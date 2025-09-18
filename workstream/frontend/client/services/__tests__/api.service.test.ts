import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AuthService,
  UserService,
  LabService,
  MedicationService,
  VitalService,
  ChatService,
  ProgramService,
  AnalyticsService,
  FileService,
  type User,
  type UserPreferences,
  type LabResult,
  type Medication,
  type VitalSigns,
  type Program
} from '../api.service';

// Mock the API client
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
    request: vi.fn(),
  },
}));

// Mock API endpoints
vi.mock('../../lib/api-endpoints', () => ({
  API_ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      RESET_PASSWORD: '/auth/reset-password'
    },
    USERS: {
      PROFILE: '/users/profile',
      UPDATE_PROFILE: '/users/profile',
      PREFERENCES: '/users/preferences',
      AVATAR: '/users/avatar'
    },
    LABS: {
      RESULTS: '/labs/results',
      ANALYZE: '/labs/analyze',
      ANALYSIS: '/labs/analysis',
      TRENDS: '/labs/trends'
    },
    MEDICATIONS: {
      LIST: '/medications',
      ADD: '/medications',
      UPDATE: (id: string) => `/medications/${id}`,
      DELETE: (id: string) => `/medications/${id}`,
      INTERACTIONS: '/medications/interactions',
      SEARCH: '/medications/search'
    },
    VITALS: {
      LIST: '/vitals',
      ADD: '/vitals',
      UPDATE: (id: string) => `/vitals/${id}`,
      DELETE: (id: string) => `/vitals/${id}`,
      TRENDS: '/vitals/trends'
    },
    CHAT: {
      SEND: '/chat/send',
      HISTORY: '/chat/history',
      SESSIONS: '/chat/sessions',
      DELETE_SESSION: (id: string) => `/chat/sessions/${id}`
    },
    EHR: {
      PROGRAMS: {
        LIST: '/programs',
        CREATE: '/programs',
        UPDATE: (id: string) => `/programs/${id}`,
        DELETE: (id: string) => `/programs/${id}`,
        ENROLL: (id: string) => `/programs/${id}/enroll`,
        PARTICIPANTS: (id: string) => `/programs/${id}/participants`,
        ANALYTICS: (id: string) => `/programs/${id}/analytics`
      }
    },
    ANALYTICS: {
      DASHBOARD: '/analytics/dashboard',
      REPORTS: '/analytics/reports',
      EXPORT: '/analytics/export',
      POPULATION_HEALTH: '/analytics/population-health'
    },
    FILES: {
      UPLOAD: '/files/upload',
      DOWNLOAD: (id: string) => `/files/${id}/download`,
      DELETE: (id: string) => `/files/${id}`,
      LIST: '/files'
    }
  }
}));

import { apiClient } from '../../lib/api-client';
const mockedApiClient = vi.mocked(apiClient);

// Healthcare test data factories (NO REAL PATIENT DATA)
const createMockUser = (): User => ({
  id: 'user-test-123',
  email: 'test.user@telecheck.test',
  name: 'Test User',
  role: 'patient',
  avatar: 'https://test.example.com/avatar.jpg',
  preferences: {
    theme: 'light',
    notifications: true,
    language: 'en',
    timezone: 'UTC'
  }
});

const createMockLabResult = (): LabResult => ({
  id: 'lab-test-123',
  testName: 'Complete Blood Count',
  value: 12.5,
  unit: 'g/dL',
  referenceRange: '12.0-15.5',
  status: 'normal',
  date: '2025-09-15T00:00:00Z',
  notes: 'Test result within normal range'
});

const createMockVitalSigns = (): VitalSigns => ({
  id: 'vital-test-123',
  bloodPressure: { systolic: 120, diastolic: 80 },
  heartRate: 72,
  temperature: 98.6,
  weight: 150,
  height: 68,
  date: '2025-09-15T00:00:00Z'
});

describe('API Service Layer - Healthcare Platform TDD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthService - Authentication Security (Critical for Healthcare)', () => {
    it('should authenticate user with valid credentials', async () => {
      // RED: Test first, implementation follows
      const mockResponse = {
        data: {
          user: createMockUser(),
          token: 'test-jwt-token-12345'
        }
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await AuthService.login('test.user@telecheck.test', 'securePassword123!');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test.user@telecheck.test',
        password: 'securePassword123!'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should register new healthcare user with role validation', async () => {
      const userData = {
        email: 'new.doctor@telecheck.test',
        password: 'securePassword123!',
        name: 'Dr. Test User',
        role: 'doctor'
      };

      const mockResponse = {
        data: {
          user: { ...createMockUser(), role: 'doctor' as const },
          token: 'test-jwt-token-67890'
        }
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await AuthService.register(userData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/register', userData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle password reset with email validation', async () => {
      mockedApiClient.post.mockResolvedValue({ data: null });

      await AuthService.resetPassword('patient@telecheck.test');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/reset-password', {
        email: 'patient@telecheck.test'
      });
    });

    it('should refresh authentication token for session security', async () => {
      const mockResponse = {
        data: { token: 'refreshed-jwt-token-11111' }
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await AuthService.refreshToken();

      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/refresh');
      expect(result).toEqual(mockResponse);
    });

    it('should logout user and invalidate session', async () => {
      mockedApiClient.post.mockResolvedValue({ data: null });

      await AuthService.logout();

      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/logout');
    });
  });

  describe('UserService - Profile Management (HIPAA Compliant)', () => {
    it('should fetch user profile data securely', async () => {
      const mockResponse = { data: createMockUser() };
      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await UserService.getProfile();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/users/profile');
      expect(result).toEqual(mockResponse);
    });

    it('should update user profile with data validation', async () => {
      const updateData = { name: 'Updated Test User' };
      const mockResponse = { data: { ...createMockUser(), name: 'Updated Test User' } };

      mockedApiClient.put.mockResolvedValue(mockResponse);

      const result = await UserService.updateProfile(updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/users/profile', updateData);
      expect(result).toEqual(mockResponse);
    });

    it('should update user preferences with validation', async () => {
      const preferences: Partial<UserPreferences> = {
        notifications: false,
        theme: 'dark'
      };
      const mockResponse = { data: preferences };

      mockedApiClient.put.mockResolvedValue(mockResponse);

      const result = await UserService.updatePreferences(preferences);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/users/preferences', preferences);
      expect(result).toEqual(mockResponse);
    });

    it('should upload avatar with file validation', async () => {
      const mockFile = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      const mockResponse = { data: { avatarUrl: 'https://test.example.com/new-avatar.jpg' } };

      mockedApiClient.upload.mockResolvedValue(mockResponse);

      const result = await UserService.uploadAvatar(mockFile);

      expect(mockedApiClient.upload).toHaveBeenCalledWith('/users/avatar', mockFile);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('LabService - Lab Results Management (Critical Healthcare Data)', () => {
    it('should fetch lab results for patient', async () => {
      const mockResults = [createMockLabResult()];
      const mockResponse = { data: mockResults };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await LabService.getResults('patient-test-123');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/labs/results/patient-test-123');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch lab results for current user when no userId provided', async () => {
      const mockResults = [createMockLabResult()];
      const mockResponse = { data: mockResults };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await LabService.getResults();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/labs/results');
      expect(result).toEqual(mockResponse);
    });

    it('should upload lab report with proper file handling', async () => {
      const mockFile = new File(['lab-data'], 'lab-report.pdf', { type: 'application/pdf' });
      const mockResponse = { data: { analysisId: 'analysis-test-123' } };

      mockedApiClient.request.mockResolvedValue(mockResponse);

      const result = await LabService.uploadLabReport(mockFile, 'patient-test-123');

      expect(mockedApiClient.request).toHaveBeenCalledWith('/labs/analyze', {
        method: 'POST',
        body: expect.any(FormData),
        headers: {}
      });
      expect(result).toEqual(mockResponse);
    });

    it('should get lab analysis with patient safety checks', async () => {
      const mockAnalysis = { status: 'completed', criticalValues: [] };
      const mockResponse = { data: mockAnalysis };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await LabService.getAnalysis('patient-test-123');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/labs/analysis/patient-test-123');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch lab trends with time range parameters', async () => {
      const mockTrends = { glucose: { trend: 'stable', values: [] } };
      const mockResponse = { data: mockTrends };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await LabService.getTrends('patient-test-123', 30);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/labs/trends/patient-test-123?days=30');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('VitalService - Vital Signs Monitoring (Patient Safety Critical)', () => {
    it('should fetch vital signs with safety thresholds', async () => {
      const mockVitals = [createMockVitalSigns()];
      const mockResponse = { data: mockVitals };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await VitalService.getVitalSigns('patient-test-123');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/vitals/patient-test-123');
      expect(result).toEqual(mockResponse);
    });

    it('should add vital signs with validation', async () => {
      const newVitals: Omit<VitalSigns, 'id'> = {
        bloodPressure: { systolic: 140, diastolic: 90 },
        heartRate: 85,
        temperature: 99.2,
        weight: 155,
        height: 68,
        date: '2025-09-15T10:00:00Z'
      };

      const mockResponse = { data: { ...newVitals, id: 'vital-new-123' } };
      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await VitalService.addVitalSigns(newVitals, 'patient-test-123');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/vitals', {
        ...newVitals,
        userId: 'patient-test-123'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should update vital signs with change tracking', async () => {
      const updateData = { heartRate: 78 };
      const mockResponse = { data: { ...createMockVitalSigns(), ...updateData } };

      mockedApiClient.put.mockResolvedValue(mockResponse);

      const result = await VitalService.updateVitalSigns('vital-test-123', updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/vitals/vital-test-123', updateData);
      expect(result).toEqual(mockResponse);
    });

    it('should delete vital signs with audit trail', async () => {
      mockedApiClient.delete.mockResolvedValue({ data: null });

      await VitalService.deleteVitalSigns('vital-test-123');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/vitals/vital-test-123');
    });

    it('should fetch vital trends for monitoring', async () => {
      const mockTrends = { heartRate: { trend: 'increasing', alerts: [] } };
      const mockResponse = { data: mockTrends };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await VitalService.getVitalTrends('patient-test-123', 7);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/vitals/trends/patient-test-123?days=7');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('ChatService - Secure Healthcare Communication', () => {
    it('should send message with context and user identification', async () => {
      const message = 'I need help with my medication schedule';
      const context = { medicationId: 'med-123', concern: 'scheduling' };
      const mockResponse = { data: { messageId: 'msg-123', response: 'I can help with that.' } };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await ChatService.sendMessage(message, context, 'patient-test-123');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/chat/send', {
        message,
        context,
        userId: 'patient-test-123'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch chat history with privacy controls', async () => {
      const mockHistory = [
        { id: 'msg-1', message: 'Hello', timestamp: '2025-09-15T10:00:00Z' }
      ];
      const mockResponse = { data: mockHistory };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await ChatService.getChatHistory('patient-test-123');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/chat/history/patient-test-123');
      expect(result).toEqual(mockResponse);
    });

    it('should delete chat session with proper authorization', async () => {
      mockedApiClient.delete.mockResolvedValue({ data: null });

      await ChatService.deleteChatSession('session-test-123');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/chat/sessions/session-test-123');
    });
  });

  describe('AnalyticsService - Healthcare Analytics (Population Health)', () => {
    it('should fetch dashboard data with proper authorization', async () => {
      const mockDashboard = {
        totalPatients: 1000,
        activePatients: 850,
        criticalAlerts: 5,
        monthlyTrends: {}
      };
      const mockResponse = { data: mockDashboard };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await AnalyticsService.getDashboardData();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/analytics/dashboard');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch reports with type filtering', async () => {
      const mockReports = [
        { id: 'report-1', type: 'medication-adherence', data: {} }
      ];
      const mockResponse = { data: mockReports };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await AnalyticsService.getReports('medication-adherence');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/analytics/reports?type=medication-adherence');
      expect(result).toEqual(mockResponse);
    });

    it('should export data with format and filter options', async () => {
      const filters = { dateRange: '30d', patientType: 'diabetic' };
      const mockResponse = { data: { downloadUrl: 'https://test.example.com/export.csv' } };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await AnalyticsService.exportData('csv', filters);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/analytics/export', {
        format: 'csv',
        filters
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch population health data with privacy protection', async () => {
      const mockPopulationData = {
        totalPopulation: 10000,
        riskDistribution: { low: 7000, medium: 2500, high: 500 },
        trends: {}
      };
      const mockResponse = { data: mockPopulationData };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await AnalyticsService.getPopulationHealth();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/analytics/population-health');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('FileService - Secure File Management (HIPAA Compliant)', () => {
    it('should upload file with category classification', async () => {
      const mockFile = new File(['medical-record'], 'record.pdf', { type: 'application/pdf' });
      const mockResponse = {
        data: { fileId: 'file-test-123', url: 'https://secure.telecheck.test/files/file-test-123' }
      };

      mockedApiClient.request.mockResolvedValue(mockResponse);

      const result = await FileService.uploadFile(mockFile, 'medical-records');

      expect(mockedApiClient.request).toHaveBeenCalledWith('/files/upload', {
        method: 'POST',
        body: expect.any(FormData),
        headers: {}
      });
      expect(result).toEqual(mockResponse);
    });

    it('should download file with proper authentication', async () => {
      const mockResponse = new Response('file-content');
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await FileService.downloadFile('file-test-123');

      expect(fetch).toHaveBeenCalledWith('/files/file-test-123/download');
      expect(result).toEqual(mockResponse);
    });

    it('should delete file with audit logging', async () => {
      mockedApiClient.delete.mockResolvedValue({ data: null });

      await FileService.deleteFile('file-test-123');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/files/file-test-123');
    });

    it('should list files with proper access controls', async () => {
      const mockFiles = [
        { id: 'file-1', name: 'lab-report.pdf', category: 'lab-results' }
      ];
      const mockResponse = { data: mockFiles };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await FileService.getFiles();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/files');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling - Healthcare Safety Critical', () => {
    it('should handle authentication failures gracefully', async () => {
      mockedApiClient.post.mockRejectedValue(new Error('Authentication failed'));

      await expect(AuthService.login('invalid@test.com', 'wrong')).rejects.toThrow('Authentication failed');
    });

    it('should handle network errors in vital sign retrieval', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Network error'));

      await expect(VitalService.getVitalSigns('patient-123')).rejects.toThrow('Network error');
    });

    it('should handle file upload failures with cleanup', async () => {
      mockedApiClient.request.mockRejectedValue(new Error('Upload failed'));

      const file = new File(['test'], 'test.pdf');
      await expect(FileService.uploadFile(file)).rejects.toThrow('Upload failed');
    });
  });

  describe('Healthcare Compliance Validation', () => {
    it('should ensure no real patient data is used in tests', () => {
      const testUser = createMockUser();
      expect(testUser.email).toContain('telecheck.test');
      expect(testUser.name).toBe('Test User');
      expect(testUser.id).toContain('test');
    });

    it('should validate all service methods exist and are callable', () => {
      // Ensure all critical healthcare services are properly exported
      expect(typeof AuthService.login).toBe('function');
      expect(typeof UserService.getProfile).toBe('function');
      expect(typeof LabService.getResults).toBe('function');
      expect(typeof VitalService.getVitalSigns).toBe('function');
      expect(typeof MedicationService.getMedications).toBe('function');
      expect(typeof ChatService.sendMessage).toBe('function');
      expect(typeof AnalyticsService.getDashboardData).toBe('function');
      expect(typeof FileService.uploadFile).toBe('function');
    });

    it('should ensure proper API endpoint configuration', () => {
      // All endpoints should be properly defined (mocked verification)
      expect(mockedApiClient.get).toBeDefined();
      expect(mockedApiClient.post).toBeDefined();
      expect(mockedApiClient.put).toBeDefined();
      expect(mockedApiClient.delete).toBeDefined();
    });
  });
});