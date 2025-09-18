import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { logger } from '@/core/logger'
import { createError } from './errorHandler'

export interface AuthRequest extends Request {
  user?: {
    id: string
    role: string
    permissions: string[]
  }
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')

    if (!token) {
      throw createError('Access token required', 401)
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured')
      throw createError('Authentication configuration error', 500)
    }

    const decoded = jwt.verify(token, jwtSecret) as any
    req.user = {
      id: decoded.id,
      role: decoded.role,
      permissions: decoded.permissions || []
    }

    logger.info('User authenticated', {
      userId: req.user.id,
      role: req.user.role,
      endpoint: req.path
    })

    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Invalid token', 401))
    } else if (error instanceof jwt.TokenExpiredError) {
      next(createError('Token expired', 401))
    } else {
      next(error)
    }
  }
}

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(createError('Authentication required', 401))
      return
    }

    if (!roles.includes(req.user.role)) {
      next(createError('Insufficient permissions', 403))
      return
    }

    next()
  }
}

export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(createError('Authentication required', 401))
      return
    }

    if (!req.user.permissions.includes(permission)) {
      next(createError('Insufficient permissions', 403))
      return
    }

    next()
  }
}

// HIPAA compliance: Role-based access control
export const requireMedicalCodingAccess = requirePermission('medical_coding:read')
export const requireMedicalCodingWrite = requirePermission('medical_coding:write')
export const requireModelAccess = requirePermission('ai_models:access')
export const requireModelAdmin = requirePermission('ai_models:admin')
export const requireBiasReview = requirePermission('bias_detection:review')
export const requireAuditAccess = requirePermission('audit:read')