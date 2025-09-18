import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'

export interface RequestWithLogging extends Request {
  correlationId: string
  requestId: string
  startTime: number
  logger: typeof logger
}

export function loggingMiddleware(req: RequestWithLogging, res: Response, next: NextFunction): void {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4()
  const requestId = uuidv4()
  const startTime = Date.now()

  req.correlationId = correlationId
  req.requestId = requestId
  req.startTime = startTime
  req.logger = logger.child({
    correlationId,
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  })

  // Add correlation ID to response headers
  res.setHeader('x-correlation-id', correlationId)
  res.setHeader('x-request-id', requestId)

  // Log request
  req.logger.http('Request received', {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: req.headers
  })

  // Override res.json to log responses
  const originalJson = res.json.bind(res)
  res.json = function(data: any) {
    const duration = Date.now() - startTime
    const statusCode = res.statusCode

    req.logger.http('Request completed', {
      statusCode,
      duration,
      responseSize: JSON.stringify(data).length
    })

    return originalJson(data)
  }

  // Log errors and completion
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const statusCode = res.statusCode

    if (statusCode >= 400) {
      req.logger.warn('Request failed', {
        statusCode,
        duration
      })
    } else {
      req.logger.info('Request successful', {
        statusCode,
        duration
      })
    }
  })

  next()
}

export function errorLoggingMiddleware(
  error: Error,
  req: RequestWithLogging,
  res: Response,
  _next: NextFunction
): void {
  const duration = Date.now() - req.startTime

  req.logger.error('Request error', error, {
    statusCode: res.statusCode,
    duration,
    stack: error.stack
  })

  // Don't expose error details in production
  const errorResponse = process.env.NODE_ENV === 'production'
    ? { error: 'Internal server error' }
    : { error: error.message, stack: error.stack }

  if (!res.headersSent) {
    res.status(500).json(errorResponse)
  }
}