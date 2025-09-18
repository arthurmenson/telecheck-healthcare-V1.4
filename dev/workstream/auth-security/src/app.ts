import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { AuthRoutes } from './routes/auth.routes';
import { SecurityMiddleware } from './middleware/security.middleware';

export class App {
  private app: Application;
  private authRoutes: AuthRoutes;

  constructor() {
    this.app = express();
    this.authRoutes = new AuthRoutes();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security headers
    this.app.use(SecurityMiddleware.securityHeaders());

    // CORS configuration
    this.app.use(cors({
      origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Request logging
    this.app.use(SecurityMiddleware.requestLogger());

    // Security monitoring
    this.app.use(SecurityMiddleware.securityMonitor());

    // Request size limiting
    this.app.use(SecurityMiddleware.requestSizeLimit('10mb'));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // General rate limiting
    this.app.use(SecurityMiddleware.createRateLimiter(
      parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'), // 15 minutes
      parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100')
    ));

    // Auth-specific rate limiting for sensitive endpoints
    this.app.use('/api/auth/login', SecurityMiddleware.createAuthRateLimiter());
    this.app.use('/api/auth/register', SecurityMiddleware.createAuthRateLimiter());
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'auth-security-service',
        version: '1.0.0'
      });
    });

    // API routes
    this.app.use('/api/auth', this.authRoutes.getRouter());

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Endpoint not found',
        code: 'NOT_FOUND',
        path: req.originalUrl
      });
    });
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error(`[ERROR] ${error.stack}`);

      // Don't expose internal errors in production
      const isDevelopment = process.env['NODE_ENV'] === 'development';

      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(isDevelopment && {
          details: error.message,
          stack: error.stack
        })
      });
    });

    // Graceful shutdown handling
    process.on('SIGTERM', this.gracefulShutdown);
    process.on('SIGINT', this.gracefulShutdown);
  }

  private gracefulShutdown = (signal: string): void => {
    console.log(`[${new Date().toISOString()}] Received ${signal}. Starting graceful shutdown...`);

    // Close server and cleanup resources
    const server = this.app.listen();
    server.close(() => {
      console.log(`[${new Date().toISOString()}] Server closed gracefully`);
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error(`[${new Date().toISOString()}] Forced shutdown after timeout`);
      process.exit(1);
    }, 30000);
  };

  public getApp(): Application {
    return this.app;
  }

  public listen(port: number = 3000): void {
    this.app.listen(port, () => {
      console.log(`[${new Date().toISOString()}] Auth Security Service listening on port ${port}`);
      console.log(`[${new Date().toISOString()}] Environment: ${process.env['NODE_ENV'] || 'development'}`);
      console.log(`[${new Date().toISOString()}] Health check: http://localhost:${port}/health`);
    });
  }
}