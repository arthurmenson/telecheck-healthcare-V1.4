import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env['PORT'] || 3002;

// JWT secrets
const JWT_SECRET = process.env['JWT_SECRET'] || 'dev-jwt-secret-key-change-in-production-this-must-be-at-least-32-chars';
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] || 'dev-jwt-refresh-secret-key-change-in-production-this-must-be-at-least-32-chars';

// User roles enum
enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  PHARMACIST = 'pharmacist',
  ADMIN = 'admin',
  CAREGIVER = 'caregiver'
}

// User interface
interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  failedLoginAttempts: number;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lockedUntil?: Date;
  lastLogin?: Date;
}

// In-memory user storage
const users = new Map<string, User>();

// Simple hash function using crypto
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password: string, hashedPassword: string): boolean {
  return hashPassword(password) === hashedPassword;
}

// Initialize default users
async function initializeUsers() {
  const defaultUsers = [
    { email: 'admin@sparkden.com', password: 'password123', role: UserRole.ADMIN },
    { email: 'admin@telecheck.com', password: 'demo123', role: UserRole.ADMIN },
    { email: 'doctor@telecheck.com', password: 'demo123', role: UserRole.DOCTOR },
    { email: 'nurse@telecheck.com', password: 'demo123', role: UserRole.NURSE },
    { email: 'patient@telecheck.com', password: 'demo123', role: UserRole.PATIENT },
    { email: 'pharmacist@telecheck.com', password: 'demo123', role: UserRole.PHARMACIST },
    { email: 'caregiver@telecheck.com', password: 'demo123', role: UserRole.CAREGIVER },
  ];

  for (const userData of defaultUsers) {
    const hashedPassword = hashPassword(userData.password);
    const user: User = {
      id: uuidv4(),
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      isActive: true,
      failedLoginAttempts: 0,
      mfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    users.set(user.id, user);
  }

  console.log(`[AuthService] Initialized ${users.size} default users`);
  console.log('[AuthService] Admin: admin@sparkden.com / password123');
  console.log('[AuthService] Demo users: *@telecheck.com / demo123');
}

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', // EHR portal
    'http://localhost:5174', // PMS portal
    'http://localhost:3002',
    'http://spark-den-staging-alb-1661305982.us-east-1.elb.amazonaws.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Helper functions
function getUserByEmail(email: string): User | undefined {
  for (const user of users.values()) {
    if (user.email === email) {
      return user;
    }
  }
  return undefined;
}

function generateTokens(user: User) {
  const sessionId = uuidv4();
  const now = new Date();

  const accessTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId,
    iat: Math.floor(now.getTime() / 1000),
    exp: Math.floor((now.getTime() + 15 * 60 * 1000) / 1000) // 15 minutes
  };

  const refreshTokenPayload = {
    userId: user.id,
    sessionId,
    tokenVersion: 1,
    iat: Math.floor(now.getTime() / 1000),
    exp: Math.floor((now.getTime() + 7 * 24 * 60 * 60 * 1000) / 1000) // 7 days
  };

  const accessToken = jwt.sign(accessTokenPayload, JWT_SECRET, { algorithm: 'HS256' });
  const refreshToken = jwt.sign(refreshTokenPayload, JWT_REFRESH_SECRET, { algorithm: 'HS256' });

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60 // 15 minutes in seconds
  };
}

// Routes
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'auth-security-service',
    version: '1.0.0'
  });
});

// Audit endpoint (placeholder for now)
app.post('/api/audit', (_req, res) => {
  // In production, this would save to a database
  console.log(`[Audit] Received ${_req.body?.entries?.length || 0} audit log entries`);
  res.status(200).json({ success: true, message: 'Audit logs received' });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'LOGIN_FAILED'
      });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({
        error: 'Account temporarily locked',
        code: 'ACCOUNT_LOCKED'
      });
    }

    const isPasswordValid = verifyPassword(password, user.password);
    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }
      user.updatedAt = new Date();

      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'LOGIN_FAILED'
      });
    }

    // Reset failed attempts
    user.failedLoginAttempts = 0;
    delete user.lockedUntil;
    user.lastLogin = new Date();
    user.updatedAt = new Date();

    const tokens = generateTokens(user);

    console.log(`[Auth] Login successful for ${email} (${user.role})`);

    // Frontend expects {token, refreshToken, user, expiresIn} format
    res.status(200).json({
      message: 'Login successful',
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login service error',
      code: 'SERVICE_ERROR'
    });
  }
});

// Middleware to verify JWT
function verifyToken(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      code: 'NO_TOKEN'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
}

app.get('/api/auth/profile', verifyToken, (req: any, res) => {
  const userId = req.user.userId;
  const user = Array.from(users.values()).find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }

  res.json({
    message: 'Profile retrieved successfully',
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
});

// Start server
async function startServer() {
  await initializeUsers();

  app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Auth Security Service listening on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] Health check: http://localhost:${PORT}/health`);
    console.log(`[${new Date().toISOString()}] Login endpoint: http://localhost:${PORT}/api/auth/login`);
  });
}

startServer().catch(console.error);
