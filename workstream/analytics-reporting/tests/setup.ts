import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { register } from 'prom-client';

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.PORT = '0'; // Use random port for tests

  console.log('🧪 Test environment initialized');
});

afterAll(async () => {
  // Cleanup after all tests
  console.log('🧪 Test environment cleanup completed');
});

beforeEach(async () => {
  // Clear prometheus metrics registry before each test
  register.clear();
});

afterEach(async () => {
  // Cleanup after each test
  register.clear();
});

// Global test utilities
global.testUtils = {
  generateMockMetrics: () => ({
    responseTime: Math.random() * 500 + 100,
    dataAccuracy: 0.95 + Math.random() * 0.05,
    renderTime: Math.random() * 200 + 50,
    cacheHitRate: 0.8 + Math.random() * 0.2,
    errorRate: Math.random() * 0.02,
    userEngagement: 0.6 + Math.random() * 0.4
  }),

  generateMockFinancialData: () => ({
    revenue: Math.random() * 1000000 + 500000,
    expenses: Math.random() * 800000 + 400000,
    netIncome: 0
  }),

  generateMockPatientData: () => ({
    id: 'patient-123',
    age: Math.floor(Math.random() * 50) + 30,
    conditions: ['diabetes', 'hypertension'],
    admissions_last_year: Math.floor(Math.random() * 3),
    medication_count: Math.floor(Math.random() * 10) + 2,
    social_risk_score: Math.random() * 100,
    functional_score: Math.random() * 100
  })
};

declare global {
  var testUtils: {
    generateMockMetrics: () => any;
    generateMockFinancialData: () => any;
    generateMockPatientData: () => any;
  };
}

export {};