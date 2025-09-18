import { Pool } from 'pg';
import {
  User,
  NewUser,
  EmailVerificationToken,
  NewEmailVerificationToken,
  UserSession,
  NewUserSession
} from '../types/database';

export class DatabaseService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env['DB_HOST'] || 'localhost',
      port: parseInt(process.env['DB_PORT'] || '5432'),
      database: process.env['DB_NAME'] || 'spark_den_dev',
      user: process.env['DB_USER'] || 'postgres',
      password: process.env['DB_PASSWORD'] || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  // User operations
  async createUser(userData: NewUser): Promise<User> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO spark_den.users (email, password_hash, first_name, last_name, role, is_email_verified)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const values = [
        userData.email,
        userData.passwordHash,
        userData.firstName,
        userData.lastName,
        userData.role || 'patient',
        userData.isEmailVerified || false
      ];
      const result = await client.query(query, values);
      return this.mapRowToUser(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM spark_den.users WHERE email = $1 LIMIT 1';
      const result = await client.query(query, [email]);
      return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async getUserById(id: string): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM spark_den.users WHERE id = $1 LIMIT 1';
      const result = await client.query(query, [id]);
      return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (userData.passwordHash !== undefined) {
        updates.push(`password_hash = $${paramCount++}`);
        values.push(userData.passwordHash);
      }
      if (userData.isEmailVerified !== undefined) {
        updates.push(`is_email_verified = $${paramCount++}`);
        values.push(userData.isEmailVerified);
      }
      if (userData.failedLoginAttempts !== undefined) {
        updates.push(`failed_login_attempts = $${paramCount++}`);
        values.push(userData.failedLoginAttempts);
      }
      if (userData.lockedUntil !== undefined) {
        updates.push(`locked_until = $${paramCount++}`);
        values.push(userData.lockedUntil);
      }
      if (userData.lastLoginAt !== undefined) {
        updates.push(`last_login_at = $${paramCount++}`);
        values.push(userData.lastLoginAt);
      }

      if (updates.length === 0) {
        return this.getUserById(id);
      }

      updates.push(`updated_at = $${paramCount++}`);
      values.push(new Date());
      values.push(id);

      const query = `
        UPDATE spark_den.users
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async verifyUserEmail(id: string): Promise<User | null> {
    return this.updateUser(id, { isEmailVerified: true });
  }

  // Email verification token operations
  async createEmailVerificationToken(tokenData: NewEmailVerificationToken): Promise<EmailVerificationToken> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO spark_den.email_verification_tokens (user_id, token, type, expires_at)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const values = [tokenData.userId, tokenData.token, tokenData.type, tokenData.expiresAt];
      const result = await client.query(query, values);
      return this.mapRowToEmailToken(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getValidEmailVerificationToken(token: string, type: string): Promise<EmailVerificationToken | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM spark_den.email_verification_tokens
        WHERE token = $1 AND type = $2 AND expires_at > NOW() AND used_at IS NULL
        LIMIT 1
      `;
      const result = await client.query(query, [token, type]);
      return result.rows[0] ? this.mapRowToEmailToken(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async markTokenAsUsed(id: string): Promise<EmailVerificationToken | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE spark_den.email_verification_tokens
        SET used_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const result = await client.query(query, [id]);
      return result.rows[0] ? this.mapRowToEmailToken(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async deleteExpiredTokens(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const query = 'DELETE FROM spark_den.email_verification_tokens WHERE expires_at < NOW()';
      const result = await client.query(query);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  // Session operations
  async createUserSession(sessionData: NewUserSession): Promise<UserSession> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO spark_den.user_sessions (user_id, session_token, refresh_token, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const values = [
        sessionData.userId,
        sessionData.sessionToken,
        sessionData.refreshToken,
        sessionData.expiresAt,
        sessionData.ipAddress,
        sessionData.userAgent
      ];
      const result = await client.query(query, values);
      return this.mapRowToSession(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getUserSession(sessionToken: string): Promise<UserSession | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM spark_den.user_sessions
        WHERE session_token = $1 AND is_active = true AND expires_at > NOW()
        LIMIT 1
      `;
      const result = await client.query(query, [sessionToken]);
      return result.rows[0] ? this.mapRowToSession(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async invalidateUserSession(sessionToken: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE spark_den.user_sessions
        SET is_active = false, updated_at = NOW()
        WHERE session_token = $1
      `;
      const result = await client.query(query, [sessionToken]);
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async invalidateAllUserSessions(userId: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE spark_den.user_sessions
        SET is_active = false, updated_at = NOW()
        WHERE user_id = $1
      `;
      const result = await client.query(query, [userId]);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  async updateLoginAttempts(userId: string, attempts: number, lockedUntil?: Date): Promise<User | null> {
    return this.updateUser(userId, {
      failedLoginAttempts: attempts,
      lockedUntil: lockedUntil || null,
      lastLoginAt: attempts === 0 ? new Date() : null
    });
  }

  async cleanup(): Promise<void> {
    await this.deleteExpiredTokens();

    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM spark_den.user_sessions WHERE expires_at < NOW()');
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // Helper methods to map database rows to TypeScript objects
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      isEmailVerified: row.is_email_verified,
      lastLoginAt: row.last_login_at,
      failedLoginAttempts: row.failed_login_attempts,
      lockedUntil: row.locked_until,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToEmailToken(row: any): EmailVerificationToken {
    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      type: row.type,
      expiresAt: row.expires_at,
      usedAt: row.used_at,
      createdAt: row.created_at
    };
  }

  private mapRowToSession(row: any): UserSession {
    return {
      id: row.id,
      userId: row.user_id,
      sessionToken: row.session_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}