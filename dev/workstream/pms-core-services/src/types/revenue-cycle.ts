export interface RevenueCycleKPI {
  id: string;
  organizationId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  date: Date;
  daysInAR: number;
  collectionRate: number;
  denialRate: number;
  costToCollect: number;
  netCollectionRate: number;
  grossCharges: number;
  netCharges: number;
  payments: number;
  adjustments: number;
  writeOffs: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RevenueCycleOptimization {
  id: string;
  organizationId: string;
  optimizationType: 'claims_processing' | 'payment_posting' | 'denial_management' | 'collection_strategy';
  currentValue: number;
  targetValue: number;
  actualValue: number;
  improvementPercentage: number;
  status: 'planning' | 'implementing' | 'monitoring' | 'completed';
  recommendations: OptimizationRecommendation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OptimizationRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  expectedImpact: number;
  estimatedEffort: 'low' | 'medium' | 'high';
  category: 'automation' | 'process_improvement' | 'staff_training' | 'technology_upgrade';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  implementationDate?: Date;
  completionDate?: Date;
}

export interface RevenueCycleMetrics {
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  revenueGrowth: number;
  operationalEfficiency: number;
  automationRate: number;
  customerSatisfaction: number;
  complianceScore: number;
  qualityMetrics: QualityMetrics;
}

export interface QualityMetrics {
  claimsAccuracy: number;
  codingAccuracy: number;
  denialResolutionTime: number;
  paymentPostingAccuracy: number;
  patientDataQuality: number;
  auditCompliance: number;
}

export interface RevenueCycleAlert {
  id: string;
  organizationId: string;
  alertType: 'performance_degradation' | 'compliance_violation' | 'system_error' | 'optimization_opportunity';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  affectedKPI: string;
  currentValue: number;
  thresholdValue: number;
  recommendedActions: string[];
  isResolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface RevenueCycleTarget {
  id: string;
  organizationId: string;
  metric: 'days_in_ar' | 'collection_rate' | 'denial_rate' | 'cost_to_collect' | 'automation_rate';
  currentValue: number;
  targetValue: number;
  timeframe: number; // months
  achievementDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}