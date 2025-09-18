export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailVerificationData {
  firstName: string;
  lastName: string;
  email: string;
  verificationUrl: string;
  companyName: string;
}

export interface PasswordResetData {
  firstName: string;
  lastName: string;
  email: string;
  resetUrl: string;
  expiryHours: number;
  companyName: string;
}

export interface UsernameReminderData {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
}

export interface WelcomeEmailData {
  firstName: string;
  lastName: string;
  email: string;
  loginUrl: string;
  companyName: string;
}

export enum EmailType {
  VERIFICATION = 'verification',
  PASSWORD_RESET = 'password_reset',
  USERNAME_REMINDER = 'username_reminder',
  WELCOME = 'welcome',
  SECURITY_ALERT = 'security_alert'
}

export interface EmailRateLimit {
  userId?: string;
  email: string;
  type: EmailType;
  timestamp: Date;
}