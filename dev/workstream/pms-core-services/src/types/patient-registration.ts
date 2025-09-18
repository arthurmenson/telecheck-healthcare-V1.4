export interface Patient {
  id: string;
  organizationId: string;
  mrn: string; // Medical Record Number
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  ssn?: string; // Encrypted
  address: Address;
  contactInfo: ContactInfo;
  emergencyContact?: EmergencyContact;
  insuranceInfo: InsuranceInfo[];
  registrationStatus: 'pending' | 'verified' | 'incomplete' | 'flagged';
  dataQualityScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isVerified: boolean;
  verificationSource?: string;
}

export interface ContactInfo {
  primaryPhone: string;
  secondaryPhone?: string;
  email?: string;
  preferredContactMethod: 'phone' | 'email' | 'sms' | 'patient_portal';
  communicationPreferences: {
    appointments: boolean;
    billing: boolean;
    marketing: boolean;
    healthReminders: boolean;
  };
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: Address;
}

export interface InsuranceInfo {
  id: string;
  priority: 'primary' | 'secondary' | 'tertiary';
  payerId: string;
  payerName: string;
  memberNumber: string;
  groupNumber?: string;
  policyNumber?: string;
  subscriberName?: string;
  subscriberDOB?: Date;
  relationshipToSubscriber: 'self' | 'spouse' | 'child' | 'other';
  effectiveDate?: Date;
  terminationDate?: Date;
  eligibilityStatus: 'verified' | 'pending' | 'expired' | 'terminated' | 'unknown';
  lastVerified?: Date;
  copay?: number;
  deductible?: number;
  outOfPocketMax?: number;
  benefits?: InsuranceBenefit[];
}

export interface InsuranceBenefit {
  serviceType: string;
  coverageLevel: number;
  copay?: number;
  coinsurance?: number;
  deductibleApplies: boolean;
  authorizationRequired: boolean;
  visitLimit?: number;
  yearlyLimit?: number;
}

export interface PatientRegistration {
  id: string;
  organizationId: string;
  patientId?: string;
  sessionId: string;
  registrationType: 'new_patient' | 'returning_patient' | 'emergency' | 'referral';
  status: 'started' | 'in_progress' | 'pending_verification' | 'completed' | 'abandoned';
  completionPercentage: number;
  stepsCCompleted: string[];
  stepsRemaining: string[];
  validationErrors: ValidationError[];
  dataQualityIssues: DataQualityIssue[];
  estimatedCompletionTime: number;
  selfServiceEnabled: boolean;
  assistanceRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationError {
  field: string;
  errorType: 'required' | 'format' | 'verification' | 'duplicate';
  message: string;
  suggestion?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface DataQualityIssue {
  field: string;
  issueType: 'incomplete' | 'inconsistent' | 'outdated' | 'unverified';
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  autoFixable: boolean;
  recommendation: string;
}

export interface DuplicateDetection {
  id: string;
  candidatePatientId: string;
  existingPatientIds: string[];
  matchScore: number;
  matchCriteria: MatchCriteria[];
  confidence: 'low' | 'medium' | 'high' | 'exact';
  recommendedAction: 'merge' | 'link' | 'separate' | 'manual_review';
  reviewStatus: 'pending' | 'reviewed' | 'resolved';
  createdAt: Date;
}

export interface MatchCriteria {
  field: string;
  matchType: 'exact' | 'fuzzy' | 'phonetic' | 'pattern';
  score: number;
  weight: number;
}

export interface RegistrationMetrics {
  organizationId: string;
  period: 'daily' | 'weekly' | 'monthly';
  date: Date;
  totalRegistrations: number;
  completedRegistrations: number;
  averageCompletionTime: number;
  selfServiceRate: number;
  dataQualityScore: number;
  duplicateDetectionRate: number;
  automationMetrics: {
    autoVerificationRate: number;
    autoPopulationRate: number;
    manualInterventionRate: number;
  };
  userExperience: {
    completionRate: number;
    abandonmentRate: number;
    satisfactionScore: number;
    errorRate: number;
  };
}