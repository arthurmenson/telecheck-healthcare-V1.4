import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth.middleware';
import { AuthService } from '@/services/auth.service';
import { LoginRequest, RegisterRequest } from '@/types/auth';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const registerRequest: RegisterRequest = req.body;
      const tokens = await this.authService.register(registerRequest);

      res.status(201).json({
        message: 'User registered successfully',
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          error: error.message,
          code: 'REGISTRATION_FAILED'
        });
      } else {
        res.status(500).json({
          error: 'Registration service error',
          code: 'SERVICE_ERROR'
        });
      }
    }
  };

  login = async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const loginRequest: LoginRequest = req.body;
      const tokens = await this.authService.login(loginRequest);

      res.status(200).json({
        message: 'Login successful',
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        const statusCode = error.message.includes('locked') ? 423 : 401;
        res.status(statusCode).json({
          error: error.message,
          code: 'LOGIN_FAILED'
        });
      } else {
        res.status(500).json({
          error: 'Login service error',
          code: 'SERVICE_ERROR'
        });
      }
    }
  };

  refreshToken = async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const tokens = await this.authService.refreshToken(refreshToken);

      res.status(200).json({
        message: 'Token refreshed successfully',
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(401).json({
          error: error.message,
          code: 'TOKEN_REFRESH_FAILED'
        });
      } else {
        res.status(500).json({
          error: 'Token refresh service error',
          code: 'SERVICE_ERROR'
        });
      }
    }
  };

  logout = async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      await this.authService.logout(refreshToken);

      res.status(200).json({
        message: 'Logout successful'
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          error: error.message,
          code: 'LOGOUT_FAILED'
        });
      } else {
        res.status(500).json({
          error: 'Logout service error',
          code: 'SERVICE_ERROR'
        });
      }
    }
  };

  profile = async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      // Remove sensitive data before sending response
      const userProfile = {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive,
        mfaEnabled: req.user.mfaEnabled,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt
      };

      res.status(200).json({
        message: 'Profile retrieved successfully',
        data: userProfile
      });
    } catch (error) {
      res.status(500).json({
        error: 'Profile service error',
        code: 'SERVICE_ERROR'
      });
    }
  };

  health = async (_req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'auth-security'
    });
  };
}