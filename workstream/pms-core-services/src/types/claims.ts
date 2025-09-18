export interface Claim {
  id: string;
  organizationId: string;
  patientId: string;
  providerId: string;
  encounterId: string;
  claimNumber: string;
  status: 'draft' | 'submitted' | 'pending' | 'paid' | 'denied' | 'appealed' | 'written_off';
  submissionDate?: Date;
  paidDate?: Date;
  deniedDate?: Date;
  totalCharges: number;
  totalPayments: number;
  totalAdjustments: number;
  balance: number;
  primaryInsurance: InsuranceInfo;
  secondaryInsurance?: InsuranceInfo;
  clearinghouseId?: string;
  validationScore: number;
  qualityMetrics: ClaimQualityMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsuranceInfo {
  payerId: string;
  payerName: string;
  memberNumber: string;
  groupNumber?: string;
  eligibilityStatus: 'verified' | 'pending' | 'expired' | 'unknown';
  eligibilityDate?: Date;
  copay?: number;
  deductible?: number;
  outOfPocketMax?: number;
}

export interface ClaimQualityMetrics {
  codingAccuracy: number;
  documentationCompliance: number;
  payerCompliance: number;
  preSubmissionValidation: number;
  overallQualityScore: number;
}

export interface ClaimLineItem {
  id: string;
  claimId: string;
  lineNumber: number;
  procedureCode: string;
  modifiers?: string[];
  diagnosisCodes: string[];
  chargeAmount: number;
  allowedAmount?: number;
  paidAmount?: number;
  adjustmentAmount?: number;
  denialReason?: string;
  status: 'pending' | 'paid' | 'denied' | 'adjusted';
}

export interface ClaimValidationResult {
  claimId: string;
  isValid: boolean;
  validationScore: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recommendations: ValidationRecommendation[];
  timestamp: Date;
}

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  category: 'coding' | 'demographic' | 'insurance' | 'documentation' | 'payer_specific';
}

export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
}

export interface ValidationRecommendation {
  code: string;
  title: string;
  description: string;
  expectedImprovement: number;
  implementationEffort: 'low' | 'medium' | 'high';
}

export interface ClaimSubmissionBatch {
  id: string;
  organizationId: string;
  claimIds: string[];
  clearinghouseId: string;
  submissionDate: Date;
  status: 'preparing' | 'validating' | 'submitting' | 'submitted' | 'acknowledged' | 'rejected';
  batchSize: number;
  validationResults: ClaimValidationResult[];
  submissionResults?: SubmissionResult[];
}

export interface SubmissionResult {
  claimId: string;
  isAccepted: boolean;
  acknowledgmentCode?: string;
  rejectionReason?: string;
  submissionId?: string;
  timestamp: Date;
}

export interface ClaimProcessingMetrics {
  organizationId: string;
  period: 'daily' | 'weekly' | 'monthly';
  date: Date;
  totalClaims: number;
  claimsSubmitted: number;
  claimsAccepted: number;
  claimsRejected: number;
  claimsPaid: number;
  claimsDenied: number;
  averageValidationScore: number;
  automationRate: number;
  processingTime: {
    averageValidationTime: number;
    averageSubmissionTime: number;
    averagePaymentTime: number;
  };
  qualityMetrics: {
    firstPassAcceptanceRate: number;
    denialRate: number;
    appealSuccessRate: number;
    codingAccuracy: number;
  };
}

export interface DenialAnalysis {
  id: string;
  claimId: string;
  denialDate: Date;
  denialCode: string;
  denialReason: string;
  denialCategory: 'technical' | 'clinical' | 'authorization' | 'coverage' | 'duplicate' | 'timely_filing';
  isAppealable: boolean;
  appealDeadline?: Date;
  rootCause?: string;
  preventionStrategy?: string;
  isResolved: boolean;
  resolutionDate?: Date;
  resolutionMethod?: 'appeal' | 'resubmission' | 'write_off' | 'patient_responsibility';
}

export interface ClaimAlert {
  id: string;
  claimId: string;
  alertType: 'validation_failure' | 'submission_delay' | 'denial_received' | 'payment_overdue' | 'appeal_deadline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendedActions: string[];
  isResolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}