import { RevenueCycleKPI, RevenueCycleAlert, RevenueCycleMetrics } from '@types/revenue-cycle.js';
import { pool } from '@config/database.js';
import { v4 as uuidv4 } from 'uuid';

export class KPIMonitor {
  private readonly alertThresholds = {
    daysInAR: { warning: 35, critical: 45 },
    collectionRate: { warning: 92, critical: 88 },
    denialRate: { warning: 8, critical: 12 },
    responseTime: { warning: 150, critical: 200 },
    uptime: { warning: 99.95, critical: 99.9 }
  };

  /**
   * Monitors revenue cycle KPIs in real-time and generates alerts
   */
  async monitorRealTimeKPIs(organizationId: string): Promise<RevenueCycleAlert[]> {
    try {
      const currentMetrics = await this.getCurrentMetrics(organizationId);
      const alerts: RevenueCycleAlert[] = [];

      // Check Days in A/R
      if (currentMetrics.daysInAR > this.alertThresholds.daysInAR.critical) {
        alerts.push(this.createAlert(
          organizationId,
          'performance_degradation',
          'critical',
          'Critical: Days in A/R Exceeded',
          `Days in A/R (${currentMetrics.daysInAR}) exceeded critical threshold (${this.alertThresholds.daysInAR.critical})`,
          'daysInAR',
          currentMetrics.daysInAR,
          this.alertThresholds.daysInAR.critical,
          [
            'Implement automated payment posting',
            'Review denial management process',
            'Optimize collection workflows'
          ]
        ));
      } else if (currentMetrics.daysInAR > this.alertThresholds.daysInAR.warning) {
        alerts.push(this.createAlert(
          organizationId,
          'performance_degradation',
          'warning',
          'Warning: Days in A/R Elevated',
          `Days in A/R (${currentMetrics.daysInAR}) exceeded warning threshold (${this.alertThresholds.daysInAR.warning})`,
          'daysInAR',
          currentMetrics.daysInAR,
          this.alertThresholds.daysInAR.warning,
          [
            'Monitor payment posting delays',
            'Review payer response times'
          ]
        ));
      }

      // Check Collection Rate
      if (currentMetrics.collectionRate < this.alertThresholds.collectionRate.critical) {
        alerts.push(this.createAlert(
          organizationId,
          'performance_degradation',
          'critical',
          'Critical: Collection Rate Below Target',
          `Collection rate (${currentMetrics.collectionRate}%) below critical threshold (${this.alertThresholds.collectionRate.critical}%)`,
          'collectionRate',
          currentMetrics.collectionRate,
          this.alertThresholds.collectionRate.critical,
          [
            'Analyze denial patterns',
            'Implement automated appeals',
            'Review coding accuracy'
          ]
        ));
      }

      // Check Denial Rate
      if (currentMetrics.denialRate > this.alertThresholds.denialRate.critical) {
        alerts.push(this.createAlert(
          organizationId,
          'performance_degradation',
          'critical',
          'Critical: High Denial Rate',
          `Denial rate (${currentMetrics.denialRate}%) exceeded critical threshold (${this.alertThresholds.denialRate.critical}%)`,
          'denialRate',
          currentMetrics.denialRate,
          this.alertThresholds.denialRate.critical,
          [
            'Implement pre-submission validation',
            'Review coding accuracy',
            'Analyze payer-specific requirements'
          ]
        ));
      }

      // Save alerts to database
      for (const alert of alerts) {
        await this.saveAlert(alert);
      }

      return alerts;
    } catch (error) {
      console.error('Error monitoring real-time KPIs:', error);
      throw new Error('Failed to monitor real-time KPIs');
    }
  }

  /**
   * Tracks revenue cycle performance trends over time
   */
  async trackPerformanceTrends(organizationId: string, days: number = 30): Promise<{
    trends: RevenueCycleKPI[];
    analysis: {
      daysInARTrend: 'improving' | 'stable' | 'declining';
      collectionRateTrend: 'improving' | 'stable' | 'declining';
      denialRateTrend: 'improving' | 'stable' | 'declining';
      overallTrend: 'improving' | 'stable' | 'declining';
    };
  }> {
    try {
      const query = `
        SELECT *
        FROM revenue_cycle_kpis
        WHERE organization_id = $1
        AND date >= NOW() - INTERVAL '${days} days'
        ORDER BY date ASC
      `;

      const result = await pool.query(query, [organizationId]);

      const trends: RevenueCycleKPI[] = result.rows.map(row => ({
        id: row.id,
        organizationId: row.organization_id,
        period: row.period,
        date: row.date,
        daysInAR: row.days_in_ar,
        collectionRate: row.collection_rate,
        denialRate: row.denial_rate,
        costToCollect: row.cost_to_collect,
        netCollectionRate: row.net_collection_rate,
        grossCharges: row.gross_charges,
        netCharges: row.net_charges,
        payments: row.payments,
        adjustments: row.adjustments,
        writeOffs: row.write_offs,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      const analysis = this.analyzeTrends(trends);

      return { trends, analysis };
    } catch (error) {
      console.error('Error tracking performance trends:', error);
      throw new Error('Failed to track performance trends');
    }
  }

  /**
   * Generates comprehensive revenue cycle performance report
   */
  async generatePerformanceReport(organizationId: string): Promise<RevenueCycleMetrics> {
    try {
      const currentMetrics = await this.getCurrentMetrics(organizationId);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Calculate growth metrics
      const previousMetrics = await this.getMetricsForDate(organizationId, thirtyDaysAgo);
      const revenueGrowth = previousMetrics
        ? ((currentMetrics.totalRevenue - previousMetrics.totalRevenue) / previousMetrics.totalRevenue) * 100
        : 0;

      // Get automation metrics
      const automationMetrics = await this.getAutomationMetrics(organizationId);

      // Get quality metrics
      const qualityMetrics = await this.getQualityMetrics(organizationId);

      const report: RevenueCycleMetrics = {
        periodStart: thirtyDaysAgo,
        periodEnd: new Date(),
        totalRevenue: currentMetrics.totalRevenue,
        revenueGrowth,
        operationalEfficiency: this.calculateOperationalEfficiency(currentMetrics),
        automationRate: automationMetrics.automationRate,
        customerSatisfaction: 95, // Mock data - would integrate with actual surveys
        complianceScore: 99.5, // Mock data - would integrate with actual compliance system
        qualityMetrics
      };

      return report;
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw new Error('Failed to generate performance report');
    }
  }

  /**
   * Monitors system performance and uptime
   */
  async monitorSystemPerformance(): Promise<{
    responseTime: number;
    uptime: number;
    throughput: number;
    errorRate: number;
    systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
  }> {
    try {
      // Mock system metrics - would integrate with actual monitoring
      const responseTime = Math.random() * 50 + 50; // 50-100ms
      const uptime = 99.99;
      const throughput = Math.random() * 1000 + 5000; // 5000-6000 requests/min
      const errorRate = Math.random() * 0.1; // 0-0.1%

      let systemHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

      if (responseTime > 150 || uptime < 99.95 || errorRate > 0.1) {
        systemHealth = 'poor';
      } else if (responseTime > 100 || uptime < 99.98 || errorRate > 0.05) {
        systemHealth = 'fair';
      } else if (responseTime > 75 || uptime < 99.99 || errorRate > 0.01) {
        systemHealth = 'good';
      }

      return {
        responseTime,
        uptime,
        throughput,
        errorRate,
        systemHealth
      };
    } catch (error) {
      console.error('Error monitoring system performance:', error);
      throw new Error('Failed to monitor system performance');
    }
  }

  private async getCurrentMetrics(organizationId: string): Promise<{
    daysInAR: number;
    collectionRate: number;
    denialRate: number;
    totalRevenue: number;
  }> {
    // This would query actual claims and payment data
    // For now, returning mock data based on realistic scenarios
    return {
      daysInAR: 32 + Math.random() * 20,
      collectionRate: 90 + Math.random() * 8,
      denialRate: 8 + Math.random() * 7,
      totalRevenue: 500000 + Math.random() * 200000
    };
  }

  private async getMetricsForDate(organizationId: string, date: Date): Promise<{
    totalRevenue: number;
  } | null> {
    // Mock previous metrics
    return {
      totalRevenue: 480000 + Math.random() * 150000
    };
  }

  private async getAutomationMetrics(organizationId: string): Promise<{
    automationRate: number;
  }> {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE processing_type = 'automated') as automated_count,
        COUNT(*) as total_count
      FROM revenue_cycle_tasks
      WHERE organization_id = $1
      AND created_at >= NOW() - INTERVAL '7 days'
    `;

    try {
      const result = await pool.query(query, [organizationId]);
      const data = result.rows[0];

      const automationRate = data.total_count > 0
        ? (data.automated_count / data.total_count) * 100
        : 0;

      return { automationRate };
    } catch (error) {
      // Return mock data if table doesn't exist yet
      return { automationRate: 75 + Math.random() * 20 };
    }
  }

  private async getQualityMetrics(organizationId: string): Promise<{
    claimsAccuracy: number;
    codingAccuracy: number;
    denialResolutionTime: number;
    paymentPostingAccuracy: number;
    patientDataQuality: number;
    auditCompliance: number;
  }> {
    // Mock quality metrics - would integrate with actual quality systems
    return {
      claimsAccuracy: 97 + Math.random() * 2,
      codingAccuracy: 95 + Math.random() * 4,
      denialResolutionTime: 5 + Math.random() * 3,
      paymentPostingAccuracy: 99 + Math.random() * 1,
      patientDataQuality: 96 + Math.random() * 3,
      auditCompliance: 99 + Math.random() * 1
    };
  }

  private calculateOperationalEfficiency(metrics: any): number {
    // Weighted efficiency score based on key metrics
    const weights = {
      daysInAR: 0.3,
      collectionRate: 0.4,
      denialRate: 0.3
    };

    const daysInARScore = Math.max(0, 100 - (metrics.daysInAR - 30) * 2);
    const collectionRateScore = metrics.collectionRate;
    const denialRateScore = Math.max(0, 100 - metrics.denialRate * 5);

    return (
      daysInARScore * weights.daysInAR +
      collectionRateScore * weights.collectionRate +
      denialRateScore * weights.denialRate
    );
  }

  private analyzeTrends(kpis: RevenueCycleKPI[]): {
    daysInARTrend: 'improving' | 'stable' | 'declining';
    collectionRateTrend: 'improving' | 'stable' | 'declining';
    denialRateTrend: 'improving' | 'stable' | 'declining';
    overallTrend: 'improving' | 'stable' | 'declining';
  } {
    if (kpis.length < 2) {
      return {
        daysInARTrend: 'stable',
        collectionRateTrend: 'stable',
        denialRateTrend: 'stable',
        overallTrend: 'stable'
      };
    }

    const first = kpis[0];
    const last = kpis[kpis.length - 1];

    const daysInARChange = last.daysInAR - first.daysInAR;
    const collectionRateChange = last.collectionRate - first.collectionRate;
    const denialRateChange = last.denialRate - first.denialRate;

    const daysInARTrend = daysInARChange < -2 ? 'improving' : daysInARChange > 2 ? 'declining' : 'stable';
    const collectionRateTrend = collectionRateChange > 2 ? 'improving' : collectionRateChange < -2 ? 'declining' : 'stable';
    const denialRateTrend = denialRateChange < -1 ? 'improving' : denialRateChange > 1 ? 'declining' : 'stable';

    // Overall trend based on majority
    const improvements = [daysInARTrend, collectionRateTrend, denialRateTrend].filter(t => t === 'improving').length;
    const declines = [daysInARTrend, collectionRateTrend, denialRateTrend].filter(t => t === 'declining').length;

    const overallTrend = improvements > declines ? 'improving' : declines > improvements ? 'declining' : 'stable';

    return {
      daysInARTrend,
      collectionRateTrend,
      denialRateTrend,
      overallTrend
    };
  }

  private createAlert(
    organizationId: string,
    alertType: 'performance_degradation' | 'compliance_violation' | 'system_error' | 'optimization_opportunity',
    severity: 'info' | 'warning' | 'error' | 'critical',
    title: string,
    message: string,
    affectedKPI: string,
    currentValue: number,
    thresholdValue: number,
    recommendedActions: string[]
  ): RevenueCycleAlert {
    return {
      id: uuidv4(),
      organizationId,
      alertType,
      severity,
      title,
      message,
      affectedKPI,
      currentValue,
      thresholdValue,
      recommendedActions,
      isResolved: false,
      createdAt: new Date()
    };
  }

  private async saveAlert(alert: RevenueCycleAlert): Promise<void> {
    try {
      const query = `
        INSERT INTO revenue_cycle_alerts
        (id, organization_id, alert_type, severity, title, message,
         affected_kpi, current_value, threshold_value, recommended_actions,
         is_resolved, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;

      await pool.query(query, [
        alert.id, alert.organizationId, alert.alertType, alert.severity,
        alert.title, alert.message, alert.affectedKPI, alert.currentValue,
        alert.thresholdValue, JSON.stringify(alert.recommendedActions),
        alert.isResolved, alert.createdAt
      ]);
    } catch (error) {
      console.error('Error saving alert:', error);
      // Don't throw - we don't want alert saving to break monitoring
    }
  }
}