import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@spark-den/database/src/schema/healthcare';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
  max?: number;
}

export function createDatabaseConnection(config?: DatabaseConfig) {
  const dbConfig = config || {
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432'),
    user: process.env['DB_USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || 'password',
    database: process.env['DB_NAME'] || 'spark_den_dev',
    ssl: process.env['DB_SSL'] === 'true',
    max: parseInt(process.env['DB_MAX_CONNECTIONS'] || '10')
  };

  console.log(`[Database] Connecting to PostgreSQL at ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  const client = postgres({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    ssl: dbConfig.ssl,
    max: dbConfig.max,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    onnotice: () => {}, // Suppress notices
    debug: process.env['NODE_ENV'] === 'development'
  });

  const db = drizzle(client, { schema });

  // Test connection
  client`SELECT 1`.then(() => {
    console.log('[Database] ✅ Connection established successfully');
  }).catch((error) => {
    console.error('[Database] ❌ Connection failed:', error);
    process.exit(1);
  });

  return db;
}