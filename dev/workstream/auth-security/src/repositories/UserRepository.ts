import { eq, and, or, like, desc, asc, count, sql, gte, lte } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { users, userSessions, emailVerificationTokens } from '@spark-den/database/src/schema/healthcare';
import { ServiceResult } from '../types/ServiceResult';

export interface CreateUserDto {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isEmailVerified?: boolean;
  lastLoginAt?: Date;
  failedLoginAttempts?: number;
  lockedUntil?: Date;
  isActive?: boolean;
}

export interface UserSearchParams {
  email?: string;
  role?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: keyof typeof users.$inferSelect;
  sortOrder?: 'asc' | 'desc';
}

export interface UserWithDetails extends typeof users.$inferSelect {
  activeSessions: number;
  lastLoginAt: Date | null;
}

export class UserRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  async create(data: CreateUserDto): Promise<ServiceResult<typeof users.$inferSelect>> {
    try {
      const existingUser = await this.findByEmail(data.email);
      if (existingUser.success && existingUser.data) {
        return {
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists',
            details: { email: data.email }
          }
        };
      }

      const [newUser] = await this.db
        .insert(users)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return {
        success: true,
        data: newUser
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create user',
          details: error
        }
      };
    }
  }

  async findById(id: string): Promise<ServiceResult<typeof users.$inferSelect | null>> {
    try {
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      return {
        success: true,
        data: user || null
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve user',
          details: error
        }
      };
    }
  }

  async findByEmail(email: string): Promise<ServiceResult<typeof users.$inferSelect | null>> {
    try {
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      return {
        success: true,
        data: user || null
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve user by email',
          details: error
        }
      };
    }
  }

  async update(id: string, data: UpdateUserDto): Promise<ServiceResult<typeof users.$inferSelect>> {
    try {
      if (data.email) {
        const existingUser = await this.findByEmail(data.email);
        if (existingUser.success && existingUser.data && existingUser.data.id !== id) {
          return {
            success: false,
            error: {
              code: 'EMAIL_EXISTS',
              message: 'Another user with this email already exists',
              details: { email: data.email }
            }
          };
        }
      }

      const [updatedUser] = await this.db
        .update(users)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();

      if (!updatedUser) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            details: { id }
          }
        };
      }

      return {
        success: true,
        data: updatedUser
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update user',
          details: error
        }
      };
    }
  }

  async softDelete(id: string): Promise<ServiceResult<boolean>> {
    try {
      const result = await this.db
        .update(users)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(users.id, id));

      return {
        success: true,
        data: result.rowCount > 0
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to deactivate user',
          details: error
        }
      };
    }
  }

  async search(params: UserSearchParams): Promise<ServiceResult<{
    users: UserWithDetails[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>> {
    try {
      const {
        email,
        role,
        isActive,
        isEmailVerified,
        page = 1,
        pageSize = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = params;

      const offset = (page - 1) * pageSize;

      const conditions = [];

      if (email) {
        conditions.push(like(users.email, `%${email}%`));
      }

      if (role) {
        conditions.push(eq(users.role, role));
      }

      if (isActive !== undefined) {
        conditions.push(eq(users.isActive, isActive));
      }

      if (isEmailVerified !== undefined) {
        conditions.push(eq(users.isEmailVerified, isEmailVerified));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [{ total }] = await this.db
        .select({ total: count() })
        .from(users)
        .where(whereClause);

      const sortColumn = users[sortBy as keyof typeof users] || users.createdAt;
      const orderBy = sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

      const usersResult = await this.db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isEmailVerified: users.isEmailVerified,
          lastLoginAt: users.lastLoginAt,
          failedLoginAttempts: users.failedLoginAttempts,
          lockedUntil: users.lockedUntil,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          activeSessions: sql<number>`COALESCE((
            SELECT COUNT(*)
            FROM ${userSessions}
            WHERE ${userSessions.userId} = ${users.id}
            AND ${userSessions.isActive} = true
            AND ${userSessions.expiresAt} > NOW()
          ), 0)`.as('activeSessions')
        })
        .from(users)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset);

      const totalPages = Math.ceil(total / pageSize);

      return {
        success: true,
        data: {
          users: usersResult.map(user => ({
            ...user,
            passwordHash: '', // Never expose password hash
            activeSessions: Number(user.activeSessions)
          })) as UserWithDetails[],
          total,
          page,
          pageSize,
          totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to search users',
          details: error
        }
      };
    }
  }

  async getStats(): Promise<ServiceResult<{
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    lockedUsers: number;
    usersByRole: { [role: string]: number };
    recentRegistrations: {
      today: number;
      thisWeek: number;
      thisMonth: number;
    };
  }>> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thisWeek = new Date(today);
      thisWeek.setDate(today.getDate() - 7);

      const thisMonth = new Date(today);
      thisMonth.setMonth(today.getMonth() - 1);

      const [{ totalUsers }] = await this.db
        .select({ totalUsers: count() })
        .from(users);

      const [{ activeUsers }] = await this.db
        .select({ activeUsers: count() })
        .from(users)
        .where(eq(users.isActive, true));

      const [{ verifiedUsers }] = await this.db
        .select({ verifiedUsers: count() })
        .from(users)
        .where(and(eq(users.isEmailVerified, true), eq(users.isActive, true)));

      const [{ lockedUsers }] = await this.db
        .select({ lockedUsers: count() })
        .from(users)
        .where(and(sql`${users.lockedUntil} > NOW()`, eq(users.isActive, true)));

      const roleStats = await this.db
        .select({
          role: users.role,
          count: count()
        })
        .from(users)
        .where(eq(users.isActive, true))
        .groupBy(users.role);

      const usersByRole: { [role: string]: number } = {};
      roleStats.forEach(({ role, count }) => {
        usersByRole[role] = count;
      });

      const [{ todayRegistrations }] = await this.db
        .select({ todayRegistrations: count() })
        .from(users)
        .where(gte(users.createdAt, today));

      const [{ weekRegistrations }] = await this.db
        .select({ weekRegistrations: count() })
        .from(users)
        .where(gte(users.createdAt, thisWeek));

      const [{ monthRegistrations }] = await this.db
        .select({ monthRegistrations: count() })
        .from(users)
        .where(gte(users.createdAt, thisMonth));

      return {
        success: true,
        data: {
          totalUsers,
          activeUsers,
          verifiedUsers,
          lockedUsers,
          usersByRole,
          recentRegistrations: {
            today: todayRegistrations,
            thisWeek: weekRegistrations,
            thisMonth: monthRegistrations
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve user statistics',
          details: error
        }
      };
    }
  }

  async createEmailVerificationToken(
    userId: string,
    token: string,
    type: string,
    expiresAt: Date
  ): Promise<ServiceResult<typeof emailVerificationTokens.$inferSelect>> {
    try {
      const [verificationToken] = await this.db
        .insert(emailVerificationTokens)
        .values({
          userId,
          token,
          type,
          expiresAt,
          createdAt: new Date()
        })
        .returning();

      return {
        success: true,
        data: verificationToken
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create verification token',
          details: error
        }
      };
    }
  }

  async findValidToken(
    token: string,
    type: string
  ): Promise<ServiceResult<typeof emailVerificationTokens.$inferSelect | null>> {
    try {
      const [verificationToken] = await this.db
        .select()
        .from(emailVerificationTokens)
        .where(and(
          eq(emailVerificationTokens.token, token),
          eq(emailVerificationTokens.type, type),
          sql`${emailVerificationTokens.expiresAt} > NOW()`,
          sql`${emailVerificationTokens.usedAt} IS NULL`
        ))
        .limit(1);

      return {
        success: true,
        data: verificationToken || null
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to find verification token',
          details: error
        }
      };
    }
  }

  async markTokenAsUsed(tokenId: string): Promise<ServiceResult<boolean>> {
    try {
      const result = await this.db
        .update(emailVerificationTokens)
        .set({
          usedAt: new Date()
        })
        .where(eq(emailVerificationTokens.id, tokenId));

      return {
        success: true,
        data: result.rowCount > 0
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to mark token as used',
          details: error
        }
      };
    }
  }
}