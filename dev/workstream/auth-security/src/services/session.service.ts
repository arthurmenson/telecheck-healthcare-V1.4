import { createClient, RedisClientType } from 'redis';
import { SessionData } from '@/types/auth';

export class SessionService {
  private redisClient!: RedisClientType;
  private readonly SESSION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

  constructor() {
    this.validateEnvironmentVariables();
    this.initializeRedisClient();
  }

  private validateEnvironmentVariables(): void {
    const redisUrl = process.env['REDIS_URL'];
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }
  }

  private initializeRedisClient(): void {
    const redisUrl = process.env['REDIS_URL']!;

    this.redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    this.redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });

    this.redisClient.on('disconnect', () => {
      console.log('Disconnected from Redis');
    });

    // Connect to Redis
    this.redisClient.connect().catch(console.error);
  }

  async createSession(sessionData: SessionData): Promise<void> {
    if (!this.redisClient.isReady) {
      throw new Error('Redis client is not ready');
    }

    try {
      const sessionKey = `session:${sessionData.sessionId}`;
      const sessionValue = JSON.stringify({
        ...sessionData,
        createdAt: sessionData.createdAt.toISOString(),
        lastActivity: sessionData.lastActivity.toISOString()
      });

      await this.redisClient.set(sessionKey, sessionValue);
      await this.redisClient.expire(sessionKey, this.SESSION_TTL);
    } catch (error) {
      throw new Error(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    if (!this.redisClient.isReady) {
      throw new Error('Redis client is not ready');
    }

    try {
      const sessionKey = `session:${sessionId}`;
      const sessionValue = await this.redisClient.get(sessionKey);

      if (!sessionValue) {
        return null;
      }

      const parsedSession = JSON.parse(sessionValue);
      return {
        ...parsedSession,
        createdAt: new Date(parsedSession.createdAt),
        lastActivity: new Date(parsedSession.lastActivity)
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Handle JSON parsing errors
        console.error('Failed to parse session data:', error);
        return null;
      }
      throw new Error(`Failed to retrieve session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateSession(sessionData: SessionData): Promise<void> {
    if (!this.redisClient.isReady) {
      throw new Error('Redis client is not ready');
    }

    try {
      const sessionKey = `session:${sessionData.sessionId}`;
      const sessionValue = JSON.stringify({
        ...sessionData,
        createdAt: sessionData.createdAt.toISOString(),
        lastActivity: sessionData.lastActivity.toISOString()
      });

      await this.redisClient.set(sessionKey, sessionValue);
      await this.redisClient.expire(sessionKey, this.SESSION_TTL);
    } catch (error) {
      throw new Error(`Failed to update session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async invalidateSession(sessionId: string): Promise<void> {
    if (!this.redisClient.isReady) {
      throw new Error('Redis client is not ready');
    }

    try {
      const sessionKey = `session:${sessionId}`;
      await this.redisClient.del(sessionKey);
    } catch (error) {
      throw new Error(`Failed to invalidate session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    if (!this.redisClient.isReady) {
      throw new Error('Redis client is not ready');
    }

    try {
      const sessionKey = `session:${sessionId}`;
      const exists = await this.redisClient.exists(sessionKey);
      return exists === 1;
    } catch (error) {
      throw new Error(`Failed to check session existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    // Redis automatically handles expired keys with TTL
    // This method exists for compatibility and potential manual cleanup
    // In a real implementation, you might scan for expired sessions
    // For now, we return 0 as Redis handles this automatically
    return 0;
  }

  async disconnect(): Promise<void> {
    if (this.redisClient && this.redisClient.isReady) {
      await this.redisClient.disconnect();
    }
  }
}