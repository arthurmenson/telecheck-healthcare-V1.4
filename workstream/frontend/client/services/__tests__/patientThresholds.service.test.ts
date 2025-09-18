import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PatientThresholdsService, patientThresholdsService } from '../patientThresholds.service';
import type {
  ThresholdType,
  PatientThreshold,
  EffectiveThreshold,
  ThresholdAlert
} from '../patientThresholds.service';

// Mock global fetch
const mockFetch = vi.fn();
Object.defineProperty(globalThis, 'fetch', {
  value: mockFetch,
  writable: true,
});

// Mock console methods
const originalConsoleError = console.error;

describe('PatientThresholdsService - TDD Implementation', () => {
  let service: PatientThresholdsService;

  beforeEach(() => {
    service = new PatientThresholdsService();
    mockFetch.mockClear();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('Threshold Types Management', () => {
    it('should fetch all available threshold types', async () => {
      // Arrange
      const mockThresholdTypes: ThresholdType[] = [
        {
          type: 'blood_pressure_systolic',
          name: 'Systolic Blood Pressure',
          unit: 'mmHg',
          description: 'Upper pressure when heart beats'
        },
        {
          type: 'blood_pressure_diastolic',
          name: 'Diastolic Blood Pressure',
          unit: 'mmHg',
          description: 'Lower pressure when heart rests'
        },
        {
          type: 'heart_rate',
          name: 'Heart Rate',
          unit: 'bpm',
          description: 'Number of heartbeats per minute'
        }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          thresholdTypes: mockThresholdTypes
        })
      });

      // Act
      const result = await service.getThresholdTypes();

      // Assert
      expect(result.success).toBe(true);
      expect(result.thresholdTypes).toHaveLength(3);
      expect(result.thresholdTypes![0].type).toBe('blood_pressure_systolic');
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/thresholds/types');
    });

    it('should handle errors when fetching threshold types', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act
      const result = await service.getThresholdTypes();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch threshold types');
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching threshold types:',
        expect.any(Error)
      );
    });

    it('should return fallback data when API is unavailable', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({
          success: false,
          error: 'Service temporarily unavailable'
        })
      });

      // Act
      const result = await service.getThresholdTypes();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Service temporarily unavailable');
    });
  });

  describe('Patient-Specific Threshold Management', () => {
    const mockPatientId = 'patient-123';

    it('should fetch patient-specific thresholds and effective thresholds', async () => {
      // Arrange
      const mockPatientThresholds: PatientThreshold[] = [
        {
          id: 1,
          patientId: mockPatientId,
          thresholdType: 'blood_pressure_systolic',
          thresholdValue: 140,
          unit: 'mmHg',
          notes: 'Patient has hypertension history',
          isActive: true,
          createdBy: 'dr.smith@hospital.com',
          createdAt: '2024-01-15T10:00:00Z'
        }
      ];

      const mockEffectiveThresholds: EffectiveThreshold[] = [
        {
          type: 'blood_pressure_systolic',
          name: 'Systolic Blood Pressure',
          unit: 'mmHg',
          description: 'Upper pressure when heart beats',
          currentValue: 140,
          isPatientSpecific: true,
          notes: 'Patient has hypertension history'
        },
        {
          type: 'heart_rate',
          name: 'Heart Rate',
          unit: 'bpm',
          description: 'Number of heartbeats per minute',
          currentValue: 100, // Global default
          isPatientSpecific: false
        }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          patientThresholds: mockPatientThresholds,
          effectiveThresholds: mockEffectiveThresholds
        })
      });

      // Act
      const result = await service.getPatientThresholds(mockPatientId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.patientThresholds).toHaveLength(1);
      expect(result.effectiveThresholds).toHaveLength(2);
      expect(result.effectiveThresholds![0].isPatientSpecific).toBe(true);
      expect(result.effectiveThresholds![1].isPatientSpecific).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(`/api/admin/thresholds/patients/${mockPatientId}`);
    });

    it('should create new patient-specific threshold', async () => {
      // Arrange
      const newThreshold: Omit<PatientThreshold, 'id' | 'createdAt' | 'updatedAt'> = {
        patientId: mockPatientId,
        thresholdType: 'glucose_level',
        thresholdValue: 180,
        unit: 'mg/dL',
        notes: 'Diabetic patient - stricter glucose monitoring',
        isActive: true,
        createdBy: 'dr.johnson@hospital.com'
      };

      const mockCreatedThreshold: PatientThreshold = {
        id: 2,
        ...newThreshold,
        createdAt: '2024-01-16T14:30:00Z'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          patientThreshold: mockCreatedThreshold
        })
      });

      // Act
      const result = await service.createPatientThreshold(newThreshold);

      // Assert
      expect(result.success).toBe(true);
      expect(result.patientThreshold!.id).toBe(2);
      expect(result.patientThreshold!.thresholdValue).toBe(180);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/thresholds/patients',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newThreshold)
        })
      );
    });

    it('should update existing patient threshold', async () => {
      // Arrange
      const thresholdId = 1;
      const updateData = {
        thresholdValue: 130,
        notes: 'Updated threshold based on recent consultation',
        updatedBy: 'dr.smith@hospital.com'
      };

      const mockUpdatedThreshold: PatientThreshold = {
        id: thresholdId,
        patientId: mockPatientId,
        thresholdType: 'blood_pressure_systolic',
        thresholdValue: 130,
        unit: 'mmHg',
        notes: 'Updated threshold based on recent consultation',
        isActive: true,
        createdBy: 'dr.smith@hospital.com',
        updatedBy: 'dr.smith@hospital.com',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-16T15:00:00Z'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          patientThreshold: mockUpdatedThreshold
        })
      });

      // Act
      const result = await service.updatePatientThreshold(thresholdId, updateData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.patientThreshold!.thresholdValue).toBe(130);
      expect(result.patientThreshold!.updatedBy).toBe('dr.smith@hospital.com');
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/admin/thresholds/patients/${thresholdId}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData)
        })
      );
    });

    it('should delete patient threshold', async () => {
      // Arrange
      const thresholdId = 1;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'Patient threshold deleted successfully'
        })
      });

      // Act
      const result = await service.deletePatientThreshold(thresholdId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/admin/thresholds/patients/${thresholdId}`,
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('Threshold Alert System', () => {
    it('should check for threshold violations and generate alerts', async () => {
      // Arrange
      const patientId = 'patient-456';
      const vitalReadings = {
        blood_pressure_systolic: 160,
        blood_pressure_diastolic: 95,
        heart_rate: 110
      };

      const expectedAlerts: ThresholdAlert[] = [
        {
          patientId,
          thresholdType: 'blood_pressure_systolic',
          actualValue: 160,
          thresholdValue: 140,
          unit: 'mmHg',
          severity: 'high',
          isPatientSpecific: true,
          alertMessage: 'Systolic blood pressure (160 mmHg) exceeds patient-specific threshold (140 mmHg)'
        },
        {
          patientId,
          thresholdType: 'heart_rate',
          actualValue: 110,
          thresholdValue: 100,
          unit: 'bpm',
          severity: 'medium',
          isPatientSpecific: false,
          alertMessage: 'Heart rate (110 bpm) exceeds global threshold (100 bpm)'
        }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          alerts: expectedAlerts,
          alertCount: 2
        })
      });

      // Act
      const result = await service.checkThresholdAlerts(patientId, vitalReadings);

      // Assert
      expect(result.success).toBe(true);
      expect(result.alerts).toHaveLength(2);
      expect(result.alerts![0].severity).toBe('high');
      expect(result.alerts![0].isPatientSpecific).toBe(true);
      expect(result.alerts![1].severity).toBe('medium');
      expect(result.alerts![1].isPatientSpecific).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/admin/thresholds/alerts/check`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ patientId, vitalReadings })
        })
      );
    });

    it('should return no alerts when all vitals are within thresholds', async () => {
      // Arrange
      const patientId = 'patient-789';
      const normalVitalReadings = {
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80,
        heart_rate: 75
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          alerts: [],
          alertCount: 0
        })
      });

      // Act
      const result = await service.checkThresholdAlerts(patientId, normalVitalReadings);

      // Assert
      expect(result.success).toBe(true);
      expect(result.alerts).toHaveLength(0);
      expect(result.alertCount).toBe(0);
    });

    it('should handle critical threshold violations with appropriate severity', async () => {
      // Arrange
      const patientId = 'patient-critical';
      const criticalVitalReadings = {
        blood_pressure_systolic: 200,
        heart_rate: 140
      };

      const criticalAlerts: ThresholdAlert[] = [
        {
          patientId,
          thresholdType: 'blood_pressure_systolic',
          actualValue: 200,
          thresholdValue: 140,
          unit: 'mmHg',
          severity: 'critical',
          isPatientSpecific: true,
          alertMessage: 'CRITICAL: Systolic blood pressure (200 mmHg) significantly exceeds threshold (140 mmHg)'
        }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          alerts: criticalAlerts,
          alertCount: 1
        })
      });

      // Act
      const result = await service.checkThresholdAlerts(patientId, criticalVitalReadings);

      // Assert
      expect(result.success).toBe(true);
      expect(result.alerts![0].severity).toBe('critical');
      expect(result.alerts![0].alertMessage).toContain('CRITICAL');
    });
  });

  describe('Bulk Operations & Reporting', () => {
    it('should get patients with custom thresholds for bulk management', async () => {
      // Arrange
      const mockPatientsWithThresholds = [
        { patientId: 'patient-123', thresholdCount: 3 },
        { patientId: 'patient-456', thresholdCount: 1 },
        { patientId: 'patient-789', thresholdCount: 5 }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          patients: mockPatientsWithThresholds,
          totalCount: 3
        })
      });

      // Act
      const result = await service.getPatientsWithCustomThresholds();

      // Assert
      expect(result.success).toBe(true);
      expect(result.patients).toHaveLength(3);
      expect(result.patients![0].thresholdCount).toBe(3);
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/thresholds/patients/with-custom');
    });

    it('should generate comprehensive threshold report for a patient', async () => {
      // Arrange
      const patientId = 'patient-report';
      const mockReport = {
        patientId,
        report: [
          {
            thresholdType: 'blood_pressure_systolic',
            name: 'Systolic Blood Pressure',
            unit: 'mmHg',
            description: 'Upper pressure when heart beats',
            currentValue: 140,
            isPatientSpecific: true,
            notes: 'Patient-specific due to hypertension',
            source: 'dr.smith@hospital.com'
          },
          {
            thresholdType: 'heart_rate',
            name: 'Heart Rate',
            unit: 'bpm',
            description: 'Number of heartbeats per minute',
            currentValue: 100,
            isPatientSpecific: false,
            source: 'Global Default'
          }
        ],
        summary: {
          totalThresholds: 2,
          patientSpecific: 1,
          globalDefaults: 1
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          report: mockReport
        })
      });

      // Act
      const result = await service.generateThresholdReport(patientId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.report!.summary.totalThresholds).toBe(2);
      expect(result.report!.summary.patientSpecific).toBe(1);
      expect(result.report!.summary.globalDefaults).toBe(1);
      expect(result.report!.report[0].isPatientSpecific).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(`/api/admin/thresholds/reports/${patientId}`);
    });
  });

  describe('Error Handling & Resilience', () => {
    it('should handle network timeouts gracefully', async () => {
      // Arrange
      mockFetch.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      // Act
      const result = await service.getThresholdTypes();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch threshold types');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle invalid patient ID gracefully', async () => {
      // Arrange
      const invalidPatientId = '';
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Invalid patient ID provided'
        })
      });

      // Act
      const result = await service.getPatientThresholds(invalidPatientId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid patient ID');
    });

    it('should validate threshold data before submission', () => {
      // Arrange
      const invalidThreshold = {
        patientId: '',
        thresholdType: 'invalid_type',
        thresholdValue: -10, // Invalid negative value
        unit: '',
        isActive: true,
        createdBy: ''
      };

      // Act
      const validation = service.validateThresholdData(invalidThreshold);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Patient ID is required');
      expect(validation.errors).toContain('Threshold value must be positive');
      expect(validation.errors).toContain('Created by is required');
    });
  });
});