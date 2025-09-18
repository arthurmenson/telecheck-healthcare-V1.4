import { CircuitBreaker, CircuitBreakerState } from '../../../src/domain/circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let mockFunction: jest.MockedFunction<() => Promise<string>>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockFunction = jest.fn();
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeout: 1000,
      monitoringPeriod: 5000
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('when in CLOSED state', () => {
    it('should execute the function successfully', async () => {
      mockFunction.mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockFunction);

      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    it('should transition to OPEN state after failure threshold is reached', async () => {
      mockFunction.mockRejectedValue(new Error('Service unavailable'));

      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('when in OPEN state', () => {
    beforeEach(async () => {
      mockFunction.mockRejectedValue(new Error('Service unavailable'));

      // Trigger circuit breaker to OPEN state
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFunction);
        } catch (error) {
          // Expected to fail
        }
      }
    });

    it('should reject calls immediately without executing function', async () => {
      mockFunction.mockClear();

      await expect(circuitBreaker.execute(mockFunction)).rejects.toThrow('Circuit breaker is OPEN');
      expect(mockFunction).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN state after recovery timeout', async () => {
      jest.advanceTimersByTime(1000);

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    });
  });

  describe('when in HALF_OPEN state', () => {
    beforeEach(async () => {
      mockFunction.mockRejectedValue(new Error('Service unavailable'));

      // Trigger OPEN state
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      // Wait for recovery timeout to reach HALF_OPEN
      jest.advanceTimersByTime(1000);
    });

    it('should transition back to CLOSED state on successful execution', async () => {
      mockFunction.mockClear();
      mockFunction.mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockFunction);

      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should transition back to OPEN state on failed execution', async () => {
      mockFunction.mockClear();
      mockFunction.mockRejectedValue(new Error('Still failing'));

      await expect(circuitBreaker.execute(mockFunction)).rejects.toThrow('Still failing');
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
    });
  });
});