import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { AuthMiddleware } from '@/middleware/auth.middleware';
import { RBACMiddleware } from '@/middleware/rbac.middleware';
import { ValidationMiddleware, ValidationSchemas } from '@/middleware/validation.middleware';

export class AuthRoutes {
  private router: Router;
  private authController: AuthController;
  private authMiddleware: AuthMiddleware;
  private rbacMiddleware: RBACMiddleware;

  constructor() {
    this.router = Router();
    this.authController = new AuthController();
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

    // Protected routes
    this.router.get(
      '/profile',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requirePermission('profile', 'read'),
      this.authController.profile
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}