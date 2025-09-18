import { Router, Request, Response } from 'express';
import { Logger } from '@utils/logger';
import { MetricsService } from '@utils/metrics-service';
import { ErrorHandler } from '@utils/error-handler';
import { RevenueTracker } from './revenue-tracker';

export class FinancialRouter {
  private router: Router;
  private logger: Logger;
  private metricsService: MetricsService;
  private revenueTracker: RevenueTracker;

  constructor() {
    this.router = Router();
    this.logger = new Logger('FinancialRouter');
    this.metricsService = new MetricsService();
    this.revenueTracker = new RevenueTracker();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Financial reports
    this.router.get('/report', ErrorHandler.handleAsync(this.getFinancialReport.bind(this)));

    // Revenue tracking
    this.router.get('/revenue-streams', ErrorHandler.handleAsync(this.getRevenueStreams.bind(this)));
    this.router.post('/revenue-streams/:id/track', ErrorHandler.handleAsync(this.trackRevenueStream.bind(this)));

    // ROI calculations
    this.router.post('/roi-analysis', ErrorHandler.handleAsync(this.calculateROI.bind(this)));

    // Financial metrics
    this.router.get('/metrics', ErrorHandler.handleAsync(this.getFinancialMetrics.bind(this)));
  }

  private async getFinancialReport(req: Request, res: Response): Promise<void> {
    const { period = 'monthly' } = req.query;
    const startTime = Date.now();

    try {
      const report = await this.revenueTracker.generateFinancialReport(period as string);

      this.metricsService.recordResponseTime(Date.now() - startTime, 'GET', '/financial/report', 200);

      res.json({
        success: true,
        report,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to generate financial report', { error });
      throw error;
    }
  }

  private async getRevenueStreams(req: Request, res: Response): Promise<void> {
    try {
      const streams = this.revenueTracker.getRevenueStreams();

      res.json({
        success: true,
        revenueStreams: streams,
        count: streams.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get revenue streams', { error });
      throw ErrorHandler.analyticsError(`Failed to get revenue streams: ${error}`);
    }
  }

  private async trackRevenueStream(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { period = 'monthly' } = req.body;
    const startTime = Date.now();

    try {
      const analysis = await this.revenueTracker.trackRevenueStream(id, period);

      this.metricsService.recordResponseTime(Date.now() - startTime, 'POST', `/financial/revenue-streams/${id}/track`, 200);

      res.json({
        success: true,
        analysis,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error(`Failed to track revenue stream: ${id}`, { error });
      throw error;
    }
  }

  private async calculateROI(req: Request, res: Response): Promise<void> {
    const { investmentAmount, departmentId, timeframe = 'annual' } = req.body;
    const startTime = Date.now();

    try {
      if (!investmentAmount || !departmentId) {
        throw ErrorHandler.validationError('investmentAmount and departmentId are required');
      }

      const roiAnalysis = await this.revenueTracker.calculateROI(investmentAmount, departmentId, timeframe);

      this.metricsService.recordResponseTime(Date.now() - startTime, 'POST', '/financial/roi-analysis', 200);

      res.json({
        success: true,
        roiAnalysis,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('ROI calculation failed', { error });
      throw error;
    }
  }

  private async getFinancialMetrics(req: Request, res: Response): Promise<void> {
    const { department } = req.query;

    try {
      const metrics = this.revenueTracker.getFinancialMetrics(department as string);

      res.json({
        success: true,
        metrics,
        count: metrics.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get financial metrics', { error });
      throw ErrorHandler.analyticsError(`Failed to get financial metrics: ${error}`);
    }
  }

  getRouter(): Router {
    return this.router;
  }
}