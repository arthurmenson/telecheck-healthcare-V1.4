import express from 'express';
import { logger } from '../utils/logger';

export class MetricsCollector {
  private metrics: any = {
    requests: 0,
    errors: 0,
    responseTime: [],
    integrationCalls: {},
    lastReset: new Date()
  };

  middleware(): express.RequestHandler {
    return (req, res, next) => {
      const start = Date.now();

      // Track request
      this.metrics.requests++;

      // Track response
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.metrics.responseTime.push(duration);

        // Keep only last 1000 response times
        if (this.metrics.responseTime.length > 1000) {
          this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
        }

        // Track errors
        if (res.statusCode >= 400) {
          this.metrics.errors++;
        }
      });

      next();
    };
  }

  async start(): Promise<void> {
    logger.info('Metrics collector started');
  }

  async stop(): Promise<void> {
    logger.info('Metrics collector stopped');
  }

  async getMetrics(): Promise<any> {
    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a: number, b: number) => a + b, 0) / this.metrics.responseTime.length
      : 0;

    return {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0,
      avgResponseTime,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: new Date().toISOString(),
      lastReset: this.metrics.lastReset
    };
  }
}