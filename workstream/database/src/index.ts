export { DatabaseConnection } from './lib/database';
export { Migrator } from './lib/migrator';
export { PoolMonitor } from './lib/pool-monitor';
export { databaseConfig, type DatabaseConfig } from './lib/config';

export * from './schema/healthcare';

export type {
  QueryResult,
  HealthCheck,
  PoolStats,
  QueryStats,
  Transaction
} from './lib/database';

export type {
  MigrationFile,
  MigrationStatus
} from './lib/migrator';

export type {
  PoolMetrics,
  ConnectionEvent
} from './lib/pool-monitor';