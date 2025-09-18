import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { EmailService } from './services/email.service';
import emailAuthRoutes from './routes/email-auth.routes';

const app = express();
const PORT = process.env['PORT'] || 3002;

app.use(cors());
app.use(express.json());

// Initialize email service
const emailService = new EmailService();

// Email-based authentication routes
app.use('/auth', emailAuthRoutes);

// In-memory user storage for development (legacy routes)
const registeredUsers = new Map();

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth-security',
    timestamp: new Date().toISOString()
  });
});

// User registration endpoint
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'patient' } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
    }

    // Check if user already exists
    if (registeredUsers.has(email)) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Create new user
    const userId = `${role}-${Date.now()}`;
    const newUser = {
      id: userId,
      email,
      password, // In production, this should be hashed
      firstName,
      lastName,
      role,
      createdAt: new Date().toISOString()
    };

    registeredUsers.set(email, newUser);

    console.log(`[AUTH] New user registered: ${email} (${role})`);

    // Generate token
    const token = jwt.sign(
      { userId, email, role },
      process.env['JWT_SECRET'] || 'dev-secret',
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: userId, email, role, firstName, lastName }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Simple login endpoint
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check registered users first
    const registeredUser = registeredUsers.get(email);
    if (registeredUser && registeredUser.password === password) {
      const token = jwt.sign(
        { userId: registeredUser.id, email: registeredUser.email, role: registeredUser.role },
        process.env['JWT_SECRET'] || 'dev-secret',
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: {
          id: registeredUser.id,
          email: registeredUser.email,
          role: registeredUser.role,
          firstName: registeredUser.firstName,
          lastName: registeredUser.lastName
        }
      });
    }

    // For development, accept the test credentials
    if (email === 'admin@sparkden.com' && password === 'password123') {
      const token = jwt.sign(
        { userId: 'admin-123', email, role: 'admin' },
        process.env['JWT_SECRET'] || 'dev-secret',
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: { id: 'admin-123', email, role: 'admin' }
      });
    }

    // Check other dev users
    const devUsers = [
      { email: 'john.smith@sparkden.com', role: 'doctor', id: 'doctor-1' },
      { email: 'sarah.johnson@sparkden.com', role: 'doctor', id: 'doctor-2' },
      { email: 'michael.brown@sparkden.com', role: 'doctor', id: 'doctor-3' }
    ];

    const user = devUsers.find(u => u.email === email);
    if (user && password === 'password123') {
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env['JWT_SECRET'] || 'dev-secret',
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: { id: user.id, email: user.email, role: user.role }
      });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Token validation endpoint
app.post('/auth/validate', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, process.env['JWT_SECRET'] || 'dev-secret');
    return res.json({ valid: true, user: decoded });
  } catch (error) {
    return res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

// Test email endpoint
app.post('/test/email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address required' });
    }

    console.log(`[TEST] Sending test email to: ${email}`);

    const success = await emailService.sendTestEmail(email);

    if (success) {
      return res.json({
        success: true,
        message: `Test email sent successfully to ${email}`
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to send test email'
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🔐 Auth service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});