import winston from 'winston'

const logLevel = process.env.LOG_LEVEL || 'info'

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      let log = `${timestamp} [${level.toUpperCase()}]: ${message}`

      // Add metadata if present
      if (Object.keys(meta).length > 0) {
        log += ` | ${JSON.stringify(meta)}`
      }

      // Add stack trace for errors
      if (stack) {
        log += `\n${stack}`
      }

      return log
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ],
  // Don't exit on handled exceptions
  exitOnError: false
})

// Create logs directory if it doesn't exist
import { mkdirSync } from 'fs'
try {
  mkdirSync('logs', { recursive: true })
} catch (err) {
  // Directory already exists or can't be created
}

// Add audit logging for HIPAA compliance
export const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/audit.log',
      maxsize: 10485760, // 10MB
      maxFiles: 2555 * 365, // 7 years retention as per HIPAA
    })
  ]
})

export default logger