import { beforeAll, afterAll, beforeEach } from 'vitest';
import { config } from 'dotenv';

config({ path: '.env.test' });

let testDbConnection: any;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5433/spark_den_test';
});

afterAll(async () => {
  if (testDbConnection) {
    await testDbConnection.end();
  }
});

beforeEach(async () => {

});