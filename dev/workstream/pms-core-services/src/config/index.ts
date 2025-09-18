import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3001'),
    apiVersion: process.env.API_VERSION || 'v1',
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'spark_den_pms',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    poolMin: parseInt(process.env.DB_POOL_MIN || '5'),
    poolMax: parseInt(process.env.DB_POOL_MAX || '20')
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0')
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Revenue Cycle Configuration
  revenueCycle: {
    optimizationEnabled: process.env.REVENUE_CYCLE_OPTIMIZATION_ENABLED === 'true',
    improvementTarget: parseFloat(process.env.REVENUE_IMPROVEMENT_TARGET || '20'),
    manualTaskReductionTarget: parseFloat(process.env.MANUAL_TASK_REDUCTION_TARGET || '40')
  },

  // Claims Processing Configuration
  claims: {
    autoSubmissionEnabled: process.env.CLAIMS_AUTO_SUBMISSION_ENABLED === 'true',
    validationThreshold: parseFloat(process.env.CLAIMS_VALIDATION_THRESHOLD || '0.95'),
    maxBatchSize: parseInt(process.env.MAX_CLAIMS_BATCH_SIZE || '100')
  },

  // Payment Processing Configuration
  payments: {
    processorApiKey: process.env.PAYMENT_PROCESSOR_API_KEY || '',
    processorSecret: process.env.PAYMENT_PROCESSOR_SECRET || '',
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || ''
  },

  // Performance Configuration
  performance: {
    monitoringEnabled: process.env.PERFORMANCE_MONITORING_ENABLED === 'true',
    analyticsEndpoint: process.env.ANALYTICS_ENDPOINT || 'https://analytics.sparkden.com',
    uptimeRequirement: parseFloat(process.env.UPTIME_REQUIREMENT || '99.99'),
    responseTimeTarget: parseInt(process.env.RESPONSE_TIME_TARGET || '100')
  },

  // HIPAA Compliance Configuration
  hipaa: {
    complianceMode: process.env.HIPAA_COMPLIANCE_MODE || 'strict',
    auditLoggingEnabled: process.env.AUDIT_LOGGING_ENABLED === 'true',
    dataEncryptionAtRest: process.env.DATA_ENCRYPTION_AT_REST === 'true',
    dataEncryptionInTransit: process.env.DATA_ENCRYPTION_IN_TRANSIT === 'true'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    fileEnabled: process.env.LOG_FILE_ENABLED === 'true',
    filePath: process.env.LOG_FILE_PATH || './logs/pms-core-services.log'
  }
};

export default config;