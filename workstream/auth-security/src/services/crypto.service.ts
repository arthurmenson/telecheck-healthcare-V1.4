import crypto from 'crypto';
import bcrypt from 'bcrypt';

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
    const rounds = parseInt(process.env['BCRYPT_ROUNDS'] || '12');
    return bcrypt.hash(password, rounds);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
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