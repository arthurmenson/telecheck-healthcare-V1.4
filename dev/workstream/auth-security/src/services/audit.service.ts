import { v4 as uuidv4 } from 'uuid';
import { AuditLog } from '@/types/auth';

interface AuditLogRequest {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details?: Record<string, unknown>;
}

export class AuditService {
  private logs: AuditLog[] = [];

  async log(request: AuditLogRequest): Promise<void> {
    const auditLog: AuditLog = {
      id: uuidv4(),
      ...request,
      timestamp: new Date()
    };

    this.logs.push(auditLog);

    console.log(`[AUDIT] ${auditLog.timestamp.toISOString()} - ${auditLog.action} by ${auditLog.userId} on ${auditLog.resource} (${auditLog.success ? 'SUCCESS' : 'FAILED'})`);
  }

  async getLogs(userId?: string, startDate?: Date, endDate?: Date): Promise<AuditLog[]> {
    let filteredLogs = this.logs;

    if (userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === userId);
    }

    if (startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= startDate);
    }

    if (endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= endDate);
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getLogsByAction(action: string): Promise<AuditLog[]> {
    return this.logs.filter(log => log.action === action);
  }

  async getLogsByResource(resource: string): Promise<AuditLog[]> {
    return this.logs.filter(log => log.resource === resource);
  }

  async getFailedLogs(): Promise<AuditLog[]> {
    return this.logs.filter(log => !log.success);
  }
}