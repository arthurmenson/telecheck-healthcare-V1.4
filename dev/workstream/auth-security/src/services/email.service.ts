import nodemailer from 'nodemailer';
import {
  EmailOptions,
  EmailType,
  EmailRateLimit,
  EmailVerificationData,
  PasswordResetData,
  UsernameReminderData,
  WelcomeEmailData
} from '../types/email';
import { TemplateService } from './template.service';

export class EmailService {
  private transporter!: nodemailer.Transporter;
  private templateService: TemplateService;
  private rateLimitMap: Map<string, EmailRateLimit[]> = new Map();
  private readonly hourlyLimit: number;
  private readonly dailyLimit: number;

  constructor() {
    this.hourlyLimit = parseInt(process.env['EMAIL_RATE_LIMIT_PER_HOUR'] || '50');
    this.dailyLimit = parseInt(process.env['EMAIL_RATE_LIMIT_PER_DAY'] || '200');

    this.templateService = new TemplateService();
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const smtpConfig = {
      host: process.env['SMTP_HOST'],
      port: parseInt(process.env['SMTP_PORT'] || '587'),
      secure: process.env['SMTP_SECURE'] === 'true', // true for 465, false for other ports
      auth: {
        user: process.env['SMTP_USER'],
        pass: process.env['SMTP_PASS'],
      },
      tls: {
        rejectUnauthorized: false // May be needed for some hosting providers
      }
    };

    this.transporter = nodemailer.createTransport(smtpConfig);

    // Verify connection configuration
    this.transporter.verify((error) => {
      if (error) {
        console.error('SMTP connection error:', error);
      } else {
        console.log('✅ SMTP server ready to send emails');
      }
    });
  }

  private checkRateLimit(email: string, type: EmailType, userId?: string): boolean {
    const key = `${email}:${type}`;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get existing rate limit entries for this email/type
    const entries = this.rateLimitMap.get(key) || [];

    // Clean up old entries
    const recentEntries = entries.filter(entry => entry.timestamp > oneDayAgo);
    this.rateLimitMap.set(key, recentEntries);

    // Count entries in the last hour and day
    const hourlyCount = recentEntries.filter(entry => entry.timestamp > oneHourAgo).length;
    const dailyCount = recentEntries.length;

    // Check limits
    if (hourlyCount >= this.hourlyLimit) {
      console.warn(`Email rate limit exceeded (hourly) for ${email}:${type}`);
      return false;
    }

    if (dailyCount >= this.dailyLimit) {
      console.warn(`Email rate limit exceeded (daily) for ${email}:${type}`);
      return false;
    }

    // Add current attempt
    const entry: EmailRateLimit = {
      email,
      type,
      timestamp: now
    };

    if (userId) {
      entry.userId = userId;
    }

    recentEntries.push(entry);

    return true;
  }

  private async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env['EMAIL_FROM'] || 'Telecheck Health <noreply@telecheckhealth.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Email sent successfully to ${options.to}:`, info.messageId);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendVerificationEmail(data: EmailVerificationData, userId?: string): Promise<boolean> {
    if (!this.checkRateLimit(data.email, EmailType.VERIFICATION, userId)) {
      return false;
    }

    const template = this.templateService.generateVerificationEmail(data);

    return await this.sendEmail({
      to: data.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  async sendPasswordResetEmail(data: PasswordResetData, userId?: string): Promise<boolean> {
    if (!this.checkRateLimit(data.email, EmailType.PASSWORD_RESET, userId)) {
      return false;
    }

    const template = this.templateService.generatePasswordResetEmail(data);

    return await this.sendEmail({
      to: data.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  async sendUsernameReminderEmail(data: UsernameReminderData & { loginUrl: string }, userId?: string): Promise<boolean> {
    if (!this.checkRateLimit(data.email, EmailType.USERNAME_REMINDER, userId)) {
      return false;
    }

    const template = this.templateService.generateUsernameReminderEmail(data);

    return await this.sendEmail({
      to: data.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  async sendWelcomeEmail(data: WelcomeEmailData, userId?: string): Promise<boolean> {
    if (!this.checkRateLimit(data.email, EmailType.WELCOME, userId)) {
      return false;
    }

    const template = this.templateService.generateWelcomeEmail(data);

    return await this.sendEmail({
      to: data.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  async sendTestEmail(to: string): Promise<boolean> {
    const testTemplate = {
      subject: 'Telecheck Health - SMTP Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #3b82f6;">SMTP Configuration Test</h2>
          <p>This is a test email to verify that your Telecheck Health SMTP configuration is working correctly.</p>
          <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
          <p><strong>From:</strong> ${process.env['EMAIL_FROM']}</p>
          <p><strong>SMTP Host:</strong> ${process.env['SMTP_HOST']}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 14px;">
            If you received this email, your SMTP configuration is working properly!
          </p>
        </div>
      `,
      text: `
        SMTP Configuration Test

        This is a test email to verify that your Telecheck Health SMTP configuration is working correctly.

        Sent at: ${new Date().toISOString()}
        From: ${process.env['EMAIL_FROM']}
        SMTP Host: ${process.env['SMTP_HOST']}

        If you received this email, your SMTP configuration is working properly!
      `
    };

    return await this.sendEmail({
      to,
      subject: testTemplate.subject,
      html: testTemplate.html,
      text: testTemplate.text
    });
  }

  // Clean up old rate limit entries periodically
  cleanupRateLimits(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const [key, entries] of this.rateLimitMap.entries()) {
      const recentEntries = entries.filter(entry => entry.timestamp > oneDayAgo);

      if (recentEntries.length === 0) {
        this.rateLimitMap.delete(key);
      } else {
        this.rateLimitMap.set(key, recentEntries);
      }
    }
  }
}