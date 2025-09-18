import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { AuditService } from './audit.service';
import { EmailService } from './email.service';
import { UserRepository } from '../repositories/UserRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import {
  User,
  UserRole,
  JwtPayload,
  RefreshTokenPayload,
  AuthTokens,
  LoginRequest,
  RegisterRequest
} from '@/types/auth';
import { ServiceResult } from '../types/ServiceResult';

export class AuthService {
  private auditService: AuditService;
  private emailService: EmailService;
  private userRepository: UserRepository;
  private sessionRepository: SessionRepository;
  private jwtSecret!: string;
  private jwtRefreshSecret!: string;

  constructor(private db: PostgresJsDatabase<any>) {
    this.validateEnvironmentVariables();
    this.auditService = new AuditService();
    this.emailService = new EmailService();
    this.userRepository = new UserRepository(db);
    this.sessionRepository = new SessionRepository(db);
    this.initializeDefaultUsers();
  }

  private validateEnvironmentVariables(): void {
    const jwtSecret = process.env['JWT_SECRET'] || 'dev-jwt-secret-key-change-in-production-this-must-be-at-least-32-chars';
    const jwtRefreshSecret = process.env['JWT_REFRESH_SECRET'] || 'dev-jwt-refresh-secret-key-change-in-production-this-must-be-at-least-32-chars';

    if (jwtSecret.length < 32 || jwtRefreshSecret.length < 32) {
      throw new Error('JWT secrets must be at least 32 characters long');
    }

    this.jwtSecret = jwtSecret;
    this.jwtRefreshSecret = jwtRefreshSecret;
  }

  private async initializeDefaultUsers(): Promise<void> {
    try {
      // Check if admin user already exists
      const existingAdmin = await this.userRepository.findByEmail('admin@sparkden.com');
      if (existingAdmin.success && existingAdmin.data) {
        console.log('[AuthService] Default users already exist');
        return;
      }

      // Create default admin user
      const adminResult = await this.userRepository.create({
        email: 'admin@sparkden.com',
        passwordHash: await bcrypt.hash('password123', 12),
        firstName: 'System',
        lastName: 'Administrator',
        role: UserRole.ADMIN,
        isEmailVerified: true,
        isActive: true
      });

      if (!adminResult.success) {
        console.error('[AuthService] Failed to create admin user:', adminResult.error);
        return;
      }

      // Create demo users for each role
      const demoUsers = [
        { email: 'doctor@telecheck.com', role: UserRole.DOCTOR, firstName: 'Dr. John', lastName: 'Smith' },
        { email: 'nurse@telecheck.com', role: UserRole.NURSE, firstName: 'Jane', lastName: 'Doe' },
        { email: 'patient@telecheck.com', role: UserRole.PATIENT, firstName: 'Test', lastName: 'Patient' },
        { email: 'pharmacist@telecheck.com', role: UserRole.PHARMACIST, firstName: 'Pharmacist', lastName: 'User' }
      ];

      let createdCount = 1; // Admin already created

      for (const demoUser of demoUsers) {
        const result = await this.userRepository.create({
          email: demoUser.email,
          passwordHash: await bcrypt.hash('demo123', 12),
          firstName: demoUser.firstName,
          lastName: demoUser.lastName,
          role: demoUser.role,
          isEmailVerified: true,
          isActive: true
        });

        if (result.success) {
          createdCount++;
        } else {
          console.warn(`[AuthService] Failed to create demo user ${demoUser.email}:`, result.error);
        }
      }

      console.log(`[AuthService] Initialized ${createdCount} default users`);
    } catch (error) {
      console.error('[AuthService] Error initializing default users:', error);
    }
  }

  async register(request: RegisterRequest): Promise<ServiceResult<AuthTokens>> {
    try {
      this.validateEmail(request.email);
      this.validatePassword(request.password);

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(request.email);
      if (existingUser.success && existingUser.data) {
        return {
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User already exists',
            details: { email: request.email }
          }
        };
      }

      const hashedPassword = await bcrypt.hash(request.password, 12);

      const userResult = await this.userRepository.create({
        email: request.email,
        passwordHash: hashedPassword,
        firstName: request.firstName || '',
        lastName: request.lastName || '',
        role: request.role || UserRole.PATIENT,
        isEmailVerified: false,
        isActive: true
      });

      if (!userResult.success) {
        return userResult as ServiceResult<AuthTokens>;
      }

      const user = userResult.data!;

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await this.userRepository.createEmailVerificationToken(
        user.id,
        verificationToken,
        'email_verification',
        expiresAt
      );

      // Send verification email
      await this.emailService.sendVerificationEmail({
        email: user.email,
        firstName: user.firstName,
        verificationUrl: `${process.env['FRONTEND_URL']}/verify-email?token=${verificationToken}`
      }, user.id);

      await this.auditService.log({
        userId: user.id,
        action: 'USER_REGISTER',
        resource: 'user',
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        success: true
      });

      const tokensResult = await this.generateTokens(user);

      return {
        success: true,
        data: tokensResult
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REGISTRATION_ERROR',
          message: error instanceof Error ? error.message : 'Registration failed',
          details: error
        }
      };
    }
  }

  async login(request: LoginRequest, ipAddress: string = '127.0.0.1', userAgent: string = 'unknown'): Promise<ServiceResult<AuthTokens>> {
    try {
      const userResult = await this.userRepository.findByEmail(request.email);
      if (!userResult.success || !userResult.data) {
        await this.auditService.log({
          userId: 'unknown',
          action: 'USER_LOGIN_FAILED',
          resource: 'auth',
          ipAddress,
          userAgent,
          success: false,
          details: { reason: 'user_not_found', email: request.email }
        });

        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid credentials'
          }
        };
      }

      const user = userResult.data;

      if (!user.isActive) {
        return {
          success: false,
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Account has been deactivated'
          }
        };
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return {
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Account temporarily locked'
          }
        };
      }

      const isPasswordValid = await bcrypt.compare(request.password, user.passwordHash);
      if (!isPasswordValid) {
        // Update failed login attempts
        const failedAttempts = user.failedLoginAttempts + 1;
        const updateData: any = {
          failedLoginAttempts: failedAttempts
        };

        if (failedAttempts >= 5) {
          updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }

        await this.userRepository.update(user.id, updateData);

        await this.auditService.log({
          userId: user.id,
          action: 'USER_LOGIN_FAILED',
          resource: 'auth',
          ipAddress,
          userAgent,
          success: false,
          details: { reason: 'invalid_password' }
        });

        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid credentials'
          }
        };
      }

      // Reset failed login attempts and update last login
      await this.userRepository.update(user.id, {
        failedLoginAttempts: 0,
        lockedUntil: undefined,
        lastLoginAt: new Date()
      });

      await this.auditService.log({
        userId: user.id,
        action: 'USER_LOGIN_SUCCESS',
        resource: 'auth',
        ipAddress,
        userAgent,
        success: true
      });

      const tokens = await this.generateTokens(user, ipAddress, userAgent);

      return {
        success: true,
        data: tokens
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: error instanceof Error ? error.message : 'Login failed',
          details: error
        }
      };
    }
  }

  async refreshToken(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<ServiceResult<AuthTokens>> {
    try {
      const payload = jwt.verify(
        refreshToken,
        this.jwtRefreshSecret
      ) as RefreshTokenPayload;

      const sessionResult = await this.sessionRepository.findByRefreshToken(refreshToken);
      if (!sessionResult.success || !sessionResult.data) {
        return {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid refresh token'
          }
        };
      }

      const userResult = await this.userRepository.findById(payload.userId);
      if (!userResult.success || !userResult.data || !userResult.data.isActive) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or inactive'
          }
        };
      }

      // Invalidate old session
      await this.sessionRepository.invalidateByRefreshToken(refreshToken);

      // Generate new tokens
      const tokens = await this.generateTokens(userResult.data, ipAddress, userAgent);

      return {
        success: true,
        data: tokens
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TOKEN_REFRESH_ERROR',
          message: 'Invalid refresh token',
          details: error
        }
      };
    }
  }

  async logout(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<ServiceResult<boolean>> {
    try {
      const payload = jwt.verify(
        refreshToken,
        this.jwtRefreshSecret
      ) as RefreshTokenPayload;

      await this.sessionRepository.invalidateByRefreshToken(refreshToken);

      await this.auditService.log({
        userId: payload.userId,
        action: 'USER_LOGOUT',
        resource: 'auth',
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'unknown',
        success: true
      });

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LOGOUT_ERROR',
          message: 'Invalid refresh token',
          details: error
        }
      };
    }
  }

  private async generateTokens(user: any, ipAddress?: string, userAgent?: string): Promise<AuthTokens> {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create session in database
    await this.sessionRepository.create({
      userId: user.id,
      sessionToken,
      refreshToken,
      expiresAt,
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || 'unknown'
    });

    const accessTokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: this.getUserPermissions(user.role),
      sessionId: sessionToken,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor((now.getTime() + 15 * 60 * 1000) / 1000) // 15 minutes
    };

    const refreshTokenPayload: RefreshTokenPayload = {
      userId: user.id,
      sessionId: sessionToken,
      tokenVersion: 1,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000)
    };

    const accessToken = jwt.sign(
      accessTokenPayload,
      this.jwtSecret,
      { algorithm: 'HS256' }
    );

    const refreshTokenJwt = jwt.sign(
      refreshTokenPayload,
      this.jwtRefreshSecret,
      { algorithm: 'HS256' }
    );

    return {
      accessToken,
      refreshToken: refreshTokenJwt,
      expiresIn: 15 * 60 // 15 minutes in seconds
    };
  }

  async getUserByEmail(email: string): Promise<ServiceResult<any>> {
    return await this.userRepository.findByEmail(email);
  }

  async getUserById(id: string): Promise<ServiceResult<any>> {
    return await this.userRepository.findById(id);
  }

  async verifyEmail(token: string): Promise<ServiceResult<boolean>> {
    try {
      const tokenResult = await this.userRepository.findValidToken(token, 'email_verification');
      if (!tokenResult.success || !tokenResult.data) {
        return {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired verification token'
          }
        };
      }

      const verificationToken = tokenResult.data;

      // Update user email verification status
      const updateResult = await this.userRepository.update(verificationToken.userId, {
        isEmailVerified: true
      });

      if (!updateResult.success) {
        return updateResult as ServiceResult<boolean>;
      }

      // Mark token as used
      await this.userRepository.markTokenAsUsed(verificationToken.id);

      await this.auditService.log({
        userId: verificationToken.userId,
        action: 'EMAIL_VERIFIED',
        resource: 'auth',
        ipAddress: '127.0.0.1',
        userAgent: 'unknown',
        success: true
      });

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EMAIL_VERIFICATION_ERROR',
          message: 'Failed to verify email',
          details: error
        }
      };
    }
  }

  async requestPasswordReset(email: string): Promise<ServiceResult<boolean>> {
    try {
      const userResult = await this.userRepository.findByEmail(email);
      if (!userResult.success || !userResult.data) {
        // Don't reveal if user exists or not
        return {
          success: true,
          data: true
        };
      }

      const user = userResult.data;
      if (!user.isActive) {
        return {
          success: false,
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Account is not active'
          }
        };
      }

      // Generate password reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.userRepository.createEmailVerificationToken(
        user.id,
        resetToken,
        'password_reset',
        expiresAt
      );

      // Send password reset email
      await this.emailService.sendPasswordResetEmail({
        email: user.email,
        firstName: user.firstName,
        resetUrl: `${process.env['FRONTEND_URL']}/reset-password?token=${resetToken}`
      }, user.id);

      await this.auditService.log({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resource: 'auth',
        ipAddress: '127.0.0.1',
        userAgent: 'unknown',
        success: true
      });

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PASSWORD_RESET_ERROR',
          message: 'Failed to process password reset request',
          details: error
        }
      };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<ServiceResult<boolean>> {
    try {
      this.validatePassword(newPassword);

      const tokenResult = await this.userRepository.findValidToken(token, 'password_reset');
      if (!tokenResult.success || !tokenResult.data) {
        return {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired reset token'
          }
        };
      }

      const resetToken = tokenResult.data;
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user password
      const updateResult = await this.userRepository.update(resetToken.userId, {
        passwordHash: hashedPassword,
        failedLoginAttempts: 0,
        lockedUntil: undefined
      });

      if (!updateResult.success) {
        return updateResult as ServiceResult<boolean>;
      }

      // Mark token as used
      await this.userRepository.markTokenAsUsed(resetToken.id);

      // Invalidate all user sessions
      await this.sessionRepository.invalidateAllUserSessions(resetToken.userId);

      await this.auditService.log({
        userId: resetToken.userId,
        action: 'PASSWORD_RESET_COMPLETED',
        resource: 'auth',
        ipAddress: '127.0.0.1',
        userAgent: 'unknown',
        success: true
      });

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PASSWORD_RESET_ERROR',
          message: error instanceof Error ? error.message : 'Failed to reset password',
          details: error
        }
      };
    }
  }

  async logoutAllSessions(userId: string): Promise<ServiceResult<boolean>> {
    try {
      const result = await this.sessionRepository.invalidateAllUserSessions(userId);

      await this.auditService.log({
        userId,
        action: 'ALL_SESSIONS_LOGOUT',
        resource: 'auth',
        ipAddress: '127.0.0.1',
        userAgent: 'unknown',
        success: true
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LOGOUT_ALL_ERROR',
          message: 'Failed to logout all sessions',
          details: error
        }
      };
    }
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password does not meet security requirements');
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
      throw new Error('Password does not meet security requirements');
    }
  }

  private getUserPermissions(role: UserRole): string[] {
    const permissions: Record<UserRole, string[]> = {
      [UserRole.PATIENT]: ['read:own_profile', 'update:own_profile', 'read:own_appointments'],
      [UserRole.NURSE]: ['read:patients', 'update:patient_vitals', 'read:appointments', 'create:notes'],
      [UserRole.DOCTOR]: ['read:patients', 'update:patients', 'read:appointments', 'create:appointments', 'create:prescriptions'],
      [UserRole.ADMIN]: ['read:all', 'update:all', 'delete:all', 'create:all', 'manage:users']
    };
    return permissions[role] || [];
  }

}