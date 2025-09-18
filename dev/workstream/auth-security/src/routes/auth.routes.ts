import { Router } from 'express';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { AuthController } from '@/controllers/auth.controller';
import { AuthMiddleware } from '@/middleware/auth.middleware';
import { RBACMiddleware } from '@/middleware/rbac.middleware';
import { ValidationMiddleware, ValidationSchemas } from '@/middleware/validation.middleware';

export class AuthRoutes {
  private router: Router;
  private authController: AuthController;
  private authMiddleware: AuthMiddleware;
  private rbacMiddleware: RBACMiddleware;

  constructor(db: PostgresJsDatabase<any>) {
    this.router = Router();
    this.authController = new AuthController(db);
    this.authMiddleware = new AuthMiddleware();
    this.rbacMiddleware = new RBACMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public routes
    this.router.get('/health', this.authController.health);

    // Authentication routes
    this.router.post(
      '/register',
      ValidationMiddleware.sanitizeInput,
      ValidationMiddleware.validate(ValidationSchemas.register),
      this.authController.register
    );

    this.router.post(
      '/login',
      ValidationMiddleware.sanitizeInput,
      ValidationMiddleware.validate(ValidationSchemas.login),
      this.authController.login
    );

    this.router.post(
      '/refresh',
      ValidationMiddleware.sanitizeInput,
      ValidationMiddleware.validate(ValidationSchemas.refreshToken),
      this.authController.refreshToken
    );

    this.router.post(
      '/logout',
      ValidationMiddleware.sanitizeInput,
      ValidationMiddleware.validate(ValidationSchemas.refreshToken),
      this.authController.logout
    );

    // Email verification and password reset routes
    this.router.post(
      '/verify-email',
      ValidationMiddleware.sanitizeInput,
      this.authController.verifyEmail
    );

    this.router.post(
      '/request-password-reset',
      ValidationMiddleware.sanitizeInput,
      this.authController.requestPasswordReset
    );

    this.router.post(
      '/reset-password',
      ValidationMiddleware.sanitizeInput,
      this.authController.resetPassword
    );

    // Protected routes
    this.router.get(
      '/profile',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requirePermission('profile', 'read'),
      this.authController.profile
    );

    this.router.post(
      '/logout-all',
      this.authMiddleware.authenticate,
      this.authController.logoutAll
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}