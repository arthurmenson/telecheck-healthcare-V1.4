import { RevenueCycleKPI, RevenueCycleOptimization, OptimizationRecommendation, RevenueCycleTarget } from '@types/revenue-cycle.js';
import { pool } from '@config/database.js';
import { v4 as uuidv4 } from 'uuid';

export class RevenueCycleOptimizer {
  private readonly REVENUE_IMPROVEMENT_TARGET = 20; // 20% improvement target
  private readonly MANUAL_TASK_REDUCTION_TARGET = 40; // 40% reduction target
  private readonly UPTIME_REQUIREMENT = 99.99; // 99.99% uptime requirement

  /**
   * Analyzes current revenue cycle performance and generates optimization recommendations
   */
  async analyzeAndOptimize(organizationId: string): Promise<RevenueCycleOptimization> {
    try {
      // Get current KPIs
      const currentKPIs = await this.getCurrentKPIs(organizationId);

      // Analyze performance gaps
      const performanceGaps = await this.identifyPerformanceGaps(organizationId, currentKPIs);

      // Generate optimization recommendations
      const recommendations = await this.generateRecommendations(performanceGaps);

      // Calculate potential improvement
      const potentialImprovement = this.calculatePotentialImprovement(recommendations);

      // Create optimization record
      const optimization: RevenueCycleOptimization = {
        id: uuidv4(),
        organizationId,
        optimizationType: 'claims_processing',
        currentValue: currentKPIs.collectionRate,
        targetValue: currentKPIs.collectionRate * (1 + this.REVENUE_IMPROVEMENT_TARGET / 100),
        actualValue: currentKPIs.collectionRate,
        improvementPercentage: 0,
        status: 'planning',
        recommendations,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.saveOptimization(optimization);

      return optimization;
    } catch (error) {
      console.error('Error in revenue cycle optimization analysis:', error);
      throw new Error('Failed to analyze and optimize revenue cycle');
    }
  }

  /**
   * Monitors revenue cycle KPIs and identifies trends
   */
  async monitorKPIs(organizationId: string): Promise<RevenueCycleKPI[]> {
    try {
      const query = `
        SELECT
          id, organization_id, period, date,
          days_in_ar, collection_rate, denial_rate,
          cost_to_collect, net_collection_rate,
          gross_charges, net_charges, payments,
          adjustments, write_offs, created_at, updated_at
        FROM revenue_cycle_kpis
        WHERE organization_id = $1
        ORDER BY date DESC
        LIMIT 30
      `;

      const result = await pool.query(query, [organizationId]);

      return result.rows.map(row => ({
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
    } catch (error) {
      console.error('Error monitoring KPIs:', error);
      throw new Error('Failed to monitor revenue cycle KPIs');
    }
  }

  /**
   * Calculates real-time revenue cycle performance metrics
   */
  async calculateRealTimeMetrics(organizationId: string): Promise<{
    daysInAR: number;
    collectionRate: number;
    denialRate: number;
    automationRate: number;
    responseTime: number;
    uptime: number;
  }> {
    try {
      // Get latest claims data
      const claimsQuery = `
        SELECT
          COUNT(*) as total_claims,
          COUNT(*) FILTER (WHERE status = 'paid') as paid_claims,
          COUNT(*) FILTER (WHERE status = 'denied') as denied_claims,
          AVG(EXTRACT(DAY FROM (paid_date - submitted_date))) as avg_days_to_payment
        FROM claims
        WHERE organization_id = $1
        AND submitted_date >= NOW() - INTERVAL '30 days'
      `;

      const claimsResult = await pool.query(claimsQuery, [organizationId]);
      const claimsData = claimsResult.rows[0];

      // Get automation metrics
      const automationQuery = `
        SELECT
          COUNT(*) FILTER (WHERE processing_type = 'automated') as automated_tasks,
          COUNT(*) as total_tasks
        FROM revenue_cycle_tasks
        WHERE organization_id = $1
        AND created_at >= NOW() - INTERVAL '24 hours'
      `;

      const automationResult = await pool.query(automationQuery, [organizationId]);
      const automationData = automationResult.rows[0];

      // Calculate metrics
      const daysInAR = parseFloat(claimsData.avg_days_to_payment) || 0;
      const collectionRate = claimsData.total_claims > 0
        ? (claimsData.paid_claims / claimsData.total_claims) * 100
        : 0;
      const denialRate = claimsData.total_claims > 0
        ? (claimsData.denied_claims / claimsData.total_claims) * 100
        : 0;
      const automationRate = automationData.total_tasks > 0
        ? (automationData.automated_tasks / automationData.total_tasks) * 100
        : 0;

      // Mock performance metrics (would integrate with actual monitoring)
      const responseTime = Math.random() * 50 + 50; // 50-100ms
      const uptime = this.UPTIME_REQUIREMENT;

      return {
        daysInAR,
        collectionRate,
        denialRate,
        automationRate,
        responseTime,
        uptime
      };
    } catch (error) {
      console.error('Error calculating real-time metrics:', error);
      throw new Error('Failed to calculate real-time revenue cycle metrics');
    }
  }

  /**
   * Implements optimization recommendations
   */
  async implementOptimization(optimizationId: string, recommendationIds: string[]): Promise<boolean> {
    try {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Update optimization status
        await client.query(
          'UPDATE revenue_cycle_optimizations SET status = $1, updated_at = NOW() WHERE id = $2',
          ['implementing', optimizationId]
        );

        // Update recommendation statuses
        for (const recommendationId of recommendationIds) {
          await client.query(
            'UPDATE optimization_recommendations SET status = $1, implementation_date = NOW() WHERE id = $2',
            ['in_progress', recommendationId]
          );
        }

        await client.query('COMMIT');
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error implementing optimization:', error);
      return false;
    }
  }

  private async getCurrentKPIs(organizationId: string): Promise<RevenueCycleKPI> {
    const query = `
      SELECT * FROM revenue_cycle_kpis
      WHERE organization_id = $1
      ORDER BY date DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [organizationId]);

    if (result.rows.length === 0) {
      // Return default KPIs if none exist
      return {
        id: uuidv4(),
        organizationId,
        period: 'monthly',
        date: new Date(),
        daysInAR: 45,
        collectionRate: 85,
        denialRate: 15,
        costToCollect: 5,
        netCollectionRate: 80,
        grossCharges: 100000,
        netCharges: 90000,
        payments: 76500,
        adjustments: 10000,
        writeOffs: 3500,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    const row = result.rows[0];
    return {
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
    };
  }

  private async identifyPerformanceGaps(organizationId: string, currentKPIs: RevenueCycleKPI): Promise<{
    metric: string;
    current: number;
    target: number;
    gap: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }[]> {
    // Industry benchmarks
    const benchmarks = {
      daysInAR: 30,
      collectionRate: 98,
      denialRate: 5,
      costToCollect: 2
    };

    const gaps = [];

    // Days in A/R gap
    if (currentKPIs.daysInAR > benchmarks.daysInAR) {
      gaps.push({
        metric: 'daysInAR',
        current: currentKPIs.daysInAR,
        target: benchmarks.daysInAR,
        gap: currentKPIs.daysInAR - benchmarks.daysInAR,
        priority: currentKPIs.daysInAR > 60 ? 'critical' as const : 'high' as const
      });
    }

    // Collection rate gap
    if (currentKPIs.collectionRate < benchmarks.collectionRate) {
      gaps.push({
        metric: 'collectionRate',
        current: currentKPIs.collectionRate,
        target: benchmarks.collectionRate,
        gap: benchmarks.collectionRate - currentKPIs.collectionRate,
        priority: currentKPIs.collectionRate < 90 ? 'critical' as const : 'high' as const
      });
    }

    // Denial rate gap
    if (currentKPIs.denialRate > benchmarks.denialRate) {
      gaps.push({
        metric: 'denialRate',
        current: currentKPIs.denialRate,
        target: benchmarks.denialRate,
        gap: currentKPIs.denialRate - benchmarks.denialRate,
        priority: currentKPIs.denialRate > 20 ? 'critical' as const : 'high' as const
      });
    }

    // Cost to collect gap
    if (currentKPIs.costToCollect > benchmarks.costToCollect) {
      gaps.push({
        metric: 'costToCollect',
        current: currentKPIs.costToCollect,
        target: benchmarks.costToCollect,
        gap: currentKPIs.costToCollect - benchmarks.costToCollect,
        priority: currentKPIs.costToCollect > 5 ? 'high' as const : 'medium' as const
      });
    }

    return gaps;
  }

  private async generateRecommendations(performanceGaps: any[]): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    for (const gap of performanceGaps) {
      switch (gap.metric) {
        case 'daysInAR':
          recommendations.push({
            id: uuidv4(),
            title: 'Automate Payment Posting',
            description: 'Implement automated payment posting to reduce days in A/R by 15-20 days',
            priority: gap.priority,
            expectedImpact: 15,
            estimatedEffort: 'medium',
            category: 'automation',
            status: 'pending'
          });
          break;

        case 'collectionRate':
          recommendations.push({
            id: uuidv4(),
            title: 'Implement AI-Powered Denial Management',
            description: 'Use AI to automatically identify and appeal denials, improving collection rates by 8-12%',
            priority: gap.priority,
            expectedImpact: 10,
            estimatedEffort: 'high',
            category: 'automation',
            status: 'pending'
          });
          break;

        case 'denialRate':
          recommendations.push({
            id: uuidv4(),
            title: 'Real-time Claims Validation',
            description: 'Implement pre-submission claims validation to reduce denial rates by 60%',
            priority: gap.priority,
            expectedImpact: 60,
            estimatedEffort: 'high',
            category: 'process_improvement',
            status: 'pending'
          });
          break;

        case 'costToCollect':
          recommendations.push({
            id: uuidv4(),
            title: 'Automate Collection Workflows',
            description: 'Implement automated collection workflows to reduce manual effort by 50%',
            priority: gap.priority,
            expectedImpact: 50,
            estimatedEffort: 'medium',
            category: 'automation',
            status: 'pending'
          });
          break;
      }
    }

    return recommendations;
  }

  private calculatePotentialImprovement(recommendations: OptimizationRecommendation[]): number {
    return recommendations.reduce((total, rec) => total + rec.expectedImpact, 0);
  }

  private async saveOptimization(optimization: RevenueCycleOptimization): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Insert optimization record
      await client.query(
        `INSERT INTO revenue_cycle_optimizations
         (id, organization_id, optimization_type, current_value, target_value,
          actual_value, improvement_percentage, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [optimization.id, optimization.organizationId, optimization.optimizationType,
         optimization.currentValue, optimization.targetValue, optimization.actualValue,
         optimization.improvementPercentage, optimization.status,
         optimization.createdAt, optimization.updatedAt]
      );

      // Insert recommendations
      for (const rec of optimization.recommendations) {
        await client.query(
          `INSERT INTO optimization_recommendations
           (id, optimization_id, title, description, priority, expected_impact,
            estimated_effort, category, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [rec.id, optimization.id, rec.title, rec.description, rec.priority,
           rec.expectedImpact, rec.estimatedEffort, rec.category, rec.status]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}