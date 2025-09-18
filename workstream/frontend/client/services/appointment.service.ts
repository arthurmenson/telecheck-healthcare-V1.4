import { apiClient } from '../lib/api-client';
import { ApiResponse } from '../../../shared/types';

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  scheduledAt: string;
  duration: number; // in minutes
  appointmentType: string;
  status: 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  patient?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  provider?: {
    firstName: string;
    lastName: string;
    specialization: string;
  };
}

export interface CreateAppointmentDto {
  patientId: string;
  providerId: string;
  scheduledAt: string;
  duration: number;
  appointmentType: string;
  notes?: string;
}

export interface UpdateAppointmentDto {
  scheduledAt?: string;
  duration?: number;
  appointmentType?: string;
  status?: string;
  notes?: string;
}

export interface AppointmentSearchParams {
  patientId?: string;
  providerId?: string;
  status?: string;
  appointmentType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AppointmentListResponse {
  appointments: Appointment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AppointmentStats {
  totalAppointments: number;
  todayAppointments: number;
  upcomingAppointments: number;
  statusDistribution: { [key: string]: number };
  typeDistribution: { [key: string]: number };
}

export class AppointmentService {
  static async getAppointments(params?: AppointmentSearchParams): Promise<ApiResponse<AppointmentListResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.patientId) queryParams.append('patientId', params.patientId);
    if (params?.providerId) queryParams.append('providerId', params.providerId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.appointmentType) queryParams.append('appointmentType', params.appointmentType);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiClient.get(`/appointments${query}`);
  }

  static async getAppointment(id: string): Promise<ApiResponse<Appointment>> {
    return apiClient.get(`/appointments/${id}`);
  }

  static async createAppointment(data: CreateAppointmentDto): Promise<ApiResponse<Appointment>> {
    return apiClient.post('/appointments', data);
  }

  static async updateAppointment(id: string, data: UpdateAppointmentDto): Promise<ApiResponse<Appointment>> {
    return apiClient.put(`/appointments/${id}`, data);
  }

  static async rescheduleAppointment(id: string, newDateTime: string, reason: string): Promise<ApiResponse<Appointment>> {
    return apiClient.put(`/appointments/${id}/reschedule`, {
      scheduledAt: newDateTime,
      reason
    });
  }

  static async cancelAppointment(id: string, reason: string): Promise<ApiResponse<Appointment>> {
    return apiClient.put(`/appointments/${id}/cancel`, { reason });
  }

  static async deleteAppointment(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/appointments/${id}`);
  }

  static async getAppointmentsByDateRange(
    startDate: string,
    endDate: string,
    providerId?: string
  ): Promise<ApiResponse<Appointment[]>> {
    const queryParams = new URLSearchParams({
      startDate,
      endDate
    });
    if (providerId) queryParams.append('providerId', providerId);

    return apiClient.get(`/appointments/date-range?${queryParams.toString()}`);
  }

  static async getAppointmentStats(): Promise<ApiResponse<AppointmentStats>> {
    return apiClient.get('/appointments/stats');
  }

  // Helper methods
  static formatAppointmentTime(scheduledAt: string): string {
    return new Date(scheduledAt).toLocaleString();
  }

  static getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'scheduled': 'blue',
      'confirmed': 'green',
      'checked_in': 'purple',
      'in_progress': 'orange',
      'completed': 'green',
      'cancelled': 'red',
      'no_show': 'gray',
      'rescheduled': 'yellow'
    };
    return colors[status] || 'gray';
  }

  static getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'scheduled': 'Scheduled',
      'confirmed': 'Confirmed',
      'checked_in': 'Checked In',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'no_show': 'No Show',
      'rescheduled': 'Rescheduled'
    };
    return labels[status] || status;
  }

  static calculateDuration(scheduledAt: string, duration: number): { startTime: string; endTime: string } {
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + duration * 60000); // duration in minutes

    return {
      startTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      endTime: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }
}