import axios from 'axios';
import type { User } from './authService';

// Audit log levels
export enum AuditLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// Audit categories
export enum AuditCategory {
  AUTHENTICATION = 'authentication',
  PATIENT_ACCESS = 'patient_access',
  BILLING = 'billing',
  CLINICAL_DOCUMENTATION = 'clinical_documentation',
  SYSTEM_CONFIGURATION = 'system_configuration',
  DATA_EXPORT = 'data_export',
  APPOINTMENT_MANAGEMENT = 'appointment_management',
  REPORT_GENERATION = 'report_generation',
  USER_MANAGEMENT = 'user_management',
  INTEGRATION = 'integration',
}

// Audit event types
export enum AuditEvent {
  // Authentication events
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET = 'password_reset',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  SESSION_EXPIRED = 'session_expired',

  // Patient access events
  PATIENT_VIEWED = 'patient_viewed',
  PATIENT_CREATED = 'patient_created',
  PATIENT_UPDATED = 'patient_updated',
  PATIENT_DELETED = 'patient_deleted',
  PATIENT_DATA_EXPORTED = 'patient_data_exported',

  // Billing events
  CLAIM_SUBMITTED = 'claim_submitted',
  CLAIM_UPDATED = 'claim_updated',
  PAYMENT_PROCESSED = 'payment_processed',
  INVOICE_GENERATED = 'invoice_generated',
  BILLING_REPORT_GENERATED = 'billing_report_generated',

  // Clinical documentation events
  NOTE_CREATED = 'note_created',
  NOTE_UPDATED = 'note_updated',
  NOTE_SIGNED = 'note_signed',
  NOTE_DELETED = 'note_deleted',
  PRESCRIPTION_CREATED = 'prescription_created',
  LAB_ORDER_CREATED = 'lab_order_created',

  // System configuration events
  SETTINGS_UPDATED = 'settings_updated',
  INTEGRATION_CONFIGURED = 'integration_configured',
  ROLE_CREATED = 'role_created',
  PERMISSION_UPDATED = 'permission_updated',

  // Data export events
  DATA_EXPORTED = 'data_exported',
  REPORT_GENERATED = 'report_generated',
  BACKUP_CREATED = 'backup_created',

  // Appointment events
  APPOINTMENT_CREATED = 'appointment_created',
  APPOINTMENT_UPDATED = 'appointment_updated',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  APPOINTMENT_CHECKED_IN = 'appointment_checked_in',
}

// Audit log entry interface
export interface AuditLogEntry {
  id?: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  category: AuditCategory;
  event: AuditEvent;
  level: AuditLevel;
  description: string;
  metadata?: Record<string, any>;
  resourceType?: string;
  resourceId?: string;
  changes?: {
    before?: any;
    after?: any;
  };
  success: boolean;
  errorMessage?: string;
}

// Audit service configuration
const AUDIT_API_URL = import.meta.env.VITE_AUDIT_API_URL || 'http://localhost:3002/api/audit';
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 5000; // 5 seconds

class AuditService {
  private auditQueue: AuditLogEntry[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isOnline: boolean = true;

  constructor() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Flush queue on page unload
    window.addEventListener('beforeunload', () => {
      this.flushQueue(true);
    });
  }

  // Log an audit event
  async log(entry: Omit<AuditLogEntry, 'timestamp' | 'userId' | 'userEmail' | 'userRole'>): Promise<void> {
    const user = this.getCurrentUser();

    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
      userId: user?.id || 'anonymous',
      userEmail: user?.email || 'anonymous',
      userRole: user?.role || 'unknown',
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId(),
    };

    // Add to queue
    this.auditQueue.push(fullEntry);

    // Check if we should flush
    if (this.auditQueue.length >= BATCH_SIZE) {
      this.flushQueue();
    } else {
      this.scheduleBatchFlush();
    }

    // Also store in local storage for recovery
    this.storeLocally(fullEntry);
  }

  // Quick logging methods
  logInfo(category: AuditCategory, event: AuditEvent, description: string, metadata?: any) {
    return this.log({
      category,
      event,
      level: AuditLevel.INFO,
      description,
      metadata,
      success: true,
    });
  }

  logWarning(category: AuditCategory, event: AuditEvent, description: string, metadata?: any) {
    return this.log({
      category,
      event,
      level: AuditLevel.WARNING,
      description,
      metadata,
      success: true,
    });
  }

  logError(category: AuditCategory, event: AuditEvent, description: string, error?: any) {
    return this.log({
      category,
      event,
      level: AuditLevel.ERROR,
      description,
      errorMessage: error?.message || error,
      metadata: { error },
      success: false,
    });
  }

  logCritical(category: AuditCategory, event: AuditEvent, description: string, error?: any) {
    return this.log({
      category,
      event,
      level: AuditLevel.CRITICAL,
      description,
      errorMessage: error?.message || error,
      metadata: { error },
      success: false,
    });
  }

  // Log authentication events
  logLogin(success: boolean, email: string, error?: string) {
    return this.log({
      category: AuditCategory.AUTHENTICATION,
      event: success ? AuditEvent.USER_LOGIN : AuditEvent.LOGIN_FAILED,
      level: success ? AuditLevel.INFO : AuditLevel.WARNING,
      description: success ? `User ${email} logged in successfully` : `Failed login attempt for ${email}`,
      errorMessage: error,
      success,
      metadata: { email },
    });
  }

  logLogout() {
    return this.log({
      category: AuditCategory.AUTHENTICATION,
      event: AuditEvent.USER_LOGOUT,
      level: AuditLevel.INFO,
      description: 'User logged out',
      success: true,
    });
  }

  // Log patient access
  logPatientAccess(patientId: string, action: 'view' | 'create' | 'update' | 'delete', patientName?: string) {
    const eventMap = {
      view: AuditEvent.PATIENT_VIEWED,
      create: AuditEvent.PATIENT_CREATED,
      update: AuditEvent.PATIENT_UPDATED,
      delete: AuditEvent.PATIENT_DELETED,
    };

    return this.log({
      category: AuditCategory.PATIENT_ACCESS,
      event: eventMap[action],
      level: action === 'delete' ? AuditLevel.WARNING : AuditLevel.INFO,
      description: `Patient record ${action}d: ${patientName || patientId}`,
      resourceType: 'patient',
      resourceId: patientId,
      success: true,
      metadata: { patientId, patientName },
    });
  }

  // Log billing operations
  logBillingOperation(operation: string, amount?: number, claimId?: string) {
    return this.log({
      category: AuditCategory.BILLING,
      event: AuditEvent.CLAIM_SUBMITTED,
      level: AuditLevel.INFO,
      description: `Billing operation: ${operation}`,
      resourceType: 'claim',
      resourceId: claimId,
      success: true,
      metadata: { amount, claimId },
    });
  }

  // Log data export
  logDataExport(dataType: string, recordCount: number, format: string) {
    return this.log({
      category: AuditCategory.DATA_EXPORT,
      event: AuditEvent.DATA_EXPORTED,
      level: AuditLevel.WARNING,
      description: `Exported ${recordCount} ${dataType} records in ${format} format`,
      success: true,
      metadata: { dataType, recordCount, format },
    });
  }

  // Private methods
  private scheduleBatchFlush() {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.flushQueue();
    }, BATCH_INTERVAL);
  }

  private async flushQueue(immediate: boolean = false) {
    if (!this.isOnline && !immediate) return;
    if (this.auditQueue.length === 0) return;

    const batch = [...this.auditQueue];
    this.auditQueue = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      await this.sendBatch(batch);
      this.clearLocalStorage(batch);
    } catch (error) {
      console.error('Failed to send audit logs:', error);
      // Re-add to queue if failed
      this.auditQueue.unshift(...batch);
    }
  }

  private async sendBatch(entries: AuditLogEntry[]) {
    const token = localStorage.getItem('token');

    await axios.post(
      AUDIT_API_URL,
      { entries },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      }
    );
  }

  private storeLocally(entry: AuditLogEntry) {
    try {
      const stored = localStorage.getItem('audit_queue') || '[]';
      const queue = JSON.parse(stored);
      queue.push(entry);

      // Keep only last 100 entries
      if (queue.length > 100) {
        queue.shift();
      }

      localStorage.setItem('audit_queue', JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to store audit log locally:', error);
    }
  }

  private clearLocalStorage(entries: AuditLogEntry[]) {
    try {
      const stored = localStorage.getItem('audit_queue') || '[]';
      const queue = JSON.parse(stored);

      // Remove sent entries
      const remaining = queue.filter((q: AuditLogEntry) =>
        !entries.some(e => e.timestamp === q.timestamp && e.userId === q.userId)
      );

      localStorage.setItem('audit_queue', JSON.stringify(remaining));
    } catch (error) {
      console.error('Failed to clear local audit storage:', error);
    }
  }

  private getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  private async getClientIP(): Promise<string> {
    try {
      // In production, this would be obtained from the server
      // For now, return a placeholder
      return 'client_ip';
    } catch {
      return 'unknown';
    }
  }

  // Recover unsent logs from local storage
  async recoverUnsentLogs() {
    try {
      const stored = localStorage.getItem('audit_queue') || '[]';
      const queue = JSON.parse(stored);

      if (queue.length > 0) {
        this.auditQueue.push(...queue);
        this.flushQueue();
      }
    } catch (error) {
      console.error('Failed to recover audit logs:', error);
    }
  }
}

// Export singleton instance
export const auditService = new AuditService();

// Recover unsent logs on initialization
auditService.recoverUnsentLogs();

export default auditService;