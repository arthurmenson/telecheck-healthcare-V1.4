import request from 'supertest';
import { App } from '@/app';
import { UserRole } from '@/types/auth';

describe('Auth Integration Tests', () => {
  let app: App;
  let server: any;

  beforeAll(() => {
    app = new App();
    server = app.getApp();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: UserRole.PATIENT
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.expiresIn).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePassword123!',
        role: UserRole.PATIENT
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          field: 'email',
          message: 'Please provide a valid email address'
        })
      );
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test2@example.com',
        password: 'weak',
        role: UserRole.PATIENT
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          field: 'password'
        })
      );
    });

    it('should reject registration with invalid role', async () => {
      const userData = {
        email: 'test3@example.com',
        password: 'SecurePassword123!',
        role: 'invalid-role'
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          field: 'role',
          message: 'Role must be one of: patient, nurse, doctor, admin'
        })
      );
    });

    it('should sanitize malicious input', async () => {
      const userData = {
        email: 'test4@example.com',
        password: 'SecurePassword123!',
        role: UserRole.PATIENT,
        maliciousField: '<script>alert("xss")</script>'
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      // Register a test user for login tests
      await request(server)
        .post('/api/auth/register')
        .send({
          email: 'login-test@example.com',
          password: 'SecurePassword123!',
          role: UserRole.PATIENT
        });
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'login-test@example.com',
        password: 'SecurePassword123!'
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.expiresIn).toBeDefined();
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'SecurePassword123!'
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body.code).toBe('LOGIN_FAILED');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'login-test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body.code).toBe('LOGIN_FAILED');
    });

    it('should validate login request format', async () => {
      const loginData = {
        email: 'invalid-email-format',
        password: 'SecurePassword123!'
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      // Get a refresh token by logging in
      const loginResponse = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'login-test@example.com',
          password: 'SecurePassword123!'
        });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh token successfully with valid refresh token', async () => {
      const response = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.refreshToken).not.toBe(refreshToken); // Should be rotated
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.error).toBe('Invalid refresh token');
      expect(response.body.code).toBe('TOKEN_REFRESH_FAILED');
    });

    it('should validate refresh request format', async () => {
      const response = await request(server)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/auth/profile', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Get an access token by logging in
      const loginResponse = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'login-test@example.com',
          password: 'SecurePassword123!'
        });

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should get profile successfully with valid token', async () => {
      const response = await request(server)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Profile retrieved successfully');
      expect(response.body.data.email).toBe('login-test@example.com');
      expect(response.body.data.role).toBe(UserRole.PATIENT);
      expect(response.body.data.password).toBeUndefined(); // Should not expose password
    });

    it('should reject profile request without token', async () => {
      const response = await request(server)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });

    it('should reject profile request with invalid token', async () => {
      const response = await request(server)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Invalid or expired token');
      expect(response.body.code).toBe('INVALID_TOKEN');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('auth-security-service');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(server)
        .get('/api/unknown-endpoint')
        .expect(404);

      expect(response.body.error).toBe('Endpoint not found');
      expect(response.body.code).toBe('NOT_FOUND');
      expect(response.body.path).toBe('/api/unknown-endpoint');
    });
  });
});