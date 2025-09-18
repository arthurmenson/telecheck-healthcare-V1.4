import { describe, it, expect, beforeEach } from '@jest/globals';
import { VitalSignsService } from './VitalSignsService';
import type { CreateVitalSigns } from '../types/VitalSigns';

describe('VitalSignsService', () => {
  let vitalSignsService: VitalSignsService;

  beforeEach(() => {
    vitalSignsService = new VitalSignsService();
  });

  describe('recordVitalSigns', () => {
    it('should record vital signs with valid data', async () => {
      const vitalSignsData: CreateVitalSigns = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        measurementDate: '2025-09-15T14:30:00.000Z',
        measuredBy: 'Nurse Johnson',
        bloodPressure: {
          systolic: 120,
          diastolic: 80,
          unit: 'mmHg',
          position: 'sitting'
        },
        heartRate: {
          bpm: 72,
          rhythm: 'regular',
          method: 'pulse_oximeter'
        },
        respiratoryRate: {
          rpm: 16,
          quality: 'normal'
        },
        temperature: {
          value: 36.8,
          unit: 'celsius',
          site: 'oral',
          method: 'digital'
        },
        oxygenSaturation: {
          percentage: 98,
          method: 'pulse_oximetry',
          onRoomAir: true
        }
      };

      const result = await vitalSignsService.recordVitalSigns(vitalSignsData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bloodPressure?.systolic).toBe(120);
        expect(result.data.heartRate?.bpm).toBe(72);
        expect(result.data.alerts).toBeDefined();
        expect(result.data.clinicalSignificance?.normalForPatient).toBe(true);
        expect(result.data.id).toBeDefined();
        expect(result.data.createdAt).toBeDefined();
      }
    });

    it('should auto-calculate BMI when height and weight provided', async () => {
      const vitalSignsData: CreateVitalSigns = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        measurementDate: '2025-09-15T14:30:00.000Z',
        measuredBy: 'Nurse Smith',
        weight: {
          value: 70, // kg
          unit: 'kg'
        },
        height: {
          value: 175, // cm
          unit: 'cm'
        }
      };

      const result = await vitalSignsService.recordVitalSigns(vitalSignsData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bmi).toBeDefined();
        expect(result.data.bmi?.value).toBeCloseTo(22.86, 2);
        expect(result.data.bmi?.category).toBe('normal');
      }
    });

    it('should generate alerts for critical vital signs', async () => {
      const criticalVitalSigns: CreateVitalSigns = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        measurementDate: '2025-09-15T14:30:00.000Z',
        measuredBy: 'Nurse Critical',
        bloodPressure: {
          systolic: 200, // Critical high
          diastolic: 110, // Critical high
          unit: 'mmHg'
        },
        heartRate: {
          bpm: 45, // Bradycardia
          rhythm: 'bradycardia'
        },
        temperature: {
          value: 39.5, // Fever
          unit: 'celsius'
        },
        oxygenSaturation: {
          percentage: 88 // Critical low
        }
      };

      const result = await vitalSignsService.recordVitalSigns(criticalVitalSigns);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.alerts.length).toBeGreaterThan(0);

        const criticalAlerts = result.data.alerts.filter(alert => alert.severity === 'critical');
        expect(criticalAlerts.length).toBeGreaterThan(0);

        expect(result.data.clinicalSignificance?.actionRequired).toBe(true);
        expect(result.data.clinicalSignificance?.normalForPatient).toBe(false);
      }
    });

    it('should return error for invalid vital signs data', async () => {
      const invalidData = {
        patientId: 'invalid-uuid',
        measurementDate: 'invalid-date',
        measuredBy: '',
        bloodPressure: {
          systolic: -10, // Invalid negative value
          diastolic: 200,
          unit: 'invalid-unit'
        },
        heartRate: {
          bpm: 0 // Invalid zero value
        }
      } as unknown as CreateVitalSigns;

      const result = await vitalSignsService.recordVitalSigns(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('getVitalSigns', () => {
    it('should return vital signs by ID', async () => {
      const vitalSignsData: CreateVitalSigns = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        measurementDate: '2025-09-15T14:30:00.000Z',
        measuredBy: 'Nurse Test',
        heartRate: {
          bpm: 75
        }
      };

      const createResult = await vitalSignsService.recordVitalSigns(vitalSignsData);
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const getResult = await vitalSignsService.getVitalSigns(createResult.data.id);

        expect(getResult.success).toBe(true);
        if (getResult.success) {
          expect(getResult.data.id).toBe(createResult.data.id);
          expect(getResult.data.heartRate?.bpm).toBe(75);
        }
      }
    });

    it('should return error for non-existent vital signs', async () => {
      const result = await vitalSignsService.getVitalSigns('non-existent-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VITAL_SIGNS_NOT_FOUND');
      }
    });
  });

  describe('getPatientVitalSigns', () => {
    it('should return all vital signs for a patient', async () => {
      const patientId = '550e8400-e29b-41d4-a716-446655440000';

      const vitalSigns1: CreateVitalSigns = {
        patientId,
        measurementDate: '2025-09-15T08:00:00.000Z',
        measuredBy: 'Nurse Morning',
        heartRate: { bpm: 70 }
      };

      const vitalSigns2: CreateVitalSigns = {
        patientId,
        measurementDate: '2025-09-15T16:00:00.000Z',
        measuredBy: 'Nurse Evening',
        heartRate: { bpm: 75 }
      };

      await vitalSignsService.recordVitalSigns(vitalSigns1);
      await vitalSignsService.recordVitalSigns(vitalSigns2);

      const result = await vitalSignsService.getPatientVitalSigns(patientId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every(vs => vs.patientId === patientId)).toBe(true);
        // Should be ordered by measurement date (most recent first)
        expect(new Date(result.data[0].measurementDate).getTime())
          .toBeGreaterThan(new Date(result.data[1].measurementDate).getTime());
      }
    });
  });

  describe('analyzeTrends', () => {
    it('should analyze trends from multiple measurements', async () => {
      const patientId = '550e8400-e29b-41d4-a716-446655440000';

      // Create a series of measurements showing improving blood pressure
      const measurements: CreateVitalSigns[] = [
        {
          patientId,
          measurementDate: '2025-09-13T08:00:00.000Z',
          measuredBy: 'Nurse',
          bloodPressure: { systolic: 160, diastolic: 95, unit: 'mmHg' }
        },
        {
          patientId,
          measurementDate: '2025-09-14T08:00:00.000Z',
          measuredBy: 'Nurse',
          bloodPressure: { systolic: 145, diastolic: 88, unit: 'mmHg' }
        },
        {
          patientId,
          measurementDate: '2025-09-15T08:00:00.000Z',
          measuredBy: 'Nurse',
          bloodPressure: { systolic: 130, diastolic: 82, unit: 'mmHg' }
        }
      ];

      for (const measurement of measurements) {
        await vitalSignsService.recordVitalSigns(measurement);
      }

      const trends = await vitalSignsService.analyzeTrends(patientId, 7); // Last 7 days

      expect(trends.success).toBe(true);
      if (trends.success) {
        expect(trends.data.bloodPressure).toBe('improving');
        expect(trends.data.overall).toBe('improving');
      }
    });
  });

  describe('generateAlerts', () => {
    it('should generate appropriate alerts for abnormal values', async () => {
      const abnormalValues = {
        bloodPressure: { systolic: 180, diastolic: 100 },
        heartRate: { bpm: 120 },
        temperature: { value: 38.5, unit: 'celsius' as const },
        oxygenSaturation: { percentage: 92 }
      };

      const alerts = await vitalSignsService.generateAlerts(abnormalValues);

      expect(alerts.length).toBeGreaterThan(0);

      const bpAlert = alerts.find(alert => alert.parameter === 'bloodPressure');
      expect(bpAlert).toBeDefined();
      expect(bpAlert?.severity).toBe('high');

      const hrAlert = alerts.find(alert => alert.parameter === 'heartRate');
      expect(hrAlert).toBeDefined();
      expect(hrAlert?.type).toBe('high');

      const tempAlert = alerts.find(alert => alert.parameter === 'temperature');
      expect(tempAlert).toBeDefined();
      expect(tempAlert?.message).toContain('fever');
    });

    it('should not generate alerts for normal values', async () => {
      const normalValues = {
        bloodPressure: { systolic: 120, diastolic: 80 },
        heartRate: { bpm: 72 },
        temperature: { value: 36.8, unit: 'celsius' as const },
        oxygenSaturation: { percentage: 98 }
      };

      const alerts = await vitalSignsService.generateAlerts(normalValues);

      expect(alerts).toHaveLength(0);
    });
  });

  describe('updateVitalSigns', () => {
    it('should update vital signs and recalculate alerts', async () => {
      const vitalSignsData: CreateVitalSigns = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        measurementDate: '2025-09-15T14:30:00.000Z',
        measuredBy: 'Nurse Original',
        heartRate: { bpm: 72 },
        verified: false
      };

      const createResult = await vitalSignsService.recordVitalSigns(vitalSignsData);
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const updateData = {
          heartRate: { bpm: 95 }, // Update to higher heart rate
          verified: true,
          verifiedBy: 'Dr. Supervisor'
        };

        const updateResult = await vitalSignsService.updateVitalSigns(createResult.data.id, updateData);

        expect(updateResult.success).toBe(true);
        if (updateResult.success) {
          expect(updateResult.data.heartRate?.bpm).toBe(95);
          expect(updateResult.data.verified).toBe(true);
          expect(updateResult.data.verifiedBy).toBe('Dr. Supervisor');
          // Should have alerts for elevated heart rate
          expect(updateResult.data.alerts.length).toBeGreaterThan(0);
        }
      }
    });
  });
});