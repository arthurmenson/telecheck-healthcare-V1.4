import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { SmartAuthProvider } from '../fhir/auth/SmartAuthProvider';
import { FhirBundle, ExtendedPatient, SmartLaunchContext } from '../types/fhir';
import { logger } from '../utils/logger';
import { RateLimiter } from '../utils/RateLimiter';
import { RetryHandler } from '../utils/RetryHandler';
import { AuditLogger } from '../security/AuditLogger';

export interface EpicConfig {
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

export interface EpicPatientContext {
  patientId: string;
  encounterId?: string;
  practitionerId?: string;
  locationId?: string;
}

export interface EpicLaunchContext extends SmartLaunchContext {
  epicUserId?: string;
  epicUserIdType?: string;
  epicPatientId?: string;
  epicPatientIdType?: string;
  epicEncounterId?: string;
  epicEncounterIdType?: string;
}

export class EpicIntegration {
  private client: AxiosInstance;
  private config: EpicConfig;
  private authProvider: SmartAuthProvider;
  private rateLimiter: RateLimiter;
  private retryHandler: RetryHandler;
  private auditLogger: AuditLogger;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: EpicConfig) {
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
      windowMs: 60000 // 1 minute
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
        'Epic-Client-ID': config.clientId
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
    // Request interceptor for authentication and rate limiting
    this.client.interceptors.request.use(
      async (config) => {
        // Apply rate limiting
        await this.rateLimiter.checkLimit();

        // Ensure we have a valid access token
        await this.ensureValidToken();

        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }

        // Log request for audit
        await this.auditLogger.logRequest('Epic', config.method!, config.url!, config.data);

        return config;
      },
      (error) => {
        logger.error('Epic request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and logging
    this.client.interceptors.response.use(
      async (response) => {
        // Log successful response
        await this.auditLogger.logResponse('Epic', response.status, response.data);
        return response;
      },
      async (error) => {
        // Log error response
        await this.auditLogger.logError('Epic', error.response?.status, error.message);

        // Handle token expiration
        if (error.response?.status === 401) {
          logger.warn('Epic access token expired, attempting refresh');
          await this.refreshToken();
          // Retry the original request
          return this.client.request(error.config);
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          if (retryAfter) {
            await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
            return this.client.request(error.config);
          }
        }

        logger.error('Epic API error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Authentication Methods
  public async authenticate(authCode: string, state?: string): Promise<void> {
    try {
      logger.info('Authenticating with Epic using authorization code');

      const tokenResponse = await this.authProvider.exchangeCodeForToken(authCode, state);

      this.accessToken = tokenResponse.access_token;
      this.tokenExpiry = new Date(Date.now() + tokenResponse.expires_in * 1000);

      logger.info('Epic authentication successful');
    } catch (error) {
      logger.error('Epic authentication failed:', error);
      throw new Error('Failed to authenticate with Epic');
    }
  }

  public async authenticateClientCredentials(): Promise<void> {
    try {
      logger.info('Authenticating with Epic using client credentials');

      const response = await axios.post(`${this.getBaseUrl()}/oauth2/token`, {
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: this.config.scopes.join(' ')
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

      logger.info('Epic client credentials authentication successful');
    } catch (error) {
      logger.error('Epic client credentials authentication failed:', error);
      throw new Error('Failed to authenticate with Epic using client credentials');
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || (this.tokenExpiry && this.tokenExpiry <= new Date())) {
      if (this.config.environment === 'sandbox') {
        // Use client credentials for sandbox testing
        await this.authenticateClientCredentials();
      } else {
        throw new Error('Access token expired and no refresh mechanism available');
      }
    }
  }

  private async refreshToken(): Promise<void> {
    // Implementation would depend on Epic's refresh token mechanism
    // For now, we'll re-authenticate using client credentials in sandbox
    if (this.config.environment === 'sandbox') {
      await this.authenticateClientCredentials();
    }
  }

  // FHIR Operations
  public async getPatient(patientId: string): Promise<ExtendedPatient> {
    return this.retryHandler.execute(async () => {
      logger.info(`Fetching patient from Epic: ${patientId}`);

      const response = await this.client.get(`/api/FHIR/R4/Patient/${patientId}`);

      if (!response.data || response.data.resourceType !== 'Patient') {
        throw new Error('Invalid patient response from Epic');
      }

      return this.mapEpicPatientToFhir(response.data);
    });
  }

  public async searchPatients(params: {
    identifier?: string;
    name?: string;
    birthdate?: string;
    gender?: string;
    _count?: number;
  }): Promise<FhirBundle> {
    return this.retryHandler.execute(async () => {
      logger.info('Searching patients in Epic with params:', params);

      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value.toString());
      });

      const response = await this.client.get(`/api/FHIR/R4/Patient?${searchParams.toString()}`);

      if (!response.data || response.data.resourceType !== 'Bundle') {
        throw new Error('Invalid search response from Epic');
      }

      return this.mapEpicBundleToFhir(response.data);
    });
  }

  public async getPatientObservations(
    patientId: string,
    category?: string,
    code?: string,
    date?: string
  ): Promise<FhirBundle> {
    return this.retryHandler.execute(async () => {
      logger.info(`Fetching observations for patient ${patientId} from Epic`);

      const searchParams = new URLSearchParams();
      searchParams.append('patient', patientId);
      if (category) searchParams.append('category', category);
      if (code) searchParams.append('code', code);
      if (date) searchParams.append('date', date);

      const response = await this.client.get(`/api/FHIR/R4/Observation?${searchParams.toString()}`);

      return this.mapEpicBundleToFhir(response.data);
    });
  }

  public async getPatientConditions(patientId: string): Promise<FhirBundle> {
    return this.retryHandler.execute(async () => {
      logger.info(`Fetching conditions for patient ${patientId} from Epic`);

      const response = await this.client.get(`/api/FHIR/R4/Condition?patient=${patientId}`);

      return this.mapEpicBundleToFhir(response.data);
    });
  }

  public async getPatientMedications(patientId: string): Promise<FhirBundle> {
    return this.retryHandler.execute(async () => {
      logger.info(`Fetching medications for patient ${patientId} from Epic`);

      const response = await this.client.get(`/api/FHIR/R4/MedicationRequest?patient=${patientId}`);

      return this.mapEpicBundleToFhir(response.data);
    });
  }

  public async getPatientEncounters(
    patientId: string,
    status?: string,
    date?: string
  ): Promise<FhirBundle> {
    return this.retryHandler.execute(async () => {
      logger.info(`Fetching encounters for patient ${patientId} from Epic`);

      const searchParams = new URLSearchParams();
      searchParams.append('patient', patientId);
      if (status) searchParams.append('status', status);
      if (date) searchParams.append('date', date);

      const response = await this.client.get(`/api/FHIR/R4/Encounter?${searchParams.toString()}`);

      return this.mapEpicBundleToFhir(response.data);
    });
  }

  // Epic-specific Operations
  public async createAppointment(appointment: fhir4.Appointment): Promise<fhir4.Appointment> {
    return this.retryHandler.execute(async () => {
      logger.info('Creating appointment in Epic');

      const epicAppointment = this.mapFhirToEpicAppointment(appointment);

      const response = await this.client.post('/api/FHIR/R4/Appointment', epicAppointment);

      return this.mapEpicAppointmentToFhir(response.data);
    });
  }

  public async updateAppointment(
    appointmentId: string,
    appointment: fhir4.Appointment
  ): Promise<fhir4.Appointment> {
    return this.retryHandler.execute(async () => {
      logger.info(`Updating appointment ${appointmentId} in Epic`);

      const epicAppointment = this.mapFhirToEpicAppointment(appointment);

      const response = await this.client.put(
        `/api/FHIR/R4/Appointment/${appointmentId}`,
        epicAppointment
      );

      return this.mapEpicAppointmentToFhir(response.data);
    });
  }

  public async getPatientSchedule(
    patientId: string,
    startDate: string,
    endDate: string
  ): Promise<FhirBundle> {
    return this.retryHandler.execute(async () => {
      logger.info(`Fetching schedule for patient ${patientId} from Epic`);

      const searchParams = new URLSearchParams();
      searchParams.append('patient', patientId);
      searchParams.append('date', `ge${startDate}`);
      searchParams.append('date', `le${endDate}`);

      const response = await this.client.get(`/api/FHIR/R4/Appointment?${searchParams.toString()}`);

      return this.mapEpicBundleToFhir(response.data);
    });
  }

  // Data Mapping Methods
  private mapEpicPatientToFhir(epicPatient: any): ExtendedPatient {
    // Epic-specific patient mapping logic
    const fhirPatient: ExtendedPatient = {
      resourceType: 'Patient',
      id: epicPatient.id,
      meta: epicPatient.meta,
      identifier: epicPatient.identifier,
      name: epicPatient.name,
      telecom: epicPatient.telecom,
      gender: epicPatient.gender,
      birthDate: epicPatient.birthDate,
      address: epicPatient.address,
      maritalStatus: epicPatient.maritalStatus,
      communication: epicPatient.communication,
      extension: epicPatient.extension
    };

    // Add Epic-specific extensions if needed
    if (epicPatient.extension) {
      fhirPatient.extension = [
        ...(fhirPatient.extension || []),
        ...epicPatient.extension.filter((ext: any) =>
          ext.url?.includes('epic.com') || ext.url?.includes('epic.org')
        )
      ];
    }

    return fhirPatient;
  }

  private mapEpicBundleToFhir(epicBundle: any): FhirBundle {
    return {
      resourceType: 'Bundle',
      id: epicBundle.id,
      type: epicBundle.type,
      total: epicBundle.total,
      entry: epicBundle.entry?.map((entry: any) => ({
        fullUrl: entry.fullUrl,
        resource: this.mapEpicResourceToFhir(entry.resource),
        search: entry.search
      })),
      link: epicBundle.link
    };
  }

  private mapEpicResourceToFhir(epicResource: any): any {
    // General resource mapping logic
    switch (epicResource.resourceType) {
      case 'Patient':
        return this.mapEpicPatientToFhir(epicResource);
      default:
        return epicResource; // Pass through for other resource types
    }
  }

  private mapFhirToEpicAppointment(appointment: fhir4.Appointment): any {
    // Map FHIR appointment to Epic-specific format
    return {
      ...appointment,
      // Add Epic-specific extensions or modifications
    };
  }

  private mapEpicAppointmentToFhir(epicAppointment: any): fhir4.Appointment {
    // Map Epic appointment back to FHIR format
    return epicAppointment;
  }

  // Utility Methods
  public async validateConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/FHIR/R4/metadata');
      return response.status === 200 && response.data?.resourceType === 'CapabilityStatement';
    } catch (error) {
      logger.error('Epic connection validation failed:', error);
      return false;
    }
  }

  public async getCapabilityStatement(): Promise<fhir4.CapabilityStatement> {
    const response = await this.client.get('/api/FHIR/R4/metadata');
    return response.data;
  }

  public getAuthorizationUrl(state?: string, launchContext?: EpicLaunchContext): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: state || Math.random().toString(36).substring(7),
      aud: this.getBaseUrl()
    });

    // Add Epic-specific launch parameters
    if (launchContext?.epicPatientId) {
      params.append('patient', launchContext.epicPatientId);
    }
    if (launchContext?.epicEncounterId) {
      params.append('encounter', launchContext.epicEncounterId);
    }

    return `${this.getBaseUrl()}/oauth2/authorize?${params.toString()}`;
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
      errorRate: 0 // Would be calculated from historical data
    };
  }

  public disconnect(): void {
    this.accessToken = undefined;
    this.tokenExpiry = undefined;
    logger.info('Disconnected from Epic');
  }
}