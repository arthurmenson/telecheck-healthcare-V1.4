import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { PatientRepository } from '../repositories/PatientRepository';
import { CreatePatientDto, UpdatePatientDto, PatientSearchParams, CreatePatientSchema, UpdatePatientSchema } from '../types/Patient';
import { ServiceResult } from '../types/ServiceResult';
import { patients } from '@spark-den/database/src/schema/healthcare';

export class PatientService {
  private patientRepository: PatientRepository;

  constructor(private db: PostgresJsDatabase<any>) {
    this.patientRepository = new PatientRepository(db);
  }

  /**
   * Create a new patient with validation
   */
  async createPatient(data: CreatePatientDto): Promise<ServiceResult<typeof patients.$inferSelect>> {
    try {
      // Validate input data
      const validationResult = CreatePatientSchema.safeParse(data);
      if (!validationResult.success) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid patient data',
            details: validationResult.error.errors
          }
        };
      }

      // Normalize data
      const normalizedData = {
        ...validationResult.data,
        firstName: validationResult.data.firstName.trim(),
        lastName: validationResult.data.lastName.trim(),
        email: validationResult.data.email.toLowerCase().trim(),
        state: validationResult.data.state.toUpperCase(),
        city: validationResult.data.city.trim(),
        address: validationResult.data.address.trim(),
        emergencyContactName: validationResult.data.emergencyContactName.trim(),
        phone: this.normalizePhone(validationResult.data.phone),
        emergencyContactPhone: this.normalizePhone(validationResult.data.emergencyContactPhone)
      };

      return await this.patientRepository.create(normalizedData);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to create patient',
          details: error
        }
      };
    }
  }

  /**
   * Get patient by ID
   */
  async getPatient(id: string): Promise<ServiceResult<typeof patients.$inferSelect | null>> {
    if (!this.isValidUUID(id)) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid patient ID format',
          details: { id }
        }
      };
    }

    return await this.patientRepository.findById(id);
  }

  /**
   * Get patient by email
   */
  async getPatientByEmail(email: string): Promise<ServiceResult<typeof patients.$inferSelect | null>> {
    if (!email || !this.isValidEmail(email)) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid email format',
          details: { email }
        }
      };
    }

    return await this.patientRepository.findByEmail(email.toLowerCase().trim());
  }

  /**
   * Update patient with validation
   */
  async updatePatient(id: string, data: UpdatePatientDto): Promise<ServiceResult<typeof patients.$inferSelect>> {
    try {
      if (!this.isValidUUID(id)) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid patient ID format',
            details: { id }
          }
        };
      }

      // Validate input data
      const validationResult = UpdatePatientSchema.safeParse(data);
      if (!validationResult.success) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid patient update data',
            details: validationResult.error.errors
          }
        };
      }

      // Normalize data
      const normalizedData: UpdatePatientDto = {};
      Object.entries(validationResult.data).forEach(([key, value]) => {
        if (value !== undefined) {
          switch (key) {
            case 'firstName':
            case 'lastName':
            case 'city':
            case 'address':
            case 'emergencyContactName':
              normalizedData[key as keyof UpdatePatientDto] = (value as string).trim();
              break;
            case 'email':
              normalizedData.email = (value as string).toLowerCase().trim();
              break;
            case 'state':
              normalizedData.state = (value as string).toUpperCase();
              break;
            case 'phone':
            case 'emergencyContactPhone':
              normalizedData[key as keyof UpdatePatientDto] = this.normalizePhone(value as string);
              break;
            default:
              normalizedData[key as keyof UpdatePatientDto] = value as any;
          }
        }
      });

      return await this.patientRepository.update(id, normalizedData);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to update patient',
          details: error
        }
      };
    }
  }

  /**
   * Soft delete patient
   */
  async deletePatient(id: string): Promise<ServiceResult<boolean>> {
    if (!this.isValidUUID(id)) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid patient ID format',
          details: { id }
        }
      };
    }

    return await this.patientRepository.softDelete(id);
  }

  /**
   * Search patients with filters
   */
  async searchPatients(params: PatientSearchParams): Promise<ServiceResult<{
    patients: (typeof patients.$inferSelect)[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>> {
    try {
      // Validate and sanitize search parameters
      const sanitizedParams = this.sanitizeSearchParams(params);

      return await this.patientRepository.search(sanitizedParams);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to search patients',
          details: error
        }
      };
    }
  }

  /**
   * Get all patients with pagination
   */
  async listPatients(
    page: number = 1,
    pageSize: number = 20,
    includeInactive: boolean = false
  ): Promise<ServiceResult<{
    patients: (typeof patients.$inferSelect)[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>> {
    try {
      const validatedPage = Math.max(1, Math.floor(page));
      const validatedPageSize = Math.max(1, Math.min(100, Math.floor(pageSize))); // Max 100 per page

      return await this.patientRepository.findAll(validatedPage, validatedPageSize, includeInactive);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to retrieve patients',
          details: error
        }
      };
    }
  }

  /**
   * Get patient statistics
   */
  async getPatientStatistics(): Promise<ServiceResult<{
    totalPatients: number;
    activePatients: number;
    inactivePatients: number;
    averageAge: number;
    genderDistribution: { male: number; female: number; other: number };
    topCities: { city: string; count: number }[];
  }>> {
    return await this.patientRepository.getStats();
  }

  // Private helper methods
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private normalizePhone(phone: string): string {
    // Remove all non-digit characters except +
    return phone.replace(/[^\d\+]/g, '');
  }

  private sanitizeSearchParams(params: PatientSearchParams): PatientSearchParams {
    return {
      ...params,
      search: params.search?.trim(),
      city: params.city?.trim(),
      state: params.state?.toUpperCase(),
      insuranceProvider: params.insuranceProvider?.trim(),
      page: Math.max(1, Math.floor(params.page || 1)),
      pageSize: Math.max(1, Math.min(100, Math.floor(params.pageSize || 20))),
      ageMin: params.ageMin ? Math.max(0, Math.floor(params.ageMin)) : undefined,
      ageMax: params.ageMax ? Math.max(0, Math.floor(params.ageMax)) : undefined
    };
  }
}