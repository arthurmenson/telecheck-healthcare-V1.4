import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { DatabaseConfig } from './config';

export interface MigrationFile {
  id: string;
  name: string;
  timestamp: number;
  up: string;
  down: string;
  path: string;
}

export interface MigrationStatus {
  id: string;
  name: string;
  appliedAt: Date;
  checksum: string;
}

export class Migrator {
  private sql: postgres.Sql;
  private db: ReturnType<typeof drizzle>;
  private config: DatabaseConfig;
  private migrationsPath: string;

  constructor(config: DatabaseConfig, migrationsPath = './src/migrations') {
    this.config = config;
    this.migrationsPath = migrationsPath;
    this.sql = postgres(config.DATABASE_URL);
    this.db = drizzle(this.sql);
  }

  async init(): Promise<void> {
    await this.sql`
      CREATE SCHEMA IF NOT EXISTS migration_system;
    `;

    await this.sql`
      CREATE TABLE IF NOT EXISTS migration_system.migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL,
        up_sql TEXT NOT NULL,
        down_sql TEXT NOT NULL
      );
    `;

    await this.sql`
      CREATE INDEX IF NOT EXISTS migrations_applied_at_idx
      ON migration_system.migrations(applied_at);
    `;
  }

  async loadMigrationFiles(): Promise<MigrationFile[]> {
    try {
      const files = await readdir(this.migrationsPath);
      const migrationFiles: MigrationFile[] = [];

      for (const file of files) {
        if (!file.endsWith('.sql')) continue;

        const filePath = join(this.migrationsPath, file);
        const content = await readFile(filePath, 'utf-8');

        const [upSection, downSection] = content.split('-- ROLLBACK --');

        if (!upSection || !downSection) {
          throw new Error(`Invalid migration file format: ${file}. Must contain '-- ROLLBACK --' separator.`);
        }

        const parts = file.replace('.sql', '').split('_');
        const timestamp = parseInt(parts[0]);
        const name = parts.slice(1).join('_');

        migrationFiles.push({
          id: file.replace('.sql', ''),
          name,
          timestamp,
          up: upSection.trim(),
          down: downSection.trim(),
          path: filePath
        });
      }

      return migrationFiles.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      throw new Error(`Failed to load migration files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAppliedMigrations(): Promise<MigrationStatus[]> {
    const result = await this.sql`
      SELECT id, name, applied_at, checksum
      FROM migration_system.migrations
      ORDER BY applied_at ASC
    `;

    return result.map(row => ({
      id: row.id as string,
      name: row.name as string,
      appliedAt: new Date(row.applied_at as string),
      checksum: row.checksum as string
    }));
  }

  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async up(targetMigration?: string): Promise<string[]> {
    await this.init();

    const migrationFiles = await this.loadMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedIds = new Set(appliedMigrations.map(m => m.id));

    const migrationsToApply = migrationFiles.filter(file => {
      if (appliedIds.has(file.id)) {
        return false;
      }
      if (targetMigration) {
        return file.timestamp <= parseInt(targetMigration);
      }
      return true;
    });

    const appliedMigrationIds: string[] = [];

    for (const migration of migrationsToApply) {
      try {
        await this.sql.begin(async sql => {
          console.log(`Applying migration: ${migration.id}`);

          await sql.unsafe(migration.up);

          const checksum = this.calculateChecksum(migration.up);
          await sql`
            INSERT INTO migration_system.migrations (id, name, checksum, up_sql, down_sql)
            VALUES (${migration.id}, ${migration.name}, ${checksum}, ${migration.up}, ${migration.down})
          `;

          appliedMigrationIds.push(migration.id);
          console.log(`✓ Applied migration: ${migration.id}`);
        });
      } catch (error) {
        console.error(`✗ Failed to apply migration ${migration.id}:`, error);
        throw new Error(`Migration failed: ${migration.id}. ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return appliedMigrationIds;
  }

  async down(targetMigration?: string): Promise<string[]> {
    await this.init();

    const appliedMigrations = await this.getAppliedMigrations();

    let migrationsToRollback = appliedMigrations.reverse();

    if (targetMigration) {
      const targetTimestamp = parseInt(targetMigration);
      migrationsToRollback = migrationsToRollback.filter(m => {
        const migrationTimestamp = parseInt(m.id.split('_')[0]);
        return migrationTimestamp > targetTimestamp;
      });
    } else {
      migrationsToRollback = migrationsToRollback.slice(0, 1);
    }

    const rolledBackMigrationIds: string[] = [];

    for (const migration of migrationsToRollback) {
      try {
        await this.sql.begin(async sql => {
          console.log(`Rolling back migration: ${migration.id}`);

          const migrationRecord = await sql`
            SELECT down_sql FROM migration_system.migrations WHERE id = ${migration.id}
          `;

          if (migrationRecord.length === 0) {
            throw new Error(`Migration record not found: ${migration.id}`);
          }

          const downSql = migrationRecord[0].down_sql as string;
          await sql.unsafe(downSql);

          await sql`
            DELETE FROM migration_system.migrations WHERE id = ${migration.id}
          `;

          rolledBackMigrationIds.push(migration.id);
          console.log(`✓ Rolled back migration: ${migration.id}`);
        });
      } catch (error) {
        console.error(`✗ Failed to rollback migration ${migration.id}:`, error);
        throw new Error(`Rollback failed: ${migration.id}. ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return rolledBackMigrationIds;
  }

  async status(): Promise<{ applied: MigrationStatus[]; pending: MigrationFile[] }> {
    await this.init();

    const migrationFiles = await this.loadMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedIds = new Set(appliedMigrations.map(m => m.id));

    const pendingMigrations = migrationFiles.filter(file => !appliedIds.has(file.id));

    return {
      applied: appliedMigrations,
      pending: pendingMigrations
    };
  }

  async close(): Promise<void> {
    await this.sql.end();
  }
}