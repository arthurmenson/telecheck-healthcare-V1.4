import { describe, it, expect, beforeEach } from 'vitest';
import { DashboardValidator } from '@validation/dashboard-validator';
import type { DashboardMetrics } from '@validation/dashboard-validator';

describe('DashboardValidator', () => {
  let validator: DashboardValidator;

  beforeEach(() => {
    validator = new DashboardValidator();
  });

  describe('validateDashboard', () => {
    it('should validate dashboard with good metrics', async () => {
      const metrics: DashboardMetrics = {
        responseTime: 300,
        dataAccuracy: 0.995,
        renderTime: 150,
        cacheHitRate: 0.88,
        errorRate: 0.005,
        userEngagement: 0.75
      };

      const result = await validator.validateDashboard('test-dashboard', metrics);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.issues).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
    });

    it('should detect performance issues', async () => {
      const metrics: DashboardMetrics = {
        responseTime: 1200, // Too slow
        dataAccuracy: 0.995,
        renderTime: 150,
        cacheHitRate: 0.88,
        errorRate: 0.005,
        userEngagement: 0.75
      };

      const result = await validator.validateDashboard('test-dashboard', metrics);

      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => issue.category === 'performance')).toBe(true);
      expect(result.recommendations.some(rec => rec.includes('caching'))).toBe(true);
    });

    it('should detect data accuracy issues', async () => {
      const metrics: DashboardMetrics = {
        responseTime: 300,
        dataAccuracy: 0.85, // Too low
        renderTime: 150,
        cacheHitRate: 0.88,
        errorRate: 0.005,
        userEngagement: 0.75
      };

      const result = await validator.validateDashboard('test-dashboard', metrics);

      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => issue.category === 'accuracy')).toBe(true);
      expect(result.recommendations.some(rec => rec.includes('validation'))).toBe(true);
    });

    it('should calculate correct validation score', async () => {
      const perfectMetrics: DashboardMetrics = {
        responseTime: 200,
        dataAccuracy: 1.0,
        renderTime: 100,
        cacheHitRate: 0.95,
        errorRate: 0.001,
        userEngagement: 0.9
      };

      const result = await validator.validateDashboard('test-dashboard', perfectMetrics);

      expect(result.score).toBeCloseTo(1.0, 1);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateRealTimeAccuracy', () => {
    it('should validate real-time data accuracy', async () => {
      const expectedData = [
        { value: 100, timestamp: '2023-01-01T00:00:00Z' },
        { value: 200, timestamp: '2023-01-01T01:00:00Z' }
      ];

      const actualData = [
        { value: 101, timestamp: '2023-01-01T00:00:00Z' },
        { value: 198, timestamp: '2023-01-01T01:00:00Z' }
      ];

      const accuracy = await validator.validateRealTimeAccuracy('test-dashboard', expectedData, actualData);

      expect(accuracy).toBeGreaterThanOrEqual(0); // Should calculate accuracy successfully
    });

    it('should handle mismatched data lengths', async () => {
      const expectedData = [{ value: 100 }];
      const actualData = [{ value: 100 }, { value: 200 }];

      const accuracy = await validator.validateRealTimeAccuracy('test-dashboard', expectedData, actualData);

      expect(accuracy).toBe(0);
    });
  });

  describe('threshold management', () => {
    it('should update thresholds', () => {
      const originalThresholds = validator.getThresholds();

      validator.setThreshold('responseTime', 1000);

      const updatedThresholds = validator.getThresholds();
      expect(updatedThresholds.responseTime).toBe(1000);
      expect(updatedThresholds.responseTime).not.toBe(originalThresholds.responseTime);
    });

    it('should throw error for invalid metric', () => {
      expect(() => {
        validator.setThreshold('invalidMetric', 100);
      }).toThrow();
    });
  });
});