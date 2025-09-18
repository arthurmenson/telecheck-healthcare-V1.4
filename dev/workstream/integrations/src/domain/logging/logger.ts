export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  EXTERNAL_API = 'EXTERNAL_API',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
  MESSAGING = 'MESSAGING',
  WEARABLE_SYNC = 'WEARABLE_SYNC',
  AUTHENTICATION = 'AUTHENTICATION',
  FHIR_PROCESSING = 'FHIR_PROCESSING',
  SYSTEM = 'SYSTEM'
}

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  service: string;
  timestamp: Date;
  correlationId?: string;
  metadata?: Record<string, any>;
  stack?: string;
}

export interface ErrorLogEntry {
  id: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  service: string;
  timestamp: Date;
  correlationId?: string;
  metadata: Record<string, any>;
  stack?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  service: string;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  enableRemote?: boolean;
  remoteEndpoint?: string;
}

export interface ErrorLoggerConfig {
  service: string;
  enableAlerts: boolean;
  alertThreshold?: number;
  retentionDays: number;
  enableRemote?: boolean;
  remoteEndpoint?: string;
}

export class IntegrationError extends Error {
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly metadata: Record<string, any>;
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(
    message: string,
    severity: ErrorSeverity,
    category: ErrorCategory,
    metadata: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'IntegrationError';
    this.severity = severity;
    this.category = category;
    this.metadata = metadata;
    this.code = this.generateErrorCode();
    this.timestamp = new Date();
  }

  private generateErrorCode(): string {
    const categoryCode = this.category.substring(0, 3);
    const timestamp = this.timestamp.getTime().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5);
    return `${categoryCode}-${timestamp}-${random}`.toUpperCase();
  }
}

export class Logger {
  private config: LoggerConfig;
  private correlationId?: string;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  debug(message: string, metadata?: Record<string, any>): LogEntry | null {
    return this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): LogEntry | null {
    return this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): LogEntry | null {
    return this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, metadata?: Record<string, any>, error?: Error): LogEntry | null {
    const entry = this.log(LogLevel.ERROR, message, metadata);
    if (entry && error) {
      entry.stack = error.stack;
    }
    return entry;
  }

  withCorrelation(correlationId: string): Logger {
    const logger = new Logger(this.config);
    logger.correlationId = correlationId;
    return logger;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>): LogEntry | null {
    if (!this.shouldLog(level)) {
      return null;
    }

    const sanitizedMetadata = metadata ? this.sanitizeMetadata(metadata) : undefined;

    const entry: LogEntry = {
      id: this.generateLogId(),
      level,
      message,
      service: this.config.service,
      timestamp: new Date(),
      correlationId: this.correlationId,
      metadata: sanitizedMetadata
    };

    this.writeLog(entry);
    return entry;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const configLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= configLevelIndex;
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['password', 'apiKey', 'token', 'secret', 'authorization', 'ssn', 'creditCard'];
    const sanitized = { ...metadata };

    for (const [key, value] of Object.entries(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value);
      }
    }

    return sanitized;
  }

  private generateLogId(): string {
    return `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private writeLog(entry: LogEntry): void {
    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    if (this.config.enableFile) {
      this.writeToFile(entry);
    }

    if (this.config.enableRemote) {
      this.writeToRemote(entry);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const logMessage = `[${timestamp}] ${entry.level} [${entry.service}] ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, entry.metadata);
        break;
      case LogLevel.INFO:
        console.info(logMessage, entry.metadata);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, entry.metadata);
        break;
      case LogLevel.ERROR:
        console.error(logMessage, entry.metadata, entry.stack);
        break;
    }
  }

  private writeToFile(entry: LogEntry): void {
    // In a real implementation, this would write to a file
    // For now, we'll just simulate the behavior
  }

  private writeToRemote(entry: LogEntry): void {
    // In a real implementation, this would send to a remote logging service
    // For now, we'll just simulate the behavior
  }
}

export class ErrorLogger {
  private config: ErrorLoggerConfig;

  constructor(config: ErrorLoggerConfig) {
    this.config = config;
  }

  logError(error: IntegrationError, correlationId?: string): ErrorLogEntry {
    const entry: ErrorLogEntry = {
      id: this.generateErrorId(),
      message: error.message,
      category: error.category,
      severity: error.severity,
      service: this.config.service,
      timestamp: error.timestamp,
      correlationId,
      metadata: error.metadata,
      stack: error.stack
    };

    this.writeErrorLog(entry);

    if (this.shouldTriggerAlert(error)) {
      this.triggerAlert(entry);
    }

    return entry;
  }

  logCircuitBreakerEvent(
    state: string,
    serviceName: string,
    metadata: Record<string, any>,
    correlationId?: string
  ): ErrorLogEntry {
    const entry: ErrorLogEntry = {
      id: this.generateErrorId(),
      message: `Circuit breaker state changed to ${state} for service ${serviceName}`,
      category: ErrorCategory.CIRCUIT_BREAKER,
      severity: state === 'OPEN' ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
      service: this.config.service,
      timestamp: new Date(),
      correlationId,
      metadata: {
        ...metadata,
        service: serviceName,
        circuitBreakerState: state
      }
    };

    this.writeErrorLog(entry);
    return entry;
  }

  logValidationError(
    message: string,
    validationErrors: string[],
    metadata: Record<string, any>,
    correlationId?: string
  ): ErrorLogEntry {
    const entry: ErrorLogEntry = {
      id: this.generateErrorId(),
      message,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      service: this.config.service,
      timestamp: new Date(),
      correlationId,
      metadata: {
        ...metadata,
        validationErrors
      }
    };

    this.writeErrorLog(entry);
    return entry;
  }

  logMessagingError(
    message: string,
    provider: string,
    metadata: Record<string, any>,
    correlationId?: string
  ): ErrorLogEntry {
    const entry: ErrorLogEntry = {
      id: this.generateErrorId(),
      message,
      category: ErrorCategory.MESSAGING,
      severity: ErrorSeverity.MEDIUM,
      service: this.config.service,
      timestamp: new Date(),
      correlationId,
      metadata: {
        ...metadata,
        provider
      }
    };

    this.writeErrorLog(entry);
    return entry;
  }

  logWearableError(
    message: string,
    deviceId: string,
    metadata: Record<string, any>,
    correlationId?: string
  ): ErrorLogEntry {
    const entry: ErrorLogEntry = {
      id: this.generateErrorId(),
      message,
      category: ErrorCategory.WEARABLE_SYNC,
      severity: ErrorSeverity.MEDIUM,
      service: this.config.service,
      timestamp: new Date(),
      correlationId,
      metadata: {
        ...metadata,
        deviceId
      }
    };

    this.writeErrorLog(entry);
    return entry;
  }

  static analyzeErrorPatterns(errors: IntegrationError[]): Array<{
    message: string;
    category: ErrorCategory;
    count: number;
    firstOccurrence: Date;
    lastOccurrence: Date;
  }> {
    const patterns = new Map<string, {
      message: string;
      category: ErrorCategory;
      count: number;
      firstOccurrence: Date;
      lastOccurrence: Date;
    }>();

    for (const error of errors) {
      const key = `${error.message}-${error.category}`;
      const existing = patterns.get(key);

      if (existing) {
        existing.count++;
        existing.lastOccurrence = error.timestamp;
      } else {
        patterns.set(key, {
          message: error.message,
          category: error.category,
          count: 1,
          firstOccurrence: error.timestamp,
          lastOccurrence: error.timestamp
        });
      }
    }

    return Array.from(patterns.values()).sort((a, b) => b.count - a.count);
  }

  static calculateErrorRates(errors: IntegrationError[]): Record<ErrorCategory, number> {
    const rates: Record<ErrorCategory, number> = {
      [ErrorCategory.VALIDATION]: 0,
      [ErrorCategory.EXTERNAL_API]: 0,
      [ErrorCategory.CIRCUIT_BREAKER]: 0,
      [ErrorCategory.MESSAGING]: 0,
      [ErrorCategory.WEARABLE_SYNC]: 0,
      [ErrorCategory.AUTHENTICATION]: 0,
      [ErrorCategory.FHIR_PROCESSING]: 0,
      [ErrorCategory.SYSTEM]: 0
    };

    for (const error of errors) {
      rates[error.category]++;
    }

    return rates;
  }

  static generateHealthReport(
    errors: IntegrationError[],
    metrics: { totalRequests: number; timeWindow: string }
  ): {
    totalErrors: number;
    errorRate: number;
    highSeverityCount: number;
    mediumSeverityCount: number;
    lowSeverityCount: number;
    criticalSeverityCount: number;
    categoryBreakdown: Record<ErrorCategory, number>;
    timeWindow: string;
  } {
    const categoryBreakdown = this.calculateErrorRates(errors);

    const severityCounts = {
      [ErrorSeverity.CRITICAL]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.LOW]: 0
    };

    for (const error of errors) {
      severityCounts[error.severity]++;
    }

    return {
      totalErrors: errors.length,
      errorRate: (errors.length / metrics.totalRequests) * 100,
      highSeverityCount: severityCounts[ErrorSeverity.HIGH],
      mediumSeverityCount: severityCounts[ErrorSeverity.MEDIUM],
      lowSeverityCount: severityCounts[ErrorSeverity.LOW],
      criticalSeverityCount: severityCounts[ErrorSeverity.CRITICAL],
      categoryBreakdown,
      timeWindow: metrics.timeWindow
    };
  }

  private generateErrorId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private shouldTriggerAlert(error: IntegrationError): boolean {
    if (!this.config.enableAlerts) {
      return false;
    }

    return error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL;
  }

  private triggerAlert(entry: ErrorLogEntry): void {
    // In a real implementation, this would send alerts via email, Slack, PagerDuty, etc.
    console.warn(`ALERT: ${entry.severity} error in ${entry.service}:`, entry.message);
  }

  private writeErrorLog(entry: ErrorLogEntry): void {
    if (this.config.enableRemote) {
      this.writeToRemoteErrorService(entry);
    } else {
      // Default to console if no remote service configured
      console.error(`[ERROR] [${entry.service}] ${entry.message}`, entry.metadata);
    }
  }

  private writeToRemoteErrorService(entry: ErrorLogEntry): void {
    // In a real implementation, this would send to an error tracking service like Sentry
    // For now, we'll just simulate the behavior
  }
}