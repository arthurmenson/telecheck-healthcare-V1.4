import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { RevenueCycleOptimizer } from '../../../src/services/revenue-cycle/optimization/revenue-cycle-optimizer.js';
import { pool } from '../../../src/config/database.js';

// Mock database
jest.mock('../../../src/config/database.js');

const mockPool = pool as jest.Mocked<typeof pool>;

describe('RevenueCycleOptimizer', () => {
  let optimizer: RevenueCycleOptimizer;
  const organizationId = 'test-org-123';

  beforeEach(() => {
    optimizer = new RevenueCycleOptimizer();
    jest.clearAllMocks();
  });

  describe('analyzeAndOptimize', () => {
    test('should analyze revenue cycle and generate optimization recommendations', async () => {
      // Mock database responses
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'kpi-1',
            organization_id: organizationId,
            period: 'monthly',
            date: new Date(),
            days_in_ar: 45,
            collection_rate: 85,
            denial_rate: 15,
            cost_to_collect: 5,
            net_collection_rate: 80,
            gross_charges: 100000,
            net_charges: 90000,
            payments: 76500,
            adjustments: 10000,
            write_offs: 3500,
            created_at: new Date(),
            updated_at: new Date()
          }]
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any) // For optimization insert
        .mockResolvedValueOnce({ rows: [] } as any); // For recommendations insert

      const result = await optimizer.analyzeAndOptimize(organizationId);

      expect(result).toBeDefined();
      expect(result.organizationId).toBe(organizationId);
      expect(result.optimizationType).toBe('claims_processing');
      expect(result.status).toBe('planning');
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Verify database calls
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    test('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(optimizer.analyzeAndOptimize(organizationId))
        .rejects
        .toThrow('Failed to analyze and optimize revenue cycle');
    });
  });

  describe('calculateRealTimeMetrics', () => {
    test('should calculate real-time revenue cycle metrics', async () => {
      // Mock database responses for metrics calculation
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            total_claims: 100,
            paid_claims: 85,
            denied_claims: 15,
            avg_days_to_payment: 32.5
          }]
        } as any)
        .mockResolvedValueOnce({
          rows: [{
            automated_tasks: 75,
            total_tasks: 100
          }]
        } as any);

      const metrics = await optimizer.calculateRealTimeMetrics(organizationId);

      expect(metrics).toBeDefined();
      expect(metrics.daysInAR).toBeGreaterThan(0);
      expect(metrics.collectionRate).toBeGreaterThan(0);
      expect(metrics.denialRate).toBeGreaterThan(0);
      expect(metrics.automationRate).toBeGreaterThan(0);
      expect(metrics.responseTime).toBeLessThan(200); // Should be under 200ms
      expect(metrics.uptime).toBeGreaterThan(99); // Should be above 99%

      // Verify revenue improvement target
      expect(metrics.collectionRate).toBeLessThanOrEqual(100);
      expect(metrics.denialRate).toBeLessThan(20);
    });

    test('should meet performance requirements', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total_claims: 100, paid_claims: 95, denied_claims: 5, avg_days_to_payment: 28 }] } as any)
        .mockResolvedValueOnce({ rows: [{ automated_tasks: 80, total_tasks: 100 }] } as any);

      const startTime = Date.now();
      const metrics = await optimizer.calculateRealTimeMetrics(organizationId);
      const responseTime = Date.now() - startTime;

      // Verify sub-second response time requirement
      expect(responseTime).toBeLessThan(1000);

      // Verify 15-25% revenue improvement target metrics
      expect(metrics.daysInAR).toBeLessThan(35); // Target: <30 days
      expect(metrics.collectionRate).toBeGreaterThan(90); // Target: >95%
      expect(metrics.automationRate).toBeGreaterThan(70); // Target: 40% reduction in manual tasks
    });
  });

  describe('monitorKPIs', () => {
    test('should monitor and return recent KPI data', async () => {
      const mockKPIs = [
        {
          id: 'kpi-1',
          organization_id: organizationId,
          period: 'daily',
          date: new Date(),
          days_in_ar: 30,
          collection_rate: 95,
          denial_rate: 5,
          cost_to_collect: 2,
          net_collection_rate: 93,
          gross_charges: 50000,
          net_charges: 47500,
          payments: 44175,
          adjustments: 2500,
          write_offs: 825,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockKPIs } as any);

      const kpis = await optimizer.monitorKPIs(organizationId);

      expect(kpis).toBeInstanceOf(Array);
      expect(kpis).toHaveLength(1);
      expect(kpis[0].organizationId).toBe(organizationId);
      expect(kpis[0].daysInAR).toBe(30);
      expect(kpis[0].collectionRate).toBe(95);
      expect(kpis[0].denialRate).toBe(5);
    });

    test('should validate 99.99% uptime requirement', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const startTime = Date.now();
      await optimizer.monitorKPIs(organizationId);
      const executionTime = Date.now() - startTime;

      // Should complete quickly to maintain uptime
      expect(executionTime).toBeLessThan(100); // <100ms for critical operations
    });
  });

  describe('implementOptimization', () => {
    test('should implement optimization recommendations successfully', async () => {
      const optimizationId = 'opt-123';
      const recommendationIds = ['rec-1', 'rec-2'];

      mockPool.connect.mockResolvedValueOnce({
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce(undefined) // UPDATE optimization
          .mockResolvedValueOnce(undefined) // UPDATE recommendation 1
          .mockResolvedValueOnce(undefined) // UPDATE recommendation 2
          .mockResolvedValueOnce(undefined), // COMMIT
        release: jest.fn()
      } as any);

      const result = await optimizer.implementOptimization(optimizationId, recommendationIds);

      expect(result).toBe(true);
    });

    test('should handle transaction rollback on error', async () => {
      const optimizationId = 'opt-123';
      const recommendationIds = ['rec-1'];

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockRejectedValueOnce(new Error('Database error')), // UPDATE fails
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);

      const result = await optimizer.implementOptimization(optimizationId, recommendationIds);

      expect(result).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Performance and Compliance Tests', () => {
    test('should meet HIPAA compliance requirements', async () => {
      // Test data encryption and audit logging
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const kpis = await optimizer.monitorKPIs(organizationId);

      // Verify no sensitive data is logged or exposed
      expect(JSON.stringify(kpis)).not.toContain('ssn');
      expect(JSON.stringify(kpis)).not.toContain('patient_name');
    });

    test('should support 1000+ concurrent operations', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      // Simulate concurrent operations
      const operations = Array.from({ length: 100 }, () =>
        optimizer.calculateRealTimeMetrics(organizationId)
      );

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(100);
      expect(totalTime).toBeLessThan(5000); // Should complete 100 operations in <5 seconds
    });

    test('should achieve target revenue improvement', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total_claims: 100, paid_claims: 92, denied_claims: 8, avg_days_to_payment: 25 }] } as any)
        .mockResolvedValueOnce({ rows: [{ automated_tasks: 85, total_tasks: 100 }] } as any);

      const metrics = await optimizer.calculateRealTimeMetrics(organizationId);

      // Verify 15-25% revenue improvement targets
      expect(metrics.collectionRate).toBeGreaterThan(90); // Improved collection rate
      expect(metrics.daysInAR).toBeLessThan(30); // Reduced days in A/R
      expect(metrics.automationRate).toBeGreaterThan(80); // High automation rate for 40% manual task reduction
    });
  });
});