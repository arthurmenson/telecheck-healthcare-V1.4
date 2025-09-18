import {
  Logger,
  LogLevel,
  LogEntry,
  ErrorLogger,
  IntegrationError,
  ErrorSeverity,
  ErrorCategory
} from '../../../../src/domain/logging/logger';

describe('Logger Domain', () => {
  let logger: Logger;
  let errorLogger: ErrorLogger;

  beforeEach(() => {
    logger = new Logger({
      level: LogLevel.DEBUG,
      service: 'test-service',
      enableConsole: false,
      enableFile: false
    });

    errorLogger = new ErrorLogger({
      service: 'test-service',
      enableAlerts: false,
      retentionDays: 30
    });
  });

  describe('Logger functionality', () => {
    it('should create log entry with correct structure', () => {
      const entry = logger.info('Test message', { userId: '123' });

      expect(entry.level).toBe(LogLevel.INFO);
      expect(entry.message).toBe('Test message');
      expect(entry.service).toBe('test-service');
      expect(entry.metadata).toEqual({ userId: '123' });
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.id).toBeDefined();
    });

    it('should respect log level filtering', () => {
      const productionLogger = new Logger({
        level: LogLevel.WARN,
        service: 'prod-service',
        enableConsole: false,
        enableFile: false
      });

      const debugEntry = productionLogger.debug('Debug message');
      const infoEntry = productionLogger.info('Info message');
      const warnEntry = productionLogger.warn('Warning message');

      expect(debugEntry).toBeNull();
      expect(infoEntry).toBeNull();
      expect(warnEntry).not.toBeNull();
      expect(warnEntry?.level).toBe(LogLevel.WARN);
    });

    it('should handle structured metadata', () => {
      const metadata = {
        requestId: 'req-123',
        userId: 'user-456',
        deviceId: 'device-789',
        metrics: {
          duration: 150,
          retryCount: 2
        }
      };

      const entry = logger.info('API request completed', metadata);

      expect(entry?.metadata).toEqual(metadata);
    });

    it('should create correlation ID for request tracking', () => {
      const correlationId = 'corr-123';
      const entry = logger.withCorrelation(correlationId).info('Request started');

      expect(entry?.correlationId).toBe(correlationId);
    });

    it('should sanitize sensitive data from logs', () => {
      const sensitiveData = {
        username: 'john.doe',
        password: 'secret123',
        apiKey: 'sk-1234567890',
        token: 'bearer-token-xyz',
        ssn: '123-45-6789'
      };

      const entry = logger.info('User authentication', sensitiveData);

      expect(entry?.metadata.password).toBe('***REDACTED***');
      expect(entry?.metadata.apiKey).toBe('***REDACTED***');
      expect(entry?.metadata.token).toBe('***REDACTED***');
      expect(entry?.metadata.ssn).toBe('***REDACTED***');
      expect(entry?.metadata.username).toBe('john.doe'); // Should not be redacted
    });
  });

  describe('Error logging', () => {
    it('should create integration error with proper categorization', () => {
      const error = new IntegrationError(
        'FHIR server connection failed',
        ErrorSeverity.HIGH,
        ErrorCategory.EXTERNAL_API,
        {
          endpoint: '/Patient/123',
          statusCode: 503,
          retryAttempt: 2
        }
      );

      expect(error.message).toBe('FHIR server connection failed');
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.category).toBe(ErrorCategory.EXTERNAL_API);
      expect(error.metadata.endpoint).toBe('/Patient/123');
      expect(error.code).toBeDefined();
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should log circuit breaker events', () => {
      const entry = errorLogger.logCircuitBreakerEvent('OPEN', 'fhir-service', {
        failureCount: 5,
        threshold: 3,
        lastFailure: new Date()
      });

      expect(entry.category).toBe(ErrorCategory.CIRCUIT_BREAKER);
      expect(entry.severity).toBe(ErrorSeverity.HIGH);
      expect(entry.message).toContain('Circuit breaker state changed to OPEN');
      expect(entry.metadata.service).toBe('fhir-service');
    });

    it('should log validation errors with field details', () => {
      const validationErrors = [
        'resourceType must be "Patient"',
        'id is required',
        'name[0].family is required'
      ];

      const entry = errorLogger.logValidationError('FHIR Patient validation failed', validationErrors, {
        resourceId: 'patient-123',
        resourceType: 'Patient'
      });

      expect(entry.category).toBe(ErrorCategory.VALIDATION);
      expect(entry.severity).toBe(ErrorSeverity.MEDIUM);
      expect(entry.metadata.validationErrors).toEqual(validationErrors);
      expect(entry.metadata.resourceId).toBe('patient-123');
    });

    it('should log messaging failures with provider context', () => {
      const entry = errorLogger.logMessagingError('SMS delivery failed', 'twilio', {
        messageId: 'msg-123',
        phoneNumber: '+1-555-123-4567',
        errorCode: 'INVALID_NUMBER',
        retryCount: 2
      });

      expect(entry.category).toBe(ErrorCategory.MESSAGING);
      expect(entry.severity).toBe(ErrorSeverity.MEDIUM);
      expect(entry.metadata.provider).toBe('twilio');
      expect(entry.metadata.messageId).toBe('msg-123');
    });

    it('should log wearable sync errors with device context', () => {
      const entry = errorLogger.logWearableError('Apple Health sync timeout', 'device-123', {
        deviceType: 'APPLE_WATCH',
        userId: 'user-456',
        syncAttempt: 3,
        lastSuccessfulSync: new Date('2023-10-14T10:00:00Z')
      });

      expect(entry.category).toBe(ErrorCategory.WEARABLE_SYNC);
      expect(entry.severity).toBe(ErrorSeverity.MEDIUM);
      expect(entry.metadata.deviceId).toBe('device-123');
      expect(entry.metadata.deviceType).toBe('APPLE_WATCH');
    });
  });

  describe('Error aggregation and analysis', () => {
    it('should identify error patterns over time', () => {
      const errors = [
        new IntegrationError('Connection timeout', ErrorSeverity.MEDIUM, ErrorCategory.EXTERNAL_API),
        new IntegrationError('Connection timeout', ErrorSeverity.MEDIUM, ErrorCategory.EXTERNAL_API),
        new IntegrationError('Connection timeout', ErrorSeverity.MEDIUM, ErrorCategory.EXTERNAL_API),
        new IntegrationError('Invalid credentials', ErrorSeverity.HIGH, ErrorCategory.AUTHENTICATION)
      ];

      const patterns = ErrorLogger.analyzeErrorPatterns(errors);

      expect(patterns).toHaveLength(2);
      expect(patterns[0].message).toBe('Connection timeout');
      expect(patterns[0].count).toBe(3);
      expect(patterns[0].category).toBe(ErrorCategory.EXTERNAL_API);
    });

    it('should calculate error rates by category', () => {
      const errors = [
        new IntegrationError('Error 1', ErrorSeverity.LOW, ErrorCategory.VALIDATION),
        new IntegrationError('Error 2', ErrorSeverity.MEDIUM, ErrorCategory.VALIDATION),
        new IntegrationError('Error 3', ErrorSeverity.HIGH, ErrorCategory.EXTERNAL_API),
        new IntegrationError('Error 4', ErrorSeverity.HIGH, ErrorCategory.EXTERNAL_API),
        new IntegrationError('Error 5', ErrorSeverity.HIGH, ErrorCategory.EXTERNAL_API)
      ];

      const rates = ErrorLogger.calculateErrorRates(errors);

      expect(rates[ErrorCategory.VALIDATION]).toBe(2);
      expect(rates[ErrorCategory.EXTERNAL_API]).toBe(3);
      expect(rates[ErrorCategory.MESSAGING]).toBe(0);
    });

    it('should generate health report with metrics', () => {
      const errors = [
        new IntegrationError('High severity error', ErrorSeverity.HIGH, ErrorCategory.EXTERNAL_API),
        new IntegrationError('Medium severity error', ErrorSeverity.MEDIUM, ErrorCategory.VALIDATION),
        new IntegrationError('Low severity error', ErrorSeverity.LOW, ErrorCategory.MESSAGING)
      ];

      const report = ErrorLogger.generateHealthReport(errors, {
        totalRequests: 1000,
        timeWindow: '24h'
      });

      expect(report.totalErrors).toBe(3);
      expect(report.errorRate).toBe(0.3); // 3/1000 * 100
      expect(report.highSeverityCount).toBe(1);
      expect(report.mediumSeverityCount).toBe(1);
      expect(report.lowSeverityCount).toBe(1);
      expect(report.timeWindow).toBe('24h');
    });
  });
});