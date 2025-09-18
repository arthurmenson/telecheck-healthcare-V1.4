import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from './audit.service';
import { SessionService } from './session.service';
import {
  User,
  UserRole,
  JwtPayload,
  RefreshTokenPayload,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  SessionData
} from '@/types/auth';

export class AuthService {
  private auditService: AuditService;
  private sessionService: SessionService;
  private users: Map<string, User> = new Map();
  private jwtSecret!: string;
  private jwtRefreshSecret!: string;

  constructor() {
    this.validateEnvironmentVariables();
    this.auditService = new AuditService();
    this.sessionService = new SessionService();
  }

  private validateEnvironmentVariables(): void {
    const jwtSecret = process.env['JWT_SECRET'];
    const jwtRefreshSecret = process.env['JWT_REFRESH_SECRET'];

    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    if (!jwtRefreshSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }

    if (jwtSecret.length < 32 || jwtRefreshSecret.length < 32) {
      throw new Error('JWT secrets must be at least 32 characters long');
    }

    this.jwtSecret = jwtSecret;
    this.jwtRefreshSecret = jwtRefreshSecret;
  }

  async register(request: RegisterRequest): Promise<AuthTokens> {
    this.validateEmail(request.email);
    this.validatePassword(request.password);

    if (this.getUserByEmail(request.email)) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(request.password, 12);
    const userId = uuidv4();
    const user: User = {
      id: userId,
      email: request.email,
      password: hashedPassword,
      role: request.role,
      isActive: true,
      failedLoginAttempts: 0,
      mfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(userId, user);

    await this.auditService.log({
      userId,
      action: 'USER_REGISTER',
      resource: 'user',
      ipAddress: '127.0.0.1',
      userAgent: 'test',
      success: true
    });

    return this.generateTokens(user);
  }

  async login(request: LoginRequest): Promise<AuthTokens> {
    const user = this.getUserByEmail(request.email);
    if (!user) {
      await this.auditService.log({
        userId: 'unknown',
        action: 'USER_LOGIN_FAILED',
        resource: 'auth',
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        success: false,
        details: { reason: 'user_not_found', email: request.email }
      });
      throw new Error('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new Error('Account temporarily locked');
    }

    const isPasswordValid = await bcrypt.compare(request.password, user.password);
    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }
      user.updatedAt = new Date();

      await this.auditService.log({
        userId: user.id,
        action: 'USER_LOGIN_FAILED',
        resource: 'auth',
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        success: false,
        details: { reason: 'invalid_password' }
      });

      throw new Error('Invalid credentials');
    }

    user.failedLoginAttempts = 0;
    delete user.lockedUntil;
    user.lastLogin = new Date();
    user.updatedAt = new Date();

    await this.auditService.log({
      userId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      resource: 'auth',
      ipAddress: '127.0.0.1',
      userAgent: 'test',
      success: true
    });

    return this.generateTokens(user);
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(
        refreshToken,
        this.jwtRefreshSecret
      ) as RefreshTokenPayload;

      const session = await this.sessionService.getSession(payload.sessionId);
      if (!session || !session.isActive) {
        throw new Error('Invalid session');
      }

      const user = this.users.get(payload.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      await this.sessionService.invalidateSession(payload.sessionId);
      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof Error && (error.message.includes('Invalid session') || error.message.includes('User not found'))) {
        throw error;
      }
      throw new Error('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = jwt.verify(
        refreshToken,
        this.jwtRefreshSecret
      ) as RefreshTokenPayload;

      await this.sessionService.invalidateSession(payload.sessionId);

      await this.auditService.log({
        userId: payload.userId,
        action: 'USER_LOGOUT',
        resource: 'auth',
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        success: true
      });
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const sessionId = uuidv4();
    const now = new Date();

    const session: SessionData = {
      userId: user.id,
      sessionId,
      createdAt: now,
      lastActivity: now,
      ipAddress: '127.0.0.1',
      userAgent: 'test',
      isActive: true
    };

    await this.sessionService.createSession(session);

    const accessTokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: this.getUserPermissions(user.role),
      sessionId,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor((now.getTime() + 15 * 60 * 1000) / 1000) // 15 minutes
    };

    const refreshTokenPayload: RefreshTokenPayload = {
      userId: user.id,
      sessionId,
      tokenVersion: 1,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor((now.getTime() + 7 * 24 * 60 * 60 * 1000) / 1000) // 7 days
    };

    const accessToken = jwt.sign(
      accessTokenPayload,
      this.jwtSecret,
      { algorithm: 'HS256' }
    );

    const refreshToken = jwt.sign(
      refreshTokenPayload,
      this.jwtRefreshSecret,
      { algorithm: 'HS256' }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutes in seconds
    };
  }

  private getUserByEmail(email: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
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