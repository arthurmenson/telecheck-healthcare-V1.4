import app from './app';
import { Database } from './database/Database';

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './data/patients.db';

async function startServer(): Promise<void> {
  try {
    // Initialize database
    const db = new Database({ filename: DB_PATH });
    await db.migrate();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Patient Service running on port ${PORT}`);
      console.log(`📊 Database: ${DB_PATH}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`📖 API docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();