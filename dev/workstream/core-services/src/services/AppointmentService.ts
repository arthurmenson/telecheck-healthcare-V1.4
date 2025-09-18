import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { AppointmentRepository, AppointmentSearchParams, AppointmentWithDetails } from '../repositories/AppointmentRepository';
import { CreateAppointmentDto, UpdateAppointmentDto } from '../types/Appointment';
import { ServiceResult } from '../types/ServiceResult';
import { appointments } from '@spark-den/database/src/schema/healthcare';

export class AppointmentService {
  private appointmentRepository: AppointmentRepository;

  constructor(private db: PostgresJsDatabase<any>) {
    this.appointmentRepository = new AppointmentRepository(db);
  }

  async createAppointment(data: CreateAppointmentDto): Promise<ServiceResult<typeof appointments.$inferSelect>> {
    return await this.appointmentRepository.create(data);
  }

  async getAppointment(id: string): Promise<ServiceResult<AppointmentWithDetails | null>> {
    return await this.appointmentRepository.findById(id);
  }

  async searchAppointments(params: AppointmentSearchParams): Promise<ServiceResult<{
    appointments: AppointmentWithDetails[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>> {
    return await this.appointmentRepository.search(params);
  }

  async updateAppointment(id: string, data: UpdateAppointmentDto): Promise<ServiceResult<typeof appointments.$inferSelect>> {
    return await this.appointmentRepository.update(id, data);
  }

  async rescheduleAppointment(
    id: string,
    newDateTime: Date,
    reason: string
  ): Promise<ServiceResult<typeof appointments.$inferSelect>> {
    const updateData: UpdateAppointmentDto = {
      scheduledAt: newDateTime,
      status: 'rescheduled',
      notes: reason
    };

    return await this.appointmentRepository.update(id, updateData);
  }

  async cancelAppointment(id: string, reason: string): Promise<ServiceResult<typeof appointments.$inferSelect>> {
    const updateData: UpdateAppointmentDto = {
      status: 'cancelled',
      notes: reason
    };

    return await this.appointmentRepository.update(id, updateData);
  }

  async getAppointmentsByDateRange(
    startDate: Date,
    endDate: Date,
    providerId?: string
  ): Promise<ServiceResult<AppointmentWithDetails[]>> {
    return await this.appointmentRepository.getAppointmentsByDateRange(startDate, endDate, providerId);
  }

  async getAppointmentStatistics(): Promise<ServiceResult<{
    totalAppointments: number;
    todayAppointments: number;
    upcomingAppointments: number;
    statusDistribution: { [key: string]: number };
    typeDistribution: { [key: string]: number };
  }>> {
    return await this.appointmentRepository.getStats();
  }

  async deleteAppointment(id: string): Promise<ServiceResult<boolean>> {
    return await this.appointmentRepository.delete(id);
  }
}