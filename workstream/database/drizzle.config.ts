import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

config();

export default {
  schema: './src/schema/*.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/spark_den_dev',
  },
  verbose: true,
  strict: true,
  schemaFilter: ['spark_den', 'audit'],
} satisfies Config;