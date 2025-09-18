import { Message, MessageStatus, MessageType, MessageValidator } from '../domain/messaging/message';
import { ExternalApiService } from './external-api.service';
import { ValidationError } from '../domain/fhir/validation-error';

export interface MessageProviderConfig {
  name: 'twilio' | 'telnyx';
  baseUrl: string;
  apiKey: string;
  timeout: number;
  circuitBreakerConfig: {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringPeriod: number;
  };
}

export interface MessagingServiceConfig {
  smsProvider: MessageProviderConfig;
  emailProvider: MessageProviderConfig;
  defaultRetries: number;
  queueEnabled: boolean;
}

export interface MessageDeliveryStatus {
  messageId: string;
  status: MessageStatus;
  deliveredAt?: Date;
  errorMessage?: string;
  providerResponse?: any;
}

export class MessagingService {
  private smsApiService: ExternalApiService;
  private emailApiService: ExternalApiService;
  private validator: MessageValidator;
  private config: MessagingServiceConfig;

  constructor(config: MessagingServiceConfig) {
    this.config = config;
    this.validator = new MessageValidator();

    this.smsApiService = new ExternalApiService({
      baseUrl: config.smsProvider.baseUrl,
      timeout: config.smsProvider.timeout,
      retryAttempts: config.defaultRetries,
      circuitBreakerConfig: config.smsProvider.circuitBreakerConfig
    });

    this.emailApiService = new ExternalApiService({
      baseUrl: config.emailProvider.baseUrl,
      timeout: config.emailProvider.timeout,
      retryAttempts: config.defaultRetries,
      circuitBreakerConfig: config.emailProvider.circuitBreakerConfig
    });
  }

  async sendMessage(message: Message): Promise<MessageDeliveryStatus> {
    const validationResult = this.validator.validate(message);
    const validationError = ValidationError.fromValidationResult(validationResult);
    if (validationError) {
      throw validationError;
    }

    try {
      if (message.type === MessageType.SMS) {
        return await this.sendSms(message);
      } else {
        return await this.sendEmail(message);
      }
    } catch (error) {
      return {
        messageId: message.id,
        status: MessageStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        providerResponse: error
      };
    }
  }

  async getDeliveryStatus(messageId: string, externalId: string): Promise<MessageDeliveryStatus> {
    try {
      const response = await this.smsApiService.get(`/messages/${externalId}/status`);

      return {
        messageId,
        status: this.mapProviderStatusToMessageStatus(response.status),
        deliveredAt: response.deliveredAt ? new Date(response.deliveredAt) : undefined,
        providerResponse: response
      };
    } catch (error) {
      throw new Error(`Failed to get delivery status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async retryMessage(message: Message): Promise<MessageDeliveryStatus> {
    if (!Message.canRetry(message)) {
      throw new Error('Message cannot be retried');
    }

    const retriedMessage = Message.incrementRetryCount(message);
    return await this.sendMessage(retriedMessage);
  }

  getSmsProviderHealth() {
    return this.smsApiService.getCircuitBreakerState();
  }

  getEmailProviderHealth() {
    return this.emailApiService.getCircuitBreakerState();
  }

  private async sendSms(message: Message): Promise<MessageDeliveryStatus> {
    const smsPayload = this.formatSmsPayload(message);

    const response = await this.smsApiService.post('/messages', smsPayload);

    return {
      messageId: message.id,
      status: MessageStatus.SENT,
      providerResponse: response
    };
  }

  private async sendEmail(message: Message): Promise<MessageDeliveryStatus> {
    const emailPayload = this.formatEmailPayload(message);

    const response = await this.emailApiService.post('/send', emailPayload);

    return {
      messageId: message.id,
      status: MessageStatus.SENT,
      providerResponse: response
    };
  }

  private formatSmsPayload(message: Message): any {
    if (this.config.smsProvider.name === 'twilio') {
      return {
        To: message.to,
        From: message.from,
        Body: message.content,
        StatusCallback: `${this.config.smsProvider.baseUrl}/webhooks/status`
      };
    } else if (this.config.smsProvider.name === 'telnyx') {
      return {
        to: message.to,
        from: message.from,
        text: message.content,
        webhook_url: `${this.config.smsProvider.baseUrl}/webhooks/status`
      };
    }

    throw new Error(`Unsupported SMS provider: ${this.config.smsProvider.name}`);
  }

  private formatEmailPayload(message: Message): any {
    return {
      to: message.to,
      from: message.from,
      subject: message.subject,
      html: message.content,
      webhook_url: `${this.config.emailProvider.baseUrl}/webhooks/status`
    };
  }

  private mapProviderStatusToMessageStatus(providerStatus: string): MessageStatus {
    const statusMap: Record<string, MessageStatus> = {
      'sent': MessageStatus.SENT,
      'delivered': MessageStatus.DELIVERED,
      'failed': MessageStatus.FAILED,
      'undelivered': MessageStatus.FAILED,
      'pending': MessageStatus.PENDING
    };

    return statusMap[providerStatus.toLowerCase()] || MessageStatus.PENDING;
  }
}