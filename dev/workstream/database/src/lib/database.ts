import postgres from 'postgres';
import type { DatabaseConfig } from './config';

export interface QueryResult<T = any> {
  rows: T[];
  command: string;
  rowCount: number;
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  latency: number;
  error?: string;
}

export interface PoolStats {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
}

export interface QueryStats {
  totalQueries: number;
  averageResponseTime: number;
  slowQueries: number;
}

export interface Transaction {
  query: (text: string, params?: any[]) => Promise<QueryResult>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

export class DatabaseConnection {
  private sql: postgres.Sql | null = null;
  private config: DatabaseConfig;
  private queryCount = 0;
  private totalResponseTime = 0;
  private slowQueryCount = 0;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    try {
      this.sql = postgres(this.config.DATABASE_URL, {
        host: this.config.DATABASE_HOST,
        port: this.config.DATABASE_PORT,
        username: this.config.DATABASE_USER,
        password: this.config.DATABASE_PASSWORD,
        database: this.config.DATABASE_NAME,
        max: this.config.DATABASE_POOL_MAX,
        idle_timeout: this.config.DATABASE_POOL_IDLE_TIMEOUT,
        onnotice: (notice) => {
          if (this.config.DATABASE_LOG_LEVEL === 'debug') {
            console.log('Database notice:', notice);
          }
        },
        debug: this.config.DATABASE_LOG_LEVEL === 'debug',
      });

      await this.sql`SELECT 1`;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database connection error';
      throw new Error(`Failed to connect to database: ${message}`);
    }
  }

  async healthCheck(): Promise<HealthCheck> {
    if (!this.sql) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        latency: 0,
        error: 'No database connection'
      };
    }

    const startTime = Date.now();
    try {
      await this.sql`SELECT 1 as health_check`;
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        timestamp: new Date(),
        latency
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        status: 'unhealthy',
        timestamp: new Date(),
        latency,
        error: errorMessage
      };
    }
  }

  async getPoolStats(): Promise<PoolStats> {
    if (!this.sql) {
      return {
        totalConnections: 0,
        idleConnections: 0,
        activeConnections: 0
      };
    }

    try {
      const result = await this.sql`
        SELECT
          count(*) as total,
          count(*) FILTER (WHERE state = 'idle') as idle,
          count(*) FILTER (WHERE state = 'active') as active
        FROM pg_stat_activity
        WHERE datname = ${this.config.DATABASE_NAME}
      `;

      const stats = result[0];
      return {
        totalConnections: parseInt(stats.total as string) || 0,
        idleConnections: parseInt(stats.idle as string) || 0,
        activeConnections: parseInt(stats.active as string) || 0
      };
    } catch (error) {
      throw new Error(`Failed to get pool statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getQueryStats(): Promise<QueryStats> {
    return {
      totalQueries: this.queryCount,
      averageResponseTime: this.queryCount > 0 ? this.totalResponseTime / this.queryCount : 0,
      slowQueries: this.slowQueryCount
    };
  }

  async query<T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
    if (!this.sql) {
      throw new Error('Database not connected');
    }

    const startTime = Date.now();
    try {
      const result = await this.sql.unsafe(text, params);
      const responseTime = Date.now() - startTime;

      this.queryCount++;
      this.totalResponseTime += responseTime;

      if (responseTime > this.config.DATABASE_SLOW_QUERY_THRESHOLD) {
        this.slowQueryCount++;
        if (this.config.DATABASE_LOG_LEVEL === 'warn' || this.config.DATABASE_LOG_LEVEL === 'debug') {
          console.warn(`Slow query detected (${responseTime}ms): ${text}`);
        }
      }

      return {
        rows: Array.isArray(result) ? result : [result],
        command: text.split(' ')[0].toUpperCase(),
        rowCount: Array.isArray(result) ? result.length : 1
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.queryCount++;
      this.totalResponseTime += responseTime;

      const message = error instanceof Error ? error.message : 'Unknown query error';
      throw new Error(`Query failed: ${message}`);
    }
  }

  async beginTransaction(): Promise<Transaction> {
    if (!this.sql) {
      throw new Error('Database not connected');
    }

    const transaction = this.sql.begin();

    return {
      query: async (text: string, params: any[] = []) => {
        const txResult = await transaction.unsafe(text, params);
        return {
          rows: Array.isArray(txResult) ? txResult : [txResult],
          command: text.split(' ')[0].toUpperCase(),
          rowCount: Array.isArray(txResult) ? txResult.length : 1
        };
      },
      commit: async () => {
        await transaction.commit();
      },
      rollback: async () => {
        await transaction.rollback();
      }
    };
  }

  async close(): Promise<void> {
    if (this.sql) {
      await this.sql.end();
      this.sql = null;
    }
  }
}