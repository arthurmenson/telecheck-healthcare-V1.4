import { eq, and, gte, lt } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { userSessions } from '@spark-den/database/src/schema/healthcare';
import { ServiceResult } from '../types/ServiceResult';

export interface CreateSessionDto {
  userId: string;
  sessionToken: string;
  refreshToken: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface UpdateSessionDto {
  expiresAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  isActive?: boolean;
}

export class SessionRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  async create(data: CreateSessionDto): Promise<ServiceResult<typeof userSessions.$inferSelect>> {
    try {
      const [session] = await this.db
        .insert(userSessions)
        .values({
          ...data,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return {
        success: true,
        data: session
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create session',
          details: error
        }
      };
    }
  }

  async findBySessionToken(
    sessionToken: string
  ): Promise<ServiceResult<typeof userSessions.$inferSelect | null>> {
    try {
      const [session] = await this.db
        .select()
        .from(userSessions)
        .where(and(
          eq(userSessions.sessionToken, sessionToken),
          eq(userSessions.isActive, true),
          gte(userSessions.expiresAt, new Date())
        ))
        .limit(1);

      return {
        success: true,
        data: session || null
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to find session by token',
          details: error
        }
      };
    }
  }

  async findByRefreshToken(
    refreshToken: string
  ): Promise<ServiceResult<typeof userSessions.$inferSelect | null>> {
    try {
      const [session] = await this.db
        .select()
        .from(userSessions)
        .where(and(
          eq(userSessions.refreshToken, refreshToken),
          eq(userSessions.isActive, true),
          gte(userSessions.expiresAt, new Date())
        ))
        .limit(1);

      return {
        success: true,
        data: session || null
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to find session by refresh token',
          details: error
        }
      };
    }
  }

  async update(
    sessionId: string,
    data: UpdateSessionDto
  ): Promise<ServiceResult<typeof userSessions.$inferSelect>> {
    try {
      const [updatedSession] = await this.db
        .update(userSessions)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(userSessions.id, sessionId))
        .returning();

      if (!updatedSession) {
        return {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found',
            details: { sessionId }
          }
        };
      }

      return {
        success: true,
        data: updatedSession
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update session',
          details: error
        }
      };
    }
  }

  async invalidate(sessionId: string): Promise<ServiceResult<boolean>> {
    try {
      const result = await this.db
        .update(userSessions)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(userSessions.id, sessionId));

      return {
        success: true,
        data: result.rowCount > 0
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to invalidate session',
          details: error
        }
      };
    }
  }

  async invalidateByRefreshToken(refreshToken: string): Promise<ServiceResult<boolean>> {
    try {
      const result = await this.db
        .update(userSessions)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(userSessions.refreshToken, refreshToken));

      return {
        success: true,
        data: result.rowCount > 0
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to invalidate session by refresh token',
          details: error
        }
      };
    }
  }

  async invalidateAllUserSessions(userId: string): Promise<ServiceResult<boolean>> {
    try {
      const result = await this.db
        .update(userSessions)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(and(
          eq(userSessions.userId, userId),
          eq(userSessions.isActive, true)
        ));

      return {
        success: true,
        data: result.rowCount > 0
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to invalidate all user sessions',
          details: error
        }
      };
    }
  }

  async cleanupExpiredSessions(): Promise<ServiceResult<number>> {
    try {
      const result = await this.db
        .update(userSessions)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(and(
          eq(userSessions.isActive, true),
          lt(userSessions.expiresAt, new Date())
        ));

      return {
        success: true,
        data: result.rowCount
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to cleanup expired sessions',
          details: error
        }
      };
    }
  }

  async getUserActiveSessions(userId: string): Promise<ServiceResult<typeof userSessions.$inferSelect[]>> {
    try {
      const sessions = await this.db
        .select()
        .from(userSessions)
        .where(and(
          eq(userSessions.userId, userId),
          eq(userSessions.isActive, true),
          gte(userSessions.expiresAt, new Date())
        ))
        .orderBy(userSessions.createdAt);

      return {
        success: true,
        data: sessions
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to get user active sessions',
          details: error
        }
      };
    }
  }
}