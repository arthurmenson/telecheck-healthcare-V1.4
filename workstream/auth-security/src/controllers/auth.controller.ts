import { Response, NextFunction } from 'express';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { AuthenticatedRequest } from '@/middleware/auth.middleware';
import { AuthService } from '@/services/auth.service';
import { LoginRequest, RegisterRequest } from '@/types/auth';

export class AuthController {
  private authService: AuthService;

  constructor(db: PostgresJsDatabase<any>) {
    this.authService = new AuthService(db);
  }

  register = async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const registerRequest: RegisterRequest = req.body;
      const result = await this.authService.register(registerRequest);

      if (!result.success) {
        const statusCode = result.error?.code === 'USER_EXISTS' ? 409 : 400;
        res.status(statusCode).json({
          error: result.error?.message || 'Registration failed',
          code: result.error?.code || 'REGISTRATION_FAILED'
        });
        return;
      }

      res.status(201).json({
        message: 'User registered successfully. Please check your email to verify your account.',
        data: {
          accessToken: result.data!.accessToken,
          refreshToken: result.data!.refreshToken,
          expiresIn: result.data!.expiresIn
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Registration service error',
        code: 'SERVICE_ERROR'
      });
    }
  };

  login = async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const loginRequest: LoginRequest = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
      const userAgent = req.get('User-Agent') || 'unknown';

      const result = await this.authService.login(loginRequest, ipAddress, userAgent);

      if (!result.success) {
        const statusMap: Record<string, number> = {
          'ACCOUNT_LOCKED': 423,
          'ACCOUNT_INACTIVE': 403,
          'INVALID_CREDENTIALS': 401
        };
        const statusCode = statusMap[result.error?.code || ''] || 401;

        res.status(statusCode).json({
          error: result.error?.message || 'Login failed',
          code: result.error?.code || 'LOGIN_FAILED'
        });
        return;
      }

      const userResult = await this.authService.getUserByEmail(loginRequest.email);
      if (!userResult.success || !userResult.data) {
        res.status(500).json({
          error: 'User data not found',
          code: 'USER_DATA_ERROR'
        });
        return;
      }

      const user = userResult.data;

      // Frontend expects {token, user} format
      res.status(200).json({
        message: 'Login successful',
        token: result.data!.accessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified
        },
        // Also include backend format for compatibility
        data: {
          accessToken: result.data!.accessToken,
          refreshToken: result.data!.refreshToken,
          expiresIn: result.data!.expiresIn
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Login service error',
        code: 'SERVICE_ERROR'
      });
    }
  };

  refreshToken = async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
      const userAgent = req.get('User-Agent') || 'unknown';

      const result = await this.authService.refreshToken(refreshToken, ipAddress, userAgent);

      if (!result.success) {
        res.status(401).json({
          error: result.error?.message || 'Token refresh failed',
          code: result.error?.code || 'TOKEN_REFRESH_FAILED'
        });
        return;
      }

      res.status(200).json({
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.data!.accessToken,
          refreshToken: result.data!.refreshToken,
          expiresIn: result.data!.expiresIn
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Token refresh service error',
        code: 'SERVICE_ERROR'
      });
    }
  };

  logout = async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
      const userAgent = req.get('User-Agent') || 'unknown';

      const result = await this.authService.logout(refreshToken, ipAddress, userAgent);

      if (!result.success) {
        res.status(400).json({
          error: result.error?.message || 'Logout failed',
          code: result.error?.code || 'LOGOUT_FAILED'
        });
        return;
      }

      res.status(200).json({
        message: 'Logout successful'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Logout service error',
        code: 'SERVICE_ERROR'
      });
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

  verifyEmail = async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          error: 'Verification token is required',
          code: 'MISSING_TOKEN'
        });
        return;
      }

      const result = await this.authService.verifyEmail(token);

      if (!result.success) {
        res.status(400).json({
          error: result.error?.message || 'Email verification failed',
          code: result.error?.code || 'VERIFICATION_FAILED'
        });
        return;
      }

      res.status(200).json({
        message: 'Email verified successfully'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Email verification service error',
        code: 'SERVICE_ERROR'
      });
    }
  };

  requestPasswordReset = async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          error: 'Email is required',
          code: 'MISSING_EMAIL'
        });
        return;
      }

      const result = await this.authService.requestPasswordReset(email);

      if (!result.success) {
        res.status(400).json({
          error: result.error?.message || 'Password reset request failed',
          code: result.error?.code || 'PASSWORD_RESET_FAILED'
        });
        return;
      }

      res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Password reset service error',
        code: 'SERVICE_ERROR'
      });
    }
  };

  resetPassword = async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        res.status(400).json({
          error: 'Reset token and new password are required',
          code: 'MISSING_FIELDS'
        });
        return;
      }

      const result = await this.authService.resetPassword(token, password);

      if (!result.success) {
        res.status(400).json({
          error: result.error?.message || 'Password reset failed',
          code: result.error?.code || 'PASSWORD_RESET_FAILED'
        });
        return;
      }

      res.status(200).json({
        message: 'Password reset successfully. Please log in with your new password.'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Password reset service error',
        code: 'SERVICE_ERROR'
      });
    }
  };

  logoutAll = async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const result = await this.authService.logoutAllSessions(req.user.id);

      if (!result.success) {
        res.status(400).json({
          error: result.error?.message || 'Failed to logout all sessions',
          code: result.error?.code || 'LOGOUT_ALL_FAILED'
        });
        return;
      }

      res.status(200).json({
        message: 'All sessions logged out successfully'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Logout all service error',
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