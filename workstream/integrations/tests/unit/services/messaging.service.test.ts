import { MessagingService } from '../../../src/services/messaging.service';
import { Message, MessageType, MessageStatus } from '../../../src/domain/messaging/message';
import { ExternalApiService } from '../../../src/services/external-api.service';
import { ValidationError } from '../../../src/domain/fhir/validation-error';

jest.mock('../../../src/services/external-api.service');
const MockedExternalApiService = ExternalApiService as jest.MockedClass<typeof ExternalApiService>;

describe('MessagingService', () => {
  let messagingService: MessagingService;
  let mockSmsService: jest.Mocked<ExternalApiService>;
  let mockEmailService: jest.Mocked<ExternalApiService>;

  beforeEach(() => {
    mockSmsService = {
      post: jest.fn(),
      get: jest.fn(),
      getCircuitBreakerState: jest.fn()
    } as any;

    mockEmailService = {
      post: jest.fn(),
      get: jest.fn(),
      getCircuitBreakerState: jest.fn()
    } as any;

    MockedExternalApiService
      .mockImplementationOnce(() => mockSmsService)
      .mockImplementationOnce(() => mockEmailService);

    messagingService = new MessagingService({
      smsProvider: {
        name: 'twilio',
        baseUrl: 'https://api.twilio.com/2010-04-01/Accounts/AC123',
        apiKey: 'test-key',
        timeout: 5000,
        circuitBreakerConfig: {
          failureThreshold: 3,
          recoveryTimeout: 5000,
          monitoringPeriod: 10000
        }
      },
      emailProvider: {
        name: 'telnyx',
        baseUrl: 'https://api.telnyx.com/v2',
        apiKey: 'test-key',
        timeout: 5000,
        circuitBreakerConfig: {
          failureThreshold: 3,
          recoveryTimeout: 5000,
          monitoringPeriod: 10000
        }
      },
      defaultRetries: 3,
      queueEnabled: true
    });
  });

  describe('sendMessage', () => {
    it('should send SMS message successfully', async () => {
      const smsMessage = Message.createSmsMessage({
        id: 'msg-123',
        to: '+1-555-123-4567',
        from: '+1-555-987-6543',
        content: 'Hello, this is a test SMS'
      });

      const providerResponse = {
        sid: 'SM123456',
        status: 'queued'
      };

      mockSmsService.post.mockResolvedValue(providerResponse);

      const result = await messagingService.sendMessage(smsMessage);

      expect(result.messageId).toBe('msg-123');
      expect(result.status).toBe(MessageStatus.SENT);
      expect(result.providerResponse).toEqual(providerResponse);

      expect(mockSmsService.post).toHaveBeenCalledWith('/messages', {
        To: '+1-555-123-4567',
        From: '+1-555-987-6543',
        Body: 'Hello, this is a test SMS',
        StatusCallback: 'https://api.twilio.com/2010-04-01/Accounts/AC123/webhooks/status'
      });
    });

    it('should send email message successfully', async () => {
      const emailMessage = Message.createEmailMessage({
        id: 'msg-456',
        to: 'user@example.com',
        from: 'noreply@system.com',
        subject: 'Test Email',
        content: '<p>Hello, this is a test email</p>'
      });

      const providerResponse = {
        id: 'EM789012',
        status: 'sent'
      };

      mockEmailService.post.mockResolvedValue(providerResponse);

      const result = await messagingService.sendMessage(emailMessage);

      expect(result.messageId).toBe('msg-456');
      expect(result.status).toBe(MessageStatus.SENT);
      expect(result.providerResponse).toEqual(providerResponse);

      expect(mockEmailService.post).toHaveBeenCalledWith('/send', {
        to: 'user@example.com',
        from: 'noreply@system.com',
        subject: 'Test Email',
        html: '<p>Hello, this is a test email</p>',
        webhook_url: 'https://api.telnyx.com/v2/webhooks/status'
      });
    });

    it('should validate message before sending', async () => {
      const invalidMessage = {
        id: 'msg-123',
        type: MessageType.SMS,
        to: 'invalid-phone',
        from: '+1-555-987-6543',
        content: 'Hello, this is a test SMS',
        status: MessageStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Message;

      await expect(messagingService.sendMessage(invalidMessage))
        .rejects.toThrow(ValidationError);

      expect(mockSmsService.post).not.toHaveBeenCalled();
    });

    it('should handle provider errors gracefully', async () => {
      const smsMessage = Message.createSmsMessage({
        id: 'msg-123',
        to: '+1-555-123-4567',
        from: '+1-555-987-6543',
        content: 'Hello, this is a test SMS'
      });

      const error = new Error('Provider service unavailable');
      mockSmsService.post.mockRejectedValue(error);

      const result = await messagingService.sendMessage(smsMessage);

      expect(result.messageId).toBe('msg-123');
      expect(result.status).toBe(MessageStatus.FAILED);
      expect(result.errorMessage).toBe('Provider service unavailable');
      expect(result.providerResponse).toEqual(error);
    });
  });

  describe('getDeliveryStatus', () => {
    it('should retrieve delivery status from provider', async () => {
      const providerResponse = {
        status: 'delivered',
        deliveredAt: '2023-10-15T10:30:00Z'
      };

      mockSmsService.get.mockResolvedValue(providerResponse);

      const result = await messagingService.getDeliveryStatus('msg-123', 'SM123456');

      expect(result.messageId).toBe('msg-123');
      expect(result.status).toBe(MessageStatus.DELIVERED);
      expect(result.deliveredAt).toEqual(new Date('2023-10-15T10:30:00Z'));
      expect(result.providerResponse).toEqual(providerResponse);

      expect(mockSmsService.get).toHaveBeenCalledWith('/messages/SM123456/status');
    });

    it('should handle provider errors when getting status', async () => {
      mockSmsService.get.mockRejectedValue(new Error('Not found'));

      await expect(messagingService.getDeliveryStatus('msg-123', 'SM123456'))
        .rejects.toThrow('Failed to get delivery status: Not found');
    });
  });

  describe('retryMessage', () => {
    it('should retry failed message', async () => {
      const failedMessage: Message = {
        id: 'msg-123',
        type: MessageType.SMS,
        to: '+1-555-123-4567',
        from: '+1-555-987-6543',
        content: 'Hello, this is a test SMS',
        status: MessageStatus.FAILED,
        maxRetries: 3,
        retryCount: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const providerResponse = {
        sid: 'SM789012',
        status: 'queued'
      };

      mockSmsService.post.mockResolvedValue(providerResponse);

      const result = await messagingService.retryMessage(failedMessage);

      expect(result.messageId).toBe('msg-123');
      expect(result.status).toBe(MessageStatus.SENT);
      expect(mockSmsService.post).toHaveBeenCalled();
    });

    it('should reject retry for message that cannot be retried', async () => {
      const exhaustedMessage: Message = {
        id: 'msg-123',
        type: MessageType.SMS,
        to: '+1-555-123-4567',
        from: '+1-555-987-6543',
        content: 'Hello, this is a test SMS',
        status: MessageStatus.FAILED,
        maxRetries: 3,
        retryCount: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(messagingService.retryMessage(exhaustedMessage))
        .rejects.toThrow('Message cannot be retried');

      expect(mockSmsService.post).not.toHaveBeenCalled();
    });

    it('should reject retry for delivered message', async () => {
      const deliveredMessage: Message = {
        id: 'msg-123',
        type: MessageType.SMS,
        to: '+1-555-123-4567',
        from: '+1-555-987-6543',
        content: 'Hello, this is a test SMS',
        status: MessageStatus.DELIVERED,
        maxRetries: 3,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(messagingService.retryMessage(deliveredMessage))
        .rejects.toThrow('Message cannot be retried');

      expect(mockSmsService.post).not.toHaveBeenCalled();
    });
  });

  describe('provider health checks', () => {
    it('should return SMS provider circuit breaker state', () => {
      mockSmsService.getCircuitBreakerState.mockReturnValue('CLOSED' as any);

      const state = messagingService.getSmsProviderHealth();

      expect(state).toBe('CLOSED');
      expect(mockSmsService.getCircuitBreakerState).toHaveBeenCalled();
    });

    it('should return email provider circuit breaker state', () => {
      mockEmailService.getCircuitBreakerState.mockReturnValue('OPEN' as any);

      const state = messagingService.getEmailProviderHealth();

      expect(state).toBe('OPEN');
      expect(mockEmailService.getCircuitBreakerState).toHaveBeenCalled();
    });
  });
});