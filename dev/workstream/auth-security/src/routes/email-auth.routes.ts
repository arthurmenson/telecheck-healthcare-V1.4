import express, { Router } from 'express';
import { EmailAuthController } from '../controllers/email-auth.controller';

const router: Router = express.Router();
const emailAuthController = new EmailAuthController();

// User registration with email verification
router.post('/register', async (req, res) => {
  await emailAuthController.register(req, res);
});

// Email verification
router.get('/verify-email', async (req, res) => {
  await emailAuthController.verifyEmail(req, res);
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  await emailAuthController.resendVerification(req, res);
});

// Login (requires verified email)
router.post('/login', async (req, res) => {
  await emailAuthController.login(req, res);
});

// Request password reset
router.post('/request-password-reset', async (req, res) => {
  await emailAuthController.requestPasswordReset(req, res);
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  await emailAuthController.resetPassword(req, res);
});

export default router;