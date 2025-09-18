import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../services/database.service';
import { EmailService } from '../services/email.service';
import { CryptoService } from '../services/crypto.service.simple';

export class EmailAuthController {
  private dbService: DatabaseService;
  private emailService: EmailService;

  constructor() {
    this.dbService = new DatabaseService();
    this.emailService = new EmailService();
  }

  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password, firstName, lastName, role = 'patient' } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          error: 'Email, password, first name, and last name are required'
        });
      }

      // Check if user already exists
      const existingUser = await this.dbService.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists with this email'
        });
      }

      // Hash password
      const passwordHash = await CryptoService.hashPassword(password);

      // Create user
      const newUser = await this.dbService.createUser({
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        isEmailVerified: false
      });

      // Generate email verification token
      const verificationToken = CryptoService.generateEmailVerificationToken();
      const expiresAt = CryptoService.generateTokenExpiry(24); // 24 hours

      await this.dbService.createEmailVerificationToken({
        userId: newUser.id,
        token: verificationToken,
        type: 'email_verification',
        expiresAt
      });

      // Send verification email
      const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:5173';
      const verificationUrl = CryptoService.createEmailVerificationUrl(frontendUrl, verificationToken);

      const emailSent = await this.emailService.sendVerificationEmail({
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        verificationUrl,
        companyName: 'Telecheck Health'
      }, newUser.id);

      if (!emailSent) {
        console.warn(`Failed to send verification email to ${email}`);
      }

      console.log(`[AUTH] New user registered: ${email} (${role}) - Verification email sent: ${emailSent}`);

      return res.status(201).json({
        message: 'User registered successfully. Please check your email to verify your account.',
        userId: newUser.id,
        emailSent
      });

    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<Response> {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Verification token is required' });
      }

      // Find valid token
      const verificationToken = await this.dbService.getValidEmailVerificationToken(
        token,
        'email_verification'
      );

      if (!verificationToken) {
        return res.status(400).json({
          error: 'Invalid or expired verification token'
        });
      }

      // Get user
      const user = await this.dbService.getUserById(verificationToken.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          error: 'Email is already verified'
        });
      }

      // Mark user as verified
      await this.dbService.verifyUserEmail(user.id);

      // Mark token as used
      await this.dbService.markTokenAsUsed(verificationToken.id);

      // Send welcome email
      const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:5173';
      const loginUrl = CryptoService.createLoginUrl(frontendUrl);

      await this.emailService.sendWelcomeEmail({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        loginUrl,
        companyName: 'Telecheck Health'
      }, user.id);

      console.log(`[AUTH] Email verified for user: ${user.email}`);

      return res.json({
        message: 'Email verified successfully. You can now log in.',
        verified: true
      });

    } catch (error) {
      console.error('Email verification error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async resendVerification(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Find user
      const user = await this.dbService.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({
          message: 'If an account with this email exists and is not verified, a verification email has been sent.'
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          error: 'Email is already verified'
        });
      }

      // Generate new verification token
      const verificationToken = CryptoService.generateEmailVerificationToken();
      const expiresAt = CryptoService.generateTokenExpiry(24); // 24 hours

      await this.dbService.createEmailVerificationToken({
        userId: user.id,
        token: verificationToken,
        type: 'email_verification',
        expiresAt
      });

      // Send verification email
      const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:5173';
      const verificationUrl = CryptoService.createEmailVerificationUrl(frontendUrl, verificationToken);

      const emailSent = await this.emailService.sendVerificationEmail({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        verificationUrl,
        companyName: 'Telecheck Health'
      }, user.id);

      console.log(`[AUTH] Verification email resent to: ${email} - Success: ${emailSent}`);

      return res.json({
        message: 'If an account with this email exists and is not verified, a verification email has been sent.',
        emailSent
      });

    } catch (error) {
      console.error('Resend verification error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // Find user
      const user = await this.dbService.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return res.status(423).json({
          error: 'Account is temporarily locked due to too many failed login attempts'
        });
      }

      // Verify password
      const isPasswordValid = await CryptoService.comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        // Increment failed login attempts
        const attempts = user.failedLoginAttempts + 1;
        const maxAttempts = parseInt(process.env['MAX_LOGIN_ATTEMPTS'] || '5');

        let lockedUntil: Date | undefined;
        if (attempts >= maxAttempts) {
          const lockoutMs = parseInt(process.env['LOCKOUT_TIME_MS'] || '1800000'); // 30 minutes
          lockedUntil = new Date(Date.now() + lockoutMs);
        }

        await this.dbService.updateLoginAttempts(user.id, attempts, lockedUntil);

        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        return res.status(403).json({
          error: 'Please verify your email address before logging in',
          emailVerified: false
        });
      }

      // Reset failed login attempts on successful login
      await this.dbService.updateLoginAttempts(user.id, 0);

      // Generate JWT token
      const jwtSecret = process.env['JWT_SECRET'] || 'dev-secret';
      const jwtExpiresIn = process.env['JWT_EXPIRES_IN'] || '24h';
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        jwtSecret,
        { expiresIn: jwtExpiresIn } as jwt.SignOptions
      );

      console.log(`[AUTH] User logged in: ${email}`);

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async requestPasswordReset(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Find user
      const user = await this.dbService.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({
          message: 'If an account with this email exists, a password reset email has been sent.'
        });
      }

      // Generate password reset token
      const resetToken = CryptoService.generatePasswordResetToken();
      const expiresAt = CryptoService.generateTokenExpiry(6); // 6 hours

      await this.dbService.createEmailVerificationToken({
        userId: user.id,
        token: resetToken,
        type: 'password_reset',
        expiresAt
      });

      // Send password reset email
      const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:5173';
      const resetUrl = CryptoService.createPasswordResetUrl(frontendUrl, resetToken);

      const emailSent = await this.emailService.sendPasswordResetEmail({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        resetUrl,
        expiryHours: 6,
        companyName: 'Telecheck Health'
      }, user.id);

      console.log(`[AUTH] Password reset requested for: ${email} - Email sent: ${emailSent}`);

      return res.json({
        message: 'If an account with this email exists, a password reset email has been sent.',
        emailSent
      });

    } catch (error) {
      console.error('Password reset request error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }

      // Find valid token
      const resetToken = await this.dbService.getValidEmailVerificationToken(
        token,
        'password_reset'
      );

      if (!resetToken) {
        return res.status(400).json({
          error: 'Invalid or expired reset token'
        });
      }

      // Get user
      const user = await this.dbService.getUserById(resetToken.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Hash new password
      const passwordHash = await CryptoService.hashPassword(newPassword);

      // Update password and reset failed login attempts
      await this.dbService.updateUser(user.id, {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null
      });

      // Mark token as used
      await this.dbService.markTokenAsUsed(resetToken.id);

      // Invalidate all user sessions for security
      await this.dbService.invalidateAllUserSessions(user.id);

      console.log(`[AUTH] Password reset for user: ${user.email}`);

      return res.json({
        message: 'Password reset successfully. You can now log in with your new password.'
      });

    } catch (error) {
      console.error('Password reset error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}