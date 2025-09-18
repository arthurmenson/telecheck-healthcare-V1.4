/**
 * Authentication and Authorization Types
 * HIPAA Compliant Authentication with Biometric Support
 */

export interface User {
  id: string;
  email: string;
  username?: string;
  profile: UserProfile;
  roles: UserRole[];
  permissions: Permission[];
  mfaEnabled: boolean;
  biometricEnabled: boolean;
  lastLogin?: string;
  loginAttempts: number;
  isLocked: boolean;
  lockedUntil?: string;
  passwordChangedAt: string;
  sessionTimeout: number; // minutes
  preferences: UserPreferences;
  auditLog: AuthAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  displayName?: string;
  title?: string;
  department?: string;
  phone?: string;
  avatar?: string;
  npi?: string; // For providers
  licenseNumber?: string;
  specialties?: string[];
  organization: OrganizationInfo;
  timezone: string;
  language: string;
}

export interface UserRole {
  id: string;
  name: string;
  type: RoleType;
  description: string;
  permissions: Permission[];
  isActive: boolean;
  expiresAt?: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
  conditions?: PermissionCondition[];
}

export interface AuthSession {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  location?: GeolocationInfo;
  isActive: boolean;
  lastActivity: string;
  biometricAuthenticated: boolean;
  mfaVerified: boolean;
  createdAt: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: 'ios' | 'android';
  osVersion: string;
  appVersion: string;
  isJailbroken: boolean;
  hasLockScreen: boolean;
  biometricType?: BiometricType;
  isEmulator: boolean;
  lastSeen: string;
  isRegistered: boolean;
  isTrusted: boolean;
  securityScore: number; // 0-100
}

export interface BiometricSetup {
  userId: string;
  deviceId: string;
  biometricType: BiometricType;
  isEnabled: boolean;
  publicKey: string; // For secure key exchange
  enrolledAt: string;
  lastUsed?: string;
  failureCount: number;
  isLocked: boolean;
  lockedUntil?: string;
}

export interface MFASetup {
  userId: string;
  method: MFAMethod;
  isEnabled: boolean;
  isBackup: boolean;
  secretKey?: string; // Encrypted
  backupCodes?: string[]; // Encrypted
  phoneNumber?: string; // For SMS
  email?: string; // For email codes
  appName?: string; // Authenticator app
  qrCode?: string;
  verifiedAt?: string;
  lastUsed?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  deviceId: string;
  rememberDevice?: boolean;
  biometricToken?: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  session?: AuthSession;
  requiresMFA: boolean;
  requiresBiometric: boolean;
  requiresPasswordChange: boolean;
  securityWarnings?: SecurityWarning[];
  errorCode?: AuthErrorCode;
  errorMessage?: string;
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  prohibitCommonPasswords: boolean;
  prohibitPersonalInfo: boolean;
  expiryDays: number;
  historyLimit: number; // Cannot reuse last N passwords
}

export interface SecurityPolicy {
  sessionTimeout: number; // minutes
  maxLoginAttempts: number;
  lockoutDuration: number; // minutes
  passwordPolicy: PasswordPolicy;
  mfaRequired: boolean;
  biometricRequired: boolean;
  deviceRegistrationRequired: boolean;
  allowJailbrokenDevices: boolean;
  allowEmulators: boolean;
  ipWhitelist?: string[];
  geofencing?: GeofenceConfig[];
  auditLogging: boolean;
  dataEncryption: boolean;
}

export interface AuthAuditEntry {
  id: string;
  userId: string;
  action: AuthAction;
  result: 'success' | 'failure' | 'warning';
  details: {
    ipAddress: string;
    userAgent: string;
    deviceId?: string;
    location?: GeolocationInfo;
    errorCode?: string;
    metadata?: Record<string, any>;
  };
  timestamp: string;
  riskScore: number; // 0-100
}

// Type Definitions
export type RoleType = 'provider' | 'admin' | 'patient' | 'staff' | 'system';

export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'sign'
  | 'bill'
  | 'schedule';

export type PermissionScope =
  | 'own'
  | 'department'
  | 'organization'
  | 'all'
  | 'assigned';

export type BiometricType =
  | 'fingerprint'
  | 'faceID'
  | 'touchID'
  | 'voiceprint'
  | 'iris';

export type MFAMethod =
  | 'totp'
  | 'sms'
  | 'email'
  | 'push'
  | 'backup_codes';

export type AuthAction =
  | 'login'
  | 'logout'
  | 'mfa_verify'
  | 'biometric_auth'
  | 'password_change'
  | 'device_register'
  | 'permission_grant'
  | 'role_assign';

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'MFA_REQUIRED'
  | 'BIOMETRIC_REQUIRED'
  | 'DEVICE_NOT_REGISTERED'
  | 'SESSION_EXPIRED'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'SUSPICIOUS_ACTIVITY'
  | 'POLICY_VIOLATION';

export interface SecurityWarning {
  type: 'location_change' | 'new_device' | 'suspicious_activity' | 'policy_violation';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionRequired: boolean;
  recommendedAction?: string;
  timestamp: string;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'practice' | 'health_system';
  npi?: string;
  address: Address;
  phone: string;
  email: string;
  website?: string;
  licenseNumber?: string;
  accreditation?: string[];
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  accessibility: AccessibilityPreferences;
}

export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  sms: boolean;
  appointments: boolean;
  reminders: boolean;
  messages: boolean;
  alerts: boolean;
  marketing: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface PrivacyPreferences {
  shareDataForResearch: boolean;
  shareDataForMarketing: boolean;
  allowAnalytics: boolean;
  allowCrashReporting: boolean;
  showInDirectory: boolean;
}

export interface AccessibilityPreferences {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  highContrast: boolean;
  screenReader: boolean;
  voiceNavigation: boolean;
  largeButtons: boolean;
  reduceMotion: boolean;
}

// Utility types for forms and validation
export interface LoginFormData {
  email: string;
  password: string;
  rememberDevice: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export interface PasswordChangeFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}