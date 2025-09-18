import winston from 'winston';
import { format } from 'winston';

export class Logger {
  private logger: winston.Logger;

  constructor(service: string) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
        format.printf(({ timestamp, level, message, service: svc, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level: level.toUpperCase(),
            service: svc || service,
            message,
            ...meta
          });
        })
      ),
      defaultMeta: { service },
      transports: [
        new winston.transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple(),
            format.printf(({ timestamp, level, message, service: svc, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${(svc || service).toUpperCase()}] ${level}: ${message} ${metaStr}`;
            })
          )
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error'
        }),
        new winston.transports.File({
          filename: 'logs/combined.log'
        })
      ]
    });

    // Create logs directory if it doesn't exist
    import('fs').then(fs => {
      if (!fs.existsSync('logs')) {
        fs.mkdirSync('logs');
      }
    });
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  fatal(message: string, meta?: any): void {
    this.logger.error(`FATAL: ${message}`, meta);
  }
}