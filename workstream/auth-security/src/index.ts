import { App } from './app';
import { createDatabaseConnection } from './config/database';

// Load environment variables
const port = parseInt(process.env['PORT'] || '3000');

async function start() {
  try {
    // Initialize database connection
    const db = createDatabaseConnection();

    // Initialize and start the application
    const app = new App(db);
    app.listen(port);
  } catch (error) {
    console.error('[Startup] ❌ Failed to start auth service:', error);
    process.exit(1);
  }
}

start();