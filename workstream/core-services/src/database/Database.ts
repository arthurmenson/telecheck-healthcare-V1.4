import sqlite3 from 'sqlite3';
import { promisify } from 'util';

export interface DatabaseConfig {
  filename: string;
  mode?: number;
}

export class Database {
  private db: sqlite3.Database;
  private isReady = false;

  constructor(config: DatabaseConfig) {
    this.db = new sqlite3.Database(
      config.filename,
      config.mode || sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      (err) => {
        if (err) {
          throw new Error(`Failed to connect to database: ${err.message}`);
        }
        this.isReady = true;
      }
    );
  }

  async waitForReady(): Promise<void> {
    return new Promise((resolve) => {
      const checkReady = (): void => {
        if (this.isReady) {
          resolve();
        } else {
          setTimeout(checkReady, 10);
        }
      };
      checkReady();
    });
  }

  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!this.isReady) {
      throw new Error('Database not ready');
    }

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  async run(sql: string, params: unknown[] = []): Promise<{ lastID: number; changes: number }> {
    if (!this.isReady) {
      throw new Error('Database not ready');
    }

    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            lastID: this.lastID || 0,
            changes: this.changes || 0
          });
        }
      });
    });
  }

  async get<T = unknown>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    if (!this.isReady) {
      throw new Error('Database not ready');
    }

    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T | undefined);
        }
      });
    });
  }

  async close(): Promise<void> {
    if (!this.isReady) return;

    const close = promisify(this.db.close.bind(this.db));
    await close();
    this.isReady = false;
  }

  async migrate(): Promise<void> {
    const migrations = [
      `CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        identifier TEXT UNIQUE NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        dateOfBirth TEXT NOT NULL,
        gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other', 'unknown')),
        email TEXT,
        phone TEXT,
        address_street TEXT,
        address_city TEXT,
        address_state TEXT,
        address_zipCode TEXT,
        address_country TEXT DEFAULT 'US',
        emergencyContact_name TEXT,
        emergencyContact_relationship TEXT,
        emergencyContact_phone TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_patients_identifier ON patients(identifier)`,
      `CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(createdAt)`
    ];

    for (const migration of migrations) {
      await this.run(migration);
    }
  }
}