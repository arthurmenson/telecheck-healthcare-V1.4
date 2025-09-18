import { describe, it, expect, beforeEach } from '@jest/globals';
import { LabService } from './LabService';
import type { CreateLabTestResult } from '../types/Laboratory';

describe('LabService', () => {
  let labService: LabService;

  beforeEach(() => {
    labService = new LabService();
  });

  describe('createLabResult', () => {
    it('should create a new lab result with valid data', async () => {
      const labData: CreateLabTestResult = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        testType: 'complete_blood_count',
        testCode: 'CBC',
        testName: 'Complete Blood Count',
        results: [
          {
            parameter: 'WBC',
            value: 7.5,
            unit: 'K/uL',
            referenceRange: '4.5-11.0',
            status: 'normal'
          },
          {
            parameter: 'RBC',
            value: 4.8,
            unit: 'M/uL',
            referenceRange: '4.2-5.4',
            status: 'normal'
          }
        ],
        orderedBy: 'Dr. Smith',
        orderedDate: '2025-09-15T08:00:00.000Z',
        status: 'completed',
        priority: 'routine'
      };

      const result = await labService.createLabResult(labData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.testCode).toBe('CBC');
        expect(result.data.testName).toBe('Complete Blood Count');
        expect(result.data.results).toHaveLength(2);
        expect(result.data.id).toBeDefined();
        expect(result.data.createdAt).toBeDefined();
        expect(result.data.updatedAt).toBeDefined();
      }
    });

    it('should return error for invalid lab result data', async () => {
      const invalidData = {
        patientId: 'invalid-uuid',
        testType: 'invalid-test-type',
        testCode: '',
        testName: '',
        results: [],
        orderedBy: '',
        orderedDate: 'invalid-date',
        status: 'invalid-status'
      } as unknown as CreateLabTestResult;

      const result = await labService.createLabResult(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should automatically generate AI analysis for abnormal results', async () => {
      const labData: CreateLabTestResult = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        testType: 'lipid_panel',
        testCode: 'LIPID',
        testName: 'Lipid Panel',
        results: [
          {
            parameter: 'Total Cholesterol',
            value: 280,
            unit: 'mg/dL',
            referenceRange: '<200',
            status: 'high'
          },
          {
            parameter: 'LDL Cholesterol',
            value: 180,
            unit: 'mg/dL',
            referenceRange: '<100',
            status: 'high'
          }
        ],
        orderedBy: 'Dr. Johnson',
        orderedDate: '2025-09-15T08:00:00.000Z',
        status: 'completed'
      };

      const result = await labService.createLabResult(labData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aiAnalysis).toBeDefined();
        expect(result.data.aiAnalysis?.riskLevel).toBe('moderate');
        expect(result.data.aiAnalysis?.findings).toContain('Elevated cholesterol levels detected');
        expect(result.data.aiAnalysis?.followUpRequired).toBe(true);
      }
    });
  });

  describe('getLabResult', () => {
    it('should return lab result by ID', async () => {
      const labData: CreateLabTestResult = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        testType: 'complete_blood_count',
        testCode: 'CBC',
        testName: 'Complete Blood Count',
        results: [],
        orderedBy: 'Dr. Smith',
        orderedDate: '2025-09-15T08:00:00.000Z',
        status: 'completed'
      };

      const createResult = await labService.createLabResult(labData);
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const getResult = await labService.getLabResult(createResult.data.id);

        expect(getResult.success).toBe(true);
        if (getResult.success) {
          expect(getResult.data.id).toBe(createResult.data.id);
          expect(getResult.data.testCode).toBe('CBC');
        }
      }
    });

    it('should return error for non-existent lab result', async () => {
      const result = await labService.getLabResult('non-existent-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('LAB_RESULT_NOT_FOUND');
      }
    });
  });

  describe('getPatientLabResults', () => {
    it('should return all lab results for a patient', async () => {
      const patientId = '550e8400-e29b-41d4-a716-446655440000';

      const labData1: CreateLabTestResult = {
        patientId,
        testType: 'complete_blood_count',
        testCode: 'CBC',
        testName: 'Complete Blood Count',
        results: [],
        orderedBy: 'Dr. Smith',
        orderedDate: '2025-09-15T08:00:00.000Z',
        status: 'completed'
      };

      const labData2: CreateLabTestResult = {
        patientId,
        testType: 'lipid_panel',
        testCode: 'LIPID',
        testName: 'Lipid Panel',
        results: [],
        orderedBy: 'Dr. Johnson',
        orderedDate: '2025-09-15T09:00:00.000Z',
        status: 'completed'
      };

      await labService.createLabResult(labData1);
      await labService.createLabResult(labData2);

      const result = await labService.getPatientLabResults(patientId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every(lab => lab.patientId === patientId)).toBe(true);
      }
    });
  });

  describe('updateLabResult', () => {
    it('should update lab result status and add interpretation', async () => {
      const labData: CreateLabTestResult = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        testType: 'complete_blood_count',
        testCode: 'CBC',
        testName: 'Complete Blood Count',
        results: [],
        orderedBy: 'Dr. Smith',
        orderedDate: '2025-09-15T08:00:00.000Z',
        status: 'processing'
      };

      const createResult = await labService.createLabResult(labData);
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const updateData = {
          status: 'completed' as const,
          interpretation: 'Normal complete blood count results',
          resultDate: '2025-09-15T10:00:00.000Z'
        };

        const updateResult = await labService.updateLabResult(createResult.data.id, updateData);

        expect(updateResult.success).toBe(true);
        if (updateResult.success) {
          expect(updateResult.data.status).toBe('completed');
          expect(updateResult.data.interpretation).toBe('Normal complete blood count results');
          expect(updateResult.data.resultDate).toBe('2025-09-15T10:00:00.000Z');
        }
      }
    });
  });

  describe('generateAIAnalysis', () => {
    it('should generate AI analysis for critical values', async () => {
      const results = [
        {
          parameter: 'WBC',
          value: 25.0,
          unit: 'K/uL',
          referenceRange: '4.5-11.0',
          status: 'critical_high' as const
        }
      ];

      const analysis = await labService.generateAIAnalysis(results);

      expect(analysis.riskLevel).toBe('critical');
      expect(analysis.findings).toContain('Critically elevated white blood cell count');
      expect(analysis.followUpRequired).toBe(true);
      expect(analysis.confidence).toBeGreaterThan(0.8);
    });

    it('should generate AI analysis for normal values', async () => {
      const results = [
        {
          parameter: 'WBC',
          value: 7.5,
          unit: 'K/uL',
          referenceRange: '4.5-11.0',
          status: 'normal' as const
        }
      ];

      const analysis = await labService.generateAIAnalysis(results);

      expect(analysis.riskLevel).toBe('low');
      expect(analysis.findings).toContain('All parameters within normal limits');
      expect(analysis.followUpRequired).toBe(false);
    });
  });
});