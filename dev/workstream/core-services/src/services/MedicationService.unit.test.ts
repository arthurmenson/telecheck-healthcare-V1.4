import { describe, it, expect, beforeEach } from '@jest/globals';
import { MedicationService } from './MedicationService';
import type { CreateMedication } from '../types/Medication';

describe('MedicationService', () => {
  let medicationService: MedicationService;

  beforeEach(() => {
    medicationService = new MedicationService();
  });

  describe('createMedication', () => {
    it('should create a new medication with valid data', async () => {
      const medicationData: CreateMedication = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Metformin',
        genericName: 'Metformin Hydrochloride',
        brandName: 'Glucophage',
        dosage: {
          amount: 500,
          unit: 'mg',
          frequency: 'twice daily',
          route: 'oral',
          instructions: 'Take with meals'
        },
        prescriber: {
          name: 'Dr. Johnson',
          npi: '1234567890'
        },
        indication: 'Type 2 Diabetes',
        startDate: '2025-09-15T08:00:00.000Z',
        status: 'active'
      };

      const result = await medicationService.createMedication(medicationData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Metformin');
        expect(result.data.genericName).toBe('Metformin Hydrochloride');
        expect(result.data.dosage.amount).toBe(500);
        expect(result.data.interactions).toBeDefined();
        expect(result.data.sideEffects).toBeDefined();
        expect(result.data.id).toBeDefined();
        expect(result.data.createdAt).toBeDefined();
        expect(result.data.updatedAt).toBeDefined();
      }
    });

    it('should return error for invalid medication data', async () => {
      const invalidData = {
        patientId: 'invalid-uuid',
        name: '',
        dosage: {
          amount: -5, // Invalid negative amount
          unit: 'invalid-unit',
          frequency: '',
          route: 'invalid-route'
        },
        prescriber: {
          name: ''
        },
        startDate: 'invalid-date',
        status: 'invalid-status'
      } as unknown as CreateMedication;

      const result = await medicationService.createMedication(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should automatically check for drug interactions', async () => {
      // First, add a medication that interacts with warfarin
      const aspirinData: CreateMedication = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Aspirin',
        dosage: {
          amount: 81,
          unit: 'mg',
          frequency: 'once daily',
          route: 'oral'
        },
        prescriber: {
          name: 'Dr. Smith'
        },
        startDate: '2025-09-14T08:00:00.000Z',
        status: 'active'
      };

      await medicationService.createMedication(aspirinData);

      // Now add warfarin which should detect interaction
      const warfarinData: CreateMedication = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Warfarin',
        dosage: {
          amount: 5,
          unit: 'mg',
          frequency: 'once daily',
          route: 'oral'
        },
        prescriber: {
          name: 'Dr. Johnson'
        },
        startDate: '2025-09-15T08:00:00.000Z',
        status: 'active'
      };

      const result = await medicationService.createMedication(warfarinData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.interactions).toHaveLength(1);
        expect(result.data.interactions[0].severity).toBe('major');
        expect(result.data.interactions[0].description).toContain('bleeding');
      }
    });
  });

  describe('getMedication', () => {
    it('should return medication by ID', async () => {
      const medicationData: CreateMedication = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Lisinopril',
        dosage: {
          amount: 10,
          unit: 'mg',
          frequency: 'once daily',
          route: 'oral'
        },
        prescriber: {
          name: 'Dr. Brown'
        },
        startDate: '2025-09-15T08:00:00.000Z',
        status: 'active'
      };

      const createResult = await medicationService.createMedication(medicationData);
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const getResult = await medicationService.getMedication(createResult.data.id);

        expect(getResult.success).toBe(true);
        if (getResult.success) {
          expect(getResult.data.id).toBe(createResult.data.id);
          expect(getResult.data.name).toBe('Lisinopril');
        }
      }
    });

    it('should return error for non-existent medication', async () => {
      const result = await medicationService.getMedication('non-existent-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('MEDICATION_NOT_FOUND');
      }
    });
  });

  describe('getPatientMedications', () => {
    it('should return all medications for a patient', async () => {
      const patientId = '550e8400-e29b-41d4-a716-446655440000';

      const medications: CreateMedication[] = [
        {
          patientId,
          name: 'Metformin',
          dosage: {
            amount: 500,
            unit: 'mg',
            frequency: 'twice daily',
            route: 'oral'
          },
          prescriber: {
            name: 'Dr. Johnson'
          },
          startDate: '2025-09-15T08:00:00.000Z',
          status: 'active'
        },
        {
          patientId,
          name: 'Lisinopril',
          dosage: {
            amount: 10,
            unit: 'mg',
            frequency: 'once daily',
            route: 'oral'
          },
          prescriber: {
            name: 'Dr. Brown'
          },
          startDate: '2025-09-15T09:00:00.000Z',
          status: 'active'
        }
      ];

      for (const medication of medications) {
        await medicationService.createMedication(medication);
      }

      const result = await medicationService.getPatientMedications(patientId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every(med => med.patientId === patientId)).toBe(true);
      }
    });
  });

  describe('checkDrugInteractions', () => {
    it('should detect major drug interactions', async () => {
      const patientId = '550e8400-e29b-41d4-a716-446655440000';

      // Create existing medications
      const existingMeds = [
        {
          id: '1',
          name: 'aspirin',
          patientId
        },
        {
          id: '2',
          name: 'amoxicillin',
          patientId
        }
      ];

      const interactions = await medicationService.checkDrugInteractions('warfarin', existingMeds);

      expect(interactions).toHaveLength(2);

      const majorInteraction = interactions.find(i => i.severity === 'major');
      expect(majorInteraction).toBeDefined();
      expect(majorInteraction?.medicationName).toBe('aspirin');
      expect(majorInteraction?.description).toContain('bleeding');

      const moderateInteraction = interactions.find(i => i.severity === 'moderate');
      expect(moderateInteraction).toBeDefined();
      expect(moderateInteraction?.medicationName).toBe('amoxicillin');
    });

    it('should return empty array when no interactions found', async () => {
      const patientId = '550e8400-e29b-41d4-a716-446655440000';

      const existingMeds = [
        {
          id: '1',
          name: 'vitamin-d',
          patientId
        }
      ];

      const interactions = await medicationService.checkDrugInteractions('acetaminophen', existingMeds);

      expect(interactions).toHaveLength(0);
    });
  });

  describe('updateMedication', () => {
    it('should update medication status and dosage', async () => {
      const medicationData: CreateMedication = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Atorvastatin',
        dosage: {
          amount: 20,
          unit: 'mg',
          frequency: 'once daily',
          route: 'oral'
        },
        prescriber: {
          name: 'Dr. Wilson'
        },
        startDate: '2025-09-15T08:00:00.000Z',
        status: 'active'
      };

      const createResult = await medicationService.createMedication(medicationData);
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const updateData = {
          dosage: {
            amount: 40,
            unit: 'mg' as const,
            frequency: 'once daily',
            route: 'oral' as const,
            instructions: 'Take at bedtime'
          },
          status: 'active' as const
        };

        const updateResult = await medicationService.updateMedication(createResult.data.id, updateData);

        expect(updateResult.success).toBe(true);
        if (updateResult.success) {
          expect(updateResult.data.dosage.amount).toBe(40);
          expect(updateResult.data.dosage.instructions).toBe('Take at bedtime');
        }
      }
    });
  });

  describe('discontinueMedication', () => {
    it('should discontinue medication with reason', async () => {
      const medicationData: CreateMedication = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Simvastatin',
        dosage: {
          amount: 20,
          unit: 'mg',
          frequency: 'once daily',
          route: 'oral'
        },
        prescriber: {
          name: 'Dr. Taylor'
        },
        startDate: '2025-09-15T08:00:00.000Z',
        status: 'active'
      };

      const createResult = await medicationService.createMedication(medicationData);
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const discontinueResult = await medicationService.discontinueMedication(
          createResult.data.id,
          'Side effects - muscle pain'
        );

        expect(discontinueResult.success).toBe(true);
        if (discontinueResult.success) {
          expect(discontinueResult.data.status).toBe('discontinued');
          expect(discontinueResult.data.endDate).toBeDefined();
          expect(discontinueResult.data.notes).toContain('muscle pain');
        }
      }
    });
  });
});