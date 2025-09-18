import { apiClient } from '../lib/api-client';
import { ADMIN } from '../lib/api-endpoints';

// Types based on backend schemas
export interface AdminUser {
  id: string;
  email: string;
  role: 'patient' | 'nurse' | 'doctor' | 'admin' | 'pharmacist' | 'caregiver';
  isActive: boolean;
  lastLogin?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Additional fields for admin view
  name?: string;
  phone?: string;
  organization?: string;
  department?: string;
  verified?: boolean;
  twoFactorEnabled?: boolean;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: AdminUser['role'];
  name?: string;
  phone?: string;
  organization?: string;
  department?: string;
}

export interface UpdateUserRequest {
  email?: string;
  role?: AdminUser['role'];
  isActive?: boolean;
  name?: string;
  phone?: string;
  organization?: string;
  department?: string;
  mfaEnabled?: boolean;
}

export interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  dailyTransactions: number;
  systemUptime: number;
  responseTime: number;
  errorRate: number;
  usersByRole: {
    role: string;
    count: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
    change: string;
  }[];
}

export interface SystemActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  userId?: string;
  userName?: string;
}

export interface SecurityAlert {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  status: 'investigating' | 'resolved' | 'monitoring';
  ipAddress?: string;
  userId?: string;
}

export interface PlatformStats {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: string;
  color: string;
}

class AdminService {
  // User Management
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<{ users: AdminUser[]; total: number; pages: number }> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.role && params.role !== 'all') searchParams.append('role', params.role);
    if (params?.status && params.status !== 'all') searchParams.append('status', params.status);

    const endpoint = `${ADMIN.USERS}?${searchParams.toString()}`;
    const response = await apiClient.get<{
      users: AdminUser[];
      total: number;
      pages: number;
    }>(endpoint);

    return response.data;
  }

  async createUser(userData: CreateUserRequest): Promise<AdminUser> {
    const response = await apiClient.post<AdminUser>(ADMIN.USERS, userData);
    return response.data;
  }

  async updateUser(userId: string, userData: UpdateUserRequest): Promise<AdminUser> {
    const response = await apiClient.put<AdminUser>(`${ADMIN.USERS}/${userId}`, userData);
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`${ADMIN.USERS}/${userId}`);
  }

  async toggleUserStatus(userId: string, isActive: boolean): Promise<AdminUser> {
    const response = await apiClient.patch<AdminUser>(`${ADMIN.USERS}/${userId}/status`, {
      isActive,
    });
    return response.data;
  }

  async resetUserPassword(userId: string): Promise<{ temporaryPassword: string }> {
    const response = await apiClient.post<{ temporaryPassword: string }>(
      `${ADMIN.USERS}/${userId}/reset-password`
    );
    return response.data;
  }

  // System Metrics and Dashboard
  async getSystemMetrics(): Promise<SystemMetrics> {
    const response = await apiClient.get<SystemMetrics>(`${ADMIN.SYSTEM_STATUS}/metrics`);
    return response.data;
  }

  async getSystemActivities(params?: {
    limit?: number;
    severity?: string;
    type?: string;
  }): Promise<SystemActivity[]> {
    const searchParams = new URLSearchParams();

    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.severity && params.severity !== 'all') searchParams.append('severity', params.severity);
    if (params?.type && params.type !== 'all') searchParams.append('type', params.type);

    const endpoint = `${ADMIN.AUDIT_LOG}/activities?${searchParams.toString()}`;
    const response = await apiClient.get<SystemActivity[]>(endpoint);
    return response.data;
  }

  async getSecurityAlerts(params?: {
    limit?: number;
    severity?: string;
    status?: string;
  }): Promise<SecurityAlert[]> {
    const searchParams = new URLSearchParams();

    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.severity && params.severity !== 'all') searchParams.append('severity', params.severity);
    if (params?.status && params.status !== 'all') searchParams.append('status', params.status);

    const endpoint = `${ADMIN.AUDIT_LOG}/security-alerts?${searchParams.toString()}`;
    const response = await apiClient.get<SecurityAlert[]>(endpoint);
    return response.data;
  }

  async getPlatformStats(): Promise<PlatformStats[]> {
    const response = await apiClient.get<PlatformStats[]>(`${ADMIN.SYSTEM_STATUS}/platform-stats`);
    return response.data;
  }

  // System Health
  async getSystemHealth(): Promise<{
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    uptime: string;
    activeUsers: number;
    totalSessions: number;
    apiCalls: number;
    errors: number;
    warnings: number;
  }> {
    const response = await apiClient.get(`${ADMIN.SYSTEM_STATUS}/health`);
    return response.data;
  }

  // System Settings
  async getSystemSettings(): Promise<any> {
    const response = await apiClient.get(`${ADMIN.SETTINGS}`);
    return response.data;
  }

  async updateSystemSettings(settings: any): Promise<any> {
    const response = await apiClient.put(`${ADMIN.SETTINGS}`, settings);
    return response.data;
  }

  // Export Data
  async exportUsers(format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const response = await apiClient.get(`${ADMIN.USERS}/export?format=${format}`, {
      headers: {
        Accept: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
    return response.data;
  }

  async exportSystemData(type: 'metrics' | 'activities' | 'alerts', format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const response = await apiClient.get(`${ADMIN.SYSTEM_STATUS}/export/${type}?format=${format}`, {
      headers: {
        Accept: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
    return response.data;
  }

  // Import Users
  async importUsers(file: File): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const response = await apiClient.upload<{
      success: number;
      failed: number;
      errors: string[];
    }>(`${ADMIN.USERS}/import`, file);
    return response.data;
  }

  // Backup Management
  async createBackup(): Promise<{ backupId: string; status: string }> {
    const response = await apiClient.post<{ backupId: string; status: string }>(ADMIN.BACKUPS);
    return response.data;
  }

  async getBackups(): Promise<Array<{
    id: string;
    filename: string;
    size: number;
    createdAt: string;
    type: string;
    status: string;
  }>> {
    const response = await apiClient.get(ADMIN.BACKUPS);
    return response.data;
  }

  async downloadBackup(backupId: string): Promise<Blob> {
    const response = await apiClient.get(`${ADMIN.BACKUPS}/${backupId}/download`);
    return response.data;
  }

  async deleteBackup(backupId: string): Promise<void> {
    await apiClient.delete(`${ADMIN.BACKUPS}/${backupId}`);
  }
}

export const adminService = new AdminService();
export default adminService;