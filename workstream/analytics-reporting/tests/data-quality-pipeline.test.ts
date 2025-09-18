import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DataQualityPipeline } from '@data-quality/pipeline';
import { z } from 'zod';

describe('DataQualityPipeline', () => {
  let pipeline: DataQualityPipeline;

  beforeEach(async () => {
    pipeline = new DataQualityPipeline();
    await pipeline.initialize();
  });

  afterEach(async () => {
    await pipeline.shutdown();
  });

  describe('validateDataset', () => {
    it('should validate clean dataset successfully', async () => {
      const cleanData = [
        { id: 1, timestamp: new Date().toISOString(), value: 100, email: 'test@example.com' },
        { id: 2, timestamp: new Date().toISOString(), value: 200, email: 'user@test.com' },
        { id: 3, timestamp: new Date().toISOString(), value: 150, email: 'admin@company.com' }
      ];

      const report = await pipeline.validateDataset('clean-pipeline', cleanData);

      expect(report.overall.score).toBeGreaterThan(0.9);
      expect(report.overall.status).toBe('excellent');
      expect(report.overall.totalRecords).toBe(3);
      expect(report.overall.failedRules).toBe(0);
    });

    it('should detect data quality issues', async () => {
      const dirtyData = [
        { id: 1, timestamp: new Date().toISOString(), value: 100, email: 'test@example.com' },
        { id: 2, timestamp: null, value: -50, email: 'invalid-email' }, // Multiple issues
        { id: null, timestamp: new Date().toISOString(), value: 999999, email: 'test@test.com' } // Missing ID, high value
      ];

      const report = await pipeline.validateDataset('dirty-pipeline', dirtyData);

      expect(report.overall.score).toBeLessThan(0.9);
      expect(report.overall.failedRules).toBeGreaterThan(0);
      expect(report.results.some(r => r.status === 'failed')).toBe(true);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate dimension scores correctly', async () => {
      const testData = [
        { id: 1, timestamp: new Date().toISOString(), value: 100, email: 'test@example.com' },
        { id: 2, timestamp: new Date().toISOString(), value: 200, email: 'user@test.com' }
      ];

      const report = await pipeline.validateDataset('dimension-test', testData);

      expect(report.dimensions.completeness).toBeGreaterThan(0);
      expect(report.dimensions.accuracy).toBeGreaterThan(0);
      expect(report.dimensions.validity).toBeGreaterThan(0);
      expect(typeof report.dimensions.uniqueness).toBe('number');
      expect(typeof report.dimensions.timeliness).toBe('number');
    });

    it('should validate with schema', async () => {
      const schema = z.object({
        id: z.number().positive(),
        timestamp: z.string(),
        value: z.number().min(0).max(1000),
        email: z.string().email()
      });

      const validData = [
        { id: 1, timestamp: new Date().toISOString(), value: 100, email: 'test@example.com' }
      ];

      const report = await pipeline.validateDataset('schema-test', validData, schema);
      expect(report.overall.status).toMatch(/excellent|good/);

      const invalidData = [
        { id: -1, timestamp: 'invalid-date', value: 2000, email: 'not-an-email' }
      ];

      await expect(pipeline.validateDataset('schema-fail-test', invalidData, schema)).rejects.toThrow();
    });
  });

  describe('validateRealTimeData', () => {
    it('should validate real-time record', async () => {
      const validRecord = {
        id: 1,
        timestamp: new Date().toISOString(),
        value: 100,
        email: 'test@example.com'
      };

      const result = await pipeline.validateRealTimeData('stream-1', validRecord);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect real-time validation violations', async () => {
      const invalidRecord = {
        id: null,
        timestamp: null,
        value: -100,
        email: 'invalid-email'
      };

      const result = await pipeline.validateRealTimeData('stream-1', invalidRecord);

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('rule management', () => {
    it('should add custom rule', () => {
      const customRule = {
        id: 'custom-test-rule',
        name: 'Custom Test Rule',
        description: 'Test custom rule',
        type: 'completeness' as const,
        severity: 'medium' as const,
        condition: (record: any) => record.customField !== undefined,
        threshold: 0.9,
        enabled: true
      };

      pipeline.addRule(customRule);

      const rules = pipeline.getRules();
      expect(rules.some(r => r.id === 'custom-test-rule')).toBe(true);
    });

    it('should remove rule', () => {
      const initialCount = pipeline.getRules().length;

      pipeline.addRule({
        id: 'temp-rule',
        name: 'Temporary Rule',
        description: 'Test rule to be removed',
        type: 'validity',
        severity: 'low',
        condition: () => true,
        threshold: 1.0,
        enabled: true
      });

      expect(pipeline.getRules().length).toBe(initialCount + 1);

      pipeline.removeRule('temp-rule');
      expect(pipeline.getRules().length).toBe(initialCount);
    });
  });

  describe('governance policies', () => {
    it('should have default policies', () => {
      const policies = pipeline.getPolicies();

      expect(policies.length).toBeGreaterThan(0);
      expect(policies.some(p => p.compliance === 'HIPAA')).toBe(true);
      expect(policies.some(p => p.compliance === 'SOX')).toBe(true);
    });

    it('should add custom policy', () => {
      const customPolicy = {
        id: 'custom-policy',
        name: 'Custom Data Policy',
        description: 'Test custom policy',
        dataTypes: ['test'],
        rules: ['test-rule'],
        owner: 'Test Owner',
        approver: 'Test Approver',
        compliance: 'Internal' as const,
        retentionPeriod: 365,
        accessLevel: 'internal' as const,
        lastReviewed: new Date(),
        nextReview: new Date()
      };

      pipeline.addPolicy(customPolicy);

      const policies = pipeline.getPolicies();
      expect(policies.some(p => p.id === 'custom-policy')).toBe(true);
    });
  });
});