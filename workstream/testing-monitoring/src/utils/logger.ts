import winston from 'winston'

interface LogContext {
  correlationId?: string
  userId?: string
  requestId?: string
  traceId?: string
  spanId?: string
  [key: string]: any
}

class Logger {
  private logger: winston.Logger

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'testing-monitoring',
        environment: process.env.NODE_ENV || 'development'
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    })

    if (process.env.NODE_ENV === 'production') {
      this.logger.add(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error'
        })
      )
      this.logger.add(
        new winston.transports.File({
          filename: 'logs/combined.log'
        })
      )
    }
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context)
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    })
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context)
  }

  http(message: string, context?: LogContext): void {
    this.logger.http(message, context)
  }

  child(defaultContext: LogContext): Logger {
    const childLogger = new Logger()
    childLogger.logger = this.logger.child(defaultContext)
    return childLogger
  }
}

export const logger = new Logger()
export { Logger, LogContext }