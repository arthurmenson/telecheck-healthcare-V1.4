export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.updateStateIfRecoveryTimeoutReached();

    if (this.shouldRejectCall()) {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  getState(): CircuitBreakerState {
    this.updateStateIfRecoveryTimeoutReached();
    return this.state;
  }

  private updateStateIfRecoveryTimeoutReached(): void {
    if (this.isOpenStateAndRecoveryTimeoutReached()) {
      this.state = CircuitBreakerState.HALF_OPEN;
    }
  }

  private isOpenStateAndRecoveryTimeoutReached(): boolean {
    return this.state === CircuitBreakerState.OPEN &&
           this.hasRecoveryTimeoutBeenReached();
  }

  private hasRecoveryTimeoutBeenReached(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }

  private shouldRejectCall(): boolean {
    return this.state === CircuitBreakerState.OPEN;
  }

  private onSuccess(): void {
    this.resetFailureCount();
    this.transitionToClosed();
  }

  private onFailure(): void {
    this.incrementFailureCount();
    this.recordFailureTime();
    this.transitionToOpenIfThresholdReached();
  }

  private resetFailureCount(): void {
    this.failureCount = 0;
  }

  private transitionToClosed(): void {
    this.state = CircuitBreakerState.CLOSED;
  }

  private incrementFailureCount(): void {
    this.failureCount++;
  }

  private recordFailureTime(): void {
    this.lastFailureTime = Date.now();
  }

  private transitionToOpenIfThresholdReached(): void {
    if (this.hasFailureThresholdBeenReached()) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  private hasFailureThresholdBeenReached(): boolean {
    return this.failureCount >= this.config.failureThreshold;
  }
}