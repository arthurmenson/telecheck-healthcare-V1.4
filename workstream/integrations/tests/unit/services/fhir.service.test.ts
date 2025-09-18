import { FhirService } from '../../../src/services/fhir.service';
import { FhirPatient } from '../../../src/domain/fhir/patient';
import { ValidationError } from '../../../src/domain/fhir/validation-error';
import { ExternalApiService } from '../../../src/services/external-api.service';

jest.mock('../../../src/services/external-api.service');
const MockedExternalApiService = ExternalApiService as jest.MockedClass<typeof ExternalApiService>;

describe('FhirService', () => {
  let fhirService: FhirService;
  let mockApiService: jest.Mocked<ExternalApiService>;

  beforeEach(() => {
    mockApiService = new MockedExternalApiService({
      baseUrl: 'https://fhir.example.com',
      timeout: 5000,
      retryAttempts: 3,
      circuitBreakerConfig: {
        failureThreshold: 3,
        recoveryTimeout: 5000,
        monitoringPeriod: 10000
      }
    }) as jest.Mocked<ExternalApiService>;

    MockedExternalApiService.mockImplementation(() => mockApiService);

    fhirService = new FhirService({
      baseUrl: 'https://fhir.example.com',
      timeout: 5000,
      retryAttempts: 3,
      validateResources: true,
      circuitBreakerConfig: {
        failureThreshold: 3,
        recoveryTimeout: 5000,
        monitoringPeriod: 10000
      }
    });
  });

  describe('createPatient', () => {
    it('should create a valid patient', async () => {
      const inputPatient: FhirPatient = {
        resourceType: 'Patient',
        id: 'patient-123',
        active: true,
        name: [{
          family: 'Doe',
          given: ['John']
        }]
      };

      const createdPatient: FhirPatient = {
        ...inputPatient,
        id: 'patient-456'
      };

      mockApiService.post.mockResolvedValue(createdPatient);

      const result = await fhirService.createPatient(inputPatient);

      expect(result).toEqual(createdPatient);
      expect(mockApiService.post).toHaveBeenCalledWith('/Patient', inputPatient);
    });

    it('should reject invalid patient data', async () => {
      const invalidPatient = {
        resourceType: 'Person',
        id: 'patient-123'
      } as any;

      await expect(fhirService.createPatient(invalidPatient)).rejects.toThrow(ValidationError);
      expect(mockApiService.post).not.toHaveBeenCalled();
    });

    it('should skip validation when configured to do so', async () => {
      const fhirServiceWithoutValidation = new FhirService({
        baseUrl: 'https://fhir.example.com',
        timeout: 5000,
        retryAttempts: 3,
        validateResources: false,
        circuitBreakerConfig: {
          failureThreshold: 3,
          recoveryTimeout: 5000,
          monitoringPeriod: 10000
        }
      });

      const invalidPatient = {
        resourceType: 'Person',
        id: 'patient-123'
      } as any;

      const createdPatient = { ...invalidPatient, id: 'patient-456' };
      mockApiService.post.mockResolvedValue(createdPatient);

      const result = await fhirServiceWithoutValidation.createPatient(invalidPatient);

      expect(result).toEqual(createdPatient);
      expect(mockApiService.post).toHaveBeenCalledWith('/Patient', invalidPatient);
    });
  });

  describe('getPatient', () => {
    it('should retrieve a patient by ID', async () => {
      const patient: FhirPatient = {
        resourceType: 'Patient',
        id: 'patient-123',
        active: true,
        name: [{
          family: 'Doe',
          given: ['John']
        }]
      };

      mockApiService.get.mockResolvedValue(patient);

      const result = await fhirService.getPatient('patient-123');

      expect(result).toEqual(patient);
      expect(mockApiService.get).toHaveBeenCalledWith('/Patient/patient-123');
    });

    it('should reject invalid patient data from server', async () => {
      const invalidPatient = {
        resourceType: 'Person',
        id: 'patient-123'
      } as any;

      mockApiService.get.mockResolvedValue(invalidPatient);

      await expect(fhirService.getPatient('patient-123')).rejects.toThrow('Invalid patient resource received from server');
    });
  });

  describe('updatePatient', () => {
    it('should update a patient', async () => {
      const patient: FhirPatient = {
        resourceType: 'Patient',
        id: 'patient-123',
        active: true,
        name: [{
          family: 'Smith',
          given: ['John']
        }]
      };

      const updatedPatient = { ...patient, active: false };
      mockApiService.put.mockResolvedValue(updatedPatient);

      const result = await fhirService.updatePatient('patient-123', patient);

      expect(result).toEqual(updatedPatient);
      expect(mockApiService.put).toHaveBeenCalledWith('/Patient/patient-123', patient);
    });

    it('should reject patient with mismatched ID', async () => {
      const patient: FhirPatient = {
        resourceType: 'Patient',
        id: 'patient-456',
        active: true,
        name: [{
          family: 'Doe',
          given: ['John']
        }]
      };

      await expect(fhirService.updatePatient('patient-123', patient)).rejects.toThrow('Patient ID mismatch');
      expect(mockApiService.put).not.toHaveBeenCalled();
    });
  });

  describe('deletePatient', () => {
    it('should delete a patient', async () => {
      mockApiService.delete.mockResolvedValue(undefined);

      await fhirService.deletePatient('patient-123');

      expect(mockApiService.delete).toHaveBeenCalledWith('/Patient/patient-123');
    });
  });

  describe('searchPatients', () => {
    it('should search patients with parameters', async () => {
      const searchBundle = {
        resourceType: 'Bundle' as const,
        total: 1,
        entry: [{
          resource: {
            resourceType: 'Patient' as const,
            id: 'patient-123',
            active: true,
            name: [{
              family: 'Doe',
              given: ['John']
            }]
          }
        }]
      };

      mockApiService.get.mockResolvedValue(searchBundle);

      const result = await fhirService.searchPatients({
        family: 'Doe',
        active: true,
        _count: 10
      });

      expect(result).toEqual(searchBundle);
      expect(mockApiService.get).toHaveBeenCalledWith('/Patient?family=Doe&active=true&_count=10');
    });

    it('should validate patient resources in search results', async () => {
      const searchBundle = {
        resourceType: 'Bundle' as const,
        total: 1,
        entry: [{
          resource: {
            resourceType: 'Person',
            id: 'patient-123'
          }
        }]
      } as any;

      mockApiService.get.mockResolvedValue(searchBundle);

      await expect(fhirService.searchPatients({ family: 'Doe' }))
        .rejects.toThrow('Invalid patient resource in search results');
    });
  });

  describe('circuit breaker integration', () => {
    it('should expose circuit breaker state', () => {
      mockApiService.getCircuitBreakerState.mockReturnValue('CLOSED' as any);

      const state = fhirService.getCircuitBreakerState();

      expect(state).toBe('CLOSED');
      expect(mockApiService.getCircuitBreakerState).toHaveBeenCalled();
    });
  });
});