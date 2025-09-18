import { FHIRClient } from '../../src/fhir/client';
import { Patient, Observation } from '../../src/fhir/types';

describe('FHIRClient', () => {
  let client: FHIRClient;

  beforeEach(() => {
    client = new FHIRClient({
      baseUrl: 'https://fhir.test.com',
      apiKey: 'test-key'
    });
  });

  describe('createPatient', () => {
    it('should create a patient resource following FHIR R4 standard', async () => {
      const patientData: Partial<Patient> = {
        name: [{
          given: ['John'],
          family: 'Doe'
        }],
        gender: 'male',
        birthDate: '1990-01-01'
      };

      const result = await client.createPatient(patientData);

      expect(result.resourceType).toBe('Patient');
      expect(result.id).toBeDefined();
      expect(result.name?.[0]?.given?.[0]).toBe('John');
      expect(result.name?.[0]?.family).toBe('Doe');
    });

    it('should validate patient data against FHIR R4 schema', async () => {
      const invalidPatientData = {
        name: 'invalid-name-format'
      };

      await expect(client.createPatient(invalidPatientData))
        .rejects
        .toThrow('Invalid FHIR resource format');
    });
  });

  describe('getPatient', () => {
    it('should retrieve patient by ID', async () => {
      const patientId = 'patient-123';

      const result = await client.getPatient(patientId);

      expect(result.resourceType).toBe('Patient');
      expect(result.id).toBe(patientId);
    });

    it('should handle not found patient gracefully', async () => {
      await expect(client.getPatient('non-existent'))
        .rejects
        .toThrow('Patient not found');
    });
  });

  describe('createObservation', () => {
    it('should create observation with proper FHIR structure', async () => {
      const observationData: Partial<Observation> = {
        status: 'final',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '85354-9',
            display: 'Blood pressure'
          }]
        },
        subject: {
          reference: 'Patient/123'
        },
        valueQuantity: {
          value: 120,
          unit: 'mmHg'
        }
      };

      const result = await client.createObservation(observationData);

      expect(result.resourceType).toBe('Observation');
      expect(result.status).toBe('final');
      expect(result.subject?.reference).toBe('Patient/123');
    });
  });
});