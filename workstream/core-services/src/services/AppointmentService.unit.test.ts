import { describe, it, expect, beforeEach } from '@jest/globals';
import { AppointmentService } from './AppointmentService';
import type { CreateAppointment, AppointmentFilter } from '../types/Appointment';

describe('AppointmentService', () => {
  let appointmentService: AppointmentService;

  beforeEach(() => {
    appointmentService = new AppointmentService();
  });

  describe('createAppointment', () => {
    it('should create a new appointment with valid data', async () => {
      const appointmentData: CreateAppointment = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        providerId: '660e8400-e29b-41d4-a716-446655440001',
        type: 'consultation',
        specialty: 'primary_care',
        title: 'Annual Physical Exam',
        description: 'Routine annual physical examination',
        scheduledDate: '2025-09-20T10:00:00.000Z',
        duration: 60,
        status: 'scheduled',
        reason: 'Annual check-up',
        provider: {
          name: 'Dr. Sarah Johnson',
          title: 'MD',
          department: 'Primary Care',
          phone: '+1-555-0123',
          email: 'dr.johnson@clinic.com'
        },
        patient: {
          name: 'John Doe',
          phone: '+1-555-0456',
          email: 'john.doe@email.com'
        }
      };

      const result = await appointmentService.createAppointment(appointmentData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Annual Physical Exam');
        expect(result.data.type).toBe('consultation');
        expect(result.data.duration).toBe(60);
        expect(result.data.provider.name).toBe('Dr. Sarah Johnson');
        expect(result.data.id).toBeDefined();
        expect(result.data.createdAt).toBeDefined();
        expect(result.data.updatedAt).toBeDefined();
      }
    });

    it('should return error for invalid appointment data', async () => {
      const invalidData = {
        patientId: 'invalid-uuid',
        providerId: '',
        type: 'invalid-type',
        title: '',
        scheduledDate: 'invalid-date',
        duration: -30, // Invalid negative duration
        status: 'invalid-status',
        provider: {
          name: ''
        },
        patient: {
          name: '',
          email: 'invalid-email'
        }
      } as unknown as CreateAppointment;

      const result = await appointmentService.createAppointment(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should check for scheduling conflicts', async () => {
      // Create first appointment
      const firstAppointment: CreateAppointment = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        providerId: '660e8400-e29b-41d4-a716-446655440001',
        type: 'consultation',
        title: 'First Appointment',
        scheduledDate: '2025-09-20T10:00:00.000Z',
        duration: 60,
        status: 'scheduled',
        provider: {
          name: 'Dr. Johnson'
        },
        patient: {
          name: 'John Doe'
        }
      };

      await appointmentService.createAppointment(firstAppointment);

      // Try to create conflicting appointment
      const conflictingAppointment: CreateAppointment = {
        patientId: '770e8400-e29b-41d4-a716-446655440002',
        providerId: '660e8400-e29b-41d4-a716-446655440001', // Same provider
        type: 'consultation',
        title: 'Conflicting Appointment',
        scheduledDate: '2025-09-20T10:30:00.000Z', // Overlaps with first appointment
        duration: 60,
        status: 'scheduled',
        provider: {
          name: 'Dr. Johnson'
        },
        patient: {
          name: 'Jane Smith'
        }
      };

      const result = await appointmentService.createAppointment(conflictingAppointment);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SCHEDULING_CONFLICT');
        expect(result.error.message).toContain('conflict');
      }
    });
  });

  describe('getAppointment', () => {
    it('should return appointment by ID', async () => {
      const appointmentData: CreateAppointment = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        providerId: '660e8400-e29b-41d4-a716-446655440001',
        type: 'follow_up',
        title: 'Follow-up Visit',
        scheduledDate: '2025-09-21T14:00:00.000Z',
        duration: 30,
        status: 'scheduled',
        provider: {
          name: 'Dr. Brown'
        },
        patient: {
          name: 'Alice Johnson'
        }
      };

      const createResult = await appointmentService.createAppointment(appointmentData);
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const getResult = await appointmentService.getAppointment(createResult.data.id);

        expect(getResult.success).toBe(true);
        if (getResult.success) {
          expect(getResult.data.id).toBe(createResult.data.id);
          expect(getResult.data.title).toBe('Follow-up Visit');
        }
      }
    });

    it('should return error for non-existent appointment', async () => {
      const result = await appointmentService.getAppointment('non-existent-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('APPOINTMENT_NOT_FOUND');
      }
    });
  });

  describe('searchAppointments', () => {
    beforeEach(async () => {
      // Create test appointments
      const appointments: CreateAppointment[] = [
        {
          patientId: '550e8400-e29b-41d4-a716-446655440000',
          providerId: '660e8400-e29b-41d4-a716-446655440001',
          type: 'consultation',
          title: 'Cardiology Consultation',
          scheduledDate: '2025-09-20T10:00:00.000Z',
          duration: 60,
          status: 'scheduled',
          specialty: 'cardiology',
          provider: { name: 'Dr. Heart' },
          patient: { name: 'John Doe' }
        },
        {
          patientId: '550e8400-e29b-41d4-a716-446655440000',
          providerId: '660e8400-e29b-41d4-a716-446655440002',
          type: 'lab_work',
          title: 'Blood Work',
          scheduledDate: '2025-09-21T08:00:00.000Z',
          duration: 30,
          status: 'completed',
          provider: { name: 'Lab Tech' },
          patient: { name: 'John Doe' }
        }
      ];

      for (const apt of appointments) {
        await appointmentService.createAppointment(apt);
      }
    });

    it('should filter appointments by patient ID', async () => {
      const filter: AppointmentFilter = {
        patientId: '550e8400-e29b-41d4-a716-446655440000'
      };

      const result = await appointmentService.searchAppointments(filter);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every(apt => apt.patientId === filter.patientId)).toBe(true);
      }
    });

    it('should filter appointments by status', async () => {
      const filter: AppointmentFilter = {
        status: ['completed']
      };

      const result = await appointmentService.searchAppointments(filter);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].status).toBe('completed');
        expect(result.data[0].title).toBe('Blood Work');
      }
    });

    it('should filter appointments by type and specialty', async () => {
      const filter: AppointmentFilter = {
        type: ['consultation'],
        specialty: 'cardiology'
      };

      const result = await appointmentService.searchAppointments(filter);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].type).toBe('consultation');
        expect(result.data[0].specialty).toBe('cardiology');
      }
    });
  });

  describe('updateAppointment', () => {
    it('should update appointment status and details', async () => {
      const appointmentData: CreateAppointment = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        providerId: '660e8400-e29b-41d4-a716-446655440001',
        type: 'consultation',
        title: 'Initial Consultation',
        scheduledDate: '2025-09-22T09:00:00.000Z',
        duration: 45,
        status: 'scheduled',
        provider: { name: 'Dr. Wilson' },
        patient: { name: 'Bob Smith' }
      };

      const createResult = await appointmentService.createAppointment(appointmentData);
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const updateData = {
          status: 'confirmed' as const,
          notes: 'Patient confirmed attendance',
          preparation: {
            instructions: ['Bring insurance card', 'Arrive 15 minutes early'],
            fasting: false
          }
        };

        const updateResult = await appointmentService.updateAppointment(createResult.data.id, updateData);

        expect(updateResult.success).toBe(true);
        if (updateResult.success) {
          expect(updateResult.data.status).toBe('confirmed');
          expect(updateResult.data.notes).toBe('Patient confirmed attendance');
          expect(updateResult.data.preparation?.instructions).toHaveLength(2);
        }
      }
    });
  });

  describe('rescheduleAppointment', () => {
    it('should reschedule appointment to new date and time', async () => {
      const appointmentData: CreateAppointment = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        providerId: '660e8400-e29b-41d4-a716-446655440001',
        type: 'consultation',
        title: 'Dermatology Check',
        scheduledDate: '2025-09-23T11:00:00.000Z',
        duration: 30,
        status: 'scheduled',
        provider: { name: 'Dr. Skin' },
        patient: { name: 'Mary Johnson' }
      };

      const createResult = await appointmentService.createAppointment(appointmentData);
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const newDateTime = '2025-09-24T15:00:00.000Z';
        const rescheduleResult = await appointmentService.rescheduleAppointment(
          createResult.data.id,
          newDateTime,
          'Patient request - scheduling conflict'
        );

        expect(rescheduleResult.success).toBe(true);
        if (rescheduleResult.success) {
          expect(rescheduleResult.data.scheduledDate).toBe(newDateTime);
          expect(rescheduleResult.data.status).toBe('rescheduled');
          expect(rescheduleResult.data.notes).toContain('scheduling conflict');
        }
      }
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment with reason', async () => {
      const appointmentData: CreateAppointment = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        providerId: '660e8400-e29b-41d4-a716-446655440001',
        type: 'procedure',
        title: 'Minor Surgery',
        scheduledDate: '2025-09-25T13:00:00.000Z',
        duration: 120,
        status: 'confirmed',
        provider: { name: 'Dr. Surgeon' },
        patient: { name: 'Tom Wilson' }
      };

      const createResult = await appointmentService.createAppointment(appointmentData);
      expect(createResult.success).toBe(true);

      if (createResult.success) {
        const cancelResult = await appointmentService.cancelAppointment(
          createResult.data.id,
          'Patient illness - needs to reschedule'
        );

        expect(cancelResult.success).toBe(true);
        if (cancelResult.success) {
          expect(cancelResult.data.status).toBe('cancelled');
          expect(cancelResult.data.cancellationReason).toBe('Patient illness - needs to reschedule');
        }
      }
    });
  });

  describe('checkAvailability', () => {
    it('should return available time slots for a provider', async () => {
      const providerId = '660e8400-e29b-41d4-a716-446655440001';
      const date = '2025-09-26';

      const availability = await appointmentService.checkAvailability(providerId, date);

      expect(availability.success).toBe(true);
      if (availability.success) {
        expect(Array.isArray(availability.data)).toBe(true);
        // Should have available slots for the day
        expect(availability.data.length).toBeGreaterThan(0);
      }
    });
  });
});