import { Router, Request, Response } from 'express';
import { Logger } from '@utils/logger';
import { ErrorHandler } from '@utils/error-handler';
import { DashboardValidator } from './dashboard-validator';

export class ValidationRouter {
  private router: Router;
  private logger: Logger;
  private dashboardValidator: DashboardValidator;

  constructor() {
    this.router = Router();
    this.logger = new Logger('ValidationRouter');
    this.dashboardValidator = new DashboardValidator();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.post('/dashboard', ErrorHandler.handleAsync(this.validateDashboard.bind(this)));
    this.router.get('/thresholds', ErrorHandler.handleAsync(this.getThresholds.bind(this)));
    this.router.put('/thresholds', ErrorHandler.handleAsync(this.updateThresholds.bind(this)));
  }

  private async validateDashboard(req: Request, res: Response): Promise<void> {
    const { dashboardId, metrics } = req.body;

    try {
      const result = await this.dashboardValidator.validateDashboard(dashboardId, metrics);

      res.json({
        success: true,
        validation: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Dashboard validation failed', { error });
      throw error;
    }
  }

  private async getThresholds(req: Request, res: Response): Promise<void> {
    try {
      const thresholds = this.dashboardValidator.getThresholds();

      res.json({
        success: true,
        thresholds,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get thresholds', { error });
      throw ErrorHandler.analyticsError(`Failed to get thresholds: ${error}`);
    }
  }

  private async updateThresholds(req: Request, res: Response): Promise<void> {
    const { metric, value } = req.body;

    try {
      this.dashboardValidator.setThreshold(metric, value);

      res.json({
        success: true,
        message: `Threshold updated for ${metric}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to update threshold', { error });
      throw error;
    }
  }

  getRouter(): Router {
    return this.router;
  }
}