import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { config } from 'dotenv'

// Load test environment variables
config({ path: '.env.test' })

// Global test setup
beforeAll(async () => {
  // Initialize test database
  // Set up test models
  // Configure test logging
  console.log('🧪 Test environment initialized')
})

afterAll(async () => {
  // Cleanup test resources
  console.log('🧪 Test environment cleaned up')
})

beforeEach(async () => {
  // Reset test state before each test
})

afterEach(async () => {
  // Cleanup after each test
})

// Mock external dependencies for testing
global.fetch = vi.fn()

// Extend expect matchers for AI/ML testing
expect.extend({
  toBeWithinAccuracyThreshold(received: number, threshold: number = 0.95) {
    const pass = received >= threshold
    return {
      message: () => `Expected accuracy ${received} to be >= ${threshold}`,
      pass
    }
  },
  toBeWithinPerformanceThreshold(received: number, thresholdMs: number = 30000) {
    const pass = received <= thresholdMs
    return {
      message: () => `Expected performance ${received}ms to be <= ${thresholdMs}ms`,
      pass
    }
  },
  toBeBiasCompliant(received: any, threshold: number = 0.8) {
    const fairnessScore = received.fairnessScore || 0
    const pass = fairnessScore >= threshold
    return {
      message: () => `Expected fairness score ${fairnessScore} to be >= ${threshold}`,
      pass
    }
  }
})

// Type declarations for custom matchers
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeWithinAccuracyThreshold(threshold?: number): T
      toBeWithinPerformanceThreshold(thresholdMs?: number): T
      toBeBiasCompliant(threshold?: number): T
    }
  }
}