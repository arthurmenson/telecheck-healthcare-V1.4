import express from 'express';
import { logger } from '../utils/logger';

export class HealthCheckService {
  private integrations: Record<string, any> = {};

  async initialize(integrations: Record<string, any>): Promise<void> {
    this.integrations = integrations;
    logger.info('Health check service initialized');
  }

  router(): express.Router {
    const router = express.Router();

    router.get('/', async (req, res) => {
      try {
        const health = await this.getHealthStatus();
        const status = health.overall === 'healthy' ? 200 : 503;
        res.status(status).json(health);
      } catch (error) {
        res.status(500).json({
          overall: 'unhealthy',
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      }
    });

    router.get('/detailed', async (req, res) => {
      try {
        const detailed = await this.getDetailedHealth();
        res.json(detailed);
      } catch (error) {
        res.status(500).json({
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      }
    });

    return router;
  }

  private async getHealthStatus(): Promise<any> {
    const checks = {
      fhir: true,
      database: true,
      integrations: true,
      memory: process.memoryUsage().heapUsed < 1024 * 1024 * 1024, // 1GB limit
      uptime: process.uptime() > 0
    };

    const overall = Object.values(checks).every(check => check) ? 'healthy' : 'unhealthy';

    return {
      overall,
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  private async getDetailedHealth(): Promise<any> {
    const integrationHealth: Record<string, any> = {};

    for (const [name, integration] of Object.entries(this.integrations)) {
      if (integration && integration.validateConnection) {
        try {
          integrationHealth[name] = {
            status: await integration.validateConnection() ? 'healthy' : 'unhealthy',
            lastChecked: new Date().toISOString()
          };
        } catch (error) {
          integrationHealth[name] = {
            status: 'unhealthy',
            error: (error as Error).message,
            lastChecked: new Date().toISOString()
          };
        }
      } else {
        integrationHealth[name] = {
          status: 'not_configured',
          lastChecked: new Date().toISOString()
        };
      }
    }

    return {
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        version: process.version,
        platform: process.platform
      },
      integrations: integrationHealth,
      timestamp: new Date().toISOString()
    };
  }
}