import { z } from 'zod';
import { config } from 'dotenv';

config();

const databaseConfigSchema = z.object({
  DATABASE_URL: z.string(),
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_USER: z.string().default('postgres'),
  DATABASE_PASSWORD: z.string(),
  DATABASE_NAME: z.string().default('spark_den_dev'),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),
  DATABASE_POOL_IDLE_TIMEOUT: z.coerce.number().default(10000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  DATABASE_SLOW_QUERY_THRESHOLD: z.coerce.number().default(100),
});

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

export const databaseConfig = databaseConfigSchema.parse(process.env);

export const isDevelopment = databaseConfig.NODE_ENV === 'development';
export const isTest = databaseConfig.NODE_ENV === 'test';
export const isProduction = databaseConfig.NODE_ENV === 'production';