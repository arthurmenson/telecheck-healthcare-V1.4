import { ObservabilityService } from '../../../src/services/observability.service';
import { LogLevel, IntegrationError, ErrorSeverity, ErrorCategory } from '../../../src/domain/logging/logger';
import { CircuitBreakerState } from '../../../src/domain/circuit-breaker';

describe('ObservabilityService', () => {
  let observabilityService: ObservabilityService;

  beforeEach(() => {
    jest.useFakeTimers();

    observabilityService = new ObservabilityService({
      service: 'test-service',
      environment: 'development',
      logLevel: LogLevel.DEBUG,
      enableMetrics: true,
      enableTracing: true,
      enableHealthChecks: true,
      alertingConfig: {
        enableAlerts: true,
        errorRateThreshold: 0.05,
        responseTimeThreshold: 1000,
        slackWebhook: 'https://hooks.slack.com/test',
        emailRecipients: ['admin@example.com']
      }
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Error logging', () => {
    it('should log integration errors with proper categorization', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = new IntegrationError(
        'FHIR validation failed',
        ErrorSeverity.HIGH,
        ErrorCategory.FHIR_PROCESSING,
        { resourceId: 'patient-123' }
      );

      observabilityService.logError(error, { requestId: 'req-456' }, 'corr-789');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [test-service] FHIR validation failed'),
        expect.objectContaining({ resourceId: 'patient-123' })
      );

      consoleSpy.mockRestore();
    });

    it('should convert regular errors to integration errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = new Error('Network timeout');
      observabilityService.logError(error, { endpoint: '/api/data' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [test-service] Network timeout'),
        expect.objectContaining({ endpoint: '/api/data' })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Circuit breaker monitoring', () => {
    it('should log circuit breaker state changes', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      observabilityService.logCircuitBreakerStateChange(
        'fhir-service',
        CircuitBreakerState.OPEN,
        {
          failureCount: 5,
          threshold: 3
        },
        'corr-123'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker state changed to OPEN'),
        expect.objectContaining({
          service: 'fhir-service',
          circuitBreakerState: 'OPEN',
          failureCount: 5
        })
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ALERT: Circuit Breaker OPEN: fhir-service'),
        expect.any(Object)
      );

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('FHIR operation logging', () => {
    it('should log successful FHIR operations', () => {
      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

      observabilityService.logFhirOperation(
        'create',
        'Patient',
        'patient-123',
        true,
        150,
        'corr-456'
      );

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('FHIR create completed successfully'),
        expect.objectContaining({
          operation: 'create',
          resourceType: 'Patient',
          resourceId: 'patient-123',
          duration: 150,
          success: true
        })
      );

      consoleInfoSpy.mockRestore();
    });

    it('should log failed FHIR operations as errors', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      observabilityService.logFhirOperation(
        'update',
        'Patient',
        'patient-123',
        false,
        250,
        'corr-456'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [test-service] FHIR update failed'),
        expect.objectContaining({
          operation: 'update',
          resourceType: 'Patient',
          resourceId: 'patient-123',
          duration: 250,
          success: false
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Messaging event logging', () => {
    it('should log successful message events', () => {
      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

      observabilityService.logMessageEvent(
        'delivered',
        'msg-123',
        'twilio',
        'SMS',
        { phoneNumber: '+1-555-123-4567' },
        'corr-789'
      );

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Message msg-123 delivered'),
        expect.objectContaining({
          messageId: 'msg-123',
          provider: 'twilio',
          messageType: 'SMS',
          phoneNumber: '+1-555-123-4567'
        })
      );

      consoleInfoSpy.mockRestore();
    });

    it('should log failed message events as errors', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      observabilityService.logMessageEvent(
        'failed',
        'msg-456',
        'telnyx',
        'EMAIL',
        { errorCode: 'INVALID_EMAIL' },
        'corr-789'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [test-service] Message msg-456 failed to failed'),
        expect.objectContaining({
          messageId: 'msg-456',
          provider: 'telnyx',
          messageType: 'EMAIL',
          errorCode: 'INVALID_EMAIL'
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Wearable sync logging', () => {
    it('should log successful wearable syncs', () => {
      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

      observabilityService.logWearableSync(
        'device-123',
        'APPLE_WATCH',
        true,
        15,
        2500,
        undefined,
        'corr-456'
      );

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Wearable sync completed for device device-123'),
        expect.objectContaining({
          deviceId: 'device-123',
          deviceType: 'APPLE_WATCH',
          metricsCount: 15,
          duration: 2500
        })
      );

      consoleInfoSpy.mockRestore();
    });

    it('should log failed wearable syncs as errors', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      observabilityService.logWearableSync(
        'device-456',
        'FITBIT',
        false,
        0,
        5000,
        'OAuth token expired',
        'corr-789'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [test-service] Wearable sync failed for device device-456: OAuth token expired'),
        expect.objectContaining({
          deviceId: 'device-456',
          deviceType: 'FITBIT',
          metricsCount: 0,
          duration: 5000,
          error: 'OAuth token expired'
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance measurement', () => {
    it('should measure successful operation performance', async () => {
      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await observabilityService.measureOperation(
        'test-operation',
        mockOperation,
        { param1: 'value1' },
        'corr-123'
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Operation test-operation completed'),
        expect.objectContaining({
          duration: expect.any(Number),
          param1: 'value1'
        })
      );

      consoleInfoSpy.mockRestore();
    });

    it('should measure failed operation performance', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(observabilityService.measureOperation(
        'test-operation',
        mockOperation,
        { param1: 'value1' },
        'corr-123'
      )).rejects.toThrow('Operation failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Operation failed'),
        expect.objectContaining({
          operationName: 'test-operation',
          duration: expect.any(Number),
          param1: 'value1'
        }),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Health checks', () => {
    it('should register and execute health checks', async () => {
      const healthCheckFn = jest.fn().mockResolvedValue({
        healthy: true,
        responseTime: 50,
        metadata: { version: '1.0.0' }
      });

      observabilityService.registerHealthCheck('test-service', healthCheckFn);

      // Fast-forward time to trigger health check
      jest.advanceTimersByTime(30000);

      // Allow promises to resolve
      await new Promise(resolve => setImmediate(resolve));

      const healthChecks = observabilityService.getAllHealthChecks();
      expect(healthChecks['test-service']).toBeDefined();
      expect(healthChecks['test-service'].status).toBe('healthy');
      expect(healthChecks['test-service'].responseTime).toBeGreaterThan(0);
    });

    it('should handle failing health checks', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const healthCheckFn = jest.fn().mockResolvedValue({
        healthy: false,
        responseTime: 1000,
        metadata: { error: 'Service unavailable' }
      });

      observabilityService.registerHealthCheck('failing-service', healthCheckFn);

      // Fast-forward time to trigger health check
      jest.advanceTimersByTime(30000);

      // Allow promises to resolve
      await new Promise(resolve => setImmediate(resolve));

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Health check failed for failing-service'),
        expect.objectContaining({
          responseTime: expect.any(Number),
          metadata: { error: 'Service unavailable' }
        })
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Metrics collection', () => {
    it('should record and retrieve service metrics', () => {
      // Record some test metrics
      observabilityService.recordMetric('operation_performance', {
        operationName: 'test-op',
        duration: 100,
        success: true,
        timestamp: new Date()
      });

      observabilityService.recordMetric('operation_performance', {
        operationName: 'test-op-2',
        duration: 200,
        success: false,
        timestamp: new Date()
      });

      const metrics = observabilityService.getServiceMetrics();

      expect(metrics.requestCount).toBe(2);
      expect(metrics.errorCount).toBe(1);
      expect(metrics.averageResponseTime).toBe(150);
      expect(metrics.lastUpdated).toBeInstanceOf(Date);
    });
  });
});