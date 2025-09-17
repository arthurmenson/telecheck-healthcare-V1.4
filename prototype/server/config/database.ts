import { Pool } from 'pg';
import { createClient } from 'redis';
import { database as sqliteDb } from '../utils/database';

// Check if we should use PostgreSQL (when DATABASE_URL is set or in production)
const usePostgreSQL = !!(process.env.DATABASE_URL || (process.env.NODE_ENV === 'production' && process.env.DB_HOST));

// Database configuration for PostgreSQL
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  host: process.env.NODE_ENV === 'test' ? (process.env.TEST_DB_HOST || 'localhost') : (process.env.DB_HOST || 'localhost'),
  port: parseInt(process.env.NODE_ENV === 'test' ? (process.env.TEST_DB_PORT || '5432') : (process.env.DB_PORT || '5432')),
  database: process.env.NODE_ENV === 'test' ? (process.env.TEST_DB_NAME || 'telecheck_test') : (process.env.DB_NAME || 'telecheck'),
  user: process.env.NODE_ENV === 'test' ? (process.env.TEST_DB_USER || 'postgres') : (process.env.DB_USER || 'postgres'),
  password: process.env.NODE_ENV === 'test' ? (process.env.TEST_DB_PASSWORD || 'password') : (process.env.DB_PASSWORD || 'password'),
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Redis configuration
const redisConfig = {
  url: process.env.NODE_ENV === 'test' ? (process.env.TEST_REDIS_URL || 'redis://localhost:6379/1') : (process.env.REDIS_URL || 'redis://localhost:6379'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
};

// Create database pool (only if using PostgreSQL)
export const dbPool = usePostgreSQL ? new Pool(dbConfig) : null;

// Create Redis client (optional)
let redisClient: any = null;
try {
  if (process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
    redisClient = createClient(redisConfig);
  }
} catch (error) {
  console.log('ℹ️  Redis not available, continuing without cache');
}

export { redisClient };

// Initialize connections
export const initializeDatabase = async () => {
  try {
    if (usePostgreSQL && dbPool) {
      // Test PostgreSQL connection
      await dbPool.query('SELECT NOW()');
      console.log('✅ PostgreSQL connected successfully');
    } else {
      // Use SQLite for development
      await sqliteDb.initialize();
      console.log('✅ SQLite database connected successfully');
    }
    
    // Connect to Redis if available
    if (redisClient) {
      try {
        await redisClient.connect();
        console.log('✅ Redis connected successfully');
      } catch (error) {
        console.log('⚠️  Redis connection failed, continuing without cache:', error.message);
        redisClient = null;
      }
    }
  } catch (error) {
    if (usePostgreSQL) {
      console.error('❌ PostgreSQL connection failed:', error);
      console.log('ℹ️  Falling back to SQLite for development...');
      try {
        await sqliteDb.initialize();
        console.log('✅ SQLite fallback connected successfully');
      } catch (sqliteError) {
        console.error('❌ SQLite fallback also failed:', sqliteError);
        throw sqliteError;
      }
    } else {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }
};

// Graceful shutdown
export const closeDatabase = async () => {
  try {
    if (dbPool) {
      await dbPool.end();
    }
    if (redisClient) {
      await redisClient.quit();
    }
    if (sqliteDb) {
      await sqliteDb.close();
    }
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
};

// Health check
export const healthCheck = async () => {
  try {
    if (usePostgreSQL && dbPool) {
      await dbPool.query('SELECT 1');
    } else {
      await sqliteDb.query('SELECT 1');
    }
    
    const redisStatus = redisClient ? 
      await redisClient.ping().then(() => 'connected').catch(() => 'disconnected') : 
      'not_configured';
    
    return { 
      status: 'healthy', 
      database: usePostgreSQL ? 'postgresql' : 'sqlite', 
      redis: redisStatus 
    };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

// Query helper that works with both PostgreSQL and SQLite
export const query = async (text: string, params: any[] = []): Promise<any> => {
  if (usePostgreSQL && dbPool) {
    const result = await dbPool.query(text, params);
    return result.rows;
  } else {
    return await sqliteDb.query(text, params);
  }
};

// Export database type info
export const getDatabaseInfo = () => ({
  type: usePostgreSQL ? 'PostgreSQL' : 'SQLite',
  hasRedis: !!redisClient,
  isProduction: process.env.NODE_ENV === 'production'
});
