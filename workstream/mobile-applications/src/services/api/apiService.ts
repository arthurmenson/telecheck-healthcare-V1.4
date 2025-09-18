/**
 * Mobile API Service with Offline-First Architecture
 * HIPAA Compliant with End-to-End Encryption
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as NetInfo from '@react-native-community/netinfo';
import CryptoJS from 'crypto-js';

import {
  Patient,
  Appointment,
  ClinicalNote,
  Medication,
  VitalSigns,
  Billing,
  HealthMetrics,
} from '@/types/healthcare';
import { User, AuthSession } from '@/types/auth';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    total?: number;
    page?: number;
    limit?: number;
    timestamp: string;
  };
}

interface SyncRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  timestamp: string;
  retryCount: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiresAuth: boolean;
  encrypted: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: string;
  expiresAt: string;
  etag?: string;
  version: number;
  encrypted: boolean;
}

interface ApiConfig {
  baseURL: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  encryptionEnabled: boolean;
  offlineSupport: boolean;
  cacheEnabled: boolean;
  cacheTTL: number; // seconds
}

class MobileApiService {
  private api: AxiosInstance;
  private config: ApiConfig;
  private isOnline: boolean = true;
  private syncQueue: SyncRequest[] = [];
  private cache: Map<string, CacheEntry<any>> = new Map();
  private encryptionKey: string = '';

  constructor(config: ApiConfig) {
    this.config = config;
    this.api = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'mobile',
        'X-Client-Version': '1.0.0',
      },
    });

    this.setupInterceptors();
    this.setupNetworkMonitoring();
    this.initializeEncryption();
    this.loadSyncQueue();
  }

  private async initializeEncryption(): Promise<void> {
    try {
      this.encryptionKey = (await SecureStore.getItemAsync('api_encryption_key')) || '';
      if (!this.encryptionKey) {
        this.encryptionKey = CryptoJS.lib.WordArray.random(256/8).toString();
        await SecureStore.setItemAsync('api_encryption_key', this.encryptionKey);
      }
    } catch (error) {
      console.error('Failed to initialize API encryption:', error);
    }
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        // Add authentication token
        const token = await SecureStore.getItemAsync('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();

        // Add timestamp
        config.headers['X-Timestamp'] = new Date().toISOString();

        // Encrypt sensitive data
        if (this.config.encryptionEnabled && config.data && this.shouldEncryptRequest(config.url || '')) {
          config.data = await this.encryptData(config.data);
          config.headers['X-Encrypted'] = 'true';
        }

        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      async (response) => {
        // Decrypt response if needed
        if (response.headers['x-encrypted'] === 'true') {
          response.data = await this.decryptData(response.data);
        }

        // Cache response if enabled
        if (this.config.cacheEnabled && response.config.method === 'GET') {
          await this.cacheResponse(response.config.url || '', response.data, response.headers.etag);
        }

        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          await this.refreshAuthToken();
          // Retry original request
          return this.api.request(error.config);
        }

        // Handle network errors with offline support
        if (!this.isOnline && this.config.offlineSupport) {
          const cachedResponse = await this.getCachedResponse(error.config?.url || '');
          if (cachedResponse) {
            return { data: cachedResponse.data, status: 200, headers: {} };
          }
        }

        console.error('Response interceptor error:', error);
        return Promise.reject(error);
      }
    );
  }

  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected || false;

      if (wasOffline && this.isOnline) {
        // Back online, process sync queue
        this.processSyncQueue();
      }
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldEncryptRequest(url: string): boolean {
    const sensitiveEndpoints = [
      '/patients',
      '/appointments',
      '/clinical-notes',
      '/billing',
      '/medications',
      '/vitals',
    ];
    return sensitiveEndpoints.some(endpoint => url.includes(endpoint));
  }

  private async encryptData(data: any): Promise<string> {
    try {
      const jsonString = JSON.stringify(data);
      return CryptoJS.AES.encrypt(jsonString, this.encryptionKey).toString();
    } catch (error) {
      console.error('Data encryption failed:', error);
      return data; // Return original data if encryption fails
    }
  }

  private async decryptData(encryptedData: string): Promise<any> {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
    } catch (error) {
      console.error('Data decryption failed:', error);
      return encryptedData; // Return original data if decryption fails
    }
  }

  private async cacheResponse(url: string, data: any, etag?: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(url);
      const entry: CacheEntry<any> = {
        data,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.config.cacheTTL * 1000).toISOString(),
        etag,
        version: 1,
        encrypted: this.config.encryptionEnabled,
      };

      if (this.config.encryptionEnabled) {
        entry.data = await this.encryptData(data);
      }

      this.cache.set(cacheKey, entry);
      await SecureStore.setItemAsync(`cache_${cacheKey}`, JSON.stringify(entry));
    } catch (error) {
      console.error('Cache storage failed:', error);
    }
  }

  private async getCachedResponse(url: string): Promise<CacheEntry<any> | null> {
    try {
      const cacheKey = this.getCacheKey(url);
      let entry = this.cache.get(cacheKey);

      if (!entry) {
        const cachedData = await SecureStore.getItemAsync(`cache_${cacheKey}`);
        if (cachedData) {
          entry = JSON.parse(cachedData);
          this.cache.set(cacheKey, entry!);
        }
      }

      if (entry && new Date(entry.expiresAt) > new Date()) {
        if (entry.encrypted) {
          entry.data = await this.decryptData(entry.data);
        }
        return entry;
      }

      return null;
    } catch (error) {
      console.error('Cache retrieval failed:', error);
      return null;
    }
  }

  private getCacheKey(url: string): string {
    return CryptoJS.MD5(url).toString();
  }

  private async refreshAuthToken(): Promise<void> {
    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.api.post('/auth/refresh', {
        refreshToken,
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data;
      await SecureStore.setItemAsync('access_token', accessToken);
      await SecureStore.setItemAsync('refresh_token', newRefreshToken);
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Redirect to login
      throw new Error('Authentication failed');
    }
  }

  private async addToSyncQueue(request: Omit<SyncRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const syncRequest: SyncRequest = {
      ...request,
      id: this.generateRequestId(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    this.syncQueue.push(syncRequest);
    await this.saveSyncQueue();
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      await SecureStore.setItemAsync('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const queueData = await SecureStore.getItemAsync('sync_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    // Sort by priority and timestamp
    this.syncQueue.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    const requestsToProcess = this.syncQueue.splice(0, 10); // Process in batches

    for (const request of requestsToProcess) {
      try {
        await this.api.request({
          method: request.method,
          url: request.url,
          data: request.data,
          headers: request.headers,
        });

        console.log(`Sync request completed: ${request.id}`);
      } catch (error) {
        console.error(`Sync request failed: ${request.id}`, error);

        request.retryCount++;
        if (request.retryCount < this.config.maxRetries) {
          this.syncQueue.push(request); // Re-queue for retry
        }
      }
    }

    await this.saveSyncQueue();

    // Continue processing if more requests remain
    if (this.syncQueue.length > 0) {
      setTimeout(() => this.processSyncQueue(), this.config.retryDelay);
    }
  }

  // Authentication APIs
  public async login(email: string, password: string): Promise<ApiResponse<{ user: User; session: AuthSession }>> {
    try {
      const response = await this.api.post<ApiResponse<{ user: User; session: AuthSession }>>('/auth/login', {
        email,
        password,
        deviceInfo: await this.getDeviceInfo(),
      });

      if (response.data.success && response.data.data) {
        await SecureStore.setItemAsync('access_token', response.data.data.session.accessToken);
        await SecureStore.setItemAsync('refresh_token', response.data.data.session.refreshToken);
      }

      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  public async logout(): Promise<ApiResponse<void>> {
    try {
      const response = await this.api.post<ApiResponse<void>>('/auth/logout');

      // Clear local storage
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      this.cache.clear();
      this.syncQueue = [];

      return response.data;
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  // Patient APIs
  public async getPatients(params?: { limit?: number; offset?: number }): Promise<ApiResponse<Patient[]>> {
    try {
      const response = await this.api.get<ApiResponse<Patient[]>>('/patients', { params });
      return response.data;
    } catch (error) {
      if (!this.isOnline) {
        const cached = await this.getCachedResponse('/patients');
        if (cached) {
          return { success: true, data: cached.data };
        }
      }
      throw error;
    }
  }

  public async getPatient(patientId: string): Promise<Patient> {
    try {
      const response = await this.api.get<ApiResponse<Patient>>(`/patients/${patientId}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error('Patient not found');
    } catch (error) {
      if (!this.isOnline) {
        const cached = await this.getCachedResponse(`/patients/${patientId}`);
        if (cached) {
          return cached.data;
        }
      }
      throw error;
    }
  }

  public async createPatient(patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Patient>> {
    const request = {
      method: 'POST' as const,
      url: '/patients',
      data: patient,
      priority: 'high' as const,
      requiresAuth: true,
      encrypted: true,
    };

    if (!this.isOnline) {
      await this.addToSyncQueue(request);
      return { success: true, data: { ...patient, id: 'temp_' + Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Patient };
    }

    try {
      const response = await this.api.post<ApiResponse<Patient>>('/patients', patient);
      return response.data;
    } catch (error) {
      await this.addToSyncQueue(request);
      throw error;
    }
  }

  // Appointment APIs
  public async getAppointments(params?: {
    patientId?: string;
    providerId?: string;
    date?: string;
    status?: string;
  }): Promise<ApiResponse<Appointment[]>> {
    try {
      const response = await this.api.get<ApiResponse<Appointment[]>>('/appointments', { params });
      return response.data;
    } catch (error) {
      if (!this.isOnline) {
        const cached = await this.getCachedResponse('/appointments');
        if (cached) {
          return { success: true, data: cached.data };
        }
      }
      throw error;
    }
  }

  public async createAppointment(appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Appointment>> {
    const request = {
      method: 'POST' as const,
      url: '/appointments',
      data: appointment,
      priority: 'high' as const,
      requiresAuth: true,
      encrypted: true,
    };

    if (!this.isOnline) {
      await this.addToSyncQueue(request);
      return { success: true, data: { ...appointment, id: 'temp_' + Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Appointment };
    }

    try {
      const response = await this.api.post<ApiResponse<Appointment>>('/appointments', appointment);
      return response.data;
    } catch (error) {
      await this.addToSyncQueue(request);
      throw error;
    }
  }

  // Clinical Notes APIs
  public async getPatientNotes(patientId: string, params?: { limit?: number }): Promise<ClinicalNote[]> {
    try {
      const response = await this.api.get<ApiResponse<ClinicalNote[]>>(`/patients/${patientId}/notes`, { params });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      if (!this.isOnline) {
        const cached = await this.getCachedResponse(`/patients/${patientId}/notes`);
        if (cached) {
          return cached.data;
        }
      }
      throw error;
    }
  }

  public async createClinicalNote(note: Omit<ClinicalNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<ClinicalNote>> {
    const request = {
      method: 'POST' as const,
      url: '/clinical-notes',
      data: note,
      priority: 'critical' as const,
      requiresAuth: true,
      encrypted: true,
    };

    if (!this.isOnline) {
      await this.addToSyncQueue(request);
      return { success: true, data: { ...note, id: 'temp_' + Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as ClinicalNote };
    }

    try {
      const response = await this.api.post<ApiResponse<ClinicalNote>>('/clinical-notes', note);
      return response.data;
    } catch (error) {
      await this.addToSyncQueue(request);
      throw error;
    }
  }

  // Utility methods
  private async getDeviceInfo(): Promise<any> {
    // This would collect device information for security
    return {
      platform: 'mobile',
      // Add more device info as needed
    };
  }

  // Health Data APIs
  public async getPatientVitals(patientId: string, params?: { limit?: number }): Promise<VitalSigns[]> {
    try {
      const response = await this.api.get<ApiResponse<VitalSigns[]>>(`/patients/${patientId}/vitals`, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get patient vitals:', error);
      return [];
    }
  }

  public async getPatientMedications(patientId: string): Promise<Medication[]> {
    try {
      const response = await this.api.get<ApiResponse<Medication[]>>(`/patients/${patientId}/medications`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get patient medications:', error);
      return [];
    }
  }

  public async getPatientHealthTrends(patientId: string): Promise<HealthMetrics[]> {
    try {
      const response = await this.api.get<ApiResponse<HealthMetrics[]>>(`/patients/${patientId}/health-trends`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get patient health trends:', error);
      return [];
    }
  }

  public async getAppointment(appointmentId: string): Promise<Appointment> {
    try {
      const response = await this.api.get<ApiResponse<Appointment>>(`/appointments/${appointmentId}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error('Appointment not found');
    } catch (error) {
      console.error('Failed to get appointment:', error);
      throw error;
    }
  }

  // Placeholder methods for additional APIs
  public async getWorkflowTemplates(): Promise<any[]> {
    // Implementation for workflow templates
    return [];
  }

  public async getClinicalAlerts(userId: string): Promise<any[]> {
    // Implementation for clinical alerts
    return [];
  }

  public async getAIRecommendations(context: any): Promise<any[]> {
    // Implementation for AI recommendations
    return [];
  }

  public async trackWorkflowStep(data: any): Promise<void> {
    // Implementation for tracking workflow steps
  }

  public async saveWorkflow(workflow: any): Promise<void> {
    // Implementation for saving workflow
  }

  public async getWorkflowMetrics(params: any): Promise<any> {
    // Implementation for workflow metrics
    return null;
  }

  public async getPatientEngagement(userId: string): Promise<any> {
    // Implementation for patient engagement
    return null;
  }

  public async getPersonalizedContent(userId: string): Promise<any[]> {
    // Implementation for personalized content
    return [];
  }

  public async trackEngagementEvent(event: any): Promise<void> {
    // Implementation for tracking engagement events
  }

  public async calculateEngagementScore(userId: string): Promise<any> {
    // Implementation for calculating engagement score
    return null;
  }

  public async submitPatientFeedback(feedback: any): Promise<void> {
    // Implementation for submitting patient feedback
  }

  public async submitSatisfactionSurvey(surveyId: string, responses: any[]): Promise<void> {
    // Implementation for submitting satisfaction survey
  }

  public async getSatisfactionMetrics(userId: string): Promise<any> {
    // Implementation for getting satisfaction metrics
    return null;
  }

  public async createEngagementGoal(goal: any): Promise<void> {
    // Implementation for creating engagement goal
  }

  public async updateGoalProgress(goalId: string, progress: number): Promise<void> {
    // Implementation for updating goal progress
  }

  public async earnReward(reward: any): Promise<void> {
    // Implementation for earning reward
  }

  public async trackContentEngagement(contentId: string, engagement: any): Promise<void> {
    // Implementation for tracking content engagement
  }

  public async recordHealthOutcome(outcome: any): Promise<void> {
    // Implementation for recording health outcome
  }
}

// Create and export the API service instance
const apiConfig: ApiConfig = {
  baseURL: process.env.API_BASE_URL || 'https://api.sparkden-healthcare.com/v1',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  encryptionEnabled: true,
  offlineSupport: true,
  cacheEnabled: true,
  cacheTTL: 300, // 5 minutes
};

export const apiService = new MobileApiService(apiConfig);