import { AuthService } from '@/services/auth.service';
import { UserRole, LoginRequest, RegisterRequest } from '@/types/auth';

// Mock SessionService
const mockSessionService = {
  createSession: jest.fn(),
  getSession: jest.fn(),
  updateSession: jest.fn(),
  invalidateSession: jest.fn(),
  sessionExists: jest.fn(),
  cleanupExpiredSessions: jest.fn(),
  disconnect: jest.fn()
};

jest.mock('@/services/session.service', () => ({
  SessionService: jest.fn(() => mockSessionService)
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set required environment variables
    process.env['JWT_SECRET'] = 'test-secret-key-with-minimum-32-characters-for-security';
    process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-key-with-minimum-32-characters-for-security';
    process.env['REDIS_URL'] = 'redis://localhost:6379';

    // Mock SessionService methods
    mockSessionService.createSession.mockResolvedValue(undefined);
    mockSessionService.getSession.mockResolvedValue({
      userId: 'test-user-id',
      sessionId: 'test-session-id',
      createdAt: new Date(),
      lastActivity: new Date(),
      ipAddress: '127.0.0.1',
      userAgent: 'test',
      isActive: true
    });
    mockSessionService.invalidateSession.mockResolvedValue(undefined);

    authService = new AuthService();
  });

  afterEach(() => {
    delete process.env['JWT_SECRET'];
    delete process.env['JWT_REFRESH_SECRET'];
    delete process.env['REDIS_URL'];
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerRequest: RegisterRequest = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: UserRole.PATIENT
      };

      const result = await authService.register(registerRequest);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    it('should throw error for invalid email format', async () => {
      const registerRequest: RegisterRequest = {
        email: 'invalid-email',
        password: 'SecurePassword123!',
        role: UserRole.PATIENT
      };

      await expect(authService.register(registerRequest))
        .rejects.toThrow('Invalid email format');
    });

    it('should throw error for weak password', async () => {
      const registerRequest: RegisterRequest = {
        email: 'test@example.com',
        password: 'weak',
        role: UserRole.PATIENT
      };

      await expect(authService.register(registerRequest))
        .rejects.toThrow('Password does not meet security requirements');
    });

    it('should throw error for duplicate email', async () => {
      const registerRequest: RegisterRequest = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: UserRole.PATIENT
      };

      await authService.register(registerRequest);

      await expect(authService.register(registerRequest))
        .rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await authService.register({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: UserRole.PATIENT
      });
    });

    it('should login successfully with valid credentials', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };

      const result = await authService.login(loginRequest);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error for invalid email', async () => {
      const loginRequest: LoginRequest = {
        email: 'wrong@example.com',
        password: 'SecurePassword123!'
      };

      await expect(authService.login(loginRequest))
        .rejects.toThrow('Invalid credentials');
    });

    it('should throw error for invalid password', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      await expect(authService.login(loginRequest))
        .rejects.toThrow('Invalid credentials');
    });

    it('should lock account after maximum failed attempts', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      for (let i = 0; i < 5; i++) {
        try {
          await authService.login(loginRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      await expect(authService.login(loginRequest))
        .rejects.toThrow('Account temporarily locked');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully with valid refresh token', async () => {
      const registerResult = await authService.register({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: UserRole.PATIENT
      });

      const result = await authService.refreshToken(registerResult.refreshToken);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(registerResult.refreshToken);
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid-token'))
        .rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should logout successfully and invalidate tokens', async () => {
      const registerResult = await authService.register({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: UserRole.PATIENT
      });

      await authService.logout(registerResult.refreshToken);

      await expect(authService.refreshToken(registerResult.refreshToken))
        .rejects.toThrow('Invalid refresh token');
    });
  });
});