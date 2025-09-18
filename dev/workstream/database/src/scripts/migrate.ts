#!/usr/bin/env tsx

import { Migrator } from '../lib/migrator';
import { databaseConfig } from '../lib/config';

async function main() {
  const command = process.argv[2];
  const target = process.argv[3];

  const migrator = new Migrator(databaseConfig);

  try {
    switch (command) {
      case 'up':
        console.log('Running migrations...');
        const appliedMigrations = await migrator.up(target);
        if (appliedMigrations.length === 0) {
          console.log('No pending migrations to apply.');
        } else {
          console.log(`Applied ${appliedMigrations.length} migration(s):`);
          appliedMigrations.forEach(id => console.log(`  - ${id}`));
        }
        break;

      case 'down':
        console.log('Rolling back migrations...');
        const rolledBackMigrations = await migrator.down(target);
        if (rolledBackMigrations.length === 0) {
          console.log('No migrations to rollback.');
        } else {
          console.log(`Rolled back ${rolledBackMigrations.length} migration(s):`);
          rolledBackMigrations.forEach(id => console.log(`  - ${id}`));
        }
        break;

      case 'status':
        console.log('Migration status:');
        const status = await migrator.status();

        console.log(`\nApplied migrations (${status.applied.length}):`);
        status.applied.forEach(migration => {
          console.log(`  ✓ ${migration.id} (${migration.appliedAt.toISOString()})`);
        });

        console.log(`\nPending migrations (${status.pending.length}):`);
        status.pending.forEach(migration => {
          console.log(`  - ${migration.id}`);
        });
        break;

      default:
        console.log('Usage: tsx src/scripts/migrate.ts <command> [target]');
        console.log('');
        console.log('Commands:');
        console.log('  up [target]    - Apply migrations up to target (or all if no target)');
        console.log('  down [target]  - Rollback migrations down to target (or one if no target)');
        console.log('  status         - Show migration status');
        console.log('');
        console.log('Examples:');
        console.log('  tsx src/scripts/migrate.ts up');
        console.log('  tsx src/scripts/migrate.ts up 001');
        console.log('  tsx src/scripts/migrate.ts down');
        console.log('  tsx src/scripts/migrate.ts down 001');
        console.log('  tsx src/scripts/migrate.ts status');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await migrator.close();
  }
}

main();