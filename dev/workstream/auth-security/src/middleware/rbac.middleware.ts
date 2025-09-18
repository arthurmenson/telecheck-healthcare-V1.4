import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { RBACService } from '@/services/rbac.service';
import { AuditService } from '@/services/audit.service';

export class RBACMiddleware {
  private rbacService: RBACService;
  private auditService: AuditService;

  constructor() {
    this.rbacService = new RBACService();
    this.auditService = new AuditService();
  }

  requirePermission = (resource: string, action: string) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
          return;
        }

        const hasPermission = this.rbacService.hasPermission(
          req.user,
          resource,
          action,
          { ...req.params, ...req.query, userId: req.user.id }
        );

        if (!hasPermission) {
          await this.auditService.log({
            userId: req.user.id,
            action: 'ACCESS_DENIED',
            resource: req.path,
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            success: false,
            details: {
              reason: 'insufficient_permissions',
              required_permission: `${action}:${resource}`,
              user_role: req.user.role
            }
          });

          res.status(403).json({
            error: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
            required: `${action}:${resource}`
          });
          return;
        }

        await this.auditService.log({
          userId: req.user.id,
          action: 'PERMISSION_GRANTED',
          resource: req.path,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          success: true,
          details: {
            granted_permission: `${action}:${resource}`,
            user_role: req.user.role
          }
        });

        next();
      } catch (error) {
        res.status(500).json({
          error: 'Authorization service error',
          code: 'RBAC_SERVICE_ERROR'
        });
      }
    };
  };

  requireRole = (roles: string | string[]) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
          return;
        }

        if (!allowedRoles.includes(req.user.role)) {
          await this.auditService.log({
            userId: req.user.id,
            action: 'ACCESS_DENIED',
            resource: req.path,
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            success: false,
            details: {
              reason: 'insufficient_role',
              required_roles: allowedRoles,
              user_role: req.user.role
            }
          });

          res.status(403).json({
            error: 'Insufficient role',
            code: 'INSUFFICIENT_ROLE',
            required: allowedRoles
          });
          return;
        }

        next();
      } catch (error) {
        res.status(500).json({
          error: 'Authorization service error',
          code: 'RBAC_SERVICE_ERROR'
        });
      }
    };
  };

  checkEndpointAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const canAccess = this.rbacService.canAccessEndpoint(
        req.user,
        req.path,
        req.method
      );

      if (!canAccess) {
        await this.auditService.log({
          userId: req.user.id,
          action: 'ENDPOINT_ACCESS_DENIED',
          resource: req.path,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          success: false,
          details: {
            reason: 'endpoint_not_authorized',
            method: req.method,
            path: req.path,
            user_role: req.user.role
          }
        });

        res.status(403).json({
          error: 'Access denied for this endpoint',
          code: 'ENDPOINT_ACCESS_DENIED'
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        error: 'Authorization service error',
        code: 'RBAC_SERVICE_ERROR'
      });
    }
  };
}