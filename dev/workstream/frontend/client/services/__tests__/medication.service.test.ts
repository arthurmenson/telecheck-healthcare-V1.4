import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MedicationService, Medication, DrugInteraction } from '../medication.service';

// Mock the API client
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from '../../lib/api-client';
const mockedApiClient = vi.mocked(apiClient);

describe('MedicationService - TDD Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Drug Interaction Checking (Critical Safety Feature)', () => {
    it('should detect dangerous drug interactions', async () => {
      // RED: This test will fail initially since the service doesn't exist
      const medications = [
        { id: '1', name: 'Warfarin', dosage: '5mg', ndc: '12345-678-90' },
        { id: '2', name: 'Aspirin', dosage: '81mg', ndc: '98765-432-10' }
      ];

      const expectedInteraction: DrugInteraction = {
        severity: 'MAJOR',
        description: 'Increased risk of bleeding when Warfarin and Aspirin are used together',
        recommendation: 'Monitor INR levels closely. Consider alternative pain relief.',
        evidence: 'HIGH',
        drugs: ['Warfarin', 'Aspirin']
      };

      mockedApiClient.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            interactions: [expectedInteraction],
            hasInteractions: true
          }
        }
      });

      const result = await MedicationService.checkDrugInteractions(medications);

      expect(result.hasInteractions).toBe(true);
      expect(result.interactions).toHaveLength(1);
      expect(result.interactions[0].severity).toBe('MAJOR');
      expect(result.interactions[0].drugs).toContain('Warfarin');
      expect(result.interactions[0].drugs).toContain('Aspirin');
      expect(mockedApiClient.post).toHaveBeenCalledWith('/medications/interactions/check', {
        medications: medications.map(med => ({
          name: med.name,
          dosage: med.dosage,
          ndc: med.ndc
        }))
      });
    });

    it('should return no interactions for safe drug combinations', async () => {
      const medications = [
        { id: '1', name: 'Acetaminophen', dosage: '500mg', ndc: '11111-222-33' },
        { id: '2', name: 'Metformin', dosage: '500mg', ndc: '44444-555-66' }
      ];

      mockedApiClient.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            interactions: [],
            hasInteractions: false
          }
        }
      });

      const result = await MedicationService.checkDrugInteractions(medications);

      expect(result.hasInteractions).toBe(false);
      expect(result.interactions).toHaveLength(0);
    });

    it('should handle API errors gracefully for patient safety', async () => {
      const medications = [
        { id: '1', name: 'Unknown Drug', dosage: '100mg', ndc: '00000-000-00' }
      ];

      mockedApiClient.post.mockRejectedValue(new Error('API Error'));

      const result = await MedicationService.checkDrugInteractions(medications);

      // Safety-first: When in doubt, assume there might be interactions
      expect(result.hasInteractions).toBe(true);
      expect(result.interactions).toHaveLength(1);
      expect(result.interactions[0].severity).toBe('UNKNOWN');
      expect(result.interactions[0].description).toContain('Unable to verify drug interactions');
    });
  });

  describe('Medication Adherence Tracking', () => {
    it('should calculate adherence percentage correctly', async () => {
      const patientId = 'patient-123';
      const medicationId = 'med-456';

      const mockAdherenceData = {
        totalDoses: 30,
        takenDoses: 27,
        missedDoses: 3,
        adherencePercentage: 90,
        lastTaken: '2024-01-15T10:30:00Z',
        nextDue: '2024-01-16T10:30:00Z'
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockAdherenceData }
      });

      const result = await MedicationService.getAdherence(patientId, medicationId);

      expect(result.adherencePercentage).toBe(90);
      expect(result.totalDoses).toBe(30);
      expect(result.takenDoses).toBe(27);
      expect(result.missedDoses).toBe(3);
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        `/patients/${patientId}/medications/${medicationId}/adherence`
      );
    });

    it('should identify patients with poor adherence', async () => {
      const patientId = 'patient-123';
      const medicationId = 'med-456';

      const mockPoorAdherence = {
        totalDoses: 30,
        takenDoses: 18,
        missedDoses: 12,
        adherencePercentage: 60,
        lastTaken: '2024-01-10T10:30:00Z',
        nextDue: '2024-01-16T10:30:00Z'
      };

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockPoorAdherence }
      });

      const result = await MedicationService.getAdherence(patientId, medicationId);
      const needsIntervention = MedicationService.needsAdherenceIntervention(result);

      expect(needsIntervention).toBe(true);
      expect(result.adherencePercentage).toBeLessThan(80); // Clinical threshold
    });
  });

  describe('Prescription Management', () => {
    it('should validate prescription data before saving', async () => {
      const invalidPrescription = {
        patientId: 'patient-123',
        medicationName: '', // Invalid: empty name
        dosage: '10mg',
        frequency: 'twice daily',
        duration: '30 days',
        prescriberId: 'doctor-456'
      };

      const result = MedicationService.validatePrescription(invalidPrescription);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Medication name is required');
    });

    it('should create prescription with proper validation', async () => {
      const validPrescription = {
        patientId: 'patient-123',
        medicationName: 'Lisinopril',
        dosage: '10mg',
        frequency: 'once daily',
        duration: '90 days',
        prescriberId: 'doctor-456',
        instructions: 'Take with food'
      };

      const mockCreatedPrescription = {
        id: 'rx-789',
        ...validPrescription,
        status: 'active',
        createdAt: '2024-01-15T10:00:00Z'
      };

      mockedApiClient.post.mockResolvedValue({
        data: { success: true, data: mockCreatedPrescription }
      });

      const validation = MedicationService.validatePrescription(validPrescription);
      expect(validation.isValid).toBe(true);

      const result = await MedicationService.createPrescription(validPrescription);

      expect(result.id).toBe('rx-789');
      expect(result.status).toBe('active');
      expect(mockedApiClient.post).toHaveBeenCalledWith('/prescriptions', validPrescription);
    });
  });

  describe('Allergy Checking', () => {
    it('should prevent prescribing medications patient is allergic to', async () => {
      const patientAllergies = ['Penicillin', 'Sulfa'];
      const proposedMedication = 'Amoxicillin'; // Penicillin-based

      const isAllergic = MedicationService.checkAllergy(proposedMedication, patientAllergies);

      expect(isAllergic).toBe(true);
    });

    it('should allow safe medications for allergic patients', async () => {
      const patientAllergies = ['Penicillin', 'Sulfa'];
      const proposedMedication = 'Acetaminophen'; // Safe alternative

      const isAllergic = MedicationService.checkAllergy(proposedMedication, patientAllergies);

      expect(isAllergic).toBe(false);
    });

    it('should handle case-insensitive allergy checking', async () => {
      const patientAllergies = ['PENICILLIN', 'sulfa'];
      const proposedMedication = 'amoxicillin'; // Lowercase penicillin-based

      const isAllergic = MedicationService.checkAllergy(proposedMedication, patientAllergies);

      expect(isAllergic).toBe(true);
    });

    it('should check NSAID allergy family', async () => {
      const patientAllergies = ['nsaid'];
      const proposedMedication = 'Ibuprofen'; // NSAID family member

      const isAllergic = MedicationService.checkAllergy(proposedMedication, patientAllergies);

      expect(isAllergic).toBe(true);
    });

    it('should check aspirin allergy family', async () => {
      const patientAllergies = ['aspirin'];
      const proposedMedication = 'asa'; // Aspirin alias

      const isAllergic = MedicationService.checkAllergy(proposedMedication, patientAllergies);

      expect(isAllergic).toBe(true);
    });

    it('should handle empty allergy list', async () => {
      const patientAllergies: string[] = [];
      const proposedMedication = 'Penicillin';

      const isAllergic = MedicationService.checkAllergy(proposedMedication, patientAllergies);

      expect(isAllergic).toBe(false);
    });
  });

  describe('Advanced Medication Management', () => {
    it('should search medications with encoded query parameters', async () => {
      const searchQuery = 'acetaminophen 500mg';
      const expectedMedications = [
        { id: '1', name: 'Acetaminophen', dosage: '500mg', ndc: '12345-678-90' }
      ];

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: expectedMedications }
      });

      const result = await MedicationService.searchMedications(searchQuery);

      expect(result).toEqual(expectedMedications);
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        `/medications/search?q=${encodeURIComponent(searchQuery)}`
      );
    });

    it('should handle search API errors gracefully', async () => {
      const searchQuery = 'test medication';
      mockedApiClient.get.mockRejectedValue(new Error('Search API Error'));

      const result = await MedicationService.searchMedications(searchQuery);

      expect(result).toEqual([]);
    });

    it('should get patient medications with proper API call', async () => {
      const patientId = 'patient-123';
      const expectedMedications = [
        { id: '1', name: 'Lisinopril', dosage: '10mg', frequency: 'daily' },
        { id: '2', name: 'Metformin', dosage: '500mg', frequency: 'twice daily' }
      ];

      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: expectedMedications }
      });

      const result = await MedicationService.getPatientMedications(patientId);

      expect(result).toEqual(expectedMedications);
      expect(mockedApiClient.get).toHaveBeenCalledWith(`/patients/${patientId}/medications`);
    });

    it('should handle patient medications API error', async () => {
      const patientId = 'patient-123';
      mockedApiClient.get.mockRejectedValue(new Error('Medications API Error'));

      const result = await MedicationService.getPatientMedications(patientId);

      expect(result).toEqual([]);
    });

    it('should handle adherence API error with fallback data', async () => {
      const patientId = 'patient-123';
      const medicationId = 'med-456';

      mockedApiClient.get.mockRejectedValue(new Error('Adherence API Error'));

      const result = await MedicationService.getAdherence(patientId, medicationId);

      expect(result).toEqual({
        totalDoses: 0,
        takenDoses: 0,
        missedDoses: 0,
        adherencePercentage: 0,
        lastTaken: '',
        nextDue: '',
      });
    });

    it('should correctly identify excellent adherence', async () => {
      const excellentAdherence = {
        totalDoses: 30,
        takenDoses: 29,
        missedDoses: 1,
        adherencePercentage: 97,
        lastTaken: '2024-01-15T10:30:00Z',
        nextDue: '2024-01-16T10:30:00Z'
      };

      const needsIntervention = MedicationService.needsAdherenceIntervention(excellentAdherence);

      expect(needsIntervention).toBe(false);
    });

    it('should identify borderline adherence (exactly 80%)', async () => {
      const borderlineAdherence = {
        totalDoses: 30,
        takenDoses: 24,
        missedDoses: 6,
        adherencePercentage: 80,
        lastTaken: '2024-01-15T10:30:00Z',
        nextDue: '2024-01-16T10:30:00Z'
      };

      const needsIntervention = MedicationService.needsAdherenceIntervention(borderlineAdherence);

      expect(needsIntervention).toBe(false);
    });
  });

  describe('Prescription Validation Edge Cases', () => {
    it('should validate all required fields comprehensively', async () => {
      const emptyPrescription = {
        patientId: '',
        medicationName: '',
        dosage: '',
        frequency: '',
        duration: '',
        prescriberId: ''
      };

      const result = MedicationService.validatePrescription(emptyPrescription);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(6);
      expect(result.errors).toEqual([
        'Patient ID is required',
        'Medication name is required',
        'Dosage is required',
        'Frequency is required',
        'Duration is required',
        'Prescriber ID is required'
      ]);
    });

    it('should validate dosage format strictly', async () => {
      const invalidDosagePrescription = {
        patientId: 'patient-123',
        medicationName: 'Test Med',
        dosage: '10 tablets', // Invalid format
        frequency: 'daily',
        duration: '30 days',
        prescriberId: 'doctor-456'
      };

      const result = MedicationService.validatePrescription(invalidDosagePrescription);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid dosage format. Use format like "10mg", "1g", "5ml"');
    });

    it('should accept valid dosage formats', async () => {
      const validFormats = ['10mg', '1g', '5ml', '100mcg', '2units', '1unit'];

      for (const dosage of validFormats) {
        const prescription = {
          patientId: 'patient-123',
          medicationName: 'Test Med',
          dosage: dosage,
          frequency: 'daily',
          duration: '30 days',
          prescriberId: 'doctor-456'
        };

        const result = MedicationService.validatePrescription(prescription);
        expect(result.isValid).toBe(true);
      }
    });

    it('should handle prescription creation API error', async () => {
      const validPrescription = {
        patientId: 'patient-123',
        medicationName: 'Lisinopril',
        dosage: '10mg',
        frequency: 'daily',
        duration: '90 days',
        prescriberId: 'doctor-456'
      };

      mockedApiClient.post.mockRejectedValue(new Error('Prescription API Error'));

      await expect(MedicationService.createPrescription(validPrescription)).rejects.toThrow('Failed to create prescription');
      expect(mockedApiClient.post).toHaveBeenCalledWith('/prescriptions', validPrescription);
    });

    it('should handle whitespace in required fields', async () => {
      const whitespaceFieldsPrescription = {
        patientId: '   ',
        medicationName: ' \t ',
        dosage: ' \n ',
        frequency: '  ',
        duration: '\t\t',
        prescriberId: '   '
      };

      const result = MedicationService.validatePrescription(whitespaceFieldsPrescription);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(6);
    });
  });

  describe('Drug Interaction Edge Cases', () => {
    it('should handle empty medication list for interactions', async () => {
      const medications: any[] = [];

      mockedApiClient.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            interactions: [],
            hasInteractions: false
          }
        }
      });

      const result = await MedicationService.checkDrugInteractions(medications);

      expect(result.hasInteractions).toBe(false);
      expect(result.interactions).toHaveLength(0);
    });

    it('should handle single medication (no interactions possible)', async () => {
      const medications = [
        { id: '1', name: 'Acetaminophen', dosage: '500mg', ndc: '12345-678-90' }
      ];

      mockedApiClient.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            interactions: [],
            hasInteractions: false
          }
        }
      });

      const result = await MedicationService.checkDrugInteractions(medications);

      expect(result.hasInteractions).toBe(false);
      expect(result.interactions).toHaveLength(0);
      expect(mockedApiClient.post).toHaveBeenCalledWith('/medications/interactions/check', {
        medications: medications.map(med => ({
          name: med.name,
          dosage: med.dosage,
          ndc: med.ndc
        }))
      });
    });

    it('should include medication names in error fallback interaction', async () => {
      const medications = [
        { id: '1', name: 'Drug A', dosage: '10mg', ndc: '111' },
        { id: '2', name: 'Drug B', dosage: '20mg', ndc: '222' }
      ];

      mockedApiClient.post.mockRejectedValue(new Error('Network Error'));

      const result = await MedicationService.checkDrugInteractions(medications);

      expect(result.hasInteractions).toBe(true);
      expect(result.interactions).toHaveLength(1);
      expect(result.interactions[0].drugs).toEqual(['Drug A', 'Drug B']);
      expect(result.interactions[0].severity).toBe('UNKNOWN');
    });

    it('should handle contraindicated drug interactions', async () => {
      const medications = [
        { id: '1', name: 'Drug X', dosage: '5mg', ndc: '111' },
        { id: '2', name: 'Drug Y', dosage: '10mg', ndc: '222' }
      ];

      const contraindication: DrugInteraction = {
        severity: 'CONTRAINDICATED',
        description: 'These medications should never be used together',
        recommendation: 'Alternative therapy required immediately',
        evidence: 'HIGH',
        drugs: ['Drug X', 'Drug Y']
      };

      mockedApiClient.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            interactions: [contraindication],
            hasInteractions: true
          }
        }
      });

      const result = await MedicationService.checkDrugInteractions(medications);

      expect(result.hasInteractions).toBe(true);
      expect(result.interactions[0].severity).toBe('CONTRAINDICATED');
      expect(result.interactions[0].evidence).toBe('HIGH');
    });
  });
});