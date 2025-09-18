import { Request, Response, NextFunction } from 'express'
import { logger } from '@/core/logger'
import { ZodError } from 'zod'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error details
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  // Default error response
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal Server Error'

  // Handle specific error types
  if (err instanceof ZodError) {
    statusCode = 400
    message = 'Validation Error'
    const validationErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }))

    res.status(statusCode).json({
      success: false,
      message,
      errors: validationErrors,
      timestamp: new Date().toISOString()
    })
    return
  }

  // Handle MongoDB/Database errors
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'Database Validation Error'
  }

  if (err.name === 'CastError') {
    statusCode = 400
    message = 'Invalid ID format'
  }

  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    statusCode = 409
    message = 'Duplicate field value'
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  }

  // Handle AI/ML specific errors
  if (err.message?.includes('Model not found')) {
    statusCode = 404
    message = 'AI Model not found'
  }

  if (err.message?.includes('Prediction failed')) {
    statusCode = 500
    message = 'AI Model prediction failed'
  }

  if (err.message?.includes('Accuracy threshold')) {
    statusCode = 422
    message = 'Model accuracy below threshold'
  }

  if (err.message?.includes('Performance threshold')) {
    statusCode = 408
    message = 'Model response time exceeded threshold'
  }

  if (err.message?.includes('Bias detected')) {
    statusCode = 422
    message = 'Bias compliance violation detected'
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development'

  res.status(statusCode).json({
    success: false,
    message,
    ...(isDevelopment && {
      stack: err.stack,
      details: err
    }),
    timestamp: new Date().toISOString()
  })
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError
  error.statusCode = statusCode
  error.isOperational = true
  return error
}