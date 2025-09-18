import { Request, Response, NextFunction } from 'express';
import { Logger } from './logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ErrorHandler {
  private static logger = new Logger('ErrorHandler');

  static handle = (err: AppError, req: Request, res: Response, next: NextFunction): void => {
    const statusCode = err.statusCode || 500;
    const isOperational = err.isOperational || false;

    // Log error details
    ErrorHandler.logger.error('Request error occurred', {
      error: err.message,
      stack: err.stack,
      statusCode,
      isOperational,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Send error response
    const errorResponse = {
      error: {
        message: isOperational ? err.message : 'Internal Server Error',
        statusCode,
        timestamp: new Date().toISOString(),
        path: req.url,
        method: req.method,
        ...(process.env.NODE_ENV === 'development' && {
          stack: err.stack,
          details: err.message
        })
      }
    };

    res.status(statusCode).json(errorResponse);
  };

  static createError(message: string, statusCode: number = 500, isOperational: boolean = true): AppError {
    const error = new Error(message) as AppError;
    error.statusCode = statusCode;
    error.isOperational = isOperational;
    return error;
  }

  static handleAsync = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  static notFound = (req: Request, res: Response, next: NextFunction): void => {
    const error = ErrorHandler.createError(`Route ${req.method} ${req.originalUrl} not found`, 404);
    next(error);
  };

  static validationError = (message: string): AppError => {
    return ErrorHandler.createError(`Validation Error: ${message}`, 400);
  };

  static unauthorizedError = (message: string = 'Unauthorized'): AppError => {
    return ErrorHandler.createError(message, 401);
  };

  static forbiddenError = (message: string = 'Forbidden'): AppError => {
    return ErrorHandler.createError(message, 403);
  };

  static conflictError = (message: string): AppError => {
    return ErrorHandler.createError(`Conflict: ${message}`, 409);
  };

  static rateLimitError = (): AppError => {
    return ErrorHandler.createError('Rate limit exceeded', 429);
  };

  static databaseError = (message: string): AppError => {
    return ErrorHandler.createError(`Database Error: ${message}`, 500);
  };

  static analyticsError = (message: string): AppError => {
    return ErrorHandler.createError(`Analytics Error: ${message}`, 500);
  };

  static mlModelError = (message: string): AppError => {
    return ErrorHandler.createError(`ML Model Error: ${message}`, 500);
  };

  static dataQualityError = (message: string): AppError => {
    return ErrorHandler.createError(`Data Quality Error: ${message}`, 422);
  };

  static streamingError = (message: string): AppError => {
    return ErrorHandler.createError(`Streaming Error: ${message}`, 500);
  };
}