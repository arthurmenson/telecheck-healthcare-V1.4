import { ValidationResult } from '../fhir/validation-error';
import Joi from 'joi';

export enum MessageType {
  SMS = 'SMS',
  EMAIL = 'EMAIL'
}

export enum MessageStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED'
}

export interface Message {
  id: string;
  type: MessageType;
  to: string;
  from: string;
  subject?: string;
  content: string;
  status: MessageStatus;
  errorMessage?: string;
  externalId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deliveredAt?: Date;
  retryCount?: number;
  maxRetries?: number;
}

export class MessageValidator {
  private phoneRegex = /^\+[1-9]\d{1,14}$/;
  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private baseSchema = Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid(...Object.values(MessageType)).required(),
    to: Joi.string().required(),
    from: Joi.string().required(),
    content: Joi.string().required(),
    status: Joi.string().valid(...Object.values(MessageStatus)).required(),
    errorMessage: Joi.string(),
    externalId: Joi.string(),
    metadata: Joi.object(),
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required(),
    deliveredAt: Joi.date(),
    retryCount: Joi.number().integer().min(0),
    maxRetries: Joi.number().integer().min(0)
  });

  validate(message: Message): ValidationResult {
    const { error: baseError } = this.baseSchema.validate(message);

    if (baseError) {
      return {
        isValid: false,
        errors: baseError.details.map(detail => detail.message.replace(/"/g, ''))
      };
    }

    const errors: string[] = [];

    if (message.type === MessageType.SMS) {
      if (message.subject) {
        errors.push('subject should not be present for SMS messages');
      }

      if (!this.phoneRegex.test(message.to)) {
        errors.push('to must be a valid phone number for SMS messages');
      }

      if (!this.phoneRegex.test(message.from)) {
        errors.push('from must be a valid phone number for SMS messages');
      }
    }

    if (message.type === MessageType.EMAIL) {
      if (!message.subject) {
        errors.push('subject is required for email messages');
      }

      if (!this.emailRegex.test(message.to)) {
        errors.push('to must be a valid email address for email messages');
      }

      if (!this.emailRegex.test(message.from)) {
        errors.push('from must be a valid email address for email messages');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export namespace Message {
  const validTransitions: Record<MessageStatus, MessageStatus[]> = {
    [MessageStatus.PENDING]: [MessageStatus.SENT, MessageStatus.FAILED],
    [MessageStatus.SENT]: [MessageStatus.DELIVERED, MessageStatus.FAILED],
    [MessageStatus.DELIVERED]: [MessageStatus.FAILED], // Can still fail (e.g., bounce)
    [MessageStatus.FAILED]: [] // Terminal state
  };

  export function updateStatus(
    message: Message,
    newStatus: MessageStatus,
    errorMessage?: string
  ): Message {
    if (newStatus !== MessageStatus.FAILED) {
      const allowedTransitions = validTransitions[message.status];
      if (!allowedTransitions.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${message.status} to ${newStatus}`);
      }
    }

    return {
      ...message,
      status: newStatus,
      errorMessage: newStatus === MessageStatus.FAILED ? errorMessage : undefined,
      updatedAt: new Date(),
      deliveredAt: newStatus === MessageStatus.DELIVERED ? new Date() : message.deliveredAt
    };
  }

  export function incrementRetryCount(message: Message): Message {
    return {
      ...message,
      retryCount: (message.retryCount || 0) + 1,
      updatedAt: new Date()
    };
  }

  export function canRetry(message: Message): boolean {
    if (message.status !== MessageStatus.FAILED) {
      return false;
    }

    if (!message.maxRetries) {
      return false;
    }

    const currentRetries = message.retryCount || 0;
    return currentRetries < message.maxRetries;
  }

  export function createSmsMessage(params: {
    id: string;
    to: string;
    from: string;
    content: string;
    maxRetries?: number;
    metadata?: Record<string, any>;
  }): Message {
    const now = new Date();
    return {
      id: params.id,
      type: MessageType.SMS,
      to: params.to,
      from: params.from,
      content: params.content,
      status: MessageStatus.PENDING,
      maxRetries: params.maxRetries || 3,
      retryCount: 0,
      metadata: params.metadata,
      createdAt: now,
      updatedAt: now
    };
  }

  export function createEmailMessage(params: {
    id: string;
    to: string;
    from: string;
    subject: string;
    content: string;
    maxRetries?: number;
    metadata?: Record<string, any>;
  }): Message {
    const now = new Date();
    return {
      id: params.id,
      type: MessageType.EMAIL,
      to: params.to,
      from: params.from,
      subject: params.subject,
      content: params.content,
      status: MessageStatus.PENDING,
      maxRetries: params.maxRetries || 3,
      retryCount: 0,
      metadata: params.metadata,
      createdAt: now,
      updatedAt: now
    };
  }
}