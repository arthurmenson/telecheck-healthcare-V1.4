import { eq, and, or, like, desc, asc, count, sql, gte, lte, between } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { appointments, patients, providers } from '@spark-den/database/src/schema/healthcare';
import { CreateAppointmentDto, UpdateAppointmentDto } from '../types/Appointment';
import { ServiceResult } from '../types/ServiceResult';

export interface AppointmentSearchParams {
  patientId?: string;
  providerId?: string;
  status?: string;
  appointmentType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
  sortBy?: keyof typeof appointments.$inferSelect;
  sortOrder?: 'asc' | 'desc';
}

export interface AppointmentWithDetails extends typeof appointments.$inferSelect {
  patient: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  provider: {
    firstName: string;
    lastName: string;
    specialization: string;
  };
}

export class AppointmentRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  /**
   * Create a new appointment
   */
  async create(data: CreateAppointmentDto): Promise<ServiceResult<typeof appointments.$inferSelect>> {
    try {
      // Check for scheduling conflicts
      const conflictCheck = await this.checkSchedulingConflict(
        data.providerId,
        new Date(data.scheduledAt),
        data.duration
      );

      if (!conflictCheck.success) {
        return conflictCheck;
      }

      if (conflictCheck.data) {
        return {
          success: false,
          error: {
            code: 'SCHEDULING_CONFLICT',
            message: 'Provider is not available at the requested time',
            details: { scheduledAt: data.scheduledAt, duration: data.duration }
          }
        };
      }

      const [newAppointment] = await this.db
        .insert(appointments)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return {
        success: true,
        data: newAppointment
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create appointment',
          details: error
        }
      };
    }
  }

  /**
   * Get appointment by ID with patient and provider details
   */
  async findById(id: string): Promise<ServiceResult<AppointmentWithDetails | null>> {
    try {
      const [appointment] = await this.db
        .select({
          // Appointment fields
          id: appointments.id,
          patientId: appointments.patientId,
          providerId: appointments.providerId,
          scheduledAt: appointments.scheduledAt,
          duration: appointments.duration,
          appointmentType: appointments.appointmentType,
          status: appointments.status,
          notes: appointments.notes,
          createdAt: appointments.createdAt,
          updatedAt: appointments.updatedAt,
          // Patient details
          patient: {
            firstName: patients.firstName,
            lastName: patients.lastName,
            email: patients.email,
            phone: patients.phone
          },
          // Provider details
          provider: {
            firstName: providers.firstName,
            lastName: providers.lastName,
            specialization: providers.specialization
          }
        })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.id))
        .innerJoin(providers, eq(appointments.providerId, providers.id))
        .where(eq(appointments.id, id))
        .limit(1);

      return {
        success: true,
        data: appointment || null
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve appointment',
          details: error
        }
      };
    }
  }

  /**
   * Update appointment
   */
  async update(id: string, data: UpdateAppointmentDto): Promise<ServiceResult<typeof appointments.$inferSelect>> {
    try {
      // If scheduling details are being updated, check for conflicts
      if (data.scheduledAt || data.duration || data.providerId) {
        const existingAppointment = await this.db
          .select()
          .from(appointments)
          .where(eq(appointments.id, id))
          .limit(1);

        if (existingAppointment.length === 0) {
          return {
            success: false,
            error: {
              code: 'APPOINTMENT_NOT_FOUND',
              message: 'Appointment not found',
              details: { id }
            }
          };
        }

        const appointment = existingAppointment[0];
        const newProviderId = data.providerId || appointment.providerId;
        const newScheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : appointment.scheduledAt;
        const newDuration = data.duration || appointment.duration;

        const conflictCheck = await this.checkSchedulingConflict(
          newProviderId,
          newScheduledAt,
          newDuration,
          id // Exclude current appointment from conflict check
        );

        if (!conflictCheck.success) {
          return conflictCheck;
        }

        if (conflictCheck.data) {
          return {
            success: false,
            error: {
              code: 'SCHEDULING_CONFLICT',
              message: 'Provider is not available at the requested time',
              details: { scheduledAt: newScheduledAt, duration: newDuration }
            }
          };
        }
      }

      const [updatedAppointment] = await this.db
        .update(appointments)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(appointments.id, id))
        .returning();

      if (!updatedAppointment) {
        return {
          success: false,
          error: {
            code: 'APPOINTMENT_NOT_FOUND',
            message: 'Appointment not found',
            details: { id }
          }
        };
      }

      return {
        success: true,
        data: updatedAppointment
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update appointment',
          details: error
        }
      };
    }
  }

  /**
   * Delete appointment
   */
  async delete(id: string): Promise<ServiceResult<boolean>> {
    try {
      const result = await this.db
        .delete(appointments)
        .where(eq(appointments.id, id));

      return {
        success: true,
        data: result.rowCount > 0
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete appointment',
          details: error
        }
      };
    }
  }

  /**
   * Search appointments with filters and pagination
   */
  async search(params: AppointmentSearchParams): Promise<ServiceResult<{
    appointments: AppointmentWithDetails[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>> {
    try {
      const {
        patientId,
        providerId,
        status,
        appointmentType,
        startDate,
        endDate,
        page = 1,
        pageSize = 20,
        sortBy = 'scheduledAt',
        sortOrder = 'asc'
      } = params;

      const offset = (page - 1) * pageSize;
      
      // Build where conditions
      const conditions = [];

      if (patientId) {
        conditions.push(eq(appointments.patientId, patientId));
      }

      if (providerId) {
        conditions.push(eq(appointments.providerId, providerId));
      }

      if (status) {
        conditions.push(eq(appointments.status, status));
      }

      if (appointmentType) {
        conditions.push(eq(appointments.appointmentType, appointmentType));
      }

      if (startDate && endDate) {
        conditions.push(between(appointments.scheduledAt, startDate, endDate));
      } else if (startDate) {
        conditions.push(gte(appointments.scheduledAt, startDate));
      } else if (endDate) {
        conditions.push(lte(appointments.scheduledAt, endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [{ total }] = await this.db
        .select({ total: count() })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.id))
        .innerJoin(providers, eq(appointments.providerId, providers.id))
        .where(whereClause);

      // Get appointments with pagination and sorting
      const sortColumn = appointments[sortBy as keyof typeof appointments] || appointments.scheduledAt;
      const orderBy = sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

      const appointmentsResult = await this.db
        .select({
          // Appointment fields
          id: appointments.id,
          patientId: appointments.patientId,
          providerId: appointments.providerId,
          scheduledAt: appointments.scheduledAt,
          duration: appointments.duration,
          appointmentType: appointments.appointmentType,
          status: appointments.status,
          notes: appointments.notes,
          createdAt: appointments.createdAt,
          updatedAt: appointments.updatedAt,
          // Patient details
          patient: {
            firstName: patients.firstName,
            lastName: patients.lastName,
            email: patients.email,
            phone: patients.phone
          },
          // Provider details
          provider: {
            firstName: providers.firstName,
            lastName: providers.lastName,
            specialization: providers.specialization
          }
        })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.id))
        .innerJoin(providers, eq(appointments.providerId, providers.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset);

      const totalPages = Math.ceil(total / pageSize);

      return {
        success: true,
        data: {
          appointments: appointmentsResult,
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
          message: 'Failed to search appointments',
          details: error
        }
      };
    }
  }

  /**
   * Get appointments for a specific date range
   */
  async getAppointmentsByDateRange(
    startDate: Date,
    endDate: Date,
    providerId?: string
  ): Promise<ServiceResult<AppointmentWithDetails[]>> {
    try {
      const conditions = [between(appointments.scheduledAt, startDate, endDate)];
      
      if (providerId) {
        conditions.push(eq(appointments.providerId, providerId));
      }

      const result = await this.db
        .select({
          // Appointment fields
          id: appointments.id,
          patientId: appointments.patientId,
          providerId: appointments.providerId,
          scheduledAt: appointments.scheduledAt,
          duration: appointments.duration,
          appointmentType: appointments.appointmentType,
          status: appointments.status,
          notes: appointments.notes,
          createdAt: appointments.createdAt,
          updatedAt: appointments.updatedAt,
          // Patient details
          patient: {
            firstName: patients.firstName,
            lastName: patients.lastName,
            email: patients.email,
            phone: patients.phone
          },
          // Provider details
          provider: {
            firstName: providers.firstName,
            lastName: providers.lastName,
            specialization: providers.specialization
          }
        })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.id))
        .innerJoin(providers, eq(appointments.providerId, providers.id))
        .where(and(...conditions))
        .orderBy(asc(appointments.scheduledAt));

      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve appointments by date range',
          details: error
        }
      };
    }
  }

  /**
   * Check for scheduling conflicts
   */
  private async checkSchedulingConflict(
    providerId: string,
    scheduledAt: Date,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const startTime = scheduledAt;
      const endTime = new Date(scheduledAt.getTime() + duration * 60000); // Convert minutes to milliseconds

      const conditions = [
        eq(appointments.providerId, providerId),
        or(
          // Appointment starts during the new appointment
          and(
            gte(appointments.scheduledAt, startTime),
            lte(appointments.scheduledAt, endTime)
          ),
          // Appointment ends during the new appointment
          and(
            gte(sql`${appointments.scheduledAt} + INTERVAL '${appointments.duration} minutes'`, startTime),
            lte(sql`${appointments.scheduledAt} + INTERVAL '${appointments.duration} minutes'`, endTime)
          ),
          // Appointment encompasses the new appointment
          and(
            lte(appointments.scheduledAt, startTime),
            gte(sql`${appointments.scheduledAt} + INTERVAL '${appointments.duration} minutes'`, endTime)
          )
        ),
        // Only check non-cancelled appointments
        or(
          eq(appointments.status, 'scheduled'),
          eq(appointments.status, 'confirmed'),
          eq(appointments.status, 'checked_in'),
          eq(appointments.status, 'in_progress')
        )
      ];

      if (excludeAppointmentId) {
        conditions.push(sql`${appointments.id} != ${excludeAppointmentId}`);
      }

      const conflictingAppointments = await this.db
        .select({ count: count() })
        .from(appointments)
        .where(and(...conditions));

      const hasConflict = conflictingAppointments[0]?.count > 0;

      return {
        success: true,
        data: hasConflict
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to check scheduling conflict',
          details: error
        }
      };
    }
  }

  /**
   * Get appointment statistics
   */
  async getStats(): Promise<ServiceResult<{
    totalAppointments: number;
    todayAppointments: number;
    upcomingAppointments: number;
    statusDistribution: { [key: string]: number };
    typeDistribution: { [key: string]: number };
  }>> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Total appointments
      const [{ totalAppointments }] = await this.db
        .select({ totalAppointments: count() })
        .from(appointments);

      // Today's appointments
      const [{ todayAppointments }] = await this.db
        .select({ todayAppointments: count() })
        .from(appointments)
        .where(between(appointments.scheduledAt, today, tomorrow));

      // Upcoming appointments (future appointments)
      const [{ upcomingAppointments }] = await this.db
        .select({ upcomingAppointments: count() })
        .from(appointments)
        .where(gte(appointments.scheduledAt, new Date()));

      // Status distribution
      const statusStats = await this.db
        .select({
          status: appointments.status,
          count: count()
        })
        .from(appointments)
        .groupBy(appointments.status);

      const statusDistribution: { [key: string]: number } = {};
      statusStats.forEach(({ status, count }) => {
        statusDistribution[status] = count;
      });

      // Type distribution
      const typeStats = await this.db
        .select({
          type: appointments.appointmentType,
          count: count()
        })
        .from(appointments)
        .groupBy(appointments.appointmentType);

      const typeDistribution: { [key: string]: number } = {};
      typeStats.forEach(({ type, count }) => {
        typeDistribution[type] = count;
      });

      return {
        success: true,
        data: {
          totalAppointments,
          todayAppointments,
          upcomingAppointments,
          statusDistribution,
          typeDistribution
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve appointment statistics',
          details: error
        }
      };
    }
  }
}