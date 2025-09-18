import { Router, Request, Response } from 'express';
import { Logger } from '@utils/logger';
import { MetricsService } from '@utils/metrics-service';
import { ErrorHandler } from '@utils/error-handler';
import { PopulationAnalytics } from './population-analytics';

export class HealthRouter {
  private router: Router;
  private logger: Logger;
  private metricsService: MetricsService;
  private populationAnalytics: PopulationAnalytics;

  constructor() {
    this.router = Router();
    this.logger = new Logger('HealthRouter');
    this.metricsService = new MetricsService();
    this.populationAnalytics = new PopulationAnalytics();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Population health reports
    this.router.get('/population-report', ErrorHandler.handleAsync(this.getPopulationReport.bind(this)));

    // Risk stratification
    this.router.post('/risk-stratification', ErrorHandler.handleAsync(this.stratifyRisk.bind(this)));

    // Quality measures
    this.router.get('/quality-measures', ErrorHandler.handleAsync(this.getQualityMeasures.bind(this)));
    this.router.post('/quality-measures/track', ErrorHandler.handleAsync(this.trackQualityMeasures.bind(this)));

    // Patient cohorts
    this.router.get('/cohorts', ErrorHandler.handleAsync(this.getCohorts.bind(this)));
    this.router.post('/cohorts', ErrorHandler.handleAsync(this.createCohort.bind(this)));
  }

  private async getPopulationReport(req: Request, res: Response): Promise<void> {
    const { period = 'monthly' } = req.query;
    const startTime = Date.now();

    try {
      const report = await this.populationAnalytics.generatePopulationReport(period as string);

      this.metricsService.recordResponseTime(Date.now() - startTime, 'GET', '/health/population-report', 200);

      res.json({
        success: true,
        report,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to generate population report', { error });
      throw error;
    }
  }

  private async stratifyRisk(req: Request, res: Response): Promise<void> {
    const { patientId, patientData } = req.body;
    const startTime = Date.now();

    try {
      if (!patientId || !patientData) {
        throw ErrorHandler.validationError('patientId and patientData are required');
      }

      const riskStratification = await this.populationAnalytics.stratifyPatientRisk(patientId, patientData);

      this.metricsService.recordResponseTime(Date.now() - startTime, 'POST', '/health/risk-stratification', 200);

      res.json({
        success: true,
        riskStratification,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Risk stratification failed', { error });
      throw error;
    }
  }

  private async getQualityMeasures(req: Request, res: Response): Promise<void> {
    try {
      const measures = this.populationAnalytics.getQualityMeasures();

      res.json({
        success: true,
        measures,
        count: measures.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get quality measures', { error });
      throw ErrorHandler.analyticsError(`Failed to get quality measures: ${error}`);
    }
  }

  private async trackQualityMeasures(req: Request, res: Response): Promise<void> {
    const { measureIds, reportingPeriod = 'monthly' } = req.body;
    const startTime = Date.now();

    try {
      if (!measureIds || !Array.isArray(measureIds)) {
        throw ErrorHandler.validationError('measureIds array is required');
      }

      const outcomes = await this.populationAnalytics.trackQualityMeasures(measureIds, reportingPeriod);

      this.metricsService.recordResponseTime(Date.now() - startTime, 'POST', '/health/quality-measures/track', 200);

      res.json({
        success: true,
        outcomes,
        count: outcomes.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Quality measure tracking failed', { error });
      throw error;
    }
  }

  private async getCohorts(req: Request, res: Response): Promise<void> {
    try {
      const cohorts = this.populationAnalytics.getCohorts();

      res.json({
        success: true,
        cohorts,
        count: cohorts.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get cohorts', { error });
      throw ErrorHandler.analyticsError(`Failed to get cohorts: ${error}`);
    }
  }

  private async createCohort(req: Request, res: Response): Promise<void> {
    const cohortData = req.body;

    try {
      if (!cohortData.id || !cohortData.name) {
        throw ErrorHandler.validationError('Cohort id and name are required');
      }

      const cohort = {
        ...cohortData,
        lastUpdated: new Date()
      };

      this.populationAnalytics.addCohort(cohort);

      res.status(201).json({
        success: true,
        cohort,
        message: 'Cohort created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to create cohort', { error });
      throw error;
    }
  }

  getRouter(): Router {
    return this.router;
  }
}