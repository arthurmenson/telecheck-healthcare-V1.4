import axios, { AxiosInstance } from 'axios';
import { SmartAuthProvider } from '../fhir/auth/SmartAuthProvider';
import { FhirBundle, ExtendedPatient, SmartLaunchContext } from '../types/fhir';
import { logger } from '../utils/logger';
import { RateLimiter } from '../utils/RateLimiter';
import { RetryHandler } from '../utils/RetryHandler';
import { AuditLogger } from '../security/AuditLogger';

export interface CernerConfig {
  clientId: string;
  clientSecret: string;
  sandboxUrl: string;
  productionUrl: string;
  environment: 'sandbox' | 'production';
  scopes: string[];
  redirectUri: string;
  rateLimitPerMinute: number;
  timeoutMs: number;
}

export interface CernerLaunchContext extends SmartLaunchContext {
  tenant?: string;
  userType?: 'practitioner' | 'patient';
  practitioner?: string;
  location?: string;
  department?: string;
}

export class CernerIntegration {
  private client: AxiosInstance;
  private config: CernerConfig;
  private authProvider: SmartAuthProvider;
  private rateLimiter: RateLimiter;
  private retryHandler: RetryHandler;
  private auditLogger: AuditLogger;
  private accessToken?: string;
  private tokenExpiry?: Date;
  private refreshToken?: string;

  constructor(config: CernerConfig) {
    this.config = config;
    this.authProvider = new SmartAuthProvider({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      scopes: config.scopes,
      authorizationEndpoint: `${this.getBaseUrl()}/oauth2/authorize`,
      tokenEndpoint: `${this.getBaseUrl()}/oauth2/token`
    });

    this.rateLimiter = new RateLimiter({
      maxRequests: config.rateLimitPerMinute,
      windowMs: 60000
    });

    this.retryHandler = new RetryHandler({
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2
    });

    this.auditLogger = new AuditLogger();

    this.client = axios.create({
      baseURL: this.getBaseUrl(),
      timeout: config.timeoutMs || 30000,
      headers: {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json',
        'User-Agent': 'Spark-PMS-Integration/1.0',
        'X-Cerner-Client-ID': config.clientId
      }
    });

    this.setupInterceptors();
  }

  private getBaseUrl(): string {
    return this.config.environment === 'production'
      ? this.config.productionUrl
      : this.config.sandboxUrl;
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        await this.rateLimiter.checkLimit();
        await this.ensureValidToken();

        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }

        // Add Cerner-specific headers
        config.headers['Accept'] = 'application/fhir+json';
        config.headers['Content-Type'] = 'application/fhir+json';

        await this.auditLogger.logRequest('Cerner', config.method!, config.url!, config.data);

        return config;
      },
      (error) => {
        logger.error('Cerner request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      async (response) => {
        await this.auditLogger.logResponse('Cerner', response.status, response.data);
        return response;
      },
      async (error) => {
        await this.auditLogger.logError('Cerner', error.response?.status, error.message);

        if (error.response?.status === 401) {
          logger.warn('Cerner access token expired, attempting refresh');
          if (this.refreshToken) {
            await this.refreshAccessToken();
            return this.client.request(error.config);
          }
        }

        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          if (retryAfter) {
            await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
            return this.client.request(error.config);
          }
        }

        logger.error('Cerner API error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Authentication Methods
  public async authenticate(authCode: string, state?: string): Promise<void> {
    try {
      logger.info('Authenticating with Cerner using authorization code');

      const response = await axios.post(`${this.getBaseUrl()}/oauth2/token`, {
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

      logger.info('Cerner authentication successful');
    } catch (error) {
      logger.error('Cerner authentication failed:', error);
      throw new Error('Failed to authenticate with Cerner');
    }
  }

  public async authenticateClientCredentials(): Promise<void> {
    try {
      logger.info('Authenticating with Cerner using client credentials');

      const response = await axios.post(`${this.getBaseUrl()}/oauth2/token`, {
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: this.config.scopes.join(' ')
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

      logger.info('Cerner client credentials authentication successful');
    } catch (error) {
      logger.error('Cerner client credentials authentication failed:', error);
      throw new Error('Failed to authenticate with Cerner using client credentials');
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || (this.tokenExpiry && this.tokenExpiry <= new Date())) {
      if (this.refreshToken) {
        await this.refreshAccessToken();
      } else if (this.config.environment === 'sandbox') {
        await this.authenticateClientCredentials();
      } else {
        throw new Error('Access token expired and no refresh mechanism available');
      }
    }
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      logger.info('Refreshing Cerner access token');

      const response = await axios.post(`${this.getBaseUrl()}/oauth2/token`, {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token || this.refreshToken;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

      logger.info('Cerner token refresh successful');
    } catch (error) {
      logger.error('Cerner token refresh failed:', error);
      throw new Error('Failed to refresh Cerner access token');
    }
  }

  // FHIR Operations
  public async getPatient(patientId: string): Promise<ExtendedPatient> {
    return this.retryHandler.execute(async () => {
      logger.info(`Fetching patient from Cerner: ${patientId}`);

      const response = await this.client.get(`/Patient/${patientId}`);

      if (!response.data || response.data.resourceType !== 'Patient') {
        throw new Error('Invalid patient response from Cerner');
      }

      return this.mapCernerPatientToFhir(response.data);
    });
  }

  public async searchPatients(params: {
    identifier?: string;
    name?: string;
    family?: string;
    given?: string;
    birthdate?: string;
    gender?: string;
    _count?: number;
  }): Promise<FhirBundle> {
    return this.retryHandler.execute(async () => {
      logger.info('Searching patients in Cerner with params:', params);

      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value.toString());
      });

      const response = await this.client.get(`/Patient?${searchParams.toString()}`);

      if (!response.data || response.data.resourceType !== 'Bundle') {
        throw new Error('Invalid search response from Cerner');
      }

      return this.mapCernerBundleToFhir(response.data);
    });
  }

  public async getPatientObservations(
    patientId: string,
    category?: string,
    code?: string,
    date?: string
  ): Promise<FhirBundle> {
    return this.retryHandler.execute(async () => {
      logger.info(`Fetching observations for patient ${patientId} from Cerner`);

      const searchParams = new URLSearchParams();
      searchParams.append('patient', patientId);
      if (category) searchParams.append('category', category);
      if (code) searchParams.append('code', code);
      if (date) searchParams.append('date', date);

      const response = await this.client.get(`/Observation?${searchParams.toString()}`);

      return this.mapCernerBundleToFhir(response.data);
    });
  }

  public async getPatientConditions(patientId: string): Promise<FhirBundle> {
    return this.retryHandler.execute(async () => {
      logger.info(`Fetching conditions for patient ${patientId} from Cerner`);

      const response = await this.client.get(`/Condition?patient=${patientId}`);

      return this.mapCernerBundleToFhir(response.data);
    });
  }

  public async getPatientMedications(patientId: string): Promise<FhirBundle> {
    return this.retryHandler.execute(async () => {
      logger.info(`Fetching medications for patient ${patientId} from Cerner`);

      const response = await this.client.get(`/MedicationRequest?patient=${patientId}`);

      return this.mapCernerBundleToFhir(response.data);
    });
  }

  public async getPatientEncounters(
    patientId: string,
    status?: string,
    date?: string
  ): Promise<FhirBundle> {
    return this.retryHandler.execute(async () => {
      logger.info(`Fetching encounters for patient ${patientId} from Cerner`);

      const searchParams = new URLSearchParams();
      searchParams.append('patient', patientId);
      if (status) searchParams.append('status', status);
      if (date) searchParams.append('date', date);

      const response = await this.client.get(`/Encounter?${searchParams.toString()}`);

      return this.mapCernerBundleToFhir(response.data);
    });
  }

  public async getPatientDocuments(patientId: string): Promise<FhirBundle> {
    return this.retryHandler.execute(async () => {
      logger.info(`Fetching documents for patient ${patientId} from Cerner`);

      const response = await this.client.get(`/DocumentReference?patient=${patientId}`);

      return this.mapCernerBundleToFhir(response.data);
    });
  }

  // Cerner-specific Operations
  public async getPatientSummary(patientId: string): Promise<any> {
    return this.retryHandler.execute(async () => {
      logger.info(`Fetching patient summary for ${patientId} from Cerner`);

      // Use Cerner's patient summary operation
      const response = await this.client.get(`/Patient/${patientId}/$everything`);

      return this.mapCernerBundleToFhir(response.data);
    });
  }

  public async searchPractitioners(params: {
    identifier?: string;
    name?: string;
    specialty?: string;
  }): Promise<FhirBundle> {
    return this.retryHandler.execute(async () => {
      logger.info('Searching practitioners in Cerner');

      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value.toString());
      });

      const response = await this.client.get(`/Practitioner?${searchParams.toString()}`);

      return this.mapCernerBundleToFhir(response.data);
    });
  }

  public async getOrganizations(): Promise<FhirBundle> {
    return this.retryHandler.execute(async () => {
      logger.info('Fetching organizations from Cerner');

      const response = await this.client.get('/Organization');

      return this.mapCernerBundleToFhir(response.data);
    });
  }

  public async getLocations(): Promise<FhirBundle> {
    return this.retryHandler.execute(async () => {
      logger.info('Fetching locations from Cerner');

      const response = await this.client.get('/Location');

      return this.mapCernerBundleToFhir(response.data);
    });
  }

  // Data Mapping Methods
  private mapCernerPatientToFhir(cernerPatient: any): ExtendedPatient {
    const fhirPatient: ExtendedPatient = {
      resourceType: 'Patient',
      id: cernerPatient.id,
      meta: cernerPatient.meta,
      identifier: cernerPatient.identifier,
      name: cernerPatient.name,
      telecom: cernerPatient.telecom,
      gender: cernerPatient.gender,
      birthDate: cernerPatient.birthDate,
      address: cernerPatient.address,
      maritalStatus: cernerPatient.maritalStatus,
      communication: cernerPatient.communication,
      extension: cernerPatient.extension
    };

    // Add Cerner-specific extensions
    if (cernerPatient.extension) {
      fhirPatient.extension = [
        ...(fhirPatient.extension || []),
        ...cernerPatient.extension.filter((ext: any) =>
          ext.url?.includes('cerner.com') || ext.url?.includes('cerner.org')
        )
      ];
    }

    return fhirPatient;
  }

  private mapCernerBundleToFhir(cernerBundle: any): FhirBundle {
    return {
      resourceType: 'Bundle',
      id: cernerBundle.id,
      type: cernerBundle.type,
      total: cernerBundle.total,
      entry: cernerBundle.entry?.map((entry: any) => ({
        fullUrl: entry.fullUrl,
        resource: this.mapCernerResourceToFhir(entry.resource),
        search: entry.search
      })),
      link: cernerBundle.link
    };
  }

  private mapCernerResourceToFhir(cernerResource: any): any {
    switch (cernerResource.resourceType) {
      case 'Patient':
        return this.mapCernerPatientToFhir(cernerResource);
      default:
        return cernerResource;
    }
  }

  // Utility Methods
  public async validateConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/metadata');
      return response.status === 200 && response.data?.resourceType === 'CapabilityStatement';
    } catch (error) {
      logger.error('Cerner connection validation failed:', error);
      return false;
    }
  }

  public async getCapabilityStatement(): Promise<fhir4.CapabilityStatement> {
    const response = await this.client.get('/metadata');
    return response.data;
  }

  public getAuthorizationUrl(state?: string, launchContext?: CernerLaunchContext): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: state || Math.random().toString(36).substring(7),
      aud: this.getBaseUrl()
    });

    // Add Cerner-specific launch parameters
    if (launchContext?.patient) {
      params.append('patient', launchContext.patient);
    }
    if (launchContext?.encounter) {
      params.append('encounter', launchContext.encounter);
    }
    if (launchContext?.practitioner) {
      params.append('practitioner', launchContext.practitioner);
    }
    if (launchContext?.location) {
      params.append('location', launchContext.location);
    }

    return `${this.getBaseUrl()}/oauth2/authorize?${params.toString()}`;
  }

  // Bulk FHIR Operations (Cerner-specific)
  public async initiatePatientExport(patientId: string): Promise<string> {
    return this.retryHandler.execute(async () => {
      logger.info(`Initiating bulk export for patient ${patientId} from Cerner`);

      const response = await this.client.post(
        `/Patient/${patientId}/$export`,
        {},
        {
          headers: {
            'Accept': 'application/fhir+json',
            'Prefer': 'respond-async'
          }
        }
      );

      // Return the content-location header which contains the status URL
      return response.headers['content-location'];
    });
  }

  public async checkExportStatus(statusUrl: string): Promise<{
    status: 'in-progress' | 'completed' | 'failed';
    downloadUrls?: string[];
    error?: string;
  }> {
    try {
      const response = await this.client.get(statusUrl);

      if (response.status === 202) {
        return { status: 'in-progress' };
      } else if (response.status === 200) {
        return {
          status: 'completed',
          downloadUrls: response.data.output?.map((output: any) => output.url) || []
        };
      } else {
        return { status: 'failed', error: 'Unknown status' };
      }
    } catch (error: any) {
      return { status: 'failed', error: error.message };
    }
  }

  // Performance and Monitoring
  public async getConnectionMetrics(): Promise<{
    responseTime: number;
    uptime: boolean;
    lastSuccessfulRequest: Date | null;
    errorRate: number;
  }> {
    const startTime = performance.now();
    let uptime = false;
    let responseTime = 0;

    try {
      await this.validateConnection();
      uptime = true;
      responseTime = performance.now() - startTime;
    } catch (error) {
      responseTime = performance.now() - startTime;
    }

    return {
      responseTime,
      uptime,
      lastSuccessfulRequest: uptime ? new Date() : null,
      errorRate: 0
    };
  }

  public disconnect(): void {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.tokenExpiry = undefined;
    logger.info('Disconnected from Cerner');
  }
}