import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { Patient, CreatePatient, UpdatePatient } from '../types/Patient';
import { PatientSchema, CreatePatientSchema } from '../types/Patient';
import type { ServiceResult } from '../types/ServiceResult';

export class PatientService {
  private patients: Map<string, Patient> = new Map();
  private identifierIndex: Set<string> = new Set();

  async createPatient(data: CreatePatient): Promise<ServiceResult<Patient>> {
    try {
      const validatedData = CreatePatientSchema.parse(data);

      if (this.identifierIndex.has(validatedData.identifier)) {
        return {
          success: false,
          error: {
            code: 'DUPLICATE_IDENTIFIER',
            message: `Patient with identifier ${validatedData.identifier} already exists`
          }
        };
      }

      const patient: Patient = {
        ...validatedData,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.patients.set(patient.id, patient);
      this.identifierIndex.add(patient.identifier);

      return { success: true, data: patient };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid patient data',
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

  async getPatient(id: string): Promise<ServiceResult<Patient>> {
    const patient = this.patients.get(id);

    if (!patient) {
      return {
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: `Patient with ID ${id} not found`
        }
      };
    }

    return { success: true, data: patient };
  }

  async updatePatient(id: string, data: UpdatePatient): Promise<ServiceResult<Patient>> {
    const existingPatient = this.patients.get(id);

    if (!existingPatient) {
      return {
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: `Patient with ID ${id} not found`
        }
      };
    }

    try {
      const updatedPatient = {
        ...existingPatient,
        ...data,
        updatedAt: new Date().toISOString()
      };

      const validatedPatient = PatientSchema.parse(updatedPatient);
      this.patients.set(id, validatedPatient);

      return { success: true, data: validatedPatient };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update data',
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

  async deletePatient(id: string): Promise<ServiceResult<boolean>> {
    const patient = this.patients.get(id);

    if (!patient) {
      return {
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: `Patient with ID ${id} not found`
        }
      };
    }

    this.patients.delete(id);
    this.identifierIndex.delete(patient.identifier);

    return { success: true, data: true };
  }

  async listPatients(): Promise<ServiceResult<Patient[]>> {
    const patients = Array.from(this.patients.values());
    return { success: true, data: patients };
  }
}