export interface Payment {
  id: string;
  organizationId: string;
  patientId: string;
  claimId?: string;
  amount: number;
  paymentMethod: 'cash' | 'check' | 'credit_card' | 'debit_card' | 'ach' | 'wire' | 'insurance';
  paymentType: 'patient_payment' | 'insurance_payment' | 'copay' | 'deductible' | 'coinsurance';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'disputed';
  transactionId?: string;
  referenceNumber?: string;
  paymentDate: Date;
  processedDate?: Date;
  postedDate?: Date;
  payerId?: string;
  payerName?: string;
  reconciliationStatus: 'pending' | 'matched' | 'unmatched' | 'variance';
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentPlan {
  id: string;
  organizationId: string;
  patientId: string;
  totalAmount: number;
  remainingBalance: number;
  monthlyPayment: number;
  numberOfPayments: number;
  completedPayments: number;
  startDate: Date;
  nextPaymentDate: Date;
  endDate: Date;
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
  autoPayEnabled: boolean;
  paymentMethod?: 'credit_card' | 'ach';
  paymentToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Collection {
  id: string;
  organizationId: string;
  patientId: string;
  accountBalance: number;
  daysPastDue: number;
  collectionStage: 'early' | 'middle' | 'late' | 'legal' | 'write_off';
  lastContactDate?: Date;
  nextActionDate: Date;
  assignedCollector?: string;
  collectionStrategy: 'automated' | 'manual' | 'external_agency';
  communicationHistory: CollectionCommunication[];
  isResolved: boolean;
  resolutionDate?: Date;
  resolutionMethod?: 'payment' | 'payment_plan' | 'write_off' | 'bankruptcy';
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionCommunication {
  id: string;
  collectionId: string;
  communicationType: 'email' | 'sms' | 'phone' | 'letter' | 'patient_portal';
  message: string;
  sentDate: Date;
  deliveryStatus: 'sent' | 'delivered' | 'bounced' | 'failed';
  responseReceived: boolean;
  responseDate?: Date;
  responseMessage?: string;
}

export interface PaymentProcessingMetrics {
  organizationId: string;
  period: 'daily' | 'weekly' | 'monthly';
  date: Date;
  totalPayments: number;
  totalAmount: number;
  paymentsByMethod: {
    cash: number;
    check: number;
    creditCard: number;
    ach: number;
    insurance: number;
  };
  processingMetrics: {
    averageProcessingTime: number;
    successRate: number;
    failureRate: number;
    disputeRate: number;
  };
  collectionMetrics: {
    totalCollections: number;
    collectionsResolved: number;
    averageResolutionTime: number;
    collectionRate: number;
  };
  automationMetrics: {
    automatedPayments: number;
    automatedPostings: number;
    automationRate: number;
  };
}

export interface BankReconciliation {
  id: string;
  organizationId: string;
  bankAccountId: string;
  reconciliationDate: Date;
  statementDate: Date;
  openingBalance: number;
  closingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  reconciliationStatus: 'pending' | 'in_progress' | 'completed' | 'discrepancy';
  matchedTransactions: BankTransactionMatch[];
  unmatchedTransactions: BankTransaction[];
  discrepancies: ReconciliationDiscrepancy[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BankTransaction {
  id: string;
  transactionDate: Date;
  description: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  referenceNumber?: string;
  isMatched: boolean;
  matchedPaymentId?: string;
}

export interface BankTransactionMatch {
  bankTransactionId: string;
  paymentId: string;
  matchConfidence: number;
  matchMethod: 'automatic' | 'manual';
  matchDate: Date;
}

export interface ReconciliationDiscrepancy {
  id: string;
  type: 'amount_variance' | 'missing_transaction' | 'duplicate_transaction' | 'timing_difference';
  description: string;
  expectedAmount?: number;
  actualAmount?: number;
  variance: number;
  isResolved: boolean;
  resolutionNotes?: string;
  resolutionDate?: Date;
}

export interface PaymentAlert {
  id: string;
  organizationId: string;
  alertType: 'failed_payment' | 'disputed_payment' | 'large_payment' | 'unusual_pattern' | 'fraud_detection';
  severity: 'low' | 'medium' | 'high' | 'critical';
  paymentId?: string;
  patientId?: string;
  amount?: number;
  message: string;
  details: Record<string, any>;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface PaymentOptimization {
  id: string;
  organizationId: string;
  optimizationType: 'collection_strategy' | 'payment_processing' | 'payment_plans' | 'automation';
  currentMetric: number;
  targetMetric: number;
  actualMetric: number;
  improvementPercentage: number;
  recommendations: PaymentRecommendation[];
  status: 'planning' | 'implementing' | 'monitoring' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'automation' | 'process_improvement' | 'technology' | 'training';
  expectedImprovement: number;
  implementationCost: number;
  roi: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'implementing' | 'completed';
}

export interface FraudDetection {
  id: string;
  organizationId: string;
  paymentId: string;
  riskScore: number;
  riskFactors: FraudRiskFactor[];
  status: 'pending_review' | 'approved' | 'declined' | 'investigating';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
}

export interface FraudRiskFactor {
  factor: string;
  description: string;
  weight: number;
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}