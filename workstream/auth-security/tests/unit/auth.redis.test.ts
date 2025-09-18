import { AuthService } from '@/services/auth.service';
import { UserRole, RegisterRequest } from '@/types/auth';

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

describe('AuthService Redis Integration', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set required environment variables
    process.env['JWT_SECRET'] = 'test-secret-key-with-minimum-32-characters-for-security';
    process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-key-with-minimum-32-characters-for-security';
    process.env['REDIS_URL'] = 'redis://localhost:6379';

    authService = new AuthService();
  });

  afterEach(() => {
    delete process.env['JWT_SECRET'];
    delete process.env['JWT_REFRESH_SECRET'];
    delete process.env['REDIS_URL'];
  });

  describe('session management with Redis', () => {
    it('should create session in Redis when registering user', async () => {
      mockSessionService.createSession.mockResolvedValue(undefined);

      const registerRequest: RegisterRequest = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: UserRole.PATIENT
      };

      await authService.register(registerRequest);

      expect(mockSessionService.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(String),
          sessionId: expect.any(String),
          createdAt: expect.any(Date),
          lastActivity: expect.any(Date),
          ipAddress: '127.0.0.1',
          userAgent: 'test',
          isActive: true
        })
      );
    });

    it('should create session in Redis when logging in user', async () => {
      mockSessionService.createSession.mockResolvedValue(undefined);

      // First register a user
      const registerRequest: RegisterRequest = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: UserRole.PATIENT
      };

      await authService.register(registerRequest);

      // Clear the mock calls from registration
      jest.clearAllMocks();

      // Now login
      const loginRequest = {
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };

      await authService.login(loginRequest);

      expect(mockSessionService.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(String),
          sessionId: expect.any(String),
          isActive: true
        })
      );
    });

    it('should retrieve session from Redis when refreshing token', async () => {
      mockSessionService.createSession.mockResolvedValue(undefined);
      mockSessionService.getSession.mockResolvedValue({
        userId: 'user-123',
        sessionId: 'session-456',
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        isActive: true
      });
      mockSessionService.invalidateSession.mockResolvedValue(undefined);

      // Register and get tokens
      const registerRequest: RegisterRequest = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: UserRole.PATIENT
      };

      const authResult = await authService.register(registerRequest);

      // Try to refresh token
      await authService.refreshToken(authResult.refreshToken);

      expect(mockSessionService.getSession).toHaveBeenCalled();
      expect(mockSessionService.invalidateSession).toHaveBeenCalled();
      expect(mockSessionService.createSession).toHaveBeenCalledTimes(2); // Once for register, once for refresh
    });

    it('should invalidate session in Redis when logging out', async () => {
      mockSessionService.createSession.mockResolvedValue(undefined);
      mockSessionService.invalidateSession.mockResolvedValue(undefined);

      // Register and get tokens
      const registerRequest: RegisterRequest = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: UserRole.PATIENT
      };

      const authResult = await authService.register(registerRequest);

      // Logout
      await authService.logout(authResult.refreshToken);

      expect(mockSessionService.invalidateSession).toHaveBeenCalled();
    });

    it('should handle Redis session retrieval failure gracefully', async () => {
      mockSessionService.createSession.mockResolvedValue(undefined);
      mockSessionService.getSession.mockResolvedValue(null); // Session not found

      // Register and get tokens
      const registerRequest: RegisterRequest = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: UserRole.PATIENT
      };

      const authResult = await authService.register(registerRequest);

      // Try to refresh token with non-existent session
      await expect(authService.refreshToken(authResult.refreshToken))
        .rejects.toThrow('Invalid session');
    });

    it('should handle inactive sessions from Redis', async () => {
      mockSessionService.createSession.mockResolvedValue(undefined);
      mockSessionService.getSession.mockResolvedValue({
        userId: 'user-123',
        sessionId: 'session-456',
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        isActive: false // Inactive session
      });

      // Register and get tokens
      const registerRequest: RegisterRequest = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: UserRole.PATIENT
      };

      const authResult = await authService.register(registerRequest);

      // Try to refresh token with inactive session
      await expect(authService.refreshToken(authResult.refreshToken))
        .rejects.toThrow('Invalid session');
    });
  });
});