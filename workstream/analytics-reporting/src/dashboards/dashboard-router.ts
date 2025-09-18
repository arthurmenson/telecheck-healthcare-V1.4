import { Router, Request, Response } from 'express';
import { Logger } from '@utils/logger';
import { MetricsService } from '@utils/metrics-service';
import { ErrorHandler } from '@utils/error-handler';
import { DashboardValidator } from '@validation/dashboard-validator';

export class DashboardRouter {
  private router: Router;
  private logger: Logger;
  private metricsService: MetricsService;
  private dashboardValidator: DashboardValidator;

  constructor() {
    this.router = Router();
    this.logger = new Logger('DashboardRouter');
    this.metricsService = new MetricsService();
    this.dashboardValidator = new DashboardValidator();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Dashboard management
    this.router.get('/', ErrorHandler.handleAsync(this.getDashboards.bind(this)));
    this.router.get('/:id', ErrorHandler.handleAsync(this.getDashboard.bind(this)));
    this.router.post('/', ErrorHandler.handleAsync(this.createDashboard.bind(this)));
    this.router.put('/:id', ErrorHandler.handleAsync(this.updateDashboard.bind(this)));
    this.router.delete('/:id', ErrorHandler.handleAsync(this.deleteDashboard.bind(this)));

    // Dashboard validation
    this.router.post('/:id/validate', ErrorHandler.handleAsync(this.validateDashboard.bind(this)));

    // Dashboard metrics
    this.router.get('/:id/metrics', ErrorHandler.handleAsync(this.getDashboardMetrics.bind(this)));

    // Dashboard export
    this.router.get('/:id/export/:format', ErrorHandler.handleAsync(this.exportDashboard.bind(this)));
  }

  private async getDashboards(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const dashboards = [
        {
          id: 'clinical-dashboard',
          name: 'Clinical Performance Dashboard',
          description: 'Real-time clinical metrics and quality indicators',
          category: 'clinical',
          widgets: ['patient-volume', 'quality-scores', 'safety-metrics'],
          lastUpdated: new Date(),
          isActive: true
        },
        {
          id: 'financial-dashboard',
          name: 'Financial Analytics Dashboard',
          description: 'Revenue, costs, and profitability analysis',
          category: 'financial',
          widgets: ['revenue-trend', 'cost-analysis', 'roi-metrics'],
          lastUpdated: new Date(),
          isActive: true
        },
        {
          id: 'operational-dashboard',
          name: 'Operational Efficiency Dashboard',
          description: 'Operational metrics and performance indicators',
          category: 'operational',
          widgets: ['efficiency-metrics', 'resource-utilization', 'throughput'],
          lastUpdated: new Date(),
          isActive: true
        }
      ];

      this.metricsService.recordResponseTime(Date.now() - startTime, 'GET', '/dashboards', 200);

      res.json({
        success: true,
        dashboards,
        count: dashboards.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get dashboards', { error });
      throw ErrorHandler.analyticsError(`Failed to get dashboards: ${error}`);
    }
  }

  private async getDashboard(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const startTime = Date.now();

    try {
      // Simulate dashboard data
      const dashboard = {
        id,
        name: `Dashboard ${id}`,
        description: 'Dashboard description',
        config: {
          layout: 'grid',
          refreshInterval: 30000,
          theme: 'light'
        },
        widgets: [
          {
            id: 'widget-1',
            type: 'chart',
            title: 'Sample Metric',
            config: {
              chartType: 'line',
              dataSource: 'analytics-api',
              refreshRate: 5000
            },
            position: { x: 0, y: 0, width: 6, height: 4 }
          }
        ],
        permissions: {
          view: ['all'],
          edit: ['admin'],
          share: ['admin', 'manager']
        },
        lastUpdated: new Date(),
        isActive: true
      };

      this.metricsService.recordResponseTime(Date.now() - startTime, 'GET', `/dashboards/${id}`, 200);

      res.json({
        success: true,
        dashboard,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error(`Failed to get dashboard: ${id}`, { error });
      throw ErrorHandler.analyticsError(`Failed to get dashboard: ${error}`);
    }
  }

  private async createDashboard(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { name, description, category, widgets } = req.body;

    try {
      if (!name || !description) {
        throw ErrorHandler.validationError('Name and description are required');
      }

      const dashboard = {
        id: `dashboard-${Date.now()}`,
        name,
        description,
        category: category || 'general',
        widgets: widgets || [],
        config: {
          layout: 'grid',
          refreshInterval: 30000,
          theme: 'light'
        },
        permissions: {
          view: ['all'],
          edit: ['admin'],
          share: ['admin']
        },
        createdAt: new Date(),
        lastUpdated: new Date(),
        isActive: true
      };

      this.metricsService.recordResponseTime(Date.now() - startTime, 'POST', '/dashboards', 201);

      res.status(201).json({
        success: true,
        dashboard,
        message: 'Dashboard created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to create dashboard', { error });
      throw error;
    }
  }

  private async updateDashboard(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const startTime = Date.now();

    try {
      const updates = req.body;

      const dashboard = {
        id,
        ...updates,
        lastUpdated: new Date()
      };

      this.metricsService.recordResponseTime(Date.now() - startTime, 'PUT', `/dashboards/${id}`, 200);

      res.json({
        success: true,
        dashboard,
        message: 'Dashboard updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error(`Failed to update dashboard: ${id}`, { error });
      throw ErrorHandler.analyticsError(`Failed to update dashboard: ${error}`);
    }
  }

  private async deleteDashboard(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const startTime = Date.now();

    try {
      this.metricsService.recordResponseTime(Date.now() - startTime, 'DELETE', `/dashboards/${id}`, 200);

      res.json({
        success: true,
        message: `Dashboard ${id} deleted successfully`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error(`Failed to delete dashboard: ${id}`, { error });
      throw ErrorHandler.analyticsError(`Failed to delete dashboard: ${error}`);
    }
  }

  private async validateDashboard(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const startTime = Date.now();

    try {
      const metrics = {
        responseTime: Math.random() * 500 + 100,
        dataAccuracy: 0.95 + Math.random() * 0.05,
        renderTime: Math.random() * 200 + 50,
        cacheHitRate: 0.8 + Math.random() * 0.2,
        errorRate: Math.random() * 0.02,
        userEngagement: 0.6 + Math.random() * 0.4
      };

      const result = await this.dashboardValidator.validateDashboard(id, metrics);

      this.metricsService.recordResponseTime(Date.now() - startTime, 'POST', `/dashboards/${id}/validate`, 200);

      res.json({
        success: true,
        validation: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error(`Failed to validate dashboard: ${id}`, { error });
      throw error;
    }
  }

  private async getDashboardMetrics(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const startTime = Date.now();

    try {
      const metrics = {
        performance: {
          responseTime: Math.random() * 500 + 100,
          renderTime: Math.random() * 200 + 50,
          cacheHitRate: 0.8 + Math.random() * 0.2
        },
        usage: {
          views: Math.floor(Math.random() * 10000) + 1000,
          uniqueUsers: Math.floor(Math.random() * 1000) + 100,
          averageSessionTime: Math.random() * 600 + 300
        },
        quality: {
          dataAccuracy: 0.95 + Math.random() * 0.05,
          errorRate: Math.random() * 0.02,
          userSatisfaction: 0.8 + Math.random() * 0.2
        }
      };

      this.metricsService.recordResponseTime(Date.now() - startTime, 'GET', `/dashboards/${id}/metrics`, 200);

      res.json({
        success: true,
        dashboardId: id,
        metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error(`Failed to get dashboard metrics: ${id}`, { error });
      throw ErrorHandler.analyticsError(`Failed to get dashboard metrics: ${error}`);
    }
  }

  private async exportDashboard(req: Request, res: Response): Promise<void> {
    const { id, format } = req.params;

    try {
      if (!['pdf', 'png', 'json'].includes(format)) {
        throw ErrorHandler.validationError('Supported formats: pdf, png, json');
      }

      const exportData = {
        dashboardId: id,
        exportFormat: format,
        exportedAt: new Date().toISOString(),
        data: {
          name: `Dashboard ${id}`,
          widgets: ['widget-1', 'widget-2'],
          config: { theme: 'light' }
        }
      };

      const contentTypes = {
        pdf: 'application/pdf',
        png: 'image/png',
        json: 'application/json'
      };

      res.setHeader('Content-Type', contentTypes[format as keyof typeof contentTypes]);
      res.setHeader('Content-Disposition', `attachment; filename="dashboard-${id}.${format}"`);

      if (format === 'json') {
        res.json(exportData);
      } else {
        res.send(Buffer.from(`Exported dashboard ${id} in ${format} format`));
      }

    } catch (error) {
      this.logger.error(`Failed to export dashboard: ${id}`, { error });
      throw error;
    }
  }

  getRouter(): Router {
    return this.router;
  }
}