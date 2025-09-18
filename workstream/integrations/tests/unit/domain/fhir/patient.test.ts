import { FhirPatient, PatientValidator } from '../../../../src/domain/fhir/patient';
import { ValidationError } from '../../../../src/domain/fhir/validation-error';

describe('FHIR Patient', () => {
  let validator: PatientValidator;

  beforeEach(() => {
    validator = new PatientValidator();
  });

  describe('Patient validation', () => {
    it('should validate a minimal valid patient', () => {
      const patient: FhirPatient = {
        resourceType: 'Patient',
        id: 'patient-123',
        active: true,
        name: [{
          family: 'Doe',
          given: ['John']
        }]
      };

      const result = validator.validate(patient);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require resourceType to be Patient', () => {
      const patient = {
        resourceType: 'Person',
        id: 'patient-123'
      } as any;

      const result = validator.validate(patient);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('resourceType must be "Patient"');
    });

    it('should validate patient with multiple names', () => {
      const patient: FhirPatient = {
        resourceType: 'Patient',
        id: 'patient-123',
        active: true,
        name: [
          {
            use: 'official',
            family: 'Doe',
            given: ['John', 'Michael']
          },
          {
            use: 'nickname',
            given: ['Johnny']
          }
        ]
      };

      const result = validator.validate(patient);
      expect(result.isValid).toBe(true);
    });

    it('should validate patient with telecom information', () => {
      const patient: FhirPatient = {
        resourceType: 'Patient',
        id: 'patient-123',
        active: true,
        name: [{
          family: 'Doe',
          given: ['John']
        }],
        telecom: [
          {
            system: 'phone',
            value: '+1-555-123-4567',
            use: 'home'
          },
          {
            system: 'email',
            value: 'john.doe@example.com',
            use: 'work'
          }
        ]
      };

      const result = validator.validate(patient);
      expect(result.isValid).toBe(true);
    });

    it('should validate patient with address', () => {
      const patient: FhirPatient = {
        resourceType: 'Patient',
        id: 'patient-123',
        active: true,
        name: [{
          family: 'Doe',
          given: ['John']
        }],
        address: [{
          use: 'home',
          line: ['123 Main St'],
          city: 'Anytown',
          state: 'NY',
          postalCode: '12345',
          country: 'US'
        }]
      };

      const result = validator.validate(patient);
      expect(result.isValid).toBe(true);
    });

    it('should reject patient with invalid phone system', () => {
      const patient: FhirPatient = {
        resourceType: 'Patient',
        id: 'patient-123',
        active: true,
        name: [{
          family: 'Doe',
          given: ['John']
        }],
        telecom: [{
          system: 'invalidSystem' as any,
          value: '+1-555-123-4567'
        }]
      };

      const result = validator.validate(patient);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('telecom[0].system must be one of: phone, fax, email, pager, url, sms, other');
    });

    it('should reject patient with missing required id', () => {
      const patient = {
        resourceType: 'Patient',
        active: true,
        name: [{
          family: 'Doe',
          given: ['John']
        }]
      } as any;

      const result = validator.validate(patient);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('id is required');
    });
  });

  describe('Patient transformation', () => {
    it('should transform patient to FHIR R4 format', () => {
      const patientData = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-123-4567',
        isActive: true
      };

      const fhirPatient = FhirPatient.fromPlainObject(patientData);

      expect(fhirPatient.resourceType).toBe('Patient');
      expect(fhirPatient.id).toBe('patient-123');
      expect(fhirPatient.active).toBe(true);
      expect(fhirPatient.name?.[0]?.family).toBe('Doe');
      expect(fhirPatient.name?.[0]?.given).toEqual(['John']);
      expect(fhirPatient.telecom).toEqual([
        { system: 'email', value: 'john.doe@example.com' },
        { system: 'phone', value: '+1-555-123-4567' }
      ]);
    });

    it('should transform FHIR patient to plain object', () => {
      const fhirPatient: FhirPatient = {
        resourceType: 'Patient',
        id: 'patient-123',
        active: true,
        name: [{
          family: 'Doe',
          given: ['John']
        }],
        telecom: [
          { system: 'email', value: 'john.doe@example.com' },
          { system: 'phone', value: '+1-555-123-4567' }
        ]
      };

      const plainObject = FhirPatient.toPlainObject(fhirPatient);

      expect(plainObject).toEqual({
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-123-4567',
        isActive: true
      });
    });
  });
});