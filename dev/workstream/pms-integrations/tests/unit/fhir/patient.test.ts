import { describe, it, expect, beforeEach } from 'vitest';
import { PatientProvider } from '../../../src/fhir/providers/PatientProvider';
import { TestDataFactory } from '../../setup';
import { ExtendedPatient, FhirSearchParams } from '../../../src/types/fhir';

describe('PatientProvider', () => {
  let patientProvider: PatientProvider;

  beforeEach(() => {
    patientProvider = new PatientProvider();
  });

  describe('FHIR R4 Compliance', () => {
    it('should create a valid FHIR Patient resource', async () => {
      const patientData = TestDataFactory.createPatient({
        name: [{
          use: 'official',
          family: 'Smith',
          given: ['John', 'Michael']
        }],
        gender: 'male',
        birthDate: '1985-03-15'
      });

      const createdPatient = await patientProvider.create(patientData);

      expect(createdPatient).toBeValidFHIRResource('Patient');
      expect(createdPatient.id).toBeDefined();
      expect(createdPatient.meta).toBeDefined();
      expect(createdPatient.meta?.versionId).toBe('1');
      expect(createdPatient.meta?.lastUpdated).toBeDefined();
    });

    it('should enforce required fields for Patient creation', async () => {
      const invalidPatientData = {
        resourceType: 'Patient' as const,
        // Missing required fields: name, gender, birthDate
      };

      await expect(patientProvider.create(invalidPatientData)).rejects.toThrow();
    });

    it('should validate Patient identifiers', async () => {
      const patientData = TestDataFactory.createPatient({
        identifier: [
          {
            type: {
              coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                code: 'MR',
                display: 'Medical Record Number'
              }]
            },
            system: 'http://hospital.example.org',
            value: 'MRN123456789'
          }
        ]
      });

      const createdPatient = await patientProvider.create(patientData);
      expect(createdPatient.identifier).toBeDefined();
      expect(createdPatient.identifier![0].value).toBe('MRN123456789');
    });
  });

  describe('USCDI v3 Compliance', () => {
    it('should include required USCDI v3 Patient Demographics elements', async () => {
      const patientData = TestDataFactory.createPatient({
        name: [{
          use: 'official',
          family: 'Johnson',
          given: ['Sarah', 'Elizabeth']
        }],
        gender: 'female',
        birthDate: '1992-07-22',
        address: [{
          use: 'home',
          line: ['456 Oak Avenue'],
          city: 'Another City',
          state: 'ST',
          postalCode: '54321',
          country: 'US'
        }],
        telecom: [{
          system: 'phone',
          value: '+1-555-987-6543',
          use: 'mobile'
        }]
      });

      const createdPatient = await patientProvider.create(patientData);

      expect(createdPatient).toComplyWithUSCDI('v3');
      expect(createdPatient.name).toBeDefined();
      expect(createdPatient.gender).toBeDefined();
      expect(createdPatient.birthDate).toBeDefined();
      expect(createdPatient.address).toBeDefined();
      expect(createdPatient.telecom).toBeDefined();
    });

    it('should include US Core Race and Ethnicity extensions', async () => {
      const patientData = TestDataFactory.createPatient({
        extension: [
          {
            url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
            extension: [
              {
                url: 'ombCategory',
                valueCoding: {
                  system: 'urn:oid:2.16.840.1.113883.6.238',
                  code: '2106-3',
                  display: 'White'
                }
              }
            ]
          },
          {
            url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
            extension: [
              {
                url: 'ombCategory',
                valueCoding: {
                  system: 'urn:oid:2.16.840.1.113883.6.238',
                  code: '2186-5',
                  display: 'Not Hispanic or Latino'
                }
              }
            ]
          }
        ]
      });

      const createdPatient = await patientProvider.create(patientData);

      const raceExtension = createdPatient.extension?.find(
        ext => ext.url === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
      );
      const ethnicityExtension = createdPatient.extension?.find(
        ext => ext.url === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity'
      );

      expect(raceExtension).toBeDefined();
      expect(ethnicityExtension).toBeDefined();
    });

    it('should support preferred language communication', async () => {
      const patientData = TestDataFactory.createPatient({
        communication: [
          {
            language: {
              coding: [{
                system: 'urn:ietf:bcp:47',
                code: 'es-US',
                display: 'Spanish (United States)'
              }]
            },
            preferred: true
          }
        ]
      });

      const createdPatient = await patientProvider.create(patientData);

      expect(createdPatient.communication).toBeDefined();
      expect(createdPatient.communication![0].preferred).toBe(true);
      expect(createdPatient.communication![0].language.coding![0].code).toBe('es-US');
    });
  });

  describe('Search Operations', () => {
    beforeEach(async () => {
      // Create test patients for search operations
      await patientProvider.create(TestDataFactory.createPatient({
        id: 'search-patient-1',
        name: [{ family: 'Smith', given: ['John'] }],
        gender: 'male',
        birthDate: '1985-03-15'
      }));

      await patientProvider.create(TestDataFactory.createPatient({
        id: 'search-patient-2',
        name: [{ family: 'Johnson', given: ['Sarah'] }],
        gender: 'female',
        birthDate: '1992-07-22'
      }));
    });

    it('should search patients by name', async () => {
      const searchParams: FhirSearchParams = {
        name: 'Smith'
      };

      const results = await patientProvider.search(searchParams);

      expect(results.resourceType).toBe('Bundle');
      expect(results.type).toBe('searchset');
      expect(results.total).toBeGreaterThan(0);
      expect(results.entry).toBeDefined();

      const foundPatient = results.entry!.find(
        entry => entry.resource?.id === 'search-patient-1'
      );
      expect(foundPatient).toBeDefined();
    });

    it('should search patients by family name', async () => {
      const searchParams: FhirSearchParams = {
        family: 'Johnson'
      };

      const results = await patientProvider.search(searchParams);

      expect(results.total).toBeGreaterThan(0);
      const foundPatient = results.entry!.find(
        entry => entry.resource?.id === 'search-patient-2'
      );
      expect(foundPatient).toBeDefined();
    });

    it('should search patients by gender', async () => {
      const searchParams: FhirSearchParams = {
        gender: 'female'
      };

      const results = await patientProvider.search(searchParams);

      expect(results.total).toBeGreaterThan(0);
      results.entry!.forEach(entry => {
        expect((entry.resource as ExtendedPatient).gender).toBe('female');
      });
    });

    it('should search patients by birth date', async () => {
      const searchParams: FhirSearchParams = {
        birthdate: '1985-03-15'
      };

      const results = await patientProvider.search(searchParams);

      expect(results.total).toBeGreaterThan(0);
      const foundPatient = results.entry!.find(
        entry => entry.resource?.id === 'search-patient-1'
      );
      expect(foundPatient).toBeDefined();
    });

    it('should support pagination in search results', async () => {
      const searchParams: FhirSearchParams = {
        _count: 1,
        _offset: 0
      };

      const results = await patientProvider.search(searchParams);

      expect(results.entry).toBeDefined();
      expect(results.entry!.length).toBeLessThanOrEqual(1);
      expect(results.link).toBeDefined();
      expect(results.link!.some(link => link.relation === 'self')).toBe(true);
    });

    it('should provide search result links for navigation', async () => {
      const searchParams: FhirSearchParams = {
        _count: 1
      };

      const results = await patientProvider.search(searchParams);

      expect(results.link).toBeDefined();
      expect(results.link!.some(link => link.relation === 'self')).toBe(true);

      if (results.total! > 1) {
        expect(results.link!.some(link => link.relation === 'next')).toBe(true);
      }
    });
  });

  describe('CRUD Operations', () => {
    it('should read a patient by ID', async () => {
      const patientData = TestDataFactory.createPatient({ id: 'read-test-patient' });
      await patientProvider.create(patientData);

      const retrievedPatient = await patientProvider.read('read-test-patient');

      expect(retrievedPatient).toBeDefined();
      expect(retrievedPatient!.id).toBe('read-test-patient');
    });

    it('should return null for non-existent patient', async () => {
      const retrievedPatient = await patientProvider.read('non-existent-patient');
      expect(retrievedPatient).toBeNull();
    });

    it('should update a patient', async () => {
      const patientData = TestDataFactory.createPatient({ id: 'update-test-patient' });
      await patientProvider.create(patientData);

      const updatedData = {
        ...patientData,
        name: [{ family: 'UpdatedName', given: ['Updated'] }]
      };

      const updatedPatient = await patientProvider.update('update-test-patient', updatedData);

      expect(updatedPatient.name![0].family).toBe('UpdatedName');
      expect(updatedPatient.meta?.versionId).toBe('2');
    });

    it('should patch a patient', async () => {
      const patientData = TestDataFactory.createPatient({ id: 'patch-test-patient' });
      await patientProvider.create(patientData);

      const patchData = {
        telecom: [{
          system: 'email',
          value: 'updated@example.com'
        }]
      };

      const patchedPatient = await patientProvider.patch('patch-test-patient', patchData);

      expect(patchedPatient.telecom).toBeDefined();
      expect(patchedPatient.telecom![0].value).toBe('updated@example.com');
    });

    it('should delete a patient', async () => {
      const patientData = TestDataFactory.createPatient({ id: 'delete-test-patient' });
      await patientProvider.create(patientData);

      await patientProvider.delete('delete-test-patient');

      const retrievedPatient = await patientProvider.read('delete-test-patient');
      expect(retrievedPatient).toBeNull();
    });
  });

  describe('Versioning and History', () => {
    it('should maintain version history', async () => {
      const patientData = TestDataFactory.createPatient({ id: 'version-test-patient' });
      const createdPatient = await patientProvider.create(patientData);

      expect(createdPatient.meta?.versionId).toBe('1');

      const updatedPatient = await patientProvider.update('version-test-patient', {
        ...createdPatient,
        name: [{ family: 'UpdatedName', given: ['Updated'] }]
      });

      expect(updatedPatient.meta?.versionId).toBe('2');
    });

    it('should retrieve patient history', async () => {
      const patientData = TestDataFactory.createPatient({ id: 'history-test-patient' });
      await patientProvider.create(patientData);

      const history = await patientProvider.history('history-test-patient');

      expect(history.resourceType).toBe('Bundle');
      expect(history.type).toBe('history');
      expect(history.entry).toBeDefined();
      expect(history.entry!.length).toBeGreaterThan(0);
    });

    it('should read specific version of patient', async () => {
      const patientData = TestDataFactory.createPatient({ id: 'vread-test-patient' });
      const createdPatient = await patientProvider.create(patientData);

      const versionedPatient = await patientProvider.vread('vread-test-patient', '1');

      expect(versionedPatient).toBeDefined();
      expect(versionedPatient!.meta?.versionId).toBe('1');
    });
  });

  describe('Patient-Specific Operations', () => {
    it('should validate patient identity', async () => {
      const validPatient = TestDataFactory.createPatient({
        identifier: [{
          system: 'http://hospital.example.org',
          value: 'MRN123'
        }],
        name: [{ family: 'Test', given: ['Patient'] }],
        birthDate: '1990-01-01'
      });

      const isValid = await patientProvider.validatePatientIdentity(validPatient);
      expect(isValid).toBe(true);
    });

    it('should search patient by MRN', async () => {
      const patientData = TestDataFactory.createPatient({
        id: 'mrn-search-patient',
        identifier: [{
          type: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'MR'
            }]
          },
          system: 'http://hospital.example.org',
          value: 'MRN999888777'
        }]
      });

      await patientProvider.create(patientData);

      const foundPatient = await patientProvider.searchByMRN('MRN999888777');

      expect(foundPatient).toBeDefined();
      expect(foundPatient!.id).toBe('mrn-search-patient');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid patient data gracefully', async () => {
      const invalidPatient = {
        resourceType: 'Patient' as const,
        // Missing required fields
      };

      await expect(patientProvider.create(invalidPatient))
        .rejects.toThrow(/required/);
    });

    it('should handle update of non-existent patient', async () => {
      const patientData = TestDataFactory.createPatient();

      await expect(patientProvider.update('non-existent-id', patientData))
        .rejects.toThrow(/not found/);
    });

    it('should handle delete of non-existent patient', async () => {
      await expect(patientProvider.delete('non-existent-id'))
        .rejects.toThrow(/not found/);
    });
  });

  describe('Performance Requirements', () => {
    it('should create patient within performance threshold', async () => {
      const patientData = TestDataFactory.createPatient();

      const { executionTimeMs, withinThreshold } = await global.performanceTestUtils?.measureExecutionTime(
        () => patientProvider.create(patientData),
        1000 // 1 second threshold
      ) || { executionTimeMs: 0, withinThreshold: true };

      expect(withinThreshold).toBe(true);
      expect(executionTimeMs).toBeLessThan(1000);
    });

    it('should search patients within performance threshold', async () => {
      const { executionTimeMs, withinThreshold } = await global.performanceTestUtils?.measureExecutionTime(
        () => patientProvider.search({ name: 'Smith' }),
        2000 // 2 second threshold
      ) || { executionTimeMs: 0, withinThreshold: true };

      expect(withinThreshold).toBe(true);
      expect(executionTimeMs).toBeLessThan(2000);
    });
  });
});