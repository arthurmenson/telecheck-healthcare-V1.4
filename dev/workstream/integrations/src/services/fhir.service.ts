import { ExternalApiService, ExternalApiConfig } from './external-api.service';
import { FhirPatient, PatientValidator } from '../domain/fhir/patient';
import { ValidationError } from '../domain/fhir/validation-error';

export interface FhirServiceConfig extends ExternalApiConfig {
  validateResources: boolean;
}

export class FhirService {
  private apiService: ExternalApiService;
  private patientValidator: PatientValidator;
  private config: FhirServiceConfig;

  constructor(config: FhirServiceConfig) {
    this.config = config;
    this.apiService = new ExternalApiService(config);
    this.patientValidator = new PatientValidator();
  }

  async createPatient(patient: FhirPatient): Promise<FhirPatient> {
    if (this.config.validateResources) {
      const validationResult = this.patientValidator.validate(patient);
      const validationError = ValidationError.fromValidationResult(validationResult);
      if (validationError) {
        throw validationError;
      }
    }

    const createdPatient = await this.apiService.post<FhirPatient>('/Patient', patient);
    return createdPatient;
  }

  async getPatient(id: string): Promise<FhirPatient> {
    const patient = await this.apiService.get<FhirPatient>(`/Patient/${id}`);

    if (this.config.validateResources) {
      const validationResult = this.patientValidator.validate(patient);
      const validationError = ValidationError.fromValidationResult(validationResult);
      if (validationError) {
        throw new Error(`Invalid patient resource received from server: ${validationError.message}`);
      }
    }

    return patient;
  }

  async updatePatient(id: string, patient: FhirPatient): Promise<FhirPatient> {
    if (patient.id !== id) {
      throw new Error('Patient ID mismatch');
    }

    if (this.config.validateResources) {
      const validationResult = this.patientValidator.validate(patient);
      const validationError = ValidationError.fromValidationResult(validationResult);
      if (validationError) {
        throw validationError;
      }
    }

    const updatedPatient = await this.apiService.put<FhirPatient>(`/Patient/${id}`, patient);
    return updatedPatient;
  }

  async deletePatient(id: string): Promise<void> {
    await this.apiService.delete(`/Patient/${id}`);
  }

  async searchPatients(searchParams: {
    name?: string;
    family?: string;
    given?: string;
    email?: string;
    active?: boolean;
    _count?: number;
    _offset?: number;
  }): Promise<{
    resourceType: 'Bundle';
    total: number;
    entry: Array<{ resource: FhirPatient }>;
  }> {
    const queryString = new URLSearchParams();

    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined) {
        queryString.append(key, String(value));
      }
    });

    const searchUrl = `/Patient?${queryString.toString()}`;
    const bundle = await this.apiService.get<{
      resourceType: 'Bundle';
      total: number;
      entry: Array<{ resource: FhirPatient }>;
    }>(searchUrl);

    if (this.config.validateResources && bundle.entry) {
      for (const entry of bundle.entry) {
        const validationResult = this.patientValidator.validate(entry.resource);
        const validationError = ValidationError.fromValidationResult(validationResult);
        if (validationError) {
          throw new Error(`Invalid patient resource in search results: ${validationError.message}`);
        }
      }
    }

    return bundle;
  }

  getCircuitBreakerState() {
    return this.apiService.getCircuitBreakerState();
  }
}