// Database types for auth-security workstream
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewUser {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role?: string;
  isEmailVerified?: boolean;
  lastLoginAt?: Date | null;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
  isActive?: boolean;
}

export interface EmailVerificationToken {
  id: string;
  userId: string;
  token: string;
  type: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface NewEmailVerificationToken {
  userId: string;
  token: string;
  type: string;
  expiresAt: Date;
  usedAt?: Date | null;
}

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  refreshToken: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewUserSession {
  userId: string;
  sessionToken: string;
  refreshToken: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  isActive?: boolean;
}