import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { Appointment, CreateAppointment, UpdateAppointment, AppointmentFilter, AvailabilitySlot } from '../types/Appointment';
import { CreateAppointmentSchema } from '../types/Appointment';
import type { ServiceResult } from '../types/ServiceResult';

export class AppointmentService {
  private appointments: Map<string, Appointment> = new Map();
  private patientAppointmentIndex: Map<string, string[]> = new Map();
  private providerAppointmentIndex: Map<string, string[]> = new Map();

  async createAppointment(data: CreateAppointment): Promise<ServiceResult<Appointment>> {
    try {
      const validatedData = CreateAppointmentSchema.parse(data);

      // Check for scheduling conflicts
      const conflictCheck = await this.checkSchedulingConflicts(
        validatedData.providerId,
        validatedData.scheduledDate,
        validatedData.duration
      );

      if (!conflictCheck.success) {
        return conflictCheck;
      }

      const appointment: Appointment = {
        ...validatedData,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.appointments.set(appointment.id, appointment);

      // Update indexes
      this.updatePatientIndex(appointment.patientId, appointment.id);
      this.updateProviderIndex(appointment.providerId, appointment.id);

      return { success: true, data: appointment };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid appointment data',
            details: { issues: error.issues }
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      };
    }
  }

  async getAppointment(id: string): Promise<ServiceResult<Appointment>> {
    const appointment = this.appointments.get(id);

    if (!appointment) {
      return {
        success: false,
        error: {
          code: 'APPOINTMENT_NOT_FOUND',
          message: `Appointment with ID ${id} not found`
        }
      };
    }

    return { success: true, data: appointment };
  }

  async searchAppointments(filter: AppointmentFilter): Promise<ServiceResult<Appointment[]>> {
    let appointments = Array.from(this.appointments.values());

    // Apply filters
    if (filter.patientId) {
      appointments = appointments.filter(apt => apt.patientId === filter.patientId);
    }

    if (filter.providerId) {
      appointments = appointments.filter(apt => apt.providerId === filter.providerId);
    }

    if (filter.facilityId) {
      appointments = appointments.filter(apt => apt.facilityId === filter.facilityId);
    }

    if (filter.status && filter.status.length > 0) {
      appointments = appointments.filter(apt => filter.status!.includes(apt.status));
    }

    if (filter.type && filter.type.length > 0) {
      appointments = appointments.filter(apt => filter.type!.includes(apt.type));
    }

    if (filter.specialty) {
      appointments = appointments.filter(apt => apt.specialty === filter.specialty);
    }

    if (filter.startDate) {
      appointments = appointments.filter(apt =>
        new Date(apt.scheduledDate) >= new Date(filter.startDate!)
      );
    }

    if (filter.endDate) {
      appointments = appointments.filter(apt =>
        new Date(apt.scheduledDate) <= new Date(filter.endDate!)
      );
    }

    // Sort by scheduled date
    appointments.sort((a, b) =>
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );

    return { success: true, data: appointments };
  }

  async updateAppointment(id: string, data: UpdateAppointment): Promise<ServiceResult<Appointment>> {
    const existingAppointment = this.appointments.get(id);

    if (!existingAppointment) {
      return {
        success: false,
        error: {
          code: 'APPOINTMENT_NOT_FOUND',
          message: `Appointment with ID ${id} not found`
        }
      };
    }

    try {
      // If scheduling details are being updated, check for conflicts
      if (data.scheduledDate || data.duration) {
        const newScheduledDate = data.scheduledDate || existingAppointment.scheduledDate;
        const newDuration = data.duration || existingAppointment.duration;
        const providerId = data.providerId || existingAppointment.providerId;

        const conflictCheck = await this.checkSchedulingConflicts(
          providerId,
          newScheduledDate,
          newDuration,
          id // Exclude current appointment from conflict check
        );

        if (!conflictCheck.success) {
          return conflictCheck;
        }
      }

      const updatedAppointment: Appointment = {
        ...existingAppointment,
        ...data,
        updatedAt: new Date().toISOString()
      };

      this.appointments.set(id, updatedAppointment);

      return { success: true, data: updatedAppointment };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      };
    }
  }

  async rescheduleAppointment(
    id: string,
    newDateTime: string,
    reason: string
  ): Promise<ServiceResult<Appointment>> {
    const appointment = this.appointments.get(id);

    if (!appointment) {
      return {
        success: false,
        error: {
          code: 'APPOINTMENT_NOT_FOUND',
          message: `Appointment with ID ${id} not found`
        }
      };
    }

    // Check for conflicts at new time
    const conflictCheck = await this.checkSchedulingConflicts(
      appointment.providerId,
      newDateTime,
      appointment.duration,
      id
    );

    if (!conflictCheck.success) {
      return conflictCheck;
    }

    const rescheduledAppointment: Appointment = {
      ...appointment,
      scheduledDate: newDateTime,
      status: 'rescheduled',
      notes: appointment.notes
        ? `${appointment.notes}\nRescheduled: ${reason}`
        : `Rescheduled: ${reason}`,
      updatedAt: new Date().toISOString()
    };

    this.appointments.set(id, rescheduledAppointment);

    return { success: true, data: rescheduledAppointment };
  }

  async cancelAppointment(id: string, reason: string): Promise<ServiceResult<Appointment>> {
    const appointment = this.appointments.get(id);

    if (!appointment) {
      return {
        success: false,
        error: {
          code: 'APPOINTMENT_NOT_FOUND',
          message: `Appointment with ID ${id} not found`
        }
      };
    }

    const cancelledAppointment: Appointment = {
      ...appointment,
      status: 'cancelled',
      cancellationReason: reason,
      updatedAt: new Date().toISOString()
    };

    this.appointments.set(id, cancelledAppointment);

    return { success: true, data: cancelledAppointment };
  }

  async checkAvailability(
    providerId: string,
    date: string,
    duration: number = 30
  ): Promise<ServiceResult<AvailabilitySlot[]>> {
    try {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(8, 0, 0, 0); // 8 AM
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(17, 0, 0, 0); // 5 PM

      // Get existing appointments for the provider on this date
      const existingAppointments = Array.from(this.appointments.values())
        .filter(apt => {
          const aptDate = new Date(apt.scheduledDate);
          return apt.providerId === providerId &&
                 aptDate.toDateString() === targetDate.toDateString() &&
                 apt.status !== 'cancelled';
        })
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

      const availableSlots: AvailabilitySlot[] = [];
      let currentTime = new Date(startOfDay);

      while (currentTime < endOfDay) {
        const slotEnd = new Date(currentTime.getTime() + duration * 60000);

        // Check if this slot conflicts with any existing appointment
        const hasConflict = existingAppointments.some(apt => {
          const aptStart = new Date(apt.scheduledDate);
          const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);

          return (currentTime < aptEnd && slotEnd > aptStart);
        });

        if (!hasConflict && slotEnd <= endOfDay) {
          availableSlots.push({
            id: uuidv4(),
            providerId,
            startTime: currentTime.toISOString(),
            endTime: slotEnd.toISOString(),
            duration,
            available: true
          });
        }

        // Move to next slot (15-minute intervals)
        currentTime = new Date(currentTime.getTime() + 15 * 60000);
      }

      return { success: true, data: availableSlots };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error checking availability'
        }
      };
    }
  }

  private async checkSchedulingConflicts(
    providerId: string,
    scheduledDate: string,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<ServiceResult<boolean>> {
    const newStart = new Date(scheduledDate);
    const newEnd = new Date(newStart.getTime() + duration * 60000);

    // Get all appointments for this provider
    const providerAppointments = Array.from(this.appointments.values())
      .filter(apt =>
        apt.providerId === providerId &&
        apt.status !== 'cancelled' &&
        apt.id !== excludeAppointmentId
      );

    // Check for conflicts
    const conflict = providerAppointments.find(apt => {
      const existingStart = new Date(apt.scheduledDate);
      const existingEnd = new Date(existingStart.getTime() + apt.duration * 60000);

      // Check if times overlap
      return (newStart < existingEnd && newEnd > existingStart);
    });

    if (conflict) {
      return {
        success: false,
        error: {
          code: 'SCHEDULING_CONFLICT',
          message: `Scheduling conflict with existing appointment: ${conflict.title} at ${conflict.scheduledDate}`
        }
      };
    }

    return { success: true, data: true };
  }

  private updatePatientIndex(patientId: string, appointmentId: string): void {
    const patientAppointments = this.patientAppointmentIndex.get(patientId) || [];
    patientAppointments.push(appointmentId);
    this.patientAppointmentIndex.set(patientId, patientAppointments);
  }

  private updateProviderIndex(providerId: string, appointmentId: string): void {
    const providerAppointments = this.providerAppointmentIndex.get(providerId) || [];
    providerAppointments.push(appointmentId);
    this.providerAppointmentIndex.set(providerId, providerAppointments);
  }

  async deleteAppointment(id: string): Promise<ServiceResult<boolean>> {
    const appointment = this.appointments.get(id);

    if (!appointment) {
      return {
        success: false,
        error: {
          code: 'APPOINTMENT_NOT_FOUND',
          message: `Appointment with ID ${id} not found`
        }
      };
    }

    this.appointments.delete(id);

    // Update indexes
    const patientAppointments = this.patientAppointmentIndex.get(appointment.patientId) || [];
    const updatedPatientAppointments = patientAppointments.filter(aptId => aptId !== id);
    this.patientAppointmentIndex.set(appointment.patientId, updatedPatientAppointments);

    const providerAppointments = this.providerAppointmentIndex.get(appointment.providerId) || [];
    const updatedProviderAppointments = providerAppointments.filter(aptId => aptId !== id);
    this.providerAppointmentIndex.set(appointment.providerId, updatedProviderAppointments);

    return { success: true, data: true };
  }

  async listAppointments(): Promise<ServiceResult<Appointment[]>> {
    const appointments = Array.from(this.appointments.values())
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    return { success: true, data: appointments };
  }
}