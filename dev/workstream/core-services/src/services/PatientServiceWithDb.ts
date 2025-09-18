import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { Patient, CreatePatient, UpdatePatient } from '../types/Patient';
import { CreatePatientSchema } from '../types/Patient';
import type { ServiceResult } from '../types/ServiceResult';
import { PatientRepository } from '../database/PatientRepository';

export class PatientServiceWithDb {
  constructor(private readonly patientRepository: PatientRepository) {}

  async createPatient(data: CreatePatient): Promise<ServiceResult<Patient>> {
    try {
      const validatedData = CreatePatientSchema.parse(data);

      // Check for duplicate identifier
      const existingPatient = await this.patientRepository.findByIdentifier(validatedData.identifier);
      if (existingPatient) {
        return {
          success: false,
          error: {
            code: 'DUPLICATE_IDENTIFIER',
            message: `Patient with identifier ${validatedData.identifier} already exists`
          }
        };
      }

      const patient = await this.patientRepository.create({
        ...validatedData,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

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
    try {
      const patient = await this.patientRepository.findById(id);

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

  async updatePatient(id: string, data: UpdatePatient): Promise<ServiceResult<Patient>> {
    try {
      const updatedPatient = await this.patientRepository.update(id, {
        ...data,
        updatedAt: new Date().toISOString()
      });

      if (!updatedPatient) {
        return {
          success: false,
          error: {
            code: 'PATIENT_NOT_FOUND',
            message: `Patient with ID ${id} not found`
          }
        };
      }

      return { success: true, data: updatedPatient };
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
    try {
      const deleted = await this.patientRepository.delete(id);

      if (!deleted) {
        return {
          success: false,
          error: {
            code: 'PATIENT_NOT_FOUND',
            message: `Patient with ID ${id} not found`
          }
        };
      }

      return { success: true, data: true };
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

  async listPatients(): Promise<ServiceResult<Patient[]>> {
    try {
      const patients = await this.patientRepository.findAll();
      return { success: true, data: patients };
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
}