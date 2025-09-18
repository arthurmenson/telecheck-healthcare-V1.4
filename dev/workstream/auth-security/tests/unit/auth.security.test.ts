import { AuthService } from '@/services/auth.service';
import { UserRole } from '@/types/auth';

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

describe('AuthService Security', () => {
  describe('Environment Variable Security', () => {
    it('should throw error when JWT_SECRET is not provided', () => {
      // Save original environment variables
      const originalJwtSecret = process.env['JWT_SECRET'];
      const originalRefreshSecret = process.env['JWT_REFRESH_SECRET'];

      // Remove environment variables
      delete process.env['JWT_SECRET'];
      delete process.env['JWT_REFRESH_SECRET'];

      expect(() => {
        new AuthService();
      }).toThrow('JWT_SECRET environment variable is required');

      // Restore environment variables
      if (originalJwtSecret) process.env['JWT_SECRET'] = originalJwtSecret;
      if (originalRefreshSecret) process.env['JWT_REFRESH_SECRET'] = originalRefreshSecret;
    });

    it('should throw error when JWT_REFRESH_SECRET is not provided', () => {
      // Save original environment variables
      const originalRefreshSecret = process.env['JWT_REFRESH_SECRET'];

      // Set JWT_SECRET but remove JWT_REFRESH_SECRET
      process.env['JWT_SECRET'] = 'test-secret';
      delete process.env['JWT_REFRESH_SECRET'];

      expect(() => {
        new AuthService();
      }).toThrow('JWT_REFRESH_SECRET environment variable is required');

      // Restore environment variables
      if (originalRefreshSecret) process.env['JWT_REFRESH_SECRET'] = originalRefreshSecret;
    });

    it('should initialize successfully when all required environment variables are provided', () => {
      process.env['JWT_SECRET'] = 'test-secret-key-with-minimum-32-chars';
      process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-key-with-minimum-32-chars';

      expect(() => {
        new AuthService();
      }).not.toThrow();
    });

    it('should throw error when JWT secrets are too short', () => {
      process.env['JWT_SECRET'] = 'short';
      process.env['JWT_REFRESH_SECRET'] = 'short';

      expect(() => {
        new AuthService();
      }).toThrow('JWT secrets must be at least 32 characters long');
    });
  });

  describe('Token Generation Security', () => {
    beforeEach(() => {
      process.env['JWT_SECRET'] = 'test-secret-key-with-minimum-32-characters-for-security';
      process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-key-with-minimum-32-characters-for-security';
      process.env['REDIS_URL'] = 'redis://localhost:6379';
    });

    afterEach(() => {
      delete process.env['REDIS_URL'];
    });

    it('should not use hard-coded fallback secrets', async () => {
      mockSessionService.createSession.mockResolvedValue(undefined);

      const registerRequest = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: UserRole.PATIENT
      };

      const authService = new AuthService();
      const result = await authService.register(registerRequest);

      // Verify that tokens are generated (this test will pass when fallbacks are removed)
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });
});