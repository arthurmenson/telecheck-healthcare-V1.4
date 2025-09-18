import crypto from 'crypto';

export class CryptoService {

  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateEmailVerificationToken(): string {
    return this.generateSecureToken(32);
  }

  static generatePasswordResetToken(): string {
    return this.generateSecureToken(32);
  }

  static async hashPassword(password: string): Promise<string> {
    // Simple hash for testing - NOT for production
    return crypto.createHash('sha256').update(password + 'telecheck-salt').digest('hex');
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    // Simple comparison for testing - NOT for production
    const hashedPassword = crypto.createHash('sha256').update(password + 'telecheck-salt').digest('hex');
    return hashedPassword === hash;
  }

  static generateTokenExpiry(hours: number = 24): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    return expiry;
  }

  static isTokenExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  static createEmailVerificationUrl(baseUrl: string, token: string): string {
    return `${baseUrl}/auth/verify-email?token=${token}`;
  }

  static createPasswordResetUrl(baseUrl: string, token: string): string {
    return `${baseUrl}/auth/reset-password?token=${token}`;
  }

  static createLoginUrl(baseUrl: string): string {
    return `${baseUrl}/auth/login`;
  }
}