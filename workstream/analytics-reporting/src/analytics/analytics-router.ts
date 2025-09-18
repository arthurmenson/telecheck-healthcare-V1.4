import { Router, Request, Response } from 'express';
import { Logger } from '@utils/logger';
import { MetricsService } from '@utils/metrics-service';
import { ErrorHandler } from '@utils/error-handler';
import { DashboardValidator } from '@validation/dashboard-validator';

export class AnalyticsRouter {
  private router: Router;
  private logger: Logger;
  private metricsService: MetricsService;
  private dashboardValidator: DashboardValidator;

  constructor() {
    this.router = Router();
    this.logger = new Logger('AnalyticsRouter');
    this.metricsService = new MetricsService();
    this.dashboardValidator = new DashboardValidator();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Real-time analytics endpoint
    this.router.get('/real-time/:metric', ErrorHandler.handleAsync(this.getRealTimeMetric.bind(this)));

    // Historical analytics
    this.router.get('/historical/:metric', ErrorHandler.handleAsync(this.getHistoricalMetric.bind(this)));

    // Analytics aggregation
    this.router.post('/aggregate', ErrorHandler.handleAsync(this.aggregateMetrics.bind(this)));

    // Performance benchmarks
    this.router.get('/benchmarks', ErrorHandler.handleAsync(this.getPerformanceBenchmarks.bind(this)));

    // Analytics query builder
    this.router.post('/query', ErrorHandler.handleAsync(this.executeAnalyticsQuery.bind(this)));

    // Data export
    this.router.get('/export/:format', ErrorHandler.handleAsync(this.exportData.bind(this)));

    // System health analytics
    this.router.get('/system-health', ErrorHandler.handleAsync(this.getSystemHealth.bind(this)));
  }

  private async getRealTimeMetric(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { metric } = req.params;
    const { timeRange = '1h', granularity = '1m' } = req.query;

    this.logger.info(`Getting real-time metric: ${metric}`, { timeRange, granularity });

    try {
      // Simulate real-time data fetching
      const data = await this.fetchRealTimeData(metric as string, timeRange as string, granularity as string);

      // Record performance metrics
      this.metricsService.recordResponseTime(Date.now() - startTime, 'GET', '/analytics/real-time', 200);
      this.metricsService.recordAnalyticsQuery(Date.now() - startTime, 'real-time', true);

      res.json({
        success: true,
        metric,
        timeRange,
        granularity,
        data,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      });

    } catch (error) {
      this.logger.error(`Failed to get real-time metric: ${metric}`, { error });
      this.metricsService.recordAnalyticsQuery(Date.now() - startTime, 'real-time', false);
      throw ErrorHandler.analyticsError(`Failed to fetch real-time metric: ${error}`);
    }
  }

  private async getHistoricalMetric(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { metric } = req.params;
    const { startDate, endDate, aggregation = 'hour' } = req.query;

    this.logger.info(`Getting historical metric: ${metric}`, { startDate, endDate, aggregation });

    try {
      if (!startDate || !endDate) {
        throw ErrorHandler.validationError('startDate and endDate are required');
      }

      const data = await this.fetchHistoricalData(
        metric as string,
        new Date(startDate as string),
        new Date(endDate as string),
        aggregation as string
      );

      this.metricsService.recordResponseTime(Date.now() - startTime, 'GET', '/analytics/historical', 200);
      this.metricsService.recordAnalyticsQuery(Date.now() - startTime, 'historical', true);

      res.json({
        success: true,
        metric,
        startDate,
        endDate,
        aggregation,
        data,
        dataPoints: data.length,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      });

    } catch (error) {
      this.logger.error(`Failed to get historical metric: ${metric}`, { error });
      this.metricsService.recordAnalyticsQuery(Date.now() - startTime, 'historical', false);
      throw error;
    }
  }

  private async aggregateMetrics(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { metrics, timeRange, operations } = req.body;

    this.logger.info('Aggregating metrics', { metricsCount: metrics?.length, timeRange });

    try {
      if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
        throw ErrorHandler.validationError('metrics array is required');
      }

      const aggregatedData = await this.performAggregation(metrics, timeRange, operations);

      this.metricsService.recordResponseTime(Date.now() - startTime, 'POST', '/analytics/aggregate', 200);
      this.metricsService.recordAnalyticsQuery(Date.now() - startTime, 'aggregation', true);

      res.json({
        success: true,
        aggregatedData,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      });

    } catch (error) {
      this.logger.error('Failed to aggregate metrics', { error });
      this.metricsService.recordAnalyticsQuery(Date.now() - startTime, 'aggregation', false);
      throw error;
    }
  }

  private async getPerformanceBenchmarks(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const benchmarks = {
        responseTime: {
          current: await this.getCurrentAverageResponseTime(),
          target: 500,
          status: 'good'
        },
        dataAccuracy: {
          current: await this.getCurrentDataAccuracy(),
          target: 0.99,
          status: 'excellent'
        },
        systemLoad: {
          current: await this.getCurrentSystemLoad(),
          target: 0.8,
          status: 'warning'
        },
        cacheHitRate: {
          current: await this.getCurrentCacheHitRate(),
          target: 0.85,
          status: 'good'
        }
      };

      // Calculate overall health score
      const healthScore = this.calculateHealthScore(benchmarks);

      this.metricsService.recordResponseTime(Date.now() - startTime, 'GET', '/analytics/benchmarks', 200);

      res.json({
        success: true,
        benchmarks,
        healthScore,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      });

    } catch (error) {
      this.logger.error('Failed to get performance benchmarks', { error });
      throw ErrorHandler.analyticsError(`Failed to get benchmarks: ${error}`);
    }
  }

  private async executeAnalyticsQuery(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { query, parameters } = req.body;

    this.logger.info('Executing analytics query', { queryType: query?.type });

    try {
      if (!query) {
        throw ErrorHandler.validationError('query object is required');
      }

      const result = await this.executeQuery(query, parameters);

      this.metricsService.recordResponseTime(Date.now() - startTime, 'POST', '/analytics/query', 200);
      this.metricsService.recordAnalyticsQuery(Date.now() - startTime, query.type || 'custom', true);

      res.json({
        success: true,
        result,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      });

    } catch (error) {
      this.logger.error('Failed to execute analytics query', { error });
      this.metricsService.recordAnalyticsQuery(Date.now() - startTime, 'custom', false);
      throw error;
    }
  }

  private async exportData(req: Request, res: Response): Promise<void> {
    const { format } = req.params;
    const { metric, startDate, endDate } = req.query;

    this.logger.info(`Exporting data in ${format} format`, { metric, startDate, endDate });

    try {
      if (!['csv', 'json', 'xlsx'].includes(format)) {
        throw ErrorHandler.validationError('Supported formats: csv, json, xlsx');
      }

      const data = await this.prepareExportData(metric as string, startDate as string, endDate as string);
      const exportResult = await this.formatDataForExport(data, format);

      res.setHeader('Content-Type', this.getContentType(format));
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${metric}-${Date.now()}.${format}"`);
      res.send(exportResult);

    } catch (error) {
      this.logger.error(`Failed to export data in ${format} format`, { error });
      throw ErrorHandler.analyticsError(`Data export failed: ${error}`);
    }
  }

  private async getSystemHealth(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const systemHealth = {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: await this.getCPUUsage(),
        activeConnections: await this.getActiveConnections(),
        databaseHealth: await this.checkDatabaseHealth(),
        cacheHealth: await this.checkCacheHealth(),
        streamingHealth: await this.checkStreamingHealth(),
        lastUpdate: new Date().toISOString()
      };

      res.json({
        success: true,
        systemHealth,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      });

    } catch (error) {
      this.logger.error('Failed to get system health', { error });
      throw ErrorHandler.analyticsError(`System health check failed: ${error}`);
    }
  }

  // Helper methods
  private async fetchRealTimeData(metric: string, timeRange: string, granularity: string): Promise<any[]> {
    // Simulate real-time data
    const points = this.getTimePoints(timeRange, granularity);
    return points.map(timestamp => ({
      timestamp,
      value: Math.random() * 100 + Math.sin(Date.now() / 10000) * 20,
      metric
    }));
  }

  private async fetchHistoricalData(metric: string, startDate: Date, endDate: Date, aggregation: string): Promise<any[]> {
    // Simulate historical data
    const points = this.getHistoricalTimePoints(startDate, endDate, aggregation);
    return points.map(timestamp => ({
      timestamp,
      value: Math.random() * 100,
      metric
    }));
  }

  private async performAggregation(metrics: string[], timeRange: string, operations: any): Promise<any> {
    // Simulate aggregation
    return {
      sum: metrics.reduce((acc, metric) => acc + Math.random() * 100, 0),
      average: Math.random() * 100,
      min: Math.random() * 50,
      max: Math.random() * 100 + 50,
      count: metrics.length,
      timeRange
    };
  }

  private getTimePoints(timeRange: string, granularity: string): number[] {
    const now = Date.now();
    const points: number[] = [];
    const interval = this.parseGranularity(granularity);
    const range = this.parseTimeRange(timeRange);

    for (let time = now - range; time <= now; time += interval) {
      points.push(time);
    }

    return points;
  }

  private getHistoricalTimePoints(startDate: Date, endDate: Date, aggregation: string): number[] {
    const points: number[] = [];
    const interval = this.parseAggregation(aggregation);

    for (let time = startDate.getTime(); time <= endDate.getTime(); time += interval) {
      points.push(time);
    }

    return points;
  }

  private parseGranularity(granularity: string): number {
    const unit = granularity.slice(-1);
    const value = parseInt(granularity.slice(0, -1));

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      default: return 60 * 1000; // default 1 minute
    }
  }

  private parseTimeRange(timeRange: string): number {
    const unit = timeRange.slice(-1);
    const value = parseInt(timeRange.slice(0, -1));

    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000; // default 1 hour
    }
  }

  private parseAggregation(aggregation: string): number {
    switch (aggregation) {
      case 'minute': return 60 * 1000;
      case 'hour': return 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  private async getCurrentAverageResponseTime(): Promise<number> {
    return 350 + Math.random() * 100;
  }

  private async getCurrentDataAccuracy(): Promise<number> {
    return 0.995 + Math.random() * 0.005;
  }

  private async getCurrentSystemLoad(): Promise<number> {
    return 0.6 + Math.random() * 0.3;
  }

  private async getCurrentCacheHitRate(): Promise<number> {
    return 0.85 + Math.random() * 0.1;
  }

  private calculateHealthScore(benchmarks: any): number {
    const scores = Object.values(benchmarks).map((b: any) => {
      const ratio = b.current / b.target;
      return Math.min(ratio, 1);
    });

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private async executeQuery(query: any, parameters: any): Promise<any> {
    // Simulate query execution
    return {
      rows: Math.floor(Math.random() * 1000),
      data: Array.from({ length: 10 }, () => ({
        id: Math.random().toString(36),
        value: Math.random() * 100,
        timestamp: new Date().toISOString()
      }))
    };
  }

  private async prepareExportData(metric: string, startDate: string, endDate: string): Promise<any[]> {
    // Simulate export data preparation
    return Array.from({ length: 100 }, (_, i) => ({
      timestamp: new Date(Date.now() - (100 - i) * 60000).toISOString(),
      metric,
      value: Math.random() * 100
    }));
  }

  private async formatDataForExport(data: any[], format: string): Promise<string | Buffer> {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        const headers = Object.keys(data[0] || {});
        const csvRows = [
          headers.join(','),
          ...data.map(row => headers.map(h => row[h]).join(','))
        ];
        return csvRows.join('\n');
      case 'xlsx':
        // In a real implementation, use a library like xlsx
        return Buffer.from('Excel data would go here');
      default:
        return JSON.stringify(data);
    }
  }

  private getContentType(format: string): string {
    switch (format) {
      case 'json': return 'application/json';
      case 'csv': return 'text/csv';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default: return 'application/octet-stream';
    }
  }

  private async getCPUUsage(): Promise<number> {
    return Math.random() * 100;
  }

  private async getActiveConnections(): Promise<number> {
    return Math.floor(Math.random() * 100);
  }

  private async checkDatabaseHealth(): Promise<{ status: string; responseTime: number }> {
    return {
      status: 'healthy',
      responseTime: Math.random() * 50
    };
  }

  private async checkCacheHealth(): Promise<{ status: string; hitRate: number }> {
    return {
      status: 'healthy',
      hitRate: 0.85 + Math.random() * 0.1
    };
  }

  private async checkStreamingHealth(): Promise<{ status: string; latency: number }> {
    return {
      status: 'healthy',
      latency: Math.random() * 100
    };
  }

  getRouter(): Router {
    return this.router;
  }
}