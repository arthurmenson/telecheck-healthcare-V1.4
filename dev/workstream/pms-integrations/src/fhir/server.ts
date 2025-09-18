import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { FhirServerConfig } from './config';
import { PatientProvider } from './providers/PatientProvider';
import { EncounterProvider } from './providers/EncounterProvider';
import { ObservationProvider } from './providers/ObservationProvider';
import { ConditionProvider } from './providers/ConditionProvider';
import { ProcedureProvider } from './providers/ProcedureProvider';
import { MedicationRequestProvider } from './providers/MedicationRequestProvider';
import { ImmunizationProvider } from './providers/ImmunizationProvider';
import { AllergyIntoleranceProvider } from './providers/AllergyIntoleranceProvider';
import { DiagnosticReportProvider } from './providers/DiagnosticReportProvider';
import { CoverageProvider } from './providers/CoverageProvider';
import { SmartAuthProvider } from './auth/SmartAuthProvider';
import { FhirValidator } from './validation/FhirValidator';
import { USCDIValidator } from './validation/USCDIValidator';
import { AuditLogger } from '../security/AuditLogger';
import { CapabilityStatementGenerator } from './capability/CapabilityStatementGenerator';
import { logger } from '../utils/logger';
import { FhirBundle, FhirOperationOutcome, ResourceType } from '../types/fhir';

export class FhirServer {
  private app: express.Application;
  private config: FhirServerConfig;
  private providers: Map<ResourceType, any>;
  private authProvider: SmartAuthProvider;
  private validator: FhirValidator;
  private uscdValidator: USCDIValidator;
  private auditLogger: AuditLogger;
  private capabilityGenerator: CapabilityStatementGenerator;

  constructor(config: FhirServerConfig) {
    this.config = config;
    this.app = express();
    this.providers = new Map();
    this.authProvider = new SmartAuthProvider(config.auth);
    this.validator = new FhirValidator();
    this.uscdValidator = new USCDIValidator();
    this.auditLogger = new AuditLogger();
    this.capabilityGenerator = new CapabilityStatementGenerator();

    this.initializeProviders();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private initializeProviders(): void {
    // Initialize all FHIR resource providers
    this.providers.set('Patient', new PatientProvider());
    this.providers.set('Encounter', new EncounterProvider());
    this.providers.set('Observation', new ObservationProvider());
    this.providers.set('Condition', new ConditionProvider());
    this.providers.set('Procedure', new ProcedureProvider());
    this.providers.set('MedicationRequest', new MedicationRequestProvider());
    this.providers.set('Immunization', new ImmunizationProvider());
    this.providers.set('AllergyIntolerance', new AllergyIntoleranceProvider());
    this.providers.set('DiagnosticReport', new DiagnosticReportProvider());
    this.providers.set('Coverage', new CoverageProvider());
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS with healthcare-specific origins
    this.app.use(cors({
      origin: this.config.allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-FHIR-Starter'],
      credentials: true,
      maxAge: 86400 // 24 hours
    }));

    this.app.use(compression());
    this.app.use(morgan('combined'));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Add request ID for tracing
    this.app.use((req, res, next) => {
      req.id = uuidv4();
      res.setHeader('X-Request-ID', req.id);
      next();
    });

    // FHIR content type handling
    this.app.use((req, res, next) => {
      if (req.headers['content-type']?.includes('application/fhir+json')) {
        req.headers['content-type'] = 'application/json';
      }
      res.setHeader('Content-Type', 'application/fhir+json; charset=utf-8');
      next();
    });
  }

  private setupRoutes(): void {
    const basePath = this.config.basePath || '/fhir';

    // Metadata endpoint (required by FHIR spec)
    this.app.get(`${basePath}/metadata`, async (req, res) => {
      try {
        const capability = await this.capabilityGenerator.generate();
        res.json(capability);
      } catch (error) {
        logger.error('Error generating capability statement:', error);
        res.status(500).json(this.createOperationOutcome('error', 'Internal server error'));
      }
    });

    // Well-known endpoints for SMART on FHIR
    this.app.get('/.well-known/smart-configuration', async (req, res) => {
      try {
        const smartConfig = await this.authProvider.getSmartConfiguration();
        res.json(smartConfig);
      } catch (error) {
        logger.error('Error generating SMART configuration:', error);
        res.status(500).json(this.createOperationOutcome('error', 'Internal server error'));
      }
    });

    // OAuth endpoints
    this.app.get(`${basePath}/oauth/authorize`, this.authProvider.authorize.bind(this.authProvider));
    this.app.post(`${basePath}/oauth/token`, this.authProvider.token.bind(this.authProvider));

    // Resource-level operations
    this.setupResourceRoutes(basePath);

    // Batch/Transaction operations
    this.app.post(`${basePath}`, this.handleBatch.bind(this));

    // Search across all resources
    this.app.get(`${basePath}`, this.handleSystemSearch.bind(this));

    // History operations
    this.app.get(`${basePath}/_history`, this.handleSystemHistory.bind(this));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: this.config.version || '1.0.0',
        fhirVersion: '4.0.1',
        uscdVersion: 'v3'
      });
    });
  }

  private setupResourceRoutes(basePath: string): void {
    const resourceTypes = Array.from(this.providers.keys());

    resourceTypes.forEach(resourceType => {
      const provider = this.providers.get(resourceType);
      const resourcePath = `${basePath}/${resourceType}`;

      // Search resources
      this.app.get(resourcePath, async (req, res) => {
        try {
          await this.auditLogger.logAccess(req, resourceType, 'search');
          const results = await provider.search(req.query);

          // Validate USCDI compliance
          if (this.config.uscdValidation) {
            await this.uscdValidator.validateSearchResults(results, resourceType);
          }

          res.json(results);
        } catch (error) {
          this.handleError(error, res);
        }
      });

      // Create resource
      this.app.post(resourcePath, async (req, res) => {
        try {
          await this.auditLogger.logAccess(req, resourceType, 'create');

          // Validate FHIR compliance
          const validationResult = await this.validator.validate(req.body, resourceType);
          if (!validationResult.valid) {
            return res.status(400).json(this.createOperationOutcome('error', validationResult.errors));
          }

          // Validate USCDI compliance
          if (this.config.uscdValidation) {
            const uscdValidation = await this.uscdValidator.validate(req.body, resourceType);
            if (!uscdValidation.valid) {
              return res.status(400).json(this.createOperationOutcome('warning', uscdValidation.errors));
            }
          }

          const created = await provider.create(req.body);
          res.status(201).location(`${resourcePath}/${created.id}`).json(created);
        } catch (error) {
          this.handleError(error, res);
        }
      });

      // Read resource by ID
      this.app.get(`${resourcePath}/:id`, async (req, res) => {
        try {
          await this.auditLogger.logAccess(req, resourceType, 'read', req.params.id);
          const resource = await provider.read(req.params.id);

          if (!resource) {
            return res.status(404).json(this.createOperationOutcome('error', 'Resource not found'));
          }

          res.json(resource);
        } catch (error) {
          this.handleError(error, res);
        }
      });

      // Update resource
      this.app.put(`${resourcePath}/:id`, async (req, res) => {
        try {
          await this.auditLogger.logAccess(req, resourceType, 'update', req.params.id);

          // Validate FHIR compliance
          const validationResult = await this.validator.validate(req.body, resourceType);
          if (!validationResult.valid) {
            return res.status(400).json(this.createOperationOutcome('error', validationResult.errors));
          }

          const updated = await provider.update(req.params.id, req.body);
          res.json(updated);
        } catch (error) {
          this.handleError(error, res);
        }
      });

      // Delete resource
      this.app.delete(`${resourcePath}/:id`, async (req, res) => {
        try {
          await this.auditLogger.logAccess(req, resourceType, 'delete', req.params.id);
          await provider.delete(req.params.id);
          res.status(204).send();
        } catch (error) {
          this.handleError(error, res);
        }
      });

      // Patch resource
      this.app.patch(`${resourcePath}/:id`, async (req, res) => {
        try {
          await this.auditLogger.logAccess(req, resourceType, 'patch', req.params.id);
          const patched = await provider.patch(req.params.id, req.body);
          res.json(patched);
        } catch (error) {
          this.handleError(error, res);
        }
      });

      // Resource history
      this.app.get(`${resourcePath}/:id/_history`, async (req, res) => {
        try {
          await this.auditLogger.logAccess(req, resourceType, 'history', req.params.id);
          const history = await provider.history(req.params.id);
          res.json(history);
        } catch (error) {
          this.handleError(error, res);
        }
      });

      // Version-specific read
      this.app.get(`${resourcePath}/:id/_history/:vid`, async (req, res) => {
        try {
          await this.auditLogger.logAccess(req, resourceType, 'vread', req.params.id);
          const version = await provider.vread(req.params.id, req.params.vid);

          if (!version) {
            return res.status(404).json(this.createOperationOutcome('error', 'Version not found'));
          }

          res.json(version);
        } catch (error) {
          this.handleError(error, res);
        }
      });
    });
  }

  private async handleBatch(req: express.Request, res: express.Response): Promise<void> {
    try {
      await this.auditLogger.logAccess(req, 'Bundle', 'batch');

      const bundle: FhirBundle = req.body;

      if (!bundle.type || (bundle.type !== 'batch' && bundle.type !== 'transaction')) {
        return res.status(400).json(this.createOperationOutcome('error', 'Bundle type must be batch or transaction'));
      }

      const results = await this.processBundleEntries(bundle);

      const responseBundle: FhirBundle = {
        resourceType: 'Bundle',
        id: uuidv4(),
        type: bundle.type === 'transaction' ? 'transaction-response' : 'batch-response',
        entry: results
      };

      res.json(responseBundle);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private async processBundleEntries(bundle: FhirBundle): Promise<any[]> {
    const results: any[] = [];

    if (!bundle.entry) return results;

    for (const entry of bundle.entry) {
      try {
        if (entry.request) {
          const method = entry.request.method;
          const url = entry.request.url;

          // Process each entry based on method
          let result;
          switch (method) {
            case 'GET':
              result = await this.processBundleRead(url);
              break;
            case 'POST':
              result = await this.processBundleCreate(url, entry.resource);
              break;
            case 'PUT':
              result = await this.processBundleUpdate(url, entry.resource);
              break;
            case 'DELETE':
              result = await this.processBundleDelete(url);
              break;
            default:
              result = {
                response: {
                  status: '400',
                  outcome: this.createOperationOutcome('error', `Unsupported method: ${method}`)
                }
              };
          }

          results.push(result);
        }
      } catch (error) {
        results.push({
          response: {
            status: '500',
            outcome: this.createOperationOutcome('error', 'Internal server error')
          }
        });
      }
    }

    return results;
  }

  private async processBundleRead(url: string): Promise<any> {
    // Implementation for bundle read operations
    return {
      response: {
        status: '200'
      }
    };
  }

  private async processBundleCreate(url: string, resource: any): Promise<any> {
    // Implementation for bundle create operations
    return {
      response: {
        status: '201'
      }
    };
  }

  private async processBundleUpdate(url: string, resource: any): Promise<any> {
    // Implementation for bundle update operations
    return {
      response: {
        status: '200'
      }
    };
  }

  private async processBundleDelete(url: string): Promise<any> {
    // Implementation for bundle delete operations
    return {
      response: {
        status: '204'
      }
    };
  }

  private async handleSystemSearch(req: express.Request, res: express.Response): Promise<void> {
    try {
      await this.auditLogger.logAccess(req, 'System', 'search');

      // Implement system-wide search across all resources
      const results: FhirBundle = {
        resourceType: 'Bundle',
        id: uuidv4(),
        type: 'searchset',
        total: 0,
        entry: []
      };

      res.json(results);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private async handleSystemHistory(req: express.Request, res: express.Response): Promise<void> {
    try {
      await this.auditLogger.logAccess(req, 'System', 'history');

      // Implement system-wide history
      const results: FhirBundle = {
        resourceType: 'Bundle',
        id: uuidv4(),
        type: 'history',
        total: 0,
        entry: []
      };

      res.json(results);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json(this.createOperationOutcome('error', 'Endpoint not found'));
    });

    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', error);
      this.handleError(error, res);
    });
  }

  private handleError(error: any, res: express.Response): void {
    logger.error('FHIR Server error:', error);

    if (error.status) {
      res.status(error.status).json(this.createOperationOutcome('error', error.message));
    } else {
      res.status(500).json(this.createOperationOutcome('error', 'Internal server error'));
    }
  }

  private createOperationOutcome(severity: string, message: string | string[]): FhirOperationOutcome {
    const messages = Array.isArray(message) ? message : [message];

    return {
      resourceType: 'OperationOutcome',
      issue: messages.map(msg => ({
        severity: severity as any,
        code: 'processing',
        diagnostics: msg
      }))
    };
  }

  public async start(): Promise<void> {
    const port = this.config.port || 8080;

    return new Promise((resolve, reject) => {
      try {
        this.app.listen(port, () => {
          logger.info(`FHIR Server started on port ${port}`);
          logger.info(`Base URL: http://localhost:${port}${this.config.basePath || '/fhir'}`);
          logger.info(`Metadata: http://localhost:${port}${this.config.basePath || '/fhir'}/metadata`);
          logger.info(`SMART Configuration: http://localhost:${port}/.well-known/smart-configuration`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Export default FHIR server configuration
export const createFhirServer = (config?: Partial<FhirServerConfig>): FhirServer => {
  const defaultConfig: FhirServerConfig = {
    port: parseInt(process.env.PORT || '8080'),
    basePath: '/fhir',
    version: '1.0.0',
    allowedOrigins: ['http://localhost:3000', 'http://localhost:8080'],
    uscdValidation: true,
    auth: {
      enabled: true,
      issuer: 'http://localhost:8080/fhir',
      jwksUri: 'http://localhost:8080/fhir/.well-known/jwks.json',
      algorithms: ['RS256'],
      audience: 'fhir-server'
    }
  };

  return new FhirServer({ ...defaultConfig, ...config });
};