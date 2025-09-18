import express from 'express';
import { config } from 'dotenv';
import { createFhirServer } from '../fhir/server';
import { EpicIntegration } from '../ehr/EpicIntegration';
import { CernerIntegration } from '../ehr/CernerIntegration';
import { ChangeHealthcareIntegration } from '../payer/ChangeHealthcareIntegration';
import { StripeHealthcareIntegration } from '../payment/StripeHealthcareIntegration';
import { IntegrationOrchestrator } from './IntegrationOrchestrator';
import { HealthCheckService } from './HealthCheckService';
import { MetricsCollector } from '../monitoring/MetricsCollector';
import { SecurityMiddleware } from '../security/SecurityMiddleware';
import { logger } from '../utils/logger';

// Load environment variables
config();

const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

interface ServerConfig {
  port: number;
  environment: string;
  integrations: {
    epic: boolean;
    cerner: boolean;
    changeHealthcare: boolean;
    stripe: boolean;
  };
}

class IntegrationServer {
  private app: express.Application;
  private config: ServerConfig;
  private fhirServer: any;
  private orchestrator: IntegrationOrchestrator;
  private healthCheck: HealthCheckService;
  private metricsCollector: MetricsCollector;
  private securityMiddleware: SecurityMiddleware;

  // Integration instances
  private epicIntegration?: EpicIntegration;
  private cernerIntegration?: CernerIntegration;
  private changeHealthcareIntegration?: ChangeHealthcareIntegration;
  private stripeIntegration?: StripeHealthcareIntegration;

  constructor(config: ServerConfig) {
    this.config = config;
    this.app = express();
    this.healthCheck = new HealthCheckService();
    this.metricsCollector = new MetricsCollector();
    this.securityMiddleware = new SecurityMiddleware();
    this.orchestrator = new IntegrationOrchestrator();

    this.initializeIntegrations();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private initializeIntegrations(): void {
    logger.info('Initializing healthcare integrations...');

    // Initialize FHIR Server
    this.fhirServer = createFhirServer({
      port: this.config.port,
      environment: this.config.environment as any
    });

    // Initialize Epic Integration
    if (this.config.integrations.epic && process.env.EPIC_CLIENT_ID) {
      this.epicIntegration = new EpicIntegration({
        clientId: process.env.EPIC_CLIENT_ID,
        clientSecret: process.env.EPIC_CLIENT_SECRET || '',
        sandboxUrl: process.env.EPIC_SANDBOX_URL || 'https://fhir.epic.com/interconnect-fhir-oauth',
        productionUrl: process.env.EPIC_PROD_URL || 'https://fhir.epic.com/interconnect-fhir-oauth',
        environment: this.config.environment === 'production' ? 'production' : 'sandbox',
        scopes: [
          'patient/Patient.read',
          'patient/Observation.read',
          'patient/Condition.read',
          'patient/MedicationRequest.read',
          'patient/Encounter.read'
        ],
        redirectUri: process.env.EPIC_REDIRECT_URI || 'http://localhost:8080/auth/epic/callback',
        rateLimitPerMinute: 1000,
        timeoutMs: 30000
      });
      this.orchestrator.registerIntegration('epic', this.epicIntegration);
      logger.info('Epic integration initialized');
    }

    // Initialize Cerner Integration
    if (this.config.integrations.cerner && process.env.CERNER_CLIENT_ID) {
      this.cernerIntegration = new CernerIntegration({
        clientId: process.env.CERNER_CLIENT_ID,
        clientSecret: process.env.CERNER_CLIENT_SECRET || '',
        sandboxUrl: process.env.CERNER_SANDBOX_URL || 'https://fhir-ehr-code.cerner.com/r4',
        productionUrl: process.env.CERNER_PROD_URL || 'https://fhir-ehr.cerner.com/r4',
        environment: this.config.environment === 'production' ? 'production' : 'sandbox',
        scopes: [
          'patient/Patient.read',
          'patient/Observation.read',
          'patient/Condition.read',
          'patient/MedicationRequest.read',
          'patient/Encounter.read'
        ],
        redirectUri: process.env.CERNER_REDIRECT_URI || 'http://localhost:8080/auth/cerner/callback',
        rateLimitPerMinute: 600,
        timeoutMs: 30000
      });
      this.orchestrator.registerIntegration('cerner', this.cernerIntegration);
      logger.info('Cerner integration initialized');
    }

    // Initialize Change Healthcare Integration
    if (this.config.integrations.changeHealthcare && process.env.CHANGE_HEALTHCARE_CLIENT_ID) {
      this.changeHealthcareIntegration = new ChangeHealthcareIntegration({
        clientId: process.env.CHANGE_HEALTHCARE_CLIENT_ID,
        clientSecret: process.env.CHANGE_HEALTHCARE_SECRET || '',
        baseUrl: process.env.CHANGE_HEALTHCARE_URL || 'https://api.changehealthcare.com',
        environment: this.config.environment === 'production' ? 'production' : 'sandbox',
        tradingPartnerServiceId: process.env.CHANGE_HEALTHCARE_TPSID || '',
        submitterId: process.env.CHANGE_HEALTHCARE_SUBMITTER_ID || '',
        rateLimitPerMinute: 500,
        timeoutMs: 45000
      });
      this.orchestrator.registerIntegration('changeHealthcare', this.changeHealthcareIntegration);
      logger.info('Change Healthcare integration initialized');
    }

    // Initialize Stripe Integration
    if (this.config.integrations.stripe && process.env.STRIPE_SECRET_KEY) {
      this.stripeIntegration = new StripeHealthcareIntegration({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        environment: this.config.environment === 'production' ? 'production' : 'sandbox',
        enablePCICompliance: true,
        enableTokenization: true,
        apiVersion: '2023-10-16'
      });
      this.orchestrator.registerIntegration('stripe', this.stripeIntegration);
      logger.info('Stripe integration initialized');
    }

    logger.info('Healthcare integrations initialization complete');
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(this.securityMiddleware.initialize());

    // Metrics collection
    this.app.use(this.metricsCollector.middleware());

    // Health checks
    this.app.use('/health', this.healthCheck.router());

    // Parse JSON and URL-encoded data
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.headers['x-request-id']
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Mount FHIR server
    this.app.use('/fhir', this.fhirServer.getApp());

    // Integration status endpoints
    this.app.get('/api/integrations/status', async (req, res) => {
      try {
        const status = await this.orchestrator.getIntegrationsStatus();
        res.json(status);
      } catch (error) {
        logger.error('Failed to get integrations status:', error);
        res.status(500).json({ error: 'Failed to get integrations status' });
      }
    });

    // Epic Integration endpoints
    if (this.epicIntegration) {
      this.app.get('/auth/epic/authorize', (req, res) => {
        const authUrl = this.epicIntegration!.getAuthorizationUrl(
          req.query.state as string,
          req.query as any
        );
        res.redirect(authUrl);
      });

      this.app.get('/auth/epic/callback', async (req, res) => {
        try {
          await this.epicIntegration!.authenticate(
            req.query.code as string,
            req.query.state as string
          );
          res.json({ success: true, message: 'Epic authentication successful' });
        } catch (error) {
          logger.error('Epic authentication callback failed:', error);
          res.status(400).json({ error: 'Authentication failed' });
        }
      });

      this.app.get('/api/epic/patient/:id', async (req, res) => {
        try {
          const patient = await this.epicIntegration!.getPatient(req.params.id);
          res.json(patient);
        } catch (error) {
          logger.error('Failed to get Epic patient:', error);
          res.status(500).json({ error: 'Failed to retrieve patient' });
        }
      });
    }

    // Cerner Integration endpoints
    if (this.cernerIntegration) {
      this.app.get('/auth/cerner/authorize', (req, res) => {
        const authUrl = this.cernerIntegration!.getAuthorizationUrl(
          req.query.state as string,
          req.query as any
        );
        res.redirect(authUrl);
      });

      this.app.get('/auth/cerner/callback', async (req, res) => {
        try {
          await this.cernerIntegration!.authenticate(
            req.query.code as string,
            req.query.state as string
          );
          res.json({ success: true, message: 'Cerner authentication successful' });
        } catch (error) {
          logger.error('Cerner authentication callback failed:', error);
          res.status(400).json({ error: 'Authentication failed' });
        }
      });

      this.app.get('/api/cerner/patient/:id', async (req, res) => {
        try {
          const patient = await this.cernerIntegration!.getPatient(req.params.id);
          res.json(patient);
        } catch (error) {
          logger.error('Failed to get Cerner patient:', error);
          res.status(500).json({ error: 'Failed to retrieve patient' });
        }
      });
    }

    // Change Healthcare endpoints
    if (this.changeHealthcareIntegration) {
      this.app.post('/api/eligibility/check', async (req, res) => {
        try {
          const result = await this.changeHealthcareIntegration!.checkEligibility(req.body);
          res.json(result);
        } catch (error) {
          logger.error('Eligibility check failed:', error);
          res.status(500).json({ error: 'Eligibility check failed' });
        }
      });

      this.app.post('/api/claims/submit', async (req, res) => {
        try {
          const result = await this.changeHealthcareIntegration!.submitClaim(req.body);
          res.json(result);
        } catch (error) {
          logger.error('Claim submission failed:', error);
          res.status(500).json({ error: 'Claim submission failed' });
        }
      });
    }

    // Stripe Integration endpoints
    if (this.stripeIntegration) {
      this.app.post('/api/payments/process', async (req, res) => {
        try {
          const result = await this.stripeIntegration!.processPayment(req.body);
          res.json(result);
        } catch (error) {
          logger.error('Payment processing failed:', error);
          res.status(500).json({ error: 'Payment processing failed' });
        }
      });

      this.app.post('/api/payments/webhook', async (req, res) => {
        try {
          const signature = req.headers['stripe-signature'] as string;
          const event = this.stripeIntegration!.validateWebhook(req.body, signature);
          await this.stripeIntegration!.handleWebhookEvent(event);
          res.json({ received: true });
        } catch (error) {
          logger.error('Webhook processing failed:', error);
          res.status(400).json({ error: 'Webhook processing failed' });
        }
      });
    }

    // Integration testing endpoints
    this.app.post('/api/test/integration/:type', async (req, res) => {
      try {
        const result = await this.orchestrator.testIntegration(req.params.type, req.body);
        res.json(result);
      } catch (error) {
        logger.error('Integration test failed:', error);
        res.status(500).json({ error: 'Integration test failed' });
      }
    });

    // Metrics and monitoring
    this.app.get('/api/metrics', async (req, res) => {
      try {
        const metrics = await this.metricsCollector.getMetrics();
        res.json(metrics);
      } catch (error) {
        logger.error('Failed to get metrics:', error);
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });

    // Compliance validation
    this.app.get('/api/compliance/validate', async (req, res) => {
      try {
        const validation = await this.orchestrator.validateCompliance();
        res.json(validation);
      } catch (error) {
        logger.error('Compliance validation failed:', error);
        res.status(500).json({ error: 'Compliance validation failed' });
      }
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Spark PMS Healthcare Integrations',
        version: '1.0.0',
        environment: this.config.environment,
        fhirEndpoint: '/fhir',
        healthCheck: '/health',
        documentation: '/docs',
        integrations: Object.keys(this.config.integrations).filter(
          key => this.config.integrations[key as keyof typeof this.config.integrations]
        )
      });
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        message: `${req.method} ${req.path} is not available`,
        availableEndpoints: [
          '/fhir',
          '/health',
          '/api/integrations/status',
          '/api/metrics',
          '/api/compliance/validate'
        ]
      });
    });

    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', error);

      // Don't leak error details in production
      const isDevelopment = this.config.environment === 'development';

      res.status(error.status || 500).json({
        error: 'Internal server error',
        message: isDevelopment ? error.message : 'An unexpected error occurred',
        ...(isDevelopment && { stack: error.stack }),
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    });
  }

  public async start(): Promise<void> {
    try {
      // Start FHIR server
      await this.fhirServer.start();

      // Initialize health checks for all integrations
      await this.healthCheck.initialize({
        epic: this.epicIntegration,
        cerner: this.cernerIntegration,
        changeHealthcare: this.changeHealthcareIntegration,
        stripe: this.stripeIntegration
      });

      // Start metrics collection
      await this.metricsCollector.start();

      // Start the main server
      this.app.listen(this.config.port, () => {
        logger.info(`🚀 Healthcare Integration Server started on port ${this.config.port}`);
        logger.info(`📊 Environment: ${this.config.environment}`);
        logger.info(`🔗 FHIR Server: http://localhost:${this.config.port}/fhir`);
        logger.info(`❤️  Health Check: http://localhost:${this.config.port}/health`);
        logger.info(`📈 Metrics: http://localhost:${this.config.port}/api/metrics`);

        // Log enabled integrations
        const enabledIntegrations = Object.entries(this.config.integrations)
          .filter(([, enabled]) => enabled)
          .map(([name]) => name);

        if (enabledIntegrations.length > 0) {
          logger.info(`🔌 Active integrations: ${enabledIntegrations.join(', ')}`);
        } else {
          logger.warn('⚠️  No integrations are currently enabled');
        }
      });

    } catch (error) {
      logger.error('Failed to start integration server:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    logger.info('Stopping healthcare integration server...');

    // Stop metrics collection
    await this.metricsCollector.stop();

    // Disconnect from integrations
    await this.orchestrator.disconnectAll();

    logger.info('Healthcare integration server stopped');
  }
}

// Create server configuration
const serverConfig: ServerConfig = {
  port: parseInt(process.env.PORT || '8080'),
  environment: NODE_ENV,
  integrations: {
    epic: process.env.EPIC_INTEGRATION_ENABLED === 'true',
    cerner: process.env.CERNER_INTEGRATION_ENABLED === 'true',
    changeHealthcare: process.env.CHANGE_HEALTHCARE_ENABLED === 'true',
    stripe: process.env.STRIPE_ENABLED === 'true'
  }
};

// Create and start server
const server = new IntegrationServer(serverConfig);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  server.start().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { IntegrationServer, ServerConfig };