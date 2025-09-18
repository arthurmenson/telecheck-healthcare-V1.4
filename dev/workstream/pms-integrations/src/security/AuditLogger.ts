import { logger } from '../utils/logger';

export class AuditLogger {
  async logAccess(req: any, resourceType: string, operation: string, resourceId?: string): Promise<void> {
    logger.info('Healthcare Resource Access', {
      resourceType,
      operation,
      resourceId,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }

  async logRequest(system: string, method: string, url: string, data?: any): Promise<void> {
    logger.info('Integration Request', {
      system,
      method,
      url,
      hasData: !!data,
      timestamp: new Date().toISOString()
    });
  }

  async logResponse(system: string, status: number, data?: any): Promise<void> {
    logger.info('Integration Response', {
      system,
      status,
      hasData: !!data,
      timestamp: new Date().toISOString()
    });
  }

  async logError(system: string, status?: number, error?: string): Promise<void> {
    logger.error('Integration Error', {
      system,
      status,
      error,
      timestamp: new Date().toISOString()
    });
  }

  async logPaymentAttempt(data: any): Promise<void> {
    logger.info('Payment Attempt', data);
  }

  async logPaymentError(data: any): Promise<void> {
    logger.error('Payment Error', data);
  }

  async logRefund(data: any): Promise<void> {
    logger.info('Refund Processed', data);
  }

  async logWebhookEvent(data: any): Promise<void> {
    logger.info('Webhook Event', data);
  }
}