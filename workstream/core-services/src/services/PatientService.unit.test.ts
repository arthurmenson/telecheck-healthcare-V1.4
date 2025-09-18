import { describe, it, expect, beforeEach } from '@jest/globals';
import { PatientService } from './PatientService';
import type { CreatePatient } from '../types/Patient';

describe('PatientService', () => {
  let patientService: PatientService;

  beforeEach(() => {
    patientService = new PatientService();
  });

  describe('createPatient', () => {
    it('should create a new patient with valid data', async () => {
      const createPatientData: CreatePatient = {
        identifier: 'P001',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-05-15T00:00:00.000Z',
        gender: 'male',
        email: 'john.doe@example.com',
        phone: '+1234567890'
      };

      const result = await patientService.createPatient(createPatientData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.identifier).toBe('P001');
        expect(result.data.firstName).toBe('John');
        expect(result.data.lastName).toBe('Doe');
        expect(result.data.id).toBeDefined();
        expect(result.data.createdAt).toBeDefined();
        expect(result.data.updatedAt).toBeDefined();
      }
    });

    it('should return error for invalid patient data', async () => {
      const invalidPatientData = {
        identifier: '',
        firstName: '',
        lastName: 'Doe',
        dateOfBirth: 'invalid-date',
        gender: 'invalid-gender'
      } as unknown as CreatePatient;

      const result = await patientService.createPatient(invalidPatientData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return error for duplicate patient identifier', async () => {
      const patientData: CreatePatient = {
        identifier: 'P001',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-05-15T00:00:00.000Z',
        gender: 'male'
      };

      await patientService.createPatient(patientData);
      const result = await patientService.createPatient(patientData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('DUPLICATE_IDENTIFIER');
      }
    });
  });

  describe('getPatient', () => {
    it('should return patient by ID', async () => {
      const createData: CreatePatient = {
        identifier: 'P002',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '1985-08-20T00:00:00.000Z',
        gender: 'female'
      };

      const createResult = await patientService.createPatient(createData);
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const getResult = await patientService.getPatient(createResult.data.id);

        expect(getResult.success).toBe(true);
        if (getResult.success) {
          expect(getResult.data.id).toBe(createResult.data.id);
          expect(getResult.data.identifier).toBe('P002');
        }
      }
    });

    it('should return error for non-existent patient', async () => {
      const result = await patientService.getPatient('non-existent-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PATIENT_NOT_FOUND');
      }
    });
  });

  describe('updatePatient', () => {
    it('should update patient data', async () => {
      const createData: CreatePatient = {
        identifier: 'P003',
        firstName: 'Bob',
        lastName: 'Johnson',
        dateOfBirth: '1992-03-10T00:00:00.000Z',
        gender: 'male'
      };

      const createResult = await patientService.createPatient(createData);
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const updateData = {
          firstName: 'Robert',
          email: 'robert.johnson@example.com'
        };

        const updateResult = await patientService.updatePatient(createResult.data.id, updateData);

        expect(updateResult.success).toBe(true);
        if (updateResult.success) {
          expect(updateResult.data.firstName).toBe('Robert');
          expect(updateResult.data.email).toBe('robert.johnson@example.com');
          expect(updateResult.data.lastName).toBe('Johnson');
        }
      }
    });
  });

  describe('deletePatient', () => {
    it('should delete patient', async () => {
      const createData: CreatePatient = {
        identifier: 'P004',
        firstName: 'Alice',
        lastName: 'Wilson',
        dateOfBirth: '1988-12-05T00:00:00.000Z',
        gender: 'female'
      };

      const createResult = await patientService.createPatient(createData);
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const deleteResult = await patientService.deletePatient(createResult.data.id);

        expect(deleteResult.success).toBe(true);

        const getResult = await patientService.getPatient(createResult.data.id);
        expect(getResult.success).toBe(false);
      }
    });
  });
});