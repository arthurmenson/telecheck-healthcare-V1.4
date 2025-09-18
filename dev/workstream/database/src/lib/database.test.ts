import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseConnection } from './database';
import { databaseConfig } from './config';

describe('DatabaseConnection', () => {
  let db: DatabaseConnection;

  beforeAll(async () => {
    db = new DatabaseConnection(databaseConfig);
  });

  afterAll(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('connection management', () => {
    it('should establish a connection to PostgreSQL', async () => {
      const isConnected = await db.connect();
      expect(isConnected).toBe(true);
    });

    it('should validate connection health', async () => {
      const health = await db.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.latency).toBeTypeOf('number');
      expect(health.latency).toBeLessThan(100);
    });

    it('should handle connection errors gracefully', async () => {
      const invalidConfig = {
        ...databaseConfig,
        DATABASE_URL: 'postgresql://invalid:invalid@localhost:9999/invalid'
      };
      const invalidDb = new DatabaseConnection(invalidConfig);

      await expect(invalidDb.connect()).rejects.toThrow();
    });

    it('should provide connection pool statistics', async () => {
      const stats = await db.getPoolStats();
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('idleConnections');
      expect(stats).toHaveProperty('activeConnections');
      expect(stats.totalConnections).toBeGreaterThanOrEqual(0);
    });
  });

  describe('query execution', () => {
    it('should execute simple queries', async () => {
      const result = await db.query('SELECT 1 as test');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].test).toBe(1);
    });

    it('should handle parameterized queries', async () => {
      const result = await db.query(
        'SELECT $1::text as message, $2::int as number',
        ['hello', 42]
      );
      expect(result.rows[0].message).toBe('hello');
      expect(result.rows[0].number).toBe(42);
    });

    it('should track query performance', async () => {
      const startTime = Date.now();
      await db.query('SELECT pg_sleep(0.01)');
      const stats = await db.getQueryStats();

      expect(stats.totalQueries).toBeGreaterThan(0);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });

    it('should handle query errors appropriately', async () => {
      await expect(db.query('INVALID SQL')).rejects.toThrow();
    });
  });

  describe('transaction management', () => {
    it('should support transactions', async () => {
      const transaction = await db.beginTransaction();
      expect(transaction).toBeDefined();

      await transaction.query('CREATE TEMP TABLE test_tx (id int)');
      await transaction.query('INSERT INTO test_tx VALUES (1)');

      const result = await transaction.query('SELECT * FROM test_tx');
      expect(result.rows).toHaveLength(1);

      await transaction.commit();
    });

    it('should rollback transactions on error', async () => {
      const transaction = await db.beginTransaction();

      try {
        await transaction.query('CREATE TEMP TABLE test_rollback (id int)');
        await transaction.query('INSERT INTO test_rollback VALUES (1)');
        await transaction.query('INVALID SQL');
      } catch (error) {
        await transaction.rollback();
        expect(error).toBeDefined();
      }
    });
  });
});