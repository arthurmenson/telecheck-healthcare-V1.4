import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { RateLimiter } from '../utils/RateLimiter';
import { RetryHandler } from '../utils/RetryHandler';
import { AuditLogger } from '../security/AuditLogger';
import { X12Parser } from '../utils/X12Parser';
import { HL7Parser } from '../utils/HL7Parser';

export interface ChangeHealthcareConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  environment: 'sandbox' | 'production';
  rateLimitPerMinute: number;
  timeoutMs: number;
  tradingPartnerServiceId: string;
  submitterId: string;
}

export interface EligibilityRequest {
  memberId: string;
  memberFirstName: string;
  memberLastName: string;
  memberDateOfBirth: string;
  providerNPI: string;
  payerCode: string;
  serviceDate?: string;
  serviceTypes?: string[];
}

export interface EligibilityResponse {
  memberId: string;
  eligible: boolean;
  effectiveDate?: string;
  terminationDate?: string;
  copay?: number;
  deductible?: number;
  outOfPocketMax?: number;
  benefits: BenefitDetail[];
  errors?: string[];
}

export interface BenefitDetail {
  serviceType: string;
  coverage: string;
  copay?: number;
  coinsurance?: number;
  deductible?: number;
  limitationPeriod?: string;
  limitationAmount?: number;
}

export interface ClaimSubmission {
  claimId: string;
  submitterInfo: SubmitterInfo;
  billingProvider: ProviderInfo;
  subscriber: SubscriberInfo;
  patient?: PatientInfo;
  claim: ClaimInfo;
  serviceLines: ServiceLine[];
}

export interface SubmitterInfo {
  entityIdentifier: string;
  name: string;
  contactInfo: ContactInfo;
}

export interface ProviderInfo {
  npi: string;
  taxonomy: string;
  name: string;
  address: AddressInfo;
  contactInfo: ContactInfo;
}

export interface SubscriberInfo {
  memberId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  address: AddressInfo;
  relationship: string;
}

export interface PatientInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  address: AddressInfo;
  relationship: string;
}

export interface ClaimInfo {
  totalChargeAmount: number;
  placeOfService: string;
  facilityCode?: string;
  claimFrequencyCode: string;
  signatureIndicator: boolean;
  providerAcceptAssignmentCode: boolean;
  benefitsAssignmentCertificationIndicator: boolean;
  releaseOfInformationCode: string;
}

export interface ServiceLine {
  lineNumber: string;
  procedureCode: string;
  procedureModifiers?: string[];
  diagnosisCodes: string[];
  chargeAmount: number;
  unitCount: number;
  serviceDate: string;
  placeOfService: string;
}

export interface AddressInfo {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  fax?: string;
}

export interface ClaimStatusResponse {
  claimId: string;
  status: 'submitted' | 'accepted' | 'rejected' | 'paid' | 'denied';
  statusDate: string;
  paymentAmount?: number;
  adjustmentAmount?: number;
  patientResponsibilityAmount?: number;
  errors?: ClaimError[];
  remittanceInfo?: RemittanceInfo;
}

export interface ClaimError {
  code: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
}

export interface RemittanceInfo {
  checkNumber?: string;
  paymentDate?: string;
  paymentMethod: string;
  adjustments: AdjustmentInfo[];
}

export interface AdjustmentInfo {
  groupCode: string;
  reasonCode: string;
  amount: number;
  description: string;
}

export class ChangeHealthcareIntegration {
  private client: AxiosInstance;
  private config: ChangeHealthcareConfig;
  private rateLimiter: RateLimiter;
  private retryHandler: RetryHandler;
  private auditLogger: AuditLogger;
  private x12Parser: X12Parser;
  private hl7Parser: HL7Parser;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: ChangeHealthcareConfig) {
    this.config = config;
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
    this.x12Parser = new X12Parser();
    this.hl7Parser = new HL7Parser();

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeoutMs || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CHC-CLIENT-ID': config.clientId
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      async (config) => {
        await this.rateLimiter.checkLimit();
        await this.ensureValidToken();

        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }

        await this.auditLogger.logRequest('ChangeHealthcare', config.method!, config.url!, config.data);

        return config;
      },
      (error) => {
        logger.error('Change Healthcare request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      async (response) => {
        await this.auditLogger.logResponse('ChangeHealthcare', response.status, response.data);
        return response;
      },
      async (error) => {
        await this.auditLogger.logError('ChangeHealthcare', error.response?.status, error.message);

        if (error.response?.status === 401) {
          logger.warn('Change Healthcare access token expired, attempting refresh');
          await this.authenticate();
          return this.client.request(error.config);
        }

        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          if (retryAfter) {
            await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
            return this.client.request(error.config);
          }
        }

        logger.error('Change Healthcare API error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  public async authenticate(): Promise<void> {
    try {
      logger.info('Authenticating with Change Healthcare');

      const response = await axios.post(`${this.config.baseUrl}/oauth2/token`, {
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: 'eligibility claims status'
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

      logger.info('Change Healthcare authentication successful');
    } catch (error) {
      logger.error('Change Healthcare authentication failed:', error);
      throw new Error('Failed to authenticate with Change Healthcare');
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || (this.tokenExpiry && this.tokenExpiry <= new Date())) {
      await this.authenticate();
    }
  }

  // Eligibility Verification
  public async checkEligibility(request: EligibilityRequest): Promise<EligibilityResponse> {
    return this.retryHandler.execute(async () => {
      logger.info(`Checking eligibility for member: ${request.memberId}`);

      // Generate X12 270 transaction
      const x12Transaction = this.generateX12_270(request);

      const response = await this.client.post('/eligibility/inquiry', {
        tradingPartnerServiceId: this.config.tradingPartnerServiceId,
        submitterId: this.config.submitterId,
        x12Transaction
      });

      // Parse X12 271 response
      return this.parseX12_271(response.data.x12Transaction);
    });
  }

  public async batchEligibilityCheck(requests: EligibilityRequest[]): Promise<EligibilityResponse[]> {
    return this.retryHandler.execute(async () => {
      logger.info(`Processing batch eligibility check for ${requests.length} members`);

      const x12Transactions = requests.map(request => this.generateX12_270(request));

      const response = await this.client.post('/eligibility/batch', {
        tradingPartnerServiceId: this.config.tradingPartnerServiceId,
        submitterId: this.config.submitterId,
        transactions: x12Transactions
      });

      return response.data.responses.map((resp: any) => this.parseX12_271(resp.x12Transaction));
    });
  }

  // Claims Management
  public async submitClaim(claim: ClaimSubmission): Promise<{ claimId: string; submissionId: string }> {
    return this.retryHandler.execute(async () => {
      logger.info(`Submitting claim: ${claim.claimId}`);

      // Generate X12 837 transaction
      const x12Transaction = this.generateX12_837(claim);

      const response = await this.client.post('/claims/submission', {
        tradingPartnerServiceId: this.config.tradingPartnerServiceId,
        submitterId: this.config.submitterId,
        x12Transaction
      });

      return {
        claimId: claim.claimId,
        submissionId: response.data.submissionId
      };
    });
  }

  public async getClaimStatus(claimId: string, providerNPI: string): Promise<ClaimStatusResponse> {
    return this.retryHandler.execute(async () => {
      logger.info(`Getting claim status for: ${claimId}`);

      // Generate X12 276 transaction
      const x12Transaction = this.generateX12_276(claimId, providerNPI);

      const response = await this.client.post('/claims/status', {
        tradingPartnerServiceId: this.config.tradingPartnerServiceId,
        submitterId: this.config.submitterId,
        x12Transaction
      });

      // Parse X12 277 response
      return this.parseX12_277(response.data.x12Transaction);
    });
  }

  public async getRemittanceAdvice(
    providerId: string,
    dateRange: { start: string; end: string }
  ): Promise<RemittanceInfo[]> {
    return this.retryHandler.execute(async () => {
      logger.info(`Getting remittance advice for provider: ${providerId}`);

      const response = await this.client.get('/claims/remittance', {
        params: {
          providerId,
          startDate: dateRange.start,
          endDate: dateRange.end
        }
      });

      // Parse X12 835 transactions
      return response.data.remittances.map((rem: any) => this.parseX12_835(rem.x12Transaction));
    });
  }

  // Prior Authorization
  public async submitPriorAuthorization(request: {
    memberId: string;
    providerNPI: string;
    serviceCode: string;
    diagnosisCode: string;
    serviceDate: string;
    urgency: 'routine' | 'urgent' | 'emergency';
    clinicalInfo?: string;
  }): Promise<{ authorizationId: string; status: string }> {
    return this.retryHandler.execute(async () => {
      logger.info(`Submitting prior authorization for member: ${request.memberId}`);

      // Generate X12 278 transaction
      const x12Transaction = this.generateX12_278(request);

      const response = await this.client.post('/prior-authorization/submission', {
        tradingPartnerServiceId: this.config.tradingPartnerServiceId,
        submitterId: this.config.submitterId,
        x12Transaction
      });

      return {
        authorizationId: response.data.authorizationId,
        status: response.data.status
      };
    });
  }

  public async getPriorAuthorizationStatus(authorizationId: string): Promise<{
    status: 'pending' | 'approved' | 'denied' | 'pended';
    approvalNumber?: string;
    denialReason?: string;
    validFrom?: string;
    validTo?: string;
  }> {
    return this.retryHandler.execute(async () => {
      logger.info(`Getting prior authorization status: ${authorizationId}`);

      const response = await this.client.get(`/prior-authorization/status/${authorizationId}`);

      return response.data;
    });
  }

  // X12 Transaction Generators
  private generateX12_270(request: EligibilityRequest): string {
    const controlNumber = Date.now().toString().slice(-9);
    const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');

    return this.x12Parser.generate270({
      controlNumber,
      timestamp,
      submitterId: this.config.submitterId,
      payerCode: request.payerCode,
      providerNPI: request.providerNPI,
      memberId: request.memberId,
      memberFirstName: request.memberFirstName,
      memberLastName: request.memberLastName,
      memberDateOfBirth: request.memberDateOfBirth,
      serviceDate: request.serviceDate,
      serviceTypes: request.serviceTypes
    });
  }

  private generateX12_837(claim: ClaimSubmission): string {
    const controlNumber = Date.now().toString().slice(-9);
    const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');

    return this.x12Parser.generate837({
      controlNumber,
      timestamp,
      submitterId: this.config.submitterId,
      claim
    });
  }

  private generateX12_276(claimId: string, providerNPI: string): string {
    const controlNumber = Date.now().toString().slice(-9);
    const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');

    return this.x12Parser.generate276({
      controlNumber,
      timestamp,
      submitterId: this.config.submitterId,
      claimId,
      providerNPI
    });
  }

  private generateX12_278(request: any): string {
    const controlNumber = Date.now().toString().slice(-9);
    const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');

    return this.x12Parser.generate278({
      controlNumber,
      timestamp,
      submitterId: this.config.submitterId,
      request
    });
  }

  // X12 Response Parsers
  private parseX12_271(x12Data: string): EligibilityResponse {
    return this.x12Parser.parse271(x12Data);
  }

  private parseX12_277(x12Data: string): ClaimStatusResponse {
    return this.x12Parser.parse277(x12Data);
  }

  private parseX12_835(x12Data: string): RemittanceInfo {
    return this.x12Parser.parse835(x12Data);
  }

  // Utility Methods
  public async validateConnection(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      logger.error('Change Healthcare connection validation failed:', error);
      return false;
    }
  }

  public async getServiceStatus(): Promise<{
    eligibility: boolean;
    claims: boolean;
    priorAuth: boolean;
    remittance: boolean;
  }> {
    try {
      const response = await this.client.get('/service-status');
      return response.data;
    } catch (error) {
      logger.error('Failed to get Change Healthcare service status:', error);
      return {
        eligibility: false,
        claims: false,
        priorAuth: false,
        remittance: false
      };
    }
  }

  public async getPayerList(): Promise<Array<{
    code: string;
    name: string;
    supportedServices: string[];
  }>> {
    try {
      const response = await this.client.get('/payers');
      return response.data.payers;
    } catch (error) {
      logger.error('Failed to get payer list from Change Healthcare:', error);
      return [];
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
    this.tokenExpiry = undefined;
    logger.info('Disconnected from Change Healthcare');
  }

  // Transaction History and Reporting
  public async getTransactionHistory(
    dateRange: { start: string; end: string },
    transactionType?: 'eligibility' | 'claims' | 'prior-auth'
  ): Promise<Array<{
    transactionId: string;
    type: string;
    status: string;
    timestamp: string;
    providerId: string;
    payerId: string;
  }>> {
    try {
      const response = await this.client.get('/transactions/history', {
        params: {
          startDate: dateRange.start,
          endDate: dateRange.end,
          type: transactionType
        }
      });

      return response.data.transactions;
    } catch (error) {
      logger.error('Failed to get transaction history:', error);
      return [];
    }
  }

  public async generateComplianceReport(
    dateRange: { start: string; end: string }
  ): Promise<{
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    averageResponseTime: number;
    complianceScore: number;
  }> {
    try {
      const response = await this.client.get('/compliance/report', {
        params: {
          startDate: dateRange.start,
          endDate: dateRange.end
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      return {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        averageResponseTime: 0,
        complianceScore: 0
      };
    }
  }
}