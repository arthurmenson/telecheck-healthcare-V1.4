import { z } from 'zod';
import { patients } from '@spark-den/database/src/schema/healthcare';

// Infer types from database schema
export type Patient = typeof patients.$inferSelect;
export type CreatePatientDto = Omit<typeof patients.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdatePatientDto = Partial<Omit<CreatePatientDto, 'email'>> & {
  email?: string;
};

// Zod schemas for validation
export const PatientSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().refine((date) => {
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return birthDate <= today && age <= 150;
  }, 'Invalid date of birth'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  email: z.string().email().max(255),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,2}[\s\-\.]?[\d]{3}[\s\-\.]?[\d]{3}[\s\-\.]?[\d]{4}$/, 'Invalid phone format'),
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  state: z.string().length(2).toUpperCase(),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid zip code format'),
  emergencyContactName: z.string().min(1).max(200),
  emergencyContactPhone: z.string().regex(/^[\+]?[1-9][\d]{0,2}[\s\-\.]?[\d]{3}[\s\-\.]?[\d]{3}[\s\-\.]?[\d]{4}$/, 'Invalid emergency contact phone format'),
  insuranceProvider: z.string().max(200).optional(),
  insurancePolicyNumber: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreatePatientSchema = PatientSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type CreatePatient = z.infer<typeof CreatePatientSchema>;

export const UpdatePatientSchema = CreatePatientSchema.partial();

export type UpdatePatient = z.infer<typeof UpdatePatientSchema>;

// Extended patient type with computed fields
export interface PatientWithStats extends Patient {
  age: number;
  upcomingAppointments: number;
  lastVisit: Date | null;
  totalVisits: number;
}

// Search and filter parameters
export interface PatientSearchParams {
  search?: string;
  gender?: string;
  ageMin?: number;
  ageMax?: number;
  city?: string;
  state?: string;
  insuranceProvider?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: keyof Patient;
  sortOrder?: 'asc' | 'desc';
}

// Patient list response
export interface PatientListResponse {
  patients: Patient[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Patient statistics
export interface PatientStats {
  totalPatients: number;
  activePatients: number;
  inactivePatients: number;
  averageAge: number;
  genderDistribution: {
    male: number;
    female: number;
    other: number;
  };
  topCities: {
    city: string;
    count: number;
  }[];
  recentRegistrations: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

// Utility functions
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}