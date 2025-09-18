import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Logger } from '@utils/logger';
import { AnalyticsRouter } from '@analytics/analytics-router';
import { DashboardRouter } from '@dashboards/dashboard-router';
import { ValidationRouter } from '@validation/validation-router';
import { HealthRouter } from '@health/health-router';
import { FinancialRouter } from '@financial/financial-router';
import { MetricsService } from '@utils/metrics-service';
import { ErrorHandler } from '@utils/error-handler';
import { RealTimeAnalytics } from '@streaming/real-time-analytics';
import { DataQualityPipeline } from '@data-quality/pipeline';

// Load environment variables
config();

export class AnalyticsServer {
  private app: express.Application;
  private server: any;
  private io: Server;
  private logger: Logger;
  private metricsService: MetricsService;
  private realTimeAnalytics: RealTimeAnalytics;
  private dataQualityPipeline: DataQualityPipeline;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    this.logger = new Logger('AnalyticsServer');
    this.metricsService = new MetricsService();
    this.realTimeAnalytics = new RealTimeAnalytics(this.io);
    this.dataQualityPipeline = new DataQualityPipeline();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.setupMetrics();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      this.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.metricsService.recordResponseTime(duration);
        this.logger.info(`Request completed: ${req.method} ${req.path}`, {
          statusCode: res.statusCode,
          duration: `${duration}ms`
        });
      });

      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // API routes
    this.app.use('/api/analytics', new AnalyticsRouter().getRouter());
    this.app.use('/api/dashboards', new DashboardRouter().getRouter());
    this.app.use('/api/validation', new ValidationRouter().getRouter());
    this.app.use('/api/health', new HealthRouter().getRouter());
    this.app.use('/api/financial', new FinancialRouter().getRouter());

    // Metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      const metrics = await this.metricsService.getMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(ErrorHandler.handle);
  }

  private setupMetrics(): void {
    // Setup Prometheus metrics collection
    this.metricsService.setupDefaultMetrics();

    // Start metrics server
    const metricsPort = parseInt(process.env.METRICS_PORT || '9090');
    this.metricsService.startMetricsServer(metricsPort);
  }

  private setupSocketIO(): void {
    this.io.on('connection', (socket) => {
      this.logger.info('Client connected to real-time analytics', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      // Join dashboard rooms for real-time updates
      socket.on('join-dashboard', (dashboardId: string) => {
        socket.join(`dashboard-${dashboardId}`);
        this.logger.info(`Client joined dashboard ${dashboardId}`, {
          socketId: socket.id
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.logger.info('Client disconnected from real-time analytics', {
          socketId: socket.id
        });
      });
    });
  }

  public async start(): Promise<void> {
    const port = parseInt(process.env.PORT || '3001');

    try {
      // Initialize services
      await this.realTimeAnalytics.initialize();
      await this.dataQualityPipeline.initialize();

      // Setup WebSocket connections
      this.setupSocketIO();

      // Start server
      this.server.listen(port, () => {
        this.logger.info(`Analytics and Reporting Server started`, {
          port,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      this.logger.error('Failed to start server', { error });
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    this.logger.info('Shutting down Analytics Server...');

    try {
      await this.realTimeAnalytics.shutdown();
      await this.dataQualityPipeline.shutdown();
      this.server.close();

      this.logger.info('Server shutdown complete');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new AnalyticsServer();
  server.start().catch(console.error);
}