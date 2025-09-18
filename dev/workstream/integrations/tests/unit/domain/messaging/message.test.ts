import { Message, MessageStatus, MessageType, MessageValidator } from '../../../../src/domain/messaging/message';

describe('Message Domain', () => {
  let validator: MessageValidator;

  beforeEach(() => {
    validator = new MessageValidator();
  });

  describe('Message validation', () => {
    it('should validate a valid SMS message', () => {
      const message: Message = {
        id: 'msg-123',
        type: MessageType.SMS,
        to: '+1-555-123-4567',
        from: '+1-555-987-6543',
        content: 'Hello, this is a test message',
        status: MessageStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validator.validate(message);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid email message', () => {
      const message: Message = {
        id: 'msg-456',
        type: MessageType.EMAIL,
        to: 'user@example.com',
        from: 'noreply@system.com',
        subject: 'Test Email',
        content: 'This is a test email content',
        status: MessageStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validator.validate(message);
      expect(result.isValid).toBe(true);
    });

    it('should require subject for email messages', () => {
      const message: Message = {
        id: 'msg-456',
        type: MessageType.EMAIL,
        to: 'user@example.com',
        from: 'noreply@system.com',
        content: 'This is a test email content',
        status: MessageStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validator.validate(message);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('subject is required for email messages');
    });

    it('should reject SMS messages with subject', () => {
      const message: Message = {
        id: 'msg-123',
        type: MessageType.SMS,
        to: '+1-555-123-4567',
        from: '+1-555-987-6543',
        subject: 'Invalid for SMS',
        content: 'Hello, this is a test message',
        status: MessageStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validator.validate(message);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('subject should not be present for SMS messages');
    });

    it('should validate phone number format for SMS', () => {
      const message: Message = {
        id: 'msg-123',
        type: MessageType.SMS,
        to: 'invalid-phone',
        from: '+1-555-987-6543',
        content: 'Hello, this is a test message',
        status: MessageStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validator.validate(message);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('to must be a valid phone number for SMS messages');
    });

    it('should validate email format for email messages', () => {
      const message: Message = {
        id: 'msg-456',
        type: MessageType.EMAIL,
        to: 'invalid-email',
        from: 'noreply@system.com',
        subject: 'Test Email',
        content: 'This is a test email content',
        status: MessageStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validator.validate(message);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('to must be a valid email address for email messages');
    });
  });

  describe('Message status transitions', () => {
    it('should allow valid status transitions', () => {
      let message: Message = {
        id: 'msg-123',
        type: MessageType.SMS,
        to: '+1-555-123-4567',
        from: '+1-555-987-6543',
        content: 'Hello, this is a test message',
        status: MessageStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // PENDING -> SENT
      message = Message.updateStatus(message, MessageStatus.SENT);
      expect(message.status).toBe(MessageStatus.SENT);

      // SENT -> DELIVERED
      message = Message.updateStatus(message, MessageStatus.DELIVERED);
      expect(message.status).toBe(MessageStatus.DELIVERED);
    });

    it('should prevent invalid status transitions', () => {
      const message: Message = {
        id: 'msg-123',
        type: MessageType.SMS,
        to: '+1-555-123-4567',
        from: '+1-555-987-6543',
        content: 'Hello, this is a test message',
        status: MessageStatus.DELIVERED,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // DELIVERED -> PENDING (invalid)
      expect(() => Message.updateStatus(message, MessageStatus.PENDING))
        .toThrow('Invalid status transition from DELIVERED to PENDING');
    });

    it('should allow transition to FAILED from any status', () => {
      const message: Message = {
        id: 'msg-123',
        type: MessageType.SMS,
        to: '+1-555-123-4567',
        from: '+1-555-987-6543',
        content: 'Hello, this is a test message',
        status: MessageStatus.SENT,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const failedMessage = Message.updateStatus(message, MessageStatus.FAILED, 'Network timeout');
      expect(failedMessage.status).toBe(MessageStatus.FAILED);
      expect(failedMessage.errorMessage).toBe('Network timeout');
    });
  });
});