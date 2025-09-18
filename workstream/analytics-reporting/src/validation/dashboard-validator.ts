import { Logger } from '@utils/logger';
import { MetricsService } from '@utils/metrics-service';
import { ErrorHandler } from '@utils/error-handler';

export interface DashboardMetrics {
  responseTime: number;
  dataAccuracy: number;
  renderTime: number;
  cacheHitRate: number;
  errorRate: number;
  userEngagement: number;
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  metrics: DashboardMetrics;
  issues: ValidationIssue[];
  recommendations: string[];
  timestamp: Date;
}

export interface ValidationIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'performance' | 'accuracy' | 'usability' | 'accessibility';
  message: string;
  metric: string;
  currentValue: number;
  expectedValue: number;
}

export class DashboardValidator {
  private logger: Logger;
  private metricsService: MetricsService;
  private thresholds: Record<string, number>;

  constructor() {
    this.logger = new Logger('DashboardValidator');
    this.metricsService = new MetricsService();
    this.thresholds = {
      responseTime: 500, // milliseconds
      dataAccuracy: 0.99,
      renderTime: 200, // milliseconds
      cacheHitRate: 0.85,
      errorRate: 0.01,
      userEngagement: 0.7
    };
  }

  async validateDashboard(dashboardId: string, metrics: DashboardMetrics): Promise<ValidationResult> {
    const startTime = Date.now();
    this.logger.info(`Starting dashboard validation for ${dashboardId}`);

    try {
      const issues: ValidationIssue[] = [];
      const recommendations: string[] = [];

      // Validate response time
      if (metrics.responseTime > this.thresholds.responseTime) {
        issues.push({
          severity: metrics.responseTime > this.thresholds.responseTime * 2 ? 'critical' : 'high',
          category: 'performance',
          message: 'Dashboard response time exceeds acceptable threshold',
          metric: 'responseTime',
          currentValue: metrics.responseTime,
          expectedValue: this.thresholds.responseTime
        });
        recommendations.push('Implement data caching and optimize database queries');
      }

      // Validate data accuracy
      if (metrics.dataAccuracy < this.thresholds.dataAccuracy) {
        issues.push({
          severity: metrics.dataAccuracy < 0.95 ? 'critical' : 'high',
          category: 'accuracy',
          message: 'Data accuracy below required threshold',
          metric: 'dataAccuracy',
          currentValue: metrics.dataAccuracy,
          expectedValue: this.thresholds.dataAccuracy
        });
        recommendations.push('Implement data validation pipeline and quality checks');
      }

      // Validate render time
      if (metrics.renderTime > this.thresholds.renderTime) {
        issues.push({
          severity: metrics.renderTime > this.thresholds.renderTime * 3 ? 'high' : 'medium',
          category: 'performance',
          message: 'Chart render time is too slow',
          metric: 'renderTime',
          currentValue: metrics.renderTime,
          expectedValue: this.thresholds.renderTime
        });
        recommendations.push('Optimize chart rendering with virtualization and lazy loading');
      }

      // Validate cache hit rate
      if (metrics.cacheHitRate < this.thresholds.cacheHitRate) {
        issues.push({
          severity: 'medium',
          category: 'performance',
          message: 'Cache hit rate is below optimal threshold',
          metric: 'cacheHitRate',
          currentValue: metrics.cacheHitRate,
          expectedValue: this.thresholds.cacheHitRate
        });
        recommendations.push('Review caching strategy and implement intelligent cache warming');
      }

      // Validate error rate
      if (metrics.errorRate > this.thresholds.errorRate) {
        issues.push({
          severity: metrics.errorRate > 0.05 ? 'critical' : 'high',
          category: 'accuracy',
          message: 'Error rate exceeds acceptable threshold',
          metric: 'errorRate',
          currentValue: metrics.errorRate,
          expectedValue: this.thresholds.errorRate
        });
        recommendations.push('Implement comprehensive error handling and monitoring');
      }

      // Validate user engagement
      if (metrics.userEngagement < this.thresholds.userEngagement) {
        issues.push({
          severity: 'medium',
          category: 'usability',
          message: 'User engagement is below target',
          metric: 'userEngagement',
          currentValue: metrics.userEngagement,
          expectedValue: this.thresholds.userEngagement
        });
        recommendations.push('Improve dashboard UX with interactive elements and personalization');
      }

      // Calculate overall score
      const score = this.calculateValidationScore(metrics, issues);
      const isValid = score >= 0.8 && issues.filter(i => i.severity === 'critical').length === 0;

      const result: ValidationResult = {
        isValid,
        score,
        metrics,
        issues,
        recommendations,
        timestamp: new Date()
      };

      // Record metrics
      this.metricsService.recordDashboardRender(Date.now() - startTime, dashboardId, 'validation');
      this.metricsService.setDataQualityScore(score, 'dashboard', dashboardId);

      this.logger.info(`Dashboard validation completed for ${dashboardId}`, {
        score,
        isValid,
        issuesCount: issues.length,
        validationTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      this.logger.error(`Dashboard validation failed for ${dashboardId}`, { error });
      throw ErrorHandler.analyticsError(`Dashboard validation failed: ${error}`);
    }
  }

  private calculateValidationScore(metrics: DashboardMetrics, issues: ValidationIssue[]): number {
    let score = 1.0;

    // Deduct points based on metric performance
    const responseTimeRatio = Math.min(metrics.responseTime / this.thresholds.responseTime, 2);
    score -= (responseTimeRatio - 1) * 0.2;

    score -= (1 - metrics.dataAccuracy) * 0.3;

    const renderTimeRatio = Math.min(metrics.renderTime / this.thresholds.renderTime, 2);
    score -= (renderTimeRatio - 1) * 0.1;

    score -= (1 - metrics.cacheHitRate) * 0.1;
    score -= metrics.errorRate * 0.2;
    score -= (1 - metrics.userEngagement) * 0.1;

    // Additional deductions for issues
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 0.25;
          break;
        case 'high':
          score -= 0.15;
          break;
        case 'medium':
          score -= 0.08;
          break;
        case 'low':
          score -= 0.03;
          break;
      }
    });

    return Math.max(0, Math.min(1, score));
  }

  async validateRealTimeAccuracy(dashboardId: string, expectedData: any[], actualData: any[]): Promise<number> {
    if (expectedData.length !== actualData.length) {
      return 0;
    }

    let accuratePoints = 0;
    const totalPoints = expectedData.length;

    for (let i = 0; i < expectedData.length; i++) {
      if (this.compareDataPoints(expectedData[i], actualData[i])) {
        accuratePoints++;
      }
    }

    const accuracy = accuratePoints / totalPoints;
    this.metricsService.setDataQualityScore(accuracy, 'real-time', dashboardId);

    return accuracy;
  }

  private compareDataPoints(expected: any, actual: any, tolerance: number = 0.01): boolean {
    if (typeof expected === 'number' && typeof actual === 'number') {
      if (expected === 0) return actual === 0;
      return Math.abs(expected - actual) <= Math.abs(expected) * tolerance;
    }
    return JSON.stringify(expected) === JSON.stringify(actual);
  }

  async runContinuousValidation(dashboardId: string, intervalMs: number = 30000): Promise<void> {
    this.logger.info(`Starting continuous validation for dashboard ${dashboardId}`);

    const validateInterval = setInterval(async () => {
      try {
        // Simulate getting current dashboard metrics
        const currentMetrics = await this.getCurrentDashboardMetrics(dashboardId);
        const result = await this.validateDashboard(dashboardId, currentMetrics);

        if (!result.isValid) {
          this.logger.warn(`Dashboard ${dashboardId} validation failed`, {
            score: result.score,
            issuesCount: result.issues.length,
            criticalIssues: result.issues.filter(i => i.severity === 'critical').length
          });
        }

      } catch (error) {
        this.logger.error(`Continuous validation error for dashboard ${dashboardId}`, { error });
      }
    }, intervalMs);

    // Cleanup on process exit
    process.on('SIGTERM', () => clearInterval(validateInterval));
    process.on('SIGINT', () => clearInterval(validateInterval));
  }

  private async getCurrentDashboardMetrics(dashboardId: string): Promise<DashboardMetrics> {
    // This would typically fetch real metrics from monitoring systems
    // For now, return simulated metrics
    return {
      responseTime: Math.random() * 1000,
      dataAccuracy: 0.95 + Math.random() * 0.05,
      renderTime: Math.random() * 300,
      cacheHitRate: 0.8 + Math.random() * 0.2,
      errorRate: Math.random() * 0.02,
      userEngagement: 0.6 + Math.random() * 0.4
    };
  }

  setThreshold(metric: string, value: number): void {
    if (this.thresholds.hasOwnProperty(metric)) {
      this.thresholds[metric] = value;
      this.logger.info(`Updated threshold for ${metric}`, { newValue: value });
    } else {
      throw ErrorHandler.validationError(`Unknown metric: ${metric}`);
    }
  }

  getThresholds(): Record<string, number> {
    return { ...this.thresholds };
  }
}

// Export singleton instance for CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new DashboardValidator();

  // Example validation run
  const exampleMetrics: DashboardMetrics = {
    responseTime: 300,
    dataAccuracy: 0.995,
    renderTime: 150,
    cacheHitRate: 0.88,
    errorRate: 0.005,
    userEngagement: 0.75
  };

  validator.validateDashboard('example-dashboard', exampleMetrics)
    .then(result => {
      console.log('Dashboard Validation Result:');
      console.log(`Valid: ${result.isValid}`);
      console.log(`Score: ${result.score.toFixed(3)}`);
      console.log(`Issues: ${result.issues.length}`);
      console.log(`Recommendations: ${result.recommendations.length}`);
    })
    .catch(console.error);
}