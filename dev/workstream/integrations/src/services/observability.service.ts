import { Logger, ErrorLogger, LogLevel, IntegrationError, ErrorCategory, ErrorSeverity } from '../domain/logging/logger';
import { CircuitBreakerState } from '../domain/circuit-breaker';

export interface ObservabilityConfig {
  service: string;
  environment: 'development' | 'staging' | 'production';
  logLevel: LogLevel;
  enableMetrics: boolean;
  enableTracing: boolean;
  enableHealthChecks: boolean;
  alertingConfig: {
    enableAlerts: boolean;
    errorRateThreshold: number;
    responseTimeThreshold: number;
    slackWebhook?: string;
    emailRecipients?: string[];
  };
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  responseTime: number;
  metadata?: Record<string, any>;
}

export interface ServiceMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  circuitBreakerStates: Record<string, CircuitBreakerState>;
  lastUpdated: Date;
}

export interface AlertThreshold {
  metric: string;
  threshold: number;
  comparison: 'greater_than' | 'less_than';
  timeWindow: string;
}

export class ObservabilityService {
  private logger: Logger;
  private errorLogger: ErrorLogger;
  private config: ObservabilityConfig;
  private metrics: Map<string, any[]> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();

  constructor(config: ObservabilityConfig) {
    this.config = config;

    this.logger = new Logger({
      level: config.logLevel,
      service: config.service,
      enableConsole: config.environment === 'development',
      enableFile: true,
      filePath: `/var/log/${config.service}.log`,
      enableRemote: config.environment === 'production'
    });

    this.errorLogger = new ErrorLogger({
      service: config.service,
      enableAlerts: config.alertingConfig.enableAlerts,
      retentionDays: 90,
      enableRemote: config.environment === 'production'
    });
  }

  // Logging methods
  logInfo(message: string, metadata?: Record<string, any>, correlationId?: string): void {
    const logger = correlationId ? this.logger.withCorrelation(correlationId) : this.logger;
    logger.info(message, metadata);
  }

  logWarning(message: string, metadata?: Record<string, any>, correlationId?: string): void {
    const logger = correlationId ? this.logger.withCorrelation(correlationId) : this.logger;
    logger.warn(message, metadata);
  }

  logError(error: Error | IntegrationError, metadata?: Record<string, any>, correlationId?: string): void {
    const logger = correlationId ? this.logger.withCorrelation(correlationId) : this.logger;

    if (error instanceof IntegrationError) {
      this.errorLogger.logError(error, correlationId);
    } else {
      // Convert regular Error to IntegrationError
      const integrationError = new IntegrationError(
        error.message,
        ErrorSeverity.MEDIUM,
        ErrorCategory.SYSTEM,
        metadata || {}
      );
      this.errorLogger.logError(integrationError, correlationId);
    }

    logger.error(error.message, metadata, error);
  }

  // Circuit breaker monitoring
  logCircuitBreakerStateChange(
    serviceName: string,
    newState: CircuitBreakerState,
    metadata: Record<string, any>,
    correlationId?: string
  ): void {
    this.errorLogger.logCircuitBreakerEvent(newState, serviceName, metadata, correlationId);

    if (newState === CircuitBreakerState.OPEN) {
      this.triggerAlert({
        title: `Circuit Breaker OPEN: ${serviceName}`,
        severity: 'high',
        message: `Circuit breaker for ${serviceName} has opened`,
        metadata
      });
    }
  }

  // FHIR-specific logging
  logFhirOperation(
    operation: string,
    resourceType: string,
    resourceId: string,
    success: boolean,
    duration: number,
    correlationId?: string
  ): void {
    const metadata = {
      operation,
      resourceType,
      resourceId,
      duration,
      success
    };

    if (success) {
      this.logInfo(`FHIR ${operation} completed successfully`, metadata, correlationId);
    } else {
      const error = new IntegrationError(
        `FHIR ${operation} failed`,
        ErrorSeverity.MEDIUM,
        ErrorCategory.FHIR_PROCESSING,
        metadata
      );
      this.logError(error, metadata, correlationId);
    }

    this.recordMetric('fhir_operations', {
      operation,
      resourceType,
      success,
      duration,
      timestamp: new Date()
    });
  }

  // Messaging-specific logging
  logMessageEvent(
    event: 'sent' | 'delivered' | 'failed',
    messageId: string,
    provider: string,
    messageType: 'SMS' | 'EMAIL',
    metadata?: Record<string, any>,
    correlationId?: string
  ): void {
    const logMetadata = {
      messageId,
      provider,
      messageType,
      ...metadata
    };

    if (event === 'failed') {
      this.errorLogger.logMessagingError(
        `Message ${messageId} failed to ${event}`,
        provider,
        logMetadata,
        correlationId
      );
    } else {
      this.logInfo(`Message ${messageId} ${event}`, logMetadata, correlationId);
    }

    this.recordMetric('message_events', {
      event,
      provider,
      messageType,
      timestamp: new Date()
    });
  }

  // Wearable device logging
  logWearableSync(
    deviceId: string,
    deviceType: string,
    success: boolean,
    metricsCount: number,
    duration: number,
    error?: string,
    correlationId?: string
  ): void {
    const metadata = {
      deviceId,
      deviceType,
      metricsCount,
      duration,
      error
    };

    if (success) {
      this.logInfo(`Wearable sync completed for device ${deviceId}`, metadata, correlationId);
    } else {
      this.errorLogger.logWearableError(
        `Wearable sync failed for device ${deviceId}: ${error}`,
        deviceId,
        metadata,
        correlationId
      );
    }

    this.recordMetric('wearable_syncs', {
      deviceType,
      success,
      metricsCount,
      duration,
      timestamp: new Date()
    });
  }

  // Health check system
  registerHealthCheck(
    serviceName: string,
    checkFunction: () => Promise<{ healthy: boolean; responseTime: number; metadata?: Record<string, any> }>
  ): void {
    setInterval(async () => {
      try {
        const startTime = Date.now();
        const result = await checkFunction();
        const endTime = Date.now();

        const healthCheck: HealthCheck = {
          service: serviceName,
          status: result.healthy ? 'healthy' : 'unhealthy',
          timestamp: new Date(),
          responseTime: endTime - startTime,
          metadata: result.metadata
        };

        this.healthChecks.set(serviceName, healthCheck);

        if (!result.healthy) {
          this.logWarning(`Health check failed for ${serviceName}`, {
            responseTime: healthCheck.responseTime,
            metadata: result.metadata
          });
        }
      } catch (error) {
        const healthCheck: HealthCheck = {
          service: serviceName,
          status: 'unhealthy',
          timestamp: new Date(),
          responseTime: 0,
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
        };

        this.healthChecks.set(serviceName, healthCheck);
        this.logError(error as Error, { serviceName });
      }
    }, 30000); // Check every 30 seconds
  }

  // Metrics collection
  recordMetric(metricName: string, data: any): void {
    if (!this.config.enableMetrics) {
      return;
    }

    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    const metricData = this.metrics.get(metricName)!;
    metricData.push(data);

    // Keep only last 1000 entries to prevent memory issues
    if (metricData.length > 1000) {
      metricData.splice(0, metricData.length - 1000);
    }
  }

  // Performance monitoring
  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>,
    correlationId?: string
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;
    let error: Error | undefined;

    try {
      const result = await operation();
      return result;
    } catch (err) {
      success = false;
      error = err as Error;
      throw err;
    } finally {
      const duration = Date.now() - startTime;

      this.recordMetric('operation_performance', {
        operationName,
        duration,
        success,
        timestamp: new Date()
      });

      if (success) {
        this.logInfo(`Operation ${operationName} completed`, {
          duration,
          ...metadata
        }, correlationId);
      } else {
        this.logError(error!, {
          operationName,
          duration,
          ...metadata
        }, correlationId);
      }
    }
  }

  // Alerting
  private triggerAlert(alert: {
    title: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    metadata?: Record<string, any>;
  }): void {
    if (!this.config.alertingConfig.enableAlerts) {
      return;
    }

    this.logWarning(`ALERT: ${alert.title}`, {
      severity: alert.severity,
      message: alert.message,
      metadata: alert.metadata
    });

    // In a real implementation, this would send to Slack, email, PagerDuty, etc.
    if (this.config.alertingConfig.slackWebhook) {
      this.sendSlackAlert(alert);
    }

    if (this.config.alertingConfig.emailRecipients) {
      this.sendEmailAlert(alert);
    }
  }

  private sendSlackAlert(alert: any): void {
    // Slack webhook implementation would go here
    console.log('Would send Slack alert:', alert);
  }

  private sendEmailAlert(alert: any): void {
    // Email alert implementation would go here
    console.log('Would send email alert:', alert);
  }

  // Reporting and analytics
  getServiceMetrics(): ServiceMetrics {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentOperations = this.getMetricsSince('operation_performance', oneHourAgo);
    const recentFhirOps = this.getMetricsSince('fhir_operations', oneHourAgo);
    const recentMessageEvents = this.getMetricsSince('message_events', oneHourAgo);

    const allOperations = [...recentOperations, ...recentFhirOps];
    const requestCount = allOperations.length;
    const errorCount = allOperations.filter(op => !op.success).length;

    const responseTimes = allOperations
      .filter(op => op.duration)
      .map(op => op.duration)
      .sort((a, b) => a - b);

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    return {
      requestCount,
      errorCount,
      averageResponseTime,
      p95ResponseTime: responseTimes[p95Index] || 0,
      p99ResponseTime: responseTimes[p99Index] || 0,
      circuitBreakerStates: this.getCircuitBreakerStates(),
      lastUpdated: now
    };
  }

  getAllHealthChecks(): Record<string, HealthCheck> {
    return Object.fromEntries(this.healthChecks);
  }

  private getMetricsSince(metricName: string, since: Date): any[] {
    const metrics = this.metrics.get(metricName) || [];
    return metrics.filter(metric => metric.timestamp >= since);
  }

  private getCircuitBreakerStates(): Record<string, CircuitBreakerState> {
    // This would typically be populated by circuit breaker state change events
    // For now, return empty object
    return {};
  }
}