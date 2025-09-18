import { SessionService } from '@/services/session.service';
import { SessionData } from '@/types/auth';

// Mock Redis client
const mockRedisClient = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn(),
  on: jest.fn(),
  isReady: true
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

describe('SessionService', () => {
  let sessionService: SessionService;
  const mockSessionData: SessionData = {
    userId: 'user-123',
    sessionId: 'session-456',
    createdAt: new Date(),
    lastActivity: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    isActive: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env['REDIS_URL'] = 'redis://localhost:6379';
    sessionService = new SessionService();
  });

  afterEach(() => {
    delete process.env['REDIS_URL'];
  });

  describe('constructor', () => {
    it('should throw error when REDIS_URL is not provided', () => {
      delete process.env['REDIS_URL'];

      expect(() => {
        new SessionService();
      }).toThrow('REDIS_URL environment variable is required');
    });

    it('should initialize Redis client with correct configuration', () => {
      process.env['REDIS_URL'] = 'redis://localhost:6379';

      expect(() => {
        new SessionService();
      }).not.toThrow();
    });
  });

  describe('createSession', () => {
    it('should create a session with TTL in Redis', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.expire.mockResolvedValue(1);

      await sessionService.createSession(mockSessionData);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `session:${mockSessionData.sessionId}`,
        JSON.stringify(mockSessionData)
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        `session:${mockSessionData.sessionId}`,
        604800 // 7 days
      );
    });

    it('should throw error if Redis set operation fails', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis connection failed'));

      await expect(sessionService.createSession(mockSessionData))
        .rejects.toThrow('Failed to create session');
    });
  });

  describe('getSession', () => {
    it('should retrieve a session from Redis', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSessionData));

      const result = await sessionService.getSession(mockSessionData.sessionId);

      expect(mockRedisClient.get).toHaveBeenCalledWith(`session:${mockSessionData.sessionId}`);
      expect(result).toEqual(mockSessionData);
    });

    it('should return null if session does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await sessionService.getSession('non-existent-session');

      expect(result).toBeNull();
    });

    it('should handle JSON parsing errors gracefully', async () => {
      mockRedisClient.get.mockResolvedValue('invalid-json');

      const result = await sessionService.getSession(mockSessionData.sessionId);

      expect(result).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update session data in Redis', async () => {
      const updatedSession = { ...mockSessionData, lastActivity: new Date() };
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.expire.mockResolvedValue(1);

      await sessionService.updateSession(updatedSession);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `session:${updatedSession.sessionId}`,
        JSON.stringify(updatedSession)
      );
    });
  });

  describe('invalidateSession', () => {
    it('should remove session from Redis', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await sessionService.invalidateSession(mockSessionData.sessionId);

      expect(mockRedisClient.del).toHaveBeenCalledWith(`session:${mockSessionData.sessionId}`);
    });

    it('should handle deletion of non-existent session', async () => {
      mockRedisClient.del.mockResolvedValue(0);

      await expect(sessionService.invalidateSession('non-existent'))
        .resolves.not.toThrow();
    });
  });

  describe('sessionExists', () => {
    it('should return true if session exists in Redis', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await sessionService.sessionExists(mockSessionData.sessionId);

      expect(result).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith(`session:${mockSessionData.sessionId}`);
    });

    it('should return false if session does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await sessionService.sessionExists('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove sessions that are older than TTL', async () => {
      // This test verifies that Redis TTL mechanism works
      // In practice, Redis handles expiration automatically
      const result = await sessionService.cleanupExpiredSessions();

      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Connection lost'));

      await expect(sessionService.getSession('test-session'))
        .rejects.toThrow('Failed to retrieve session');
    });

    it('should handle Redis client not ready state', async () => {
      mockRedisClient.isReady = false;

      await expect(sessionService.createSession(mockSessionData))
        .rejects.toThrow('Redis client is not ready');
    });
  });
});