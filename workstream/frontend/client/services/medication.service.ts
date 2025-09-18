import { apiClient } from '../lib/api-client';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  ndc?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface DrugInteraction {
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED' | 'UNKNOWN';
  description: string;
  recommendation: string;
  evidence: 'HIGH' | 'MODERATE' | 'LOW' | 'THEORETICAL';
  drugs: string[];
}

export interface InteractionCheckResult {
  hasInteractions: boolean;
  interactions: DrugInteraction[];
}

export interface AdherenceData {
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  adherencePercentage: number;
  lastTaken: string;
  nextDue: string;
}

export interface PrescriptionData {
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescriberId: string;
  instructions?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class MedicationService {
  /**
   * Check for drug interactions between multiple medications
   * Critical safety feature for healthcare applications
   */
  static async checkDrugInteractions(medications: Pick<Medication, 'name' | 'dosage' | 'ndc'>[]): Promise<InteractionCheckResult> {
    try {
      console.log('[MedicationService] Checking drug interactions for:', medications.map(m => m.name));

      const response = await apiClient.post('/medications/interactions/check', {
        medications: medications.map(med => ({
          name: med.name,
          dosage: med.dosage,
          ndc: med.ndc
        }))
      });

      console.log('[MedicationService] Interaction check response:', response.data.data);

      return response.data.data;
    } catch (error) {
      console.error('[MedicationService] Error checking drug interactions:', error);

      // Safety-first approach: When API fails, assume potential interactions
      return {
        hasInteractions: true,
        interactions: [{
          severity: 'UNKNOWN',
          description: 'Unable to verify drug interactions due to system error. Please consult with pharmacist or physician.',
          recommendation: 'Manual review required before administering medications.',
          evidence: 'THEORETICAL',
          drugs: medications.map(m => m.name)
        }]
      };
    }
  }

  /**
   * Get medication adherence data for a patient's specific medication
   */
  static async getAdherence(patientId: string, medicationId: string): Promise<AdherenceData> {
    try {
      console.log(`[MedicationService] Getting adherence for patient ${patientId}, medication ${medicationId}`);

      const response = await apiClient.get(`/patients/${patientId}/medications/${medicationId}/adherence`);

      return response.data.data;
    } catch (error) {
      console.error('[MedicationService] Error fetching adherence data:', error);

      // Return fallback data indicating monitoring needed
      return {
        totalDoses: 0,
        takenDoses: 0,
        missedDoses: 0,
        adherencePercentage: 0,
        lastTaken: '',
        nextDue: '',
      };
    }
  }

  /**
   * Determine if a patient needs adherence intervention
   */
  static needsAdherenceIntervention(adherenceData: AdherenceData): boolean {
    const ADHERENCE_THRESHOLD = 80; // Clinical standard: 80% adherence
    return adherenceData.adherencePercentage < ADHERENCE_THRESHOLD;
  }

  /**
   * Validate prescription data before submission
   */
  static validatePrescription(prescription: PrescriptionData): ValidationResult {
    const errors: string[] = [];

    // Required field validation
    if (!prescription.medicationName || prescription.medicationName.trim() === '') {
      errors.push('Medication name is required');
    }

    if (!prescription.dosage || prescription.dosage.trim() === '') {
      errors.push('Dosage is required');
    }

    if (!prescription.frequency || prescription.frequency.trim() === '') {
      errors.push('Frequency is required');
    }

    if (!prescription.duration || prescription.duration.trim() === '') {
      errors.push('Duration is required');
    }

    if (!prescription.patientId || prescription.patientId.trim() === '') {
      errors.push('Patient ID is required');
    }

    if (!prescription.prescriberId || prescription.prescriberId.trim() === '') {
      errors.push('Prescriber ID is required');
    }

    // Format validation
    if (prescription.dosage && !/^\d+\s*(mg|g|ml|mcg|units?)$/i.test(prescription.dosage.trim())) {
      errors.push('Invalid dosage format. Use format like "10mg", "1g", "5ml"');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a new prescription
   */
  static async createPrescription(prescription: PrescriptionData): Promise<any> {
    try {
      console.log('[MedicationService] Creating prescription:', prescription);

      const response = await apiClient.post('/prescriptions', prescription);

      return response.data.data;
    } catch (error) {
      console.error('[MedicationService] Error creating prescription:', error);
      throw new Error('Failed to create prescription');
    }
  }

  /**
   * Check if a medication conflicts with patient allergies
   */
  static checkAllergy(medicationName: string, patientAllergies: string[]): boolean {
    const medication = medicationName.toLowerCase();

    // Common drug family mappings for allergy checking
    const drugFamilies: Record<string, string[]> = {
      'penicillin': ['amoxicillin', 'ampicillin', 'penicillin', 'augmentin'],
      'sulfa': ['sulfamethoxazole', 'trimethoprim', 'bactrim', 'septra'],
      'nsaid': ['ibuprofen', 'naproxen', 'diclofenac', 'celecoxib'],
      'aspirin': ['aspirin', 'asa', 'acetylsalicylic acid']
    };

    for (const allergy of patientAllergies) {
      const allergyLower = allergy.toLowerCase();

      // Direct match
      if (medication.includes(allergyLower)) {
        return true;
      }

      // Check drug family
      if (drugFamilies[allergyLower]) {
        for (const familyMember of drugFamilies[allergyLower]) {
          if (medication.includes(familyMember)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Get all medications for a patient
   */
  static async getPatientMedications(patientId: string): Promise<Medication[]> {
    try {
      console.log(`[MedicationService] Getting medications for patient ${patientId}`);

      const response = await apiClient.get(`/patients/${patientId}/medications`);

      return response.data.data;
    } catch (error) {
      console.error('[MedicationService] Error fetching patient medications:', error);
      return [];
    }
  }

  /**
   * Search medications in formulary
   */
  static async searchMedications(query: string): Promise<Medication[]> {
    try {
      console.log(`[MedicationService] Searching medications with query: ${query}`);

      const response = await apiClient.get(`/medications/search?q=${encodeURIComponent(query)}`);

      return response.data.data;
    } catch (error) {
      console.error('[MedicationService] Error searching medications:', error);
      return [];
    }
  }
}