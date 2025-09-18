import { describe, it, expect, beforeEach } from 'vitest';
import { RevenueTracker } from '@financial/revenue-tracker';

describe('RevenueTracker', () => {
  let tracker: RevenueTracker;

  beforeEach(() => {
    tracker = new RevenueTracker();
  });

  describe('generateFinancialReport', () => {
    it('should generate comprehensive financial report', async () => {
      const report = await tracker.generateFinancialReport('monthly');

      expect(report.period).toBe('monthly');
      expect(report.summary.totalRevenue).toBeGreaterThan(0);
      expect(report.summary.totalExpenses).toBeGreaterThan(0);
      expect(report.summary.netIncome).toBeDefined();
      expect(report.summary.operatingMargin).toBeDefined();
      expect(report.departmentAnalysis.length).toBeGreaterThan(0);
      expect(report.revenueStreams.length).toBeGreaterThan(0);
      expect(report.keyMetrics.length).toBeGreaterThan(0);
      expect(report.forecast.length).toBeGreaterThan(0);
      expect(report.timestamp).toBeInstanceOf(Date);
    });

    it('should calculate financial ratios correctly', async () => {
      const report = await tracker.generateFinancialReport('quarterly');

      // Operating margin should be between -100% and 100%
      expect(report.summary.operatingMargin).toBeGreaterThan(-100);
      expect(report.summary.operatingMargin).toBeLessThan(100);

      // Net income should be revenue minus expenses
      const calculatedNetIncome = report.summary.totalRevenue - report.summary.totalExpenses;
      expect(Math.abs(report.summary.netIncome - calculatedNetIncome)).toBeLessThan(1);
    });

    it('should include department analysis', async () => {
      const report = await tracker.generateFinancialReport('monthly');

      expect(report.departmentAnalysis.length).toBeGreaterThan(0);

      const firstDept = report.departmentAnalysis[0];
      expect(firstDept.department).toBeDefined();
      expect(firstDept.revenue.gross).toBeGreaterThan(0);
      expect(firstDept.revenue.net).toBeGreaterThan(0);
      expect(firstDept.costs.direct).toBeGreaterThan(0);
      expect(firstDept.profitability.grossMargin).toBeDefined();
      expect(firstDept.profitability.netMargin).toBeDefined();
      expect(firstDept.volume.encounters).toBeGreaterThan(0);
      expect(firstDept.kpis.costPerEncounter).toBeGreaterThan(0);
    });

    it('should generate financial alerts for issues', async () => {
      const report = await tracker.generateFinancialReport('monthly');

      // Check if alerts are properly structured when they exist
      report.alerts.forEach(alert => {
        expect(alert.type).toMatch(/revenue_decline|cost_overrun|margin_compression|cash_flow|compliance/);
        expect(alert.severity).toMatch(/low|medium|high|critical/);
        expect(alert.message).toBeDefined();
        expect(alert.affectedDepartments).toBeInstanceOf(Array);
        expect(typeof alert.impact).toBe('number');
        expect(alert.recommendations).toBeInstanceOf(Array);
      });
    });
  });

  describe('trackRevenueStream', () => {
    it('should track revenue stream profitability', async () => {
      const analysis = await tracker.trackRevenueStream('emergency-services', 'monthly');

      expect(analysis.revenueStreamId).toBe('emergency-services');
      expect(analysis.department).toBeDefined();
      expect(analysis.revenue.gross).toBeGreaterThan(0);
      expect(analysis.revenue.net).toBeGreaterThan(0);
      expect(analysis.costs.direct).toBeGreaterThan(0);
      expect(analysis.profitability.grossMargin).toBeDefined();
      expect(analysis.profitability.netMargin).toBeDefined();
      expect(analysis.profitability.roi).toBeDefined();
      expect(analysis.volume.encounters).toBeGreaterThan(0);
      expect(analysis.kpis.costPerEncounter).toBeGreaterThan(0);
      expect(analysis.period).toBe('monthly');
    });

    it('should handle invalid revenue stream ID', async () => {
      await expect(tracker.trackRevenueStream('invalid-stream', 'monthly')).rejects.toThrow();
    });

    it('should calculate KPIs correctly', async () => {
      const analysis = await tracker.trackRevenueStream('surgical-services', 'quarterly');

      expect(analysis.kpis.badDebtRate).toBeGreaterThanOrEqual(0);
      expect(analysis.kpis.badDebtRate).toBeLessThanOrEqual(100);
      expect(analysis.kpis.collectionRate).toBeGreaterThanOrEqual(0);
      expect(analysis.kpis.collectionRate).toBeLessThanOrEqual(100);
      expect(analysis.kpis.daysInAr).toBeGreaterThan(0);
      expect(analysis.kpis.revenuePerFte).toBeGreaterThan(0);
    });
  });

  describe('calculateROI', () => {
    it('should calculate ROI metrics', async () => {
      const roiAnalysis = await tracker.calculateROI(500000, 'Emergency', 'annual');

      expect(typeof roiAnalysis.roi).toBe('number');
      expect(roiAnalysis.paybackPeriod).toBeGreaterThan(0);
      expect(typeof roiAnalysis.npv).toBe('number');
      expect(typeof roiAnalysis.irr).toBe('number');
      expect(roiAnalysis.breakEvenPoint).toBeGreaterThan(0);
      expect(typeof roiAnalysis.riskAdjustedReturn).toBe('number');
    });

    it('should calculate different scenarios', async () => {
      const lowInvestment = await tracker.calculateROI(100000, 'Surgery', 'annual');
      const highInvestment = await tracker.calculateROI(1000000, 'Surgery', 'annual');

      // Higher investments should generally have longer payback periods
      expect(highInvestment.paybackPeriod).toBeGreaterThanOrEqual(lowInvestment.paybackPeriod);
    });

    it('should apply risk adjustment', async () => {
      const roiAnalysis = await tracker.calculateROI(250000, 'Cardiology', 'annual');

      // Risk-adjusted return should be lower than raw ROI
      expect(roiAnalysis.riskAdjustedReturn).toBeLessThanOrEqual(roiAnalysis.roi);
    });
  });

  describe('revenue stream management', () => {
    it('should return default revenue streams', () => {
      const streams = tracker.getRevenueStreams();

      expect(streams.length).toBeGreaterThan(0);
      expect(streams.some(s => s.id === 'emergency-services')).toBe(true);
      expect(streams.some(s => s.id === 'surgical-services')).toBe(true);
      expect(streams.some(s => s.id === 'pharmacy-services')).toBe(true);
      expect(streams.some(s => s.id === 'diagnostic-imaging')).toBe(true);
    });

    it('should add custom revenue stream', () => {
      const initialCount = tracker.getRevenueStreams().length;

      const customStream = {
        id: 'custom-stream',
        name: 'Custom Revenue Stream',
        category: 'clinical_services' as const,
        department: 'Test Department',
        serviceLines: ['Test Service'],
        payerTypes: ['commercial' as const],
        isRecurring: true,
        riskLevel: 'medium' as const
      };

      tracker.addRevenueStream(customStream);

      const streams = tracker.getRevenueStreams();
      expect(streams.length).toBe(initialCount + 1);
      expect(streams.some(s => s.id === 'custom-stream')).toBe(true);
    });
  });

  describe('financial metrics', () => {
    it('should return financial metrics', () => {
      const metrics = tracker.getFinancialMetrics();

      expect(Array.isArray(metrics)).toBe(true);
      // Metrics might be empty initially, so we just check structure
    });

    it('should filter metrics by department', () => {
      const departmentMetrics = tracker.getFinancialMetrics('Emergency');

      expect(Array.isArray(departmentMetrics)).toBe(true);
      // If metrics exist, they should be for the specified department
      departmentMetrics.forEach(metric => {
        expect(metric.department).toBe('Emergency');
      });
    });
  });
});