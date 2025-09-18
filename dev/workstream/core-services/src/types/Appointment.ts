import { z } from 'zod';

export const AppointmentSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  providerId: z.string().uuid(),
  facilityId: z.string().uuid().optional(),
  type: z.enum([
    'consultation',
    'follow_up',
    'emergency',
    'procedure',
    'lab_work',
    'imaging',
    'therapy',
    'vaccination',
    'screening',
    'telemedicine'
  ]),
  specialty: z.enum([
    'primary_care',
    'cardiology',
    'dermatology',
    'endocrinology',
    'gastroenterology',
    'neurology',
    'oncology',
    'orthopedics',
    'psychiatry',
    'radiology',
    'surgery',
    'urology',
    'other'
  ]).optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledDate: z.string().datetime(),
  duration: z.number().positive(), // Duration in minutes
  status: z.enum([
    'scheduled',
    'confirmed',
    'checked_in',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
    'rescheduled'
  ]),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  reason: z.string().optional(),
  chief_complaint: z.string().optional(),
  provider: z.object({
    name: z.string(),
    title: z.string().optional(),
    department: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional()
  }),
  facility: z.object({
    name: z.string(),
    address: z.string(),
    phone: z.string().optional(),
    room: z.string().optional()
  }).optional(),
  patient: z.object({
    name: z.string(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    emergencyContact: z.object({
      name: z.string(),
      phone: z.string()
    }).optional()
  }),
  reminders: z.array(z.object({
    type: z.enum(['email', 'sms', 'phone', 'push']),
    sentAt: z.string().datetime().optional(),
    scheduledFor: z.string().datetime(),
    status: z.enum(['pending', 'sent', 'failed'])
  })).default([]),
  preparation: z.object({
    instructions: z.array(z.string()).optional(),
    fasting: z.boolean().default(false),
    medications: z.object({
      continue: z.array(z.string()).optional(),
      stop: z.array(z.string()).optional(),
      special: z.array(z.string()).optional()
    }).optional(),
    forms: z.array(z.string()).optional()
  }).optional(),
  insurance: z.object({
    provider: z.string(),
    policyNumber: z.string(),
    groupNumber: z.string().optional(),
    copay: z.number().nonnegative().optional(),
    authorizationRequired: z.boolean().default(false),
    authorizationNumber: z.string().optional()
  }).optional(),
  billing: z.object({
    amount: z.number().nonnegative().optional(),
    currency: z.string().default('USD'),
    codes: z.array(z.object({
      type: z.enum(['cpt', 'icd10', 'hcpcs']),
      code: z.string(),
      description: z.string()
    })).optional()
  }).optional(),
  notes: z.string().optional(),
  cancellationReason: z.string().optional(),
  rescheduledFrom: z.string().uuid().optional(),
  rescheduledTo: z.string().uuid().optional(),
  recurringPattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly']),
    interval: z.number().positive(),
    endDate: z.string().datetime().optional(),
    occurrences: z.number().positive().optional()
  }).optional(),
  fhirCompliant: z.object({
    resourceType: z.literal('Appointment'),
    category: z.array(z.object({
      coding: z.array(z.object({
        system: z.string(),
        code: z.string(),
        display: z.string()
      }))
    }))
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type Appointment = z.infer<typeof AppointmentSchema>;

export const CreateAppointmentSchema = AppointmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type CreateAppointment = z.infer<typeof CreateAppointmentSchema>;

export const UpdateAppointmentSchema = CreateAppointmentSchema.partial();

export type UpdateAppointment = z.infer<typeof UpdateAppointmentSchema>;

// Appointment slot availability schema
export const AvailabilitySlotSchema = z.object({
  id: z.string().uuid(),
  providerId: z.string().uuid(),
  facilityId: z.string().uuid().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  duration: z.number().positive(), // Slot duration in minutes
  available: z.boolean(),
  appointmentTypes: z.array(z.string()).optional(),
  recurring: z.object({
    pattern: z.enum(['daily', 'weekly', 'monthly']),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(), // 0=Sunday, 6=Saturday
    endDate: z.string().datetime().optional()
  }).optional()
});

export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;

// Appointment search/filter schema
export const AppointmentFilterSchema = z.object({
  patientId: z.string().uuid().optional(),
  providerId: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional(),
  status: z.array(z.enum([
    'scheduled',
    'confirmed',
    'checked_in',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
    'rescheduled'
  ])).optional(),
  type: z.array(z.enum([
    'consultation',
    'follow_up',
    'emergency',
    'procedure',
    'lab_work',
    'imaging',
    'therapy',
    'vaccination',
    'screening',
    'telemedicine'
  ])).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  specialty: z.string().optional()
});

export type AppointmentFilter = z.infer<typeof AppointmentFilterSchema>;