import winston from 'winston';
import path from 'path';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'grey',
  debug: 'white',
  silly: 'rainbow'
};

winston.addColors(logColors);

// Create log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}` +
              (info.splat !== undefined ? `${info.splat}` : ' ') +
              (info.stack !== undefined ? `\n${info.stack}` : '')
  )
);

// Create file format (no colors for files)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Configure transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat
  }),

  // Error log file
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  }),

  // Combined log file
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  }),

  // HIPAA audit log file
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'hipaa-audit.log'),
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.label({ label: 'HIPAA_AUDIT' })
    ),
    maxsize: 10485760, // 10MB
    maxFiles: 20, // Keep more audit logs
    tailable: true
  })
];

// Add additional transports based on environment
if (process.env.NODE_ENV === 'production') {
  // In production, also log to syslog
  if (process.env.SYSLOG_HOST) {
    transports.push(
      new winston.transports.Syslog({
        host: process.env.SYSLOG_HOST,
        port: parseInt(process.env.SYSLOG_PORT || '514'),
        protocol: process.env.SYSLOG_PROTOCOL as any || 'udp4',
        facility: process.env.SYSLOG_FACILITY || 'local0',
        type: '5424'
      })
    );
  }
}

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: logFormat,
  transports,
  exitOnError: false,

  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
      format: fileFormat
    })
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
      format: fileFormat
    })
  ]
});

// Healthcare-specific logging methods
export class HealthcareLogger {
  // HIPAA compliance logging
  static logHIPAAAccess(patientId: string, userId: string, action: string, details?: any): void {
    logger.info('HIPAA Access Log', {
      label: 'HIPAA_AUDIT',
      patientId,
      userId,
      action,
      timestamp: new Date().toISOString(),
      ip: details?.ip,
      userAgent: details?.userAgent,
      sessionId: details?.sessionId,
      resourceAccessed: details?.resource,
      outcome: details?.outcome || 'success'
    });
  }

  // Integration audit logging
  static logIntegrationAccess(
    system: string,
    operation: string,
    dataType: string,
    success: boolean,
    details?: any
  ): void {
    logger.info('Integration Access Log', {
      label: 'INTEGRATION_AUDIT',
      system,
      operation,
      dataType,
      success,
      timestamp: new Date().toISOString(),
      responseTime: details?.responseTime,
      recordCount: details?.recordCount,
      errorCode: details?.errorCode,
      errorMessage: details?.errorMessage,
      requestId: details?.requestId
    });
  }

  // Payment processing logging
  static logPaymentActivity(
    transactionId: string,
    amount: number,
    currency: string,
    status: string,
    patientId: string,
    details?: any
  ): void {
    logger.info('Payment Activity Log', {
      label: 'PAYMENT_AUDIT',
      transactionId,
      amount,
      currency,
      status,
      patientId,
      timestamp: new Date().toISOString(),
      paymentMethod: details?.paymentMethod,
      gatewayResponse: details?.gatewayResponse,
      pciCompliant: details?.pciCompliant || true,
      encryptedData: details?.encryptedData || false
    });
  }

  // Security incident logging
  static logSecurityIncident(
    incidentType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    details?: any
  ): void {
    logger.error('Security Incident', {
      label: 'SECURITY_INCIDENT',
      incidentType,
      severity,
      description,
      timestamp: new Date().toISOString(),
      ip: details?.ip,
      userId: details?.userId,
      userAgent: details?.userAgent,
      sessionId: details?.sessionId,
      attemptedAction: details?.attemptedAction,
      blockedByRule: details?.blockedByRule
    });
  }

  // Performance monitoring
  static logPerformanceMetric(
    operation: string,
    duration: number,
    success: boolean,
    details?: any
  ): void {
    logger.info('Performance Metric', {
      label: 'PERFORMANCE',
      operation,
      duration,
      success,
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      requestCount: details?.requestCount,
      errorRate: details?.errorRate,
      throughput: details?.throughput
    });
  }

  // FHIR compliance logging
  static logFHIRCompliance(
    resourceType: string,
    validationResult: boolean,
    errors?: string[],
    details?: any
  ): void {
    logger.info('FHIR Compliance Check', {
      label: 'FHIR_COMPLIANCE',
      resourceType,
      validationResult,
      errors: errors || [],
      timestamp: new Date().toISOString(),
      fhirVersion: details?.fhirVersion || '4.0.1',
      profileUrl: details?.profileUrl,
      uscdCompliant: details?.uscdCompliant,
      smartOnFhir: details?.smartOnFhir
    });
  }

  // Data quality logging
  static logDataQuality(
    dataSource: string,
    qualityScore: number,
    issues: string[],
    recordCount: number,
    details?: any
  ): void {
    logger.info('Data Quality Assessment', {
      label: 'DATA_QUALITY',
      dataSource,
      qualityScore,
      issues,
      recordCount,
      timestamp: new Date().toISOString(),
      completenessScore: details?.completenessScore,
      accuracyScore: details?.accuracyScore,
      consistencyScore: details?.consistencyScore,
      timelinessScore: details?.timelinessScore
    });
  }
}

// Stream for Morgan HTTP logging
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Export logger as default
export default logger;