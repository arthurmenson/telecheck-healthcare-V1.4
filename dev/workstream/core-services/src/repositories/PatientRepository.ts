import { eq, and, or, like, desc, asc, count, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { patients } from '@spark-den/database/src/schema/healthcare';
import { CreatePatientDto, UpdatePatientDto, PatientSearchParams, PatientWithStats } from '../types/Patient';
import { ServiceResult } from '../types/ServiceResult';

export class PatientRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  /**
   * Create a new patient
   */
  async create(data: CreatePatientDto): Promise<ServiceResult<typeof patients.$inferSelect>> {
    try {
      // Check if patient with email already exists
      const existingPatient = await this.db
        .select({ id: patients.id })
        .from(patients)
        .where(eq(patients.email, data.email))
        .limit(1);

      if (existingPatient.length > 0) {
        return {
          success: false,
          error: {
            code: 'PATIENT_EXISTS',
            message: 'A patient with this email already exists',
            details: { email: data.email }
          }
        };
      }

      const [newPatient] = await this.db
        .insert(patients)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return {
        success: true,
        data: newPatient
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create patient',
          details: error
        }
      };
    }
  }

  /**
   * Get patient by ID
   */
  async findById(id: string): Promise<ServiceResult<typeof patients.$inferSelect | null>> {
    try {
      const [patient] = await this.db
        .select()
        .from(patients)
        .where(and(
          eq(patients.id, id),
          eq(patients.isActive, true)
        ))
        .limit(1);

      return {
        success: true,
        data: patient || null
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve patient',
          details: error
        }
      };
    }
  }

  /**
   * Get patient by email
   */
  async findByEmail(email: string): Promise<ServiceResult<typeof patients.$inferSelect | null>> {
    try {
      const [patient] = await this.db
        .select()
        .from(patients)
        .where(and(
          eq(patients.email, email),
          eq(patients.isActive, true)
        ))
        .limit(1);

      return {
        success: true,
        data: patient || null
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve patient by email',
          details: error
        }
      };
    }
  }

  /**
   * Update patient
   */
  async update(id: string, data: UpdatePatientDto): Promise<ServiceResult<typeof patients.$inferSelect>> {
    try {
      // Check if patient exists
      const existingResult = await this.findById(id);
      if (!existingResult.success || !existingResult.data) {
        return {
          success: false,
          error: {
            code: 'PATIENT_NOT_FOUND',
            message: 'Patient not found',
            details: { id }
          }
        };
      }

      // If email is being updated, check for conflicts
      if (data.email && data.email !== existingResult.data.email) {
        const emailCheckResult = await this.findByEmail(data.email);
        if (emailCheckResult.success && emailCheckResult.data) {
          return {
            success: false,
            error: {
              code: 'EMAIL_CONFLICT',
              message: 'Another patient with this email already exists',
              details: { email: data.email }
            }
          };
        }
      }

      const [updatedPatient] = await this.db
        .update(patients)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(patients.id, id))
        .returning();

      return {
        success: true,
        data: updatedPatient
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update patient',
          details: error
        }
      };
    }
  }

  /**
   * Soft delete patient (set isActive to false)
   */
  async softDelete(id: string): Promise<ServiceResult<boolean>> {
    try {
      const result = await this.db
        .update(patients)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(patients.id, id));

      return {
        success: true,
        data: result.rowCount > 0
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete patient',
          details: error
        }
      };
    }
  }

  /**
   * Hard delete patient (permanent deletion)
   */
  async hardDelete(id: string): Promise<ServiceResult<boolean>> {
    try {
      const result = await this.db
        .delete(patients)
        .where(eq(patients.id, id));

      return {
        success: true,
        data: result.rowCount > 0
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to permanently delete patient',
          details: error
        }
      };
    }
  }

  /**
   * Search patients with filters and pagination
   */
  async search(params: PatientSearchParams): Promise<ServiceResult<{
    patients: (typeof patients.$inferSelect)[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>> {
    try {
      const {
        search,
        gender,
        ageMin,
        ageMax,
        city,
        state,
        insuranceProvider,
        isActive = true,
        page = 1,
        pageSize = 20,
        sortBy = 'lastName',
        sortOrder = 'asc'
      } = params;

      const offset = (page - 1) * pageSize;
      
      // Build where conditions
      const conditions = [eq(patients.isActive, isActive)];

      if (search) {
        conditions.push(
          or(
            like(patients.firstName, `%${search}%`),
            like(patients.lastName, `%${search}%`),
            like(patients.email, `%${search}%`),
            like(patients.phone, `%${search}%`)
          )!
        );
      }

      if (gender) {
        conditions.push(eq(patients.gender, gender));
      }

      if (city) {
        conditions.push(like(patients.city, `%${city}%`));
      }

      if (state) {
        conditions.push(eq(patients.state, state));
      }

      if (insuranceProvider) {
        conditions.push(like(patients.insuranceProvider, `%${insuranceProvider}%`));
      }

      // Age filter (calculate from date of birth)
      if (ageMin || ageMax) {
        const today = new Date();
        
        if (ageMin) {
          const maxBirthDate = new Date(today.getFullYear() - ageMin, today.getMonth(), today.getDate());
          conditions.push(sql`${patients.dateOfBirth} <= ${maxBirthDate.toISOString().split('T')[0]}`);
        }
        
        if (ageMax) {
          const minBirthDate = new Date(today.getFullYear() - ageMax - 1, today.getMonth(), today.getDate());
          conditions.push(sql`${patients.dateOfBirth} > ${minBirthDate.toISOString().split('T')[0]}`);
        }
      }

      const whereClause = and(...conditions);

      // Get total count
      const [{ total }] = await this.db
        .select({ total: count() })
        .from(patients)
        .where(whereClause);

      // Get patients with pagination and sorting
      const sortColumn = patients[sortBy as keyof typeof patients] || patients.lastName;
      const orderBy = sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

      const patientsResult = await this.db
        .select()
        .from(patients)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset);

      const totalPages = Math.ceil(total / pageSize);

      return {
        success: true,
        data: {
          patients: patientsResult,
          total,
          page,
          pageSize,
          totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to search patients',
          details: error
        }
      };
    }
  }

  /**
   * Get all patients (with pagination)
   */
  async findAll(
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
    return this.search({
      page,
      pageSize,
      isActive: !includeInactive
    });
  }

  /**
   * Get patient statistics
   */
  async getStats(): Promise<ServiceResult<{
    totalPatients: number;
    activePatients: number;
    inactivePatients: number;
    averageAge: number;
    genderDistribution: { male: number; female: number; other: number };
    topCities: { city: string; count: number }[];
  }>> {
    try {
      // Get total counts
      const [{ totalPatients }] = await this.db
        .select({ totalPatients: count() })
        .from(patients);

      const [{ activePatients }] = await this.db
        .select({ activePatients: count() })
        .from(patients)
        .where(eq(patients.isActive, true));

      const inactivePatients = totalPatients - activePatients;

      // Calculate average age
      const avgAgeResult = await this.db
        .select({
          avgAge: sql<number>`AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${patients.dateOfBirth})))`
        })
        .from(patients)
        .where(eq(patients.isActive, true));

      const averageAge = Math.round(avgAgeResult[0]?.avgAge || 0);

      // Gender distribution
      const genderStats = await this.db
        .select({
          gender: patients.gender,
          count: count()
        })
        .from(patients)
        .where(eq(patients.isActive, true))
        .groupBy(patients.gender);

      const genderDistribution = {
        male: 0,
        female: 0,
        other: 0
      };

      genderStats.forEach(({ gender, count }) => {
        if (gender.toLowerCase() === 'male') genderDistribution.male = count;
        else if (gender.toLowerCase() === 'female') genderDistribution.female = count;
        else genderDistribution.other += count;
      });

      // Top cities
      const topCities = await this.db
        .select({
          city: patients.city,
          count: count()
        })
        .from(patients)
        .where(eq(patients.isActive, true))
        .groupBy(patients.city)
        .orderBy(desc(count()))
        .limit(10);

      return {
        success: true,
        data: {
          totalPatients,
          activePatients,
          inactivePatients,
          averageAge,
          genderDistribution,
          topCities
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve patient statistics',
          details: error
        }
      };
    }
  }

  /**
   * Bulk create patients
   */
  async bulkCreate(patientsData: CreatePatientDto[]): Promise<ServiceResult<{
    created: (typeof patients.$inferSelect)[];
    errors: { index: number; email: string; error: string }[];
  }>> {
    try {
      const created: (typeof patients.$inferSelect)[] = [];
      const errors: { index: number; email: string; error: string }[] = [];

      for (let i = 0; i < patientsData.length; i++) {
        const patientData = patientsData[i];
        const result = await this.create(patientData);
        
        if (result.success) {
          created.push(result.data!);
        } else {
          errors.push({
            index: i,
            email: patientData.email,
            error: result.error!.message
          });
        }
      }

      return {
        success: true,
        data: {
          created,
          errors
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to bulk create patients',
          details: error
        }
      };
    }
  }

  /**
   * Reactivate a soft-deleted patient
   */
  async reactivate(id: string): Promise<ServiceResult<typeof patients.$inferSelect>> {
    try {
      const [reactivatedPatient] = await this.db
        .update(patients)
        .set({
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(patients.id, id))
        .returning();

      if (!reactivatedPatient) {
        return {
          success: false,
          error: {
            code: 'PATIENT_NOT_FOUND',
            message: 'Patient not found',
            details: { id }
          }
        };
      }

      return {
        success: true,
        data: reactivatedPatient
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to reactivate patient',
          details: error
        }
      };
    }
  }
}