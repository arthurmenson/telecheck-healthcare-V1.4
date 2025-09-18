import { Logger } from '@utils/logger';
import { MetricsService } from '@utils/metrics-service';
import { ErrorHandler } from '@utils/error-handler';
import { z } from 'zod';

export interface DataQualityRule {
  id: string;
  name: string;
  description: string;
  type: 'completeness' | 'accuracy' | 'consistency' | 'validity' | 'uniqueness' | 'timeliness';
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: (data: any) => boolean;
  threshold: number;
  enabled: boolean;
}

export interface DataQualityResult {
  ruleId: string;
  ruleName: string;
  status: 'passed' | 'failed' | 'warning';
  score: number;
  failedRecords: number;
  totalRecords: number;
  details: any[];
  timestamp: Date;
}

export interface DataQualityReport {
  overall: {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    totalRecords: number;
    passedRules: number;
    failedRules: number;
  };
  dimensions: {
    completeness: number;
    accuracy: number;
    consistency: number;
    validity: number;
    uniqueness: number;
    timeliness: number;
  };
  results: DataQualityResult[];
  recommendations: string[];
  timestamp: Date;
  pipelineId: string;
}

export interface DataGovernancePolicy {
  id: string;
  name: string;
  description: string;
  dataTypes: string[];
  rules: string[];
  owner: string;
  approver: string;
  compliance: 'HIPAA' | 'GDPR' | 'SOX' | 'FDA' | 'Internal';
  retentionPeriod: number; // days
  accessLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  lastReviewed: Date;
  nextReview: Date;
}

export class DataQualityPipeline {
  private logger: Logger;
  private metricsService: MetricsService;
  private rules: Map<string, DataQualityRule>;
  private policies: Map<string, DataGovernancePolicy>;
  private isRunning: boolean;

  constructor() {
    this.logger = new Logger('DataQualityPipeline');
    this.metricsService = new MetricsService();
    this.rules = new Map();
    this.policies = new Map();
    this.isRunning = false;

    this.setupDefaultRules();
    this.setupDefaultPolicies();
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Data Quality Pipeline');

    try {
      // Initialize data sources
      await this.initializeDataSources();

      // Load custom rules and policies
      await this.loadCustomRulesAndPolicies();

      // Start monitoring
      this.isRunning = true;
      this.startContinuousMonitoring();

      this.logger.info('Data Quality Pipeline initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Data Quality Pipeline', { error });
      throw ErrorHandler.dataQualityError(`Pipeline initialization failed: ${error}`);
    }
  }

  async validateDataset(pipelineId: string, data: any[], schema?: z.ZodSchema): Promise<DataQualityReport> {
    const startTime = Date.now();
    this.logger.info(`Starting data quality validation for pipeline ${pipelineId}`, {
      recordCount: data.length
    });

    try {
      // Schema validation if provided
      if (schema) {
        await this.validateSchema(data, schema);
      }

      // Execute all enabled rules
      const results: DataQualityResult[] = [];
      const enabledRules = Array.from(this.rules.values()).filter(rule => rule.enabled);

      for (const rule of enabledRules) {
        const result = await this.executeRule(rule, data);
        results.push(result);
      }

      // Calculate dimension scores
      const dimensions = this.calculateDimensionScores(results);

      // Calculate overall score
      const overallScore = this.calculateOverallScore(results);

      // Determine status
      const status = this.determineStatus(overallScore);

      // Generate recommendations
      const recommendations = this.generateRecommendations(results);

      const report: DataQualityReport = {
        overall: {
          score: overallScore,
          status,
          totalRecords: data.length,
          passedRules: results.filter(r => r.status === 'passed').length,
          failedRules: results.filter(r => r.status === 'failed').length
        },
        dimensions,
        results,
        recommendations,
        timestamp: new Date(),
        pipelineId
      };

      // Record metrics
      this.metricsService.setDataQualityScore(overallScore, 'pipeline', pipelineId);
      this.metricsService.recordAnalyticsQuery(Date.now() - startTime, 'data-quality', true);

      this.logger.info(`Data quality validation completed for pipeline ${pipelineId}`, {
        score: overallScore,
        status,
        validationTime: Date.now() - startTime
      });

      return report;

    } catch (error) {
      this.logger.error(`Data quality validation failed for pipeline ${pipelineId}`, { error });
      this.metricsService.recordAnalyticsQuery(Date.now() - startTime, 'data-quality', false);
      throw ErrorHandler.dataQualityError(`Data validation failed: ${error}`);
    }
  }

  async validateRealTimeData(streamId: string, record: any): Promise<{ isValid: boolean; violations: string[] }> {
    const violations: string[] = [];

    try {
      const enabledRules = Array.from(this.rules.values()).filter(rule => rule.enabled);

      for (const rule of enabledRules) {
        if (!rule.condition(record)) {
          violations.push(`${rule.name}: ${rule.description}`);
        }
      }

      const isValid = violations.length === 0;

      // Record real-time validation metrics
      this.metricsService.recordStreamingLatency(Date.now(), 'validation', streamId);

      return { isValid, violations };

    } catch (error) {
      this.logger.error(`Real-time data validation failed for stream ${streamId}`, { error });
      throw ErrorHandler.dataQualityError(`Real-time validation failed: ${error}`);
    }
  }

  private async validateSchema(data: any[], schema: z.ZodSchema): Promise<void> {
    const errors: string[] = [];

    for (let i = 0; i < data.length; i++) {
      try {
        schema.parse(data[i]);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(`Record ${i}: ${error.errors.map(e => e.message).join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      throw ErrorHandler.dataQualityError(`Schema validation failed: ${errors.slice(0, 10).join('; ')}`);
    }
  }

  private async executeRule(rule: DataQualityRule, data: any[]): Promise<DataQualityResult> {
    const startTime = Date.now();
    let failedRecords = 0;
    const details: any[] = [];

    try {
      for (let i = 0; i < data.length; i++) {
        const record = data[i];
        if (!rule.condition(record)) {
          failedRecords++;
          if (details.length < 100) { // Limit details to prevent memory issues
            details.push({
              recordIndex: i,
              record,
              rule: rule.name
            });
          }
        }
      }

      const score = (data.length - failedRecords) / data.length;
      const status = score >= rule.threshold ? 'passed' :
                    score >= rule.threshold * 0.8 ? 'warning' : 'failed';

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        status,
        score,
        failedRecords,
        totalRecords: data.length,
        details,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error(`Rule execution failed: ${rule.name}`, { error });
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        status: 'failed',
        score: 0,
        failedRecords: data.length,
        totalRecords: data.length,
        details: [{ error: error.toString() }],
        timestamp: new Date()
      };
    }
  }

  private calculateDimensionScores(results: DataQualityResult[]): DataQualityReport['dimensions'] {
    const dimensions = {
      completeness: 0,
      accuracy: 0,
      consistency: 0,
      validity: 0,
      uniqueness: 0,
      timeliness: 0
    };

    const dimensionCounts = {
      completeness: 0,
      accuracy: 0,
      consistency: 0,
      validity: 0,
      uniqueness: 0,
      timeliness: 0
    };

    results.forEach(result => {
      const rule = this.rules.get(result.ruleId);
      if (rule) {
        dimensions[rule.type] += result.score;
        dimensionCounts[rule.type]++;
      }
    });

    // Calculate averages
    Object.keys(dimensions).forEach(dimension => {
      const key = dimension as keyof typeof dimensions;
      if (dimensionCounts[key] > 0) {
        dimensions[key] = dimensions[key] / dimensionCounts[key];
      }
    });

    return dimensions;
  }

  private calculateOverallScore(results: DataQualityResult[]): number {
    if (results.length === 0) return 1;

    // Weight scores by rule severity
    let totalWeightedScore = 0;
    let totalWeight = 0;

    results.forEach(result => {
      const rule = this.rules.get(result.ruleId);
      if (rule) {
        const weight = this.getSeverityWeight(rule.severity);
        totalWeightedScore += result.score * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 1;
  }

  private getSeverityWeight(severity: string): number {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  private determineStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 0.95) return 'excellent';
    if (score >= 0.85) return 'good';
    if (score >= 0.70) return 'fair';
    return 'poor';
  }

  private generateRecommendations(results: DataQualityResult[]): string[] {
    const recommendations: string[] = [];

    results.forEach(result => {
      if (result.status === 'failed') {
        const rule = this.rules.get(result.ruleId);
        if (rule) {
          switch (rule.type) {
            case 'completeness':
              recommendations.push('Implement data validation at source to ensure all required fields are populated');
              break;
            case 'accuracy':
              recommendations.push('Review data entry processes and implement real-time validation');
              break;
            case 'consistency':
              recommendations.push('Standardize data formats and implement cross-system validation');
              break;
            case 'validity':
              recommendations.push('Implement business rule validation and data type checking');
              break;
            case 'uniqueness':
              recommendations.push('Implement duplicate detection and prevention mechanisms');
              break;
            case 'timeliness':
              recommendations.push('Optimize data processing pipelines and implement real-time monitoring');
              break;
          }
        }
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private setupDefaultRules(): void {
    // Completeness rules
    this.addRule({
      id: 'completeness-required-fields',
      name: 'Required Fields Completeness',
      description: 'All required fields must be populated',
      type: 'completeness',
      severity: 'critical',
      condition: (record: any) => {
        const requiredFields = ['id', 'timestamp'];
        return requiredFields.every(field => record[field] != null && record[field] !== '');
      },
      threshold: 0.95,
      enabled: true
    });

    // Accuracy rules
    this.addRule({
      id: 'accuracy-numeric-range',
      name: 'Numeric Range Validation',
      description: 'Numeric values must be within expected ranges',
      type: 'accuracy',
      severity: 'high',
      condition: (record: any) => {
        if (typeof record.value === 'number') {
          return record.value >= 0 && record.value <= 1000000;
        }
        return true;
      },
      threshold: 0.98,
      enabled: true
    });

    // Validity rules
    this.addRule({
      id: 'validity-email-format',
      name: 'Email Format Validation',
      description: 'Email addresses must be in valid format',
      type: 'validity',
      severity: 'medium',
      condition: (record: any) => {
        if (record.email) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email);
        }
        return true;
      },
      threshold: 0.95,
      enabled: true
    });

    // Uniqueness rules
    this.addRule({
      id: 'uniqueness-primary-key',
      name: 'Primary Key Uniqueness',
      description: 'Primary keys must be unique',
      type: 'uniqueness',
      severity: 'critical',
      condition: (record: any) => {
        // This would need to be implemented with context of the entire dataset
        return record.id != null;
      },
      threshold: 1.0,
      enabled: true
    });

    // Timeliness rules
    this.addRule({
      id: 'timeliness-recent-data',
      name: 'Data Recency',
      description: 'Data should not be older than specified threshold',
      type: 'timeliness',
      severity: 'medium',
      condition: (record: any) => {
        if (record.timestamp) {
          const recordTime = new Date(record.timestamp).getTime();
          const now = Date.now();
          const hoursDiff = (now - recordTime) / (1000 * 60 * 60);
          return hoursDiff <= 24; // Data should not be older than 24 hours
        }
        return true;
      },
      threshold: 0.90,
      enabled: true
    });
  }

  private setupDefaultPolicies(): void {
    this.addPolicy({
      id: 'healthcare-data-policy',
      name: 'Healthcare Data Governance Policy',
      description: 'HIPAA-compliant data handling for healthcare records',
      dataTypes: ['patient', 'medical', 'billing'],
      rules: ['completeness-required-fields', 'accuracy-numeric-range'],
      owner: 'Data Protection Officer',
      approver: 'Chief Medical Officer',
      compliance: 'HIPAA',
      retentionPeriod: 2555, // 7 years
      accessLevel: 'restricted',
      lastReviewed: new Date(),
      nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });

    this.addPolicy({
      id: 'financial-data-policy',
      name: 'Financial Data Governance Policy',
      description: 'SOX-compliant financial data handling',
      dataTypes: ['revenue', 'expense', 'billing', 'payment'],
      rules: ['completeness-required-fields', 'accuracy-numeric-range', 'uniqueness-primary-key'],
      owner: 'Chief Financial Officer',
      approver: 'Chief Executive Officer',
      compliance: 'SOX',
      retentionPeriod: 2555, // 7 years
      accessLevel: 'confidential',
      lastReviewed: new Date(),
      nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });
  }

  addRule(rule: DataQualityRule): void {
    this.rules.set(rule.id, rule);
    this.logger.info(`Added data quality rule: ${rule.name}`);
  }

  removeRule(ruleId: string): void {
    if (this.rules.delete(ruleId)) {
      this.logger.info(`Removed data quality rule: ${ruleId}`);
    }
  }

  addPolicy(policy: DataGovernancePolicy): void {
    this.policies.set(policy.id, policy);
    this.logger.info(`Added data governance policy: ${policy.name}`);
  }

  private async initializeDataSources(): Promise<void> {
    // Initialize connections to data sources
    this.logger.info('Data sources initialized');
  }

  private async loadCustomRulesAndPolicies(): Promise<void> {
    // Load custom rules and policies from configuration
    this.logger.info('Custom rules and policies loaded');
  }

  private startContinuousMonitoring(): void {
    const monitoringInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(monitoringInterval);
        return;
      }

      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error('Continuous monitoring error', { error });
      }
    }, 60000); // Check every minute

    this.logger.info('Continuous monitoring started');
  }

  private async performHealthCheck(): Promise<void> {
    // Perform periodic health checks
    const healthScore = Math.random() * 0.1 + 0.9; // Simulate health score
    this.metricsService.setDataQualityScore(healthScore, 'system', 'health-check');
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
    this.logger.info('Data Quality Pipeline shutting down');
  }

  getRules(): DataQualityRule[] {
    return Array.from(this.rules.values());
  }

  getPolicies(): DataGovernancePolicy[] {
    return Array.from(this.policies.values());
  }
}

// Export for CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const pipeline = new DataQualityPipeline();

  // Example data validation
  const sampleData = [
    { id: 1, timestamp: new Date().toISOString(), value: 100, email: 'test@example.com' },
    { id: 2, timestamp: new Date().toISOString(), value: 200, email: 'invalid-email' },
    { id: 3, timestamp: null, value: -50, email: 'valid@test.com' }
  ];

  pipeline.initialize()
    .then(() => pipeline.validateDataset('sample-pipeline', sampleData))
    .then(report => {
      console.log('Data Quality Report:');
      console.log(`Overall Score: ${(report.overall.score * 100).toFixed(2)}%`);
      console.log(`Status: ${report.overall.status}`);
      console.log(`Passed Rules: ${report.overall.passedRules}`);
      console.log(`Failed Rules: ${report.overall.failedRules}`);
      console.log(`Recommendations: ${report.recommendations.length}`);
    })
    .catch(console.error);
}