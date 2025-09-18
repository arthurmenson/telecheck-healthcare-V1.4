/**
 * Healthcare Data Types for Mobile Application
 * HIPAA Compliant - All PHI handled with encryption
 */

export interface Patient {
  id: string;
  mrn: string; // Medical Record Number
  demographics: PatientDemographics;
  insurance: InsuranceInfo[];
  emergencyContacts: EmergencyContact[];
  allergies: Allergy[];
  medications: Medication[];
  vitals: VitalSigns[];
  appointments: Appointment[];
  visitHistory: VisitRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface PatientDemographics {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  ssn?: string; // Encrypted
  address: Address;
  phone: string;
  email: string;
  preferredLanguage: string;
  race?: string;
  ethnicity?: string;
  maritalStatus?: string;
}

export interface Provider {
  id: string;
  npi: string; // National Provider Identifier
  firstName: string;
  lastName: string;
  credentials: string[];
  specialties: Specialty[];
  licenseNumbers: LicenseInfo[];
  contactInfo: ContactInfo;
  schedule: ProviderSchedule;
  preferences: ProviderPreferences;
  performance: ProviderMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledDateTime: string;
  duration: number; // minutes
  location: AppointmentLocation;
  reason: string;
  notes?: string;
  remindersSent: ReminderStatus[];
  checkedIn?: boolean;
  checkedInAt?: string;
  noShow?: boolean;
  cancelled?: boolean;
  cancelledAt?: string;
  cancelReason?: string;
  telemedicineLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  providerId: string;
  appointmentId?: string;
  type: NoteType;
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  reviewOfSystems?: ReviewOfSystems;
  physicalExam?: PhysicalExam;
  assessment?: string;
  plan?: TreatmentPlan;
  medications?: Medication[];
  orders?: Order[];
  followUp?: FollowUpPlan;
  voiceTranscription?: VoiceTranscription;
  templates?: NoteTemplate[];
  isSigned: boolean;
  signedAt?: string;
  signedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  route: string;
  quantity?: number;
  refills?: number;
  prescribedBy: string;
  prescribedDate: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  indications: string[];
  contraindications?: string[];
  interactions?: DrugInteraction[];
  sideEffects?: string[];
  adherence?: MedicationAdherence;
  createdAt: string;
  updatedAt: string;
}

export interface VitalSigns {
  id: string;
  patientId: string;
  recordedBy: string;
  recordedAt: string;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
    unit: 'mmHg';
  };
  heartRate?: {
    value: number;
    unit: 'bpm';
  };
  temperature?: {
    value: number;
    unit: 'F' | 'C';
  };
  respiratoryRate?: {
    value: number;
    unit: 'breaths/min';
  };
  oxygenSaturation?: {
    value: number;
    unit: '%';
  };
  weight?: {
    value: number;
    unit: 'lbs' | 'kg';
  };
  height?: {
    value: number;
    unit: 'in' | 'cm';
  };
  bmi?: {
    value: number;
    category: 'underweight' | 'normal' | 'overweight' | 'obese';
  };
  bloodGlucose?: {
    value: number;
    unit: 'mg/dL';
    timing: 'fasting' | 'random' | 'postprandial';
  };
  painScale?: {
    value: number; // 0-10
    location?: string;
  };
  source: 'manual' | 'device' | 'wearable';
  deviceId?: string;
  isVerified: boolean;
}

export interface Billing {
  id: string;
  patientId: string;
  appointmentId?: string;
  providerId: string;
  serviceDate: string;
  procedures: BillingProcedure[];
  diagnoses: Diagnosis[];
  insurance: InsuranceClaim;
  charges: BillingCharge[];
  payments: Payment[];
  adjustments: Adjustment[];
  balance: number;
  status: BillingStatus;
  statementsSent: Statement[];
  collections?: CollectionInfo;
  createdAt: string;
  updatedAt: string;
}

// Supporting interfaces
export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface InsuranceInfo {
  id: string;
  isPrimary: boolean;
  insuranceCompany: string;
  policyNumber: string;
  groupNumber?: string;
  subscriberId: string;
  subscriberName: string;
  relationshipToSubscriber: string;
  effectiveDate: string;
  expirationDate?: string;
  copay?: number;
  deductible?: number;
  isActive: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: Address;
  isPrimary: boolean;
}

export interface Allergy {
  id: string;
  allergen: string;
  type: 'drug' | 'food' | 'environmental' | 'other';
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  reactions: string[];
  onsetDate?: string;
  isActive: boolean;
  notes?: string;
}

// Enums and Literal Types
export type AppointmentType =
  | 'routine'
  | 'follow-up'
  | 'consultation'
  | 'procedure'
  | 'telemedicine'
  | 'urgent'
  | 'emergency';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'checked-in'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show'
  | 'rescheduled';

export type NoteType =
  | 'progress'
  | 'consultation'
  | 'discharge'
  | 'operative'
  | 'emergency'
  | 'telephone'
  | 'nursing';

export type BillingStatus =
  | 'draft'
  | 'submitted'
  | 'processed'
  | 'paid'
  | 'partially-paid'
  | 'denied'
  | 'appealed'
  | 'written-off';

// Additional supporting types would continue here...
export interface HealthMetrics {
  patientId: string;
  metrics: {
    steps?: number;
    heartRateVariability?: number;
    sleepHours?: number;
    activeMinutes?: number;
    calories?: number;
  };
  deviceSource: string;
  timestamp: string;
  isVerified: boolean;
}

export interface SecurityAuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}