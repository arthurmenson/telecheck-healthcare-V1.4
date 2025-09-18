import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, User } from '@/types/auth';
import { AuditService } from '@/services/audit.service';

export interface AuthenticatedRequest extends Request {
  user?: User;
  tokenPayload?: JwtPayload;
}

export class AuthMiddleware {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        await this.auditService.log({
          userId: 'anonymous',
          action: 'ACCESS_DENIED',
          resource: req.path,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          success: false,
          details: { reason: 'missing_token' }
        });

        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const token = authHeader.substring(7);

      try {
        const payload = jwt.verify(
          token,
          process.env['JWT_SECRET'] || 'test-jwt-secret-key-for-testing-only'
        ) as JwtPayload;

        // Add user info to request
        req.tokenPayload = payload;
        req.user = {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
          password: '', // Don't expose password
          isActive: true,
          failedLoginAttempts: 0,
          mfaEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await this.auditService.log({
          userId: payload.userId,
          action: 'ACCESS_GRANTED',
          resource: req.path,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          success: true
        });

        next();
      } catch (jwtError) {
        await this.auditService.log({
          userId: 'anonymous',
          action: 'ACCESS_DENIED',
          resource: req.path,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          success: false,
          details: { reason: 'invalid_token' }
        });

        res.status(401).json({
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Authentication service error',
        code: 'AUTH_SERVICE_ERROR'
      });
    }
  };

  optionalAuth = async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    try {
      const token = authHeader.substring(7);
      const payload = jwt.verify(
        token,
        process.env['JWT_SECRET'] || 'test-jwt-secret-key-for-testing-only'
      ) as JwtPayload;

      req.tokenPayload = payload;
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        password: '',
        isActive: true,
        failedLoginAttempts: 0,
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      // Invalid token, but continue without authentication
    }

    next();
  };
}