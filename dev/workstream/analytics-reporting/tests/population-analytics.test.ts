import { describe, it, expect, beforeEach } from 'vitest';
import { PopulationAnalytics } from '@health/population-analytics';

describe('PopulationAnalytics', () => {
  let analytics: PopulationAnalytics;

  beforeEach(() => {
    analytics = new PopulationAnalytics();
  });

  describe('generatePopulationReport', () => {
    it('should generate comprehensive population health report', async () => {
      const report = await analytics.generatePopulationReport('quarterly');

      expect(report.cohorts.length).toBeGreaterThan(0);
      expect(report.overallMetrics.totalPatients).toBeGreaterThan(0);
      expect(report.overallMetrics.averageQualityScore).toBeGreaterThan(0);
      expect(report.timestamp).toBeInstanceOf(Date);

      // Check cohort structure
      const firstCohort = report.cohorts[0];
      expect(firstCohort.id).toBeDefined();
      expect(firstCohort.name).toBeDefined();
      expect(firstCohort.patientCount).toBeGreaterThan(0);
      expect(firstCohort.demographics).toBeDefined();
      expect(firstCohort.outcomes).toBeInstanceOf(Array);
      expect(typeof firstCohort.qualityScore).toBe('number');
    });

    it('should calculate overall metrics correctly', async () => {
      const report = await analytics.generatePopulationReport('monthly');

      expect(report.overallMetrics.averageQualityScore).toBeGreaterThanOrEqual(0);
      expect(report.overallMetrics.averageQualityScore).toBeLessThanOrEqual(100);
      expect(report.overallMetrics.riskAdjustedMortality).toBeGreaterThan(0);
      expect(report.overallMetrics.readmissionRate).toBeGreaterThan(0);
      expect(report.overallMetrics.patientSatisfaction).toBeGreaterThan(0);
    });

    it('should generate appropriate alerts', async () => {
      const report = await analytics.generatePopulationReport('quarterly');

      if (report.alerts.length > 0) {
        const alert = report.alerts[0];
        expect(alert.type).toMatch(/quality_decline|outcome_deterioration|patient_safety|compliance/);
        expect(alert.severity).toMatch(/low|medium|high|critical/);
        expect(alert.message).toBeDefined();
        expect(alert.affectedCohorts).toBeInstanceOf(Array);
        expect(alert.recommendations).toBeInstanceOf(Array);
      }
    });
  });

  describe('stratifyPatientRisk', () => {
    it('should stratify patient risk correctly', async () => {
      const patientData = {
        age: 65,
        conditions: ['diabetes', 'hypertension'],
        admissions_last_year: 2,
        medication_count: 8,
        social_risk_score: 75,
        functional_score: 60
      };

      const riskStratification = await analytics.stratifyPatientRisk('patient-123', patientData);

      expect(riskStratification.patientId).toBe('patient-123');
      expect(riskStratification.riskScore).toBeGreaterThan(0);
      expect(riskStratification.riskCategory).toMatch(/low|medium|high|very_high/);
      expect(riskStratification.riskFactors.length).toBeGreaterThan(0);
      expect(riskStratification.predictedOutcomes.length).toBeGreaterThan(0);
      expect(riskStratification.interventions.length).toBeGreaterThan(0);
    });

    it('should calculate risk factors correctly', async () => {
      const highRiskPatientData = {
        age: 85,
        conditions: ['diabetes', 'hypertension', 'heart_failure', 'copd'],
        admissions_last_year: 5,
        medication_count: 15,
        social_risk_score: 90,
        functional_score: 30
      };

      const riskStratification = await analytics.stratifyPatientRisk('high-risk-patient', highRiskPatientData);

      expect(riskStratification.riskScore).toBeGreaterThan(0.5);
      expect(riskStratification.riskCategory).toMatch(/high|very_high/);

      const ageRiskFactor = riskStratification.riskFactors.find(rf => rf.factor === 'age');
      expect(ageRiskFactor).toBeDefined();
      expect(ageRiskFactor!.contribution).toBeGreaterThan(0);
    });

    it('should provide appropriate interventions based on risk', async () => {
      const lowRiskPatientData = {
        age: 45,
        conditions: [],
        admissions_last_year: 0,
        medication_count: 2,
        social_risk_score: 20,
        functional_score: 95
      };

      const riskStratification = await analytics.stratifyPatientRisk('low-risk-patient', lowRiskPatientData);

      expect(riskStratification.riskCategory).toBe('low');
      expect(riskStratification.interventions.some(i => i.intervention.includes('Routine'))).toBe(true);
    });
  });

  describe('trackQualityMeasures', () => {
    it('should track quality measures successfully', async () => {
      const measureIds = ['dm-hba1c-control', 'bp-control'];
      const outcomes = await analytics.trackQualityMeasures(measureIds, 'quarterly');

      expect(outcomes.length).toBeGreaterThan(0);

      const firstOutcome = outcomes[0];
      expect(firstOutcome.measureId).toBeDefined();
      expect(firstOutcome.cohortId).toBeDefined();
      expect(typeof firstOutcome.value).toBe('number');
      expect(typeof firstOutcome.numerator).toBe('number');
      expect(typeof firstOutcome.denominator).toBe('number');
      expect(firstOutcome.performance).toMatch(/above_target|at_target|below_target/);
      expect(firstOutcome.trend).toMatch(/improving|stable|declining/);
    });

    it('should handle invalid measure IDs gracefully', async () => {
      const invalidMeasureIds = ['invalid-measure-1', 'invalid-measure-2'];
      const outcomes = await analytics.trackQualityMeasures(invalidMeasureIds, 'monthly');

      // Should not throw error, but may have empty results
      expect(Array.isArray(outcomes)).toBe(true);
    });
  });

  describe('cohort management', () => {
    it('should return default cohorts', () => {
      const cohorts = analytics.getCohorts();

      expect(cohorts.length).toBeGreaterThan(0);
      expect(cohorts.some(c => c.id === 'diabetes-type2')).toBe(true);
      expect(cohorts.some(c => c.id === 'hypertension')).toBe(true);
      expect(cohorts.some(c => c.id === 'heart-failure')).toBe(true);
    });

    it('should add custom cohort', () => {
      const initialCount = analytics.getCohorts().length;

      const customCohort = {
        id: 'custom-cohort',
        name: 'Custom Test Cohort',
        description: 'Test cohort for unit testing',
        criteria: {
          ageMin: 18,
          conditions: ['test-condition']
        },
        patientCount: 100,
        lastUpdated: new Date()
      };

      analytics.addCohort(customCohort);

      const cohorts = analytics.getCohorts();
      expect(cohorts.length).toBe(initialCount + 1);
      expect(cohorts.some(c => c.id === 'custom-cohort')).toBe(true);
    });
  });

  describe('quality measures management', () => {
    it('should return default quality measures', () => {
      const measures = analytics.getQualityMeasures();

      expect(measures.length).toBeGreaterThan(0);
      expect(measures.some(m => m.id === 'dm-hba1c-control')).toBe(true);
      expect(measures.some(m => m.id === 'bp-control')).toBe(true);
      expect(measures.some(m => m.id === 'readmission-rate')).toBe(true);
    });

    it('should add custom quality measure', () => {
      const initialCount = analytics.getQualityMeasures().length;

      const customMeasure = {
        id: 'custom-measure',
        name: 'Custom Test Measure',
        description: 'Test measure for unit testing',
        category: 'clinical' as const,
        measure_type: 'outcome' as const,
        numerator: 'Test numerator',
        denominator: 'Test denominator',
        target: 80,
        benchmark: 85,
        reportingPeriod: 'monthly' as const,
        steward: 'Test Organization'
      };

      analytics.addQualityMeasure(customMeasure);

      const measures = analytics.getQualityMeasures();
      expect(measures.length).toBe(initialCount + 1);
      expect(measures.some(m => m.id === 'custom-measure')).toBe(true);
    });
  });
});