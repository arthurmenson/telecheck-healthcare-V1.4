import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { Medication, CreateMedication, UpdateMedication } from '../types/Medication';
import { CreateMedicationSchema, DrugInteractionDatabase, SideEffectsDatabase } from '../types/Medication';
import type { ServiceResult } from '../types/ServiceResult';

interface DrugInteraction {
  medicationId: string;
  medicationName: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  clinicalEffects: string[];
  management?: string;
}

interface ExistingMedication {
  id: string;
  name: string;
  patientId: string;
}

export class MedicationService {
  private medications: Map<string, Medication> = new Map();
  private patientMedicationIndex: Map<string, string[]> = new Map();

  async createMedication(data: CreateMedication): Promise<ServiceResult<Medication>> {
    try {
      const validatedData = CreateMedicationSchema.parse(data);

      // Get existing medications for the patient to check interactions
      const existingMedications = await this.getExistingMedicationsForPatient(validatedData.patientId);

      // Check for drug interactions
      const interactions = await this.checkDrugInteractions(
        validatedData.name.toLowerCase(),
        existingMedications
      );

      // Get known side effects for this medication
      const sideEffects = this.getSideEffects(validatedData.name.toLowerCase());

      const medication: Medication = {
        ...validatedData,
        id: uuidv4(),
        interactions,
        sideEffects,
        allergies: [], // Will be populated based on patient allergy history
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.medications.set(medication.id, medication);

      // Update patient medication index
      const patientMedications = this.patientMedicationIndex.get(medication.patientId) || [];
      patientMedications.push(medication.id);
      this.patientMedicationIndex.set(medication.patientId, patientMedications);

      return { success: true, data: medication };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid medication data',
            details: { issues: error.issues }
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      };
    }
  }

  async getMedication(id: string): Promise<ServiceResult<Medication>> {
    const medication = this.medications.get(id);

    if (!medication) {
      return {
        success: false,
        error: {
          code: 'MEDICATION_NOT_FOUND',
          message: `Medication with ID ${id} not found`
        }
      };
    }

    return { success: true, data: medication };
  }

  async getPatientMedications(patientId: string): Promise<ServiceResult<Medication[]>> {
    const medicationIds = this.patientMedicationIndex.get(patientId) || [];
    const medications = medicationIds
      .map(id => this.medications.get(id))
      .filter((med): med is Medication => med !== undefined);

    return { success: true, data: medications };
  }

  async updateMedication(id: string, data: UpdateMedication): Promise<ServiceResult<Medication>> {
    const existingMedication = this.medications.get(id);

    if (!existingMedication) {
      return {
        success: false,
        error: {
          code: 'MEDICATION_NOT_FOUND',
          message: `Medication with ID ${id} not found`
        }
      };
    }

    try {
      const updatedMedication: Medication = {
        ...existingMedication,
        ...data,
        updatedAt: new Date().toISOString()
      };

      this.medications.set(id, updatedMedication);

      return { success: true, data: updatedMedication };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      };
    }
  }

  async discontinueMedication(id: string, reason: string): Promise<ServiceResult<Medication>> {
    const medication = this.medications.get(id);

    if (!medication) {
      return {
        success: false,
        error: {
          code: 'MEDICATION_NOT_FOUND',
          message: `Medication with ID ${id} not found`
        }
      };
    }

    const discontinuedMedication: Medication = {
      ...medication,
      status: 'discontinued',
      endDate: new Date().toISOString(),
      notes: medication.notes
        ? `${medication.notes}\nDiscontinued: ${reason}`
        : `Discontinued: ${reason}`,
      updatedAt: new Date().toISOString()
    };

    this.medications.set(id, discontinuedMedication);

    return { success: true, data: discontinuedMedication };
  }

  async checkDrugInteractions(
    medicationName: string,
    existingMedications: ExistingMedication[]
  ): Promise<DrugInteraction[]> {
    const interactions: DrugInteraction[] = [];
    const drugName = medicationName.toLowerCase();

    // Check if the new medication has known interactions
    const drugInteractions = DrugInteractionDatabase[drugName as keyof typeof DrugInteractionDatabase];

    if (drugInteractions) {
      for (const existingMed of existingMedications) {
        const existingDrugName = existingMed.name.toLowerCase();

        // Check if this existing medication interacts with the new one
        const interaction = drugInteractions.interactions.find(
          inter => inter.drug === existingDrugName
        );

        if (interaction) {
          interactions.push({
            medicationId: existingMed.id,
            medicationName: existingMed.name,
            severity: interaction.severity,
            description: interaction.description,
            clinicalEffects: interaction.clinicalEffects,
            management: interaction.management
          });
        }
      }
    }

    // Also check reverse interactions (existing medications that interact with the new one)
    for (const existingMed of existingMedications) {
      const existingDrugName = existingMed.name.toLowerCase();
      const existingDrugInteractions = DrugInteractionDatabase[existingDrugName as keyof typeof DrugInteractionDatabase];

      if (existingDrugInteractions) {
        const reverseInteraction = existingDrugInteractions.interactions.find(
          inter => inter.drug === drugName
        );

        if (reverseInteraction) {
          // Check if we haven't already added this interaction
          const alreadyExists = interactions.some(
            inter => inter.medicationId === existingMed.id
          );

          if (!alreadyExists) {
            interactions.push({
              medicationId: existingMed.id,
              medicationName: existingMed.name,
              severity: reverseInteraction.severity,
              description: reverseInteraction.description,
              clinicalEffects: reverseInteraction.clinicalEffects,
              management: reverseInteraction.management
            });
          }
        }
      }
    }

    return interactions;
  }

  private async getExistingMedicationsForPatient(patientId: string): Promise<ExistingMedication[]> {
    const medicationIds = this.patientMedicationIndex.get(patientId) || [];
    const medications = medicationIds
      .map(id => {
        const med = this.medications.get(id);
        return med ? {
          id: med.id,
          name: med.name,
          patientId: med.patientId
        } : null;
      })
      .filter((med): med is ExistingMedication => med !== null);

    return medications;
  }

  private getSideEffects(medicationName: string): Medication['sideEffects'] {
    const drugName = medicationName.toLowerCase();
    const knownSideEffects = SideEffectsDatabase[drugName as keyof typeof SideEffectsDatabase];

    if (knownSideEffects) {
      return knownSideEffects.map(sideEffect => ({
        ...sideEffect,
        reported: false
      }));
    }

    return [];
  }

  async deleteMedication(id: string): Promise<ServiceResult<boolean>> {
    const medication = this.medications.get(id);

    if (!medication) {
      return {
        success: false,
        error: {
          code: 'MEDICATION_NOT_FOUND',
          message: `Medication with ID ${id} not found`
        }
      };
    }

    this.medications.delete(id);

    // Update patient medication index
    const patientMedications = this.patientMedicationIndex.get(medication.patientId) || [];
    const updatedMedications = patientMedications.filter(medId => medId !== id);
    this.patientMedicationIndex.set(medication.patientId, updatedMedications);

    return { success: true, data: true };
  }

  async listMedications(): Promise<ServiceResult<Medication[]>> {
    const medications = Array.from(this.medications.values());
    return { success: true, data: medications };
  }

  async searchMedications(query: string): Promise<ServiceResult<Medication[]>> {
    const searchTerm = query.toLowerCase();
    const medications = Array.from(this.medications.values()).filter(med =>
      med.name.toLowerCase().includes(searchTerm) ||
      med.genericName?.toLowerCase().includes(searchTerm) ||
      med.brandName?.toLowerCase().includes(searchTerm) ||
      med.indication?.toLowerCase().includes(searchTerm)
    );

    return { success: true, data: medications };
  }
}