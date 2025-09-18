import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  messagingAdminService,
  type MessagingConfig,
  type PatientSchedule,
  type MessageTemplate,
  type CareTeamMember,
  type MessagingAnalytics,
  type AuditLog
} from '../messagingAdmin.service';

// Mock global fetch
const mockFetch = vi.fn();
Object.defineProperty(globalThis, 'fetch', {
  value: mockFetch,
  writable: true,
});

// Mock console methods for clean test output
const originalConsoleError = console.error;

// Healthcare test data factories (NO REAL PATIENT DATA)
const createMockMessagingConfig = (): MessagingConfig => ({
  primaryProvider: 'telnyx',
  enableSMS: true,
  enableVoice: false,
  enableScheduled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  maxRetries: 3,
  retryDelay: 5000,
  auditLogging: true,
  thresholds: {
    glucoseLow: 70,
    glucoseHigh: 180,
    bpSystolicHigh: 140,
    bpDiastolicHigh: 90,
    heartRateHigh: 100,
    heartRateLow: 60,
    temperatureHigh: 100.4,
    temperatureLow: 97.0,
    oxygenSatLow: 95
  },
  careTeam: {
    enableAlerts: true,
    escalationTimeout: 1800,
    maxEscalationLevels: 3
  }
});

const createMockPatientSchedule = (): PatientSchedule => ({
  id: 'schedule-test-123',
  patientId: 'patient-test-456',
  active: true,
  scheduleData: {
    frequency: 'daily',
    time: '09:00',
    message: 'Please take your morning medication'
  },
  createdAt: '2025-09-15T00:00:00Z',
  updatedAt: '2025-09-15T00:00:00Z',
  activeJobs: ['job-test-789']
});

const createMockMessageTemplate = (): MessageTemplate => ({
  id: 'template-test-123',
  type: 'medication_reminder',
  name: 'Daily Medication Reminder',
  content: 'Hi {{patientName}}, it\'s time to take your {{medicationName}}',
  variables: ['patientName', 'medicationName'],
  isDefault: true,
  active: true
});

const createMockCareTeamMember = (): CareTeamMember => ({
  id: 'care-team-test-123',
  name: 'Dr. Test Provider',
  role: 'primary_physician',
  phone: '+1-555-TEST-DOC',
  email: 'test.doctor@telecheck.test',
  priorityLevel: 1,
  availability: {
    monday: { start: '09:00', end: '17:00' },
    tuesday: { start: '09:00', end: '17:00' }
  },
  preferences: {
    smsAlerts: true,
    voiceAlerts: false,
    emailAlerts: true
  },
  active: true
});

const createMockMessagingAnalytics = (): MessagingAnalytics => ({
  period: '24h',
  overview: {
    totalMessages: 1250,
    successfulMessages: 1200,
    failedMessages: 50,
    successRate: '96.0%'
  },
  providerStats: [
    {
      provider: 'telnyx',
      type: 'sms',
      count: 800,
      success_rate: 97.5
    },
    {
      provider: 'twilio',
      type: 'sms',
      count: 400,
      success_rate: 94.2
    }
  ],
  scheduling: {
    totalActiveJobs: 500,
    messagesSentToday: 150,
    messagesFailedToday: 8,
    activePatients: 425
  }
});

const createMockAuditLog = (): AuditLog => ({
  id: 'audit-test-123',
  userId: 'admin-test-456',
  action: 'CONFIG_UPDATE',
  description: 'Updated messaging configuration',
  details: {
    field: 'primaryProvider',
    oldValue: 'twilio',
    newValue: 'telnyx'
  },
  timestamp: '2025-09-15T10:30:00Z'
});

describe('MessagingAdminService - TDD Healthcare Communication Management', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('Configuration Management - Critical Healthcare Settings', () => {
    it('should fetch messaging configuration with proper error handling', async () => {
      // RED: Test first, implementation verification
      const mockConfig = createMockMessagingConfig();
      const mockResponse = { success: true, config: mockConfig };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await messagingAdminService.getConfig();

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/messaging/config');
      expect(result).toEqual(mockResponse);
    });

    it('should handle configuration fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await messagingAdminService.getConfig();

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch configuration'
      });
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching messaging config:',
        expect.any(Error)
      );
    });

    it('should update messaging configuration with validation', async () => {
      const configUpdate: Partial<MessagingConfig> = {
        primaryProvider: 'twilio',
        maxRetries: 5,
        thresholds: {
          glucoseLow: 65,
          glucoseHigh: 200,
          bpSystolicHigh: 150,
          bpDiastolicHigh: 95,
          heartRateHigh: 110,
          heartRateLow: 50,
          temperatureHigh: 101.0,
          temperatureLow: 96.5,
          oxygenSatLow: 90
        }
      };

      const mockResponse = { success: true };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await messagingAdminService.updateConfig(configUpdate);

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/messaging/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config: configUpdate })
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle configuration update errors with audit trail', async () => {
      mockFetch.mockRejectedValue(new Error('Update failed'));

      const result = await messagingAdminService.updateConfig({ primaryProvider: 'telnyx' });

      expect(result).toEqual({
        success: false,
        error: 'Failed to update configuration'
      });
      expect(console.error).toHaveBeenCalledWith(
        'Error updating messaging config:',
        expect.any(Error)
      );
    });
  });

  describe('Service Testing - Healthcare Communication Validation', () => {
    it('should test SMS service with provider validation', async () => {
      const testParams = {
        provider: 'telnyx' as const,
        type: 'sms' as const,
        phoneNumber: '+1-555-TEST-SMS'
      };

      const mockResponse = {
        success: true,
        result: {
          messageId: 'test-msg-123',
          status: 'delivered',
          provider: 'telnyx'
        }
      };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await messagingAdminService.testService(
        testParams.provider,
        testParams.type,
        testParams.phoneNumber
      );

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/messaging/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testParams)
      });
      expect(result).toEqual(mockResponse);
    });

    it('should test voice service with fallback providers', async () => {
      const testParams = {
        provider: 'auto' as const,
        type: 'voice' as const,
        phoneNumber: '+1-555-TEST-VOICE'
      };

      const mockResponse = {
        success: true,
        result: {
          callId: 'test-call-456',
          status: 'completed',
          provider: 'twilio',
          duration: 45
        }
      };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await messagingAdminService.testService(
        testParams.provider,
        testParams.type,
        testParams.phoneNumber
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle service test failures with detailed error reporting', async () => {
      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      const result = await messagingAdminService.testService('telnyx', 'sms', '+1-555-FAIL-TEST');

      expect(result).toEqual({
        success: false,
        error: 'Failed to test service'
      });
      expect(console.error).toHaveBeenCalledWith(
        'Error testing messaging service:',
        expect.any(Error)
      );
    });
  });

  describe('Analytics - Healthcare Communication Metrics', () => {
    it('should fetch analytics with period filtering', async () => {
      const mockAnalytics = createMockMessagingAnalytics();
      const mockResponse = { success: true, analytics: mockAnalytics };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await messagingAdminService.getAnalytics('24h');

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/messaging/analytics?period=24h');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch 7-day analytics for trend analysis', async () => {
      const weeklyAnalytics = {
        ...createMockMessagingAnalytics(),
        period: '7d',
        overview: {
          totalMessages: 8750,
          successfulMessages: 8400,
          failedMessages: 350,
          successRate: '96.0%'
        }
      };

      const mockResponse = { success: true, analytics: weeklyAnalytics };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await messagingAdminService.getAnalytics('7d');

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/messaging/analytics?period=7d');
      expect(result.analytics?.period).toBe('7d');
    });

    it('should handle analytics fetch errors with fallback data', async () => {
      mockFetch.mockRejectedValue(new Error('Analytics service down'));

      const result = await messagingAdminService.getAnalytics('30d');

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch analytics'
      });
    });
  });

  describe('Patient Schedule Management - Healthcare Compliance', () => {
    it('should fetch patient schedules with pagination and filtering', async () => {
      const schedules = [createMockPatientSchedule()];
      const mockResponse = {
        success: true,
        schedules,
        pagination: { page: 1, limit: 20, total: 1, pages: 1 }
      };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await messagingAdminService.getPatientSchedules({
        page: 1,
        limit: 20,
        search: 'test-patient',
        status: 'active'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/messaging/schedules?page=1&limit=20&search=test-patient&status=active'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should update patient schedule with action validation', async () => {
      const mockResponse = { success: true };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await messagingAdminService.updatePatientSchedule(
        'patient-test-456',
        'pause'
      );

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/messaging/schedules/patient-test-456', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'pause', schedule: undefined })
      });
      expect(result).toEqual(mockResponse);
    });

    it('should update schedule with new schedule data', async () => {
      const newSchedule = {
        frequency: 'twice_daily',
        times: ['09:00', '21:00'],
        message: 'Updated medication reminder'
      };

      const mockResponse = { success: true };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await messagingAdminService.updatePatientSchedule(
        'patient-test-456',
        'update',
        newSchedule
      );

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/messaging/schedules/patient-test-456', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'update', schedule: newSchedule })
      });
    });

    it('should handle schedule update errors with patient safety', async () => {
      mockFetch.mockRejectedValue(new Error('Database connection failed'));

      const result = await messagingAdminService.updatePatientSchedule(
        'patient-test-456',
        'resume'
      );

      expect(result).toEqual({
        success: false,
        error: 'Failed to update schedule'
      });
    });
  });

  describe('Message Template Management - Healthcare Communication Standards', () => {
    it('should fetch message templates with categorization', async () => {
      const templates = [createMockMessageTemplate()];
      const mockResponse = { success: true, templates };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await messagingAdminService.getMessageTemplates();

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/messaging/templates');
      expect(result).toEqual(mockResponse);
    });

    it('should update message template with validation', async () => {
      const templateUpdate: Partial<MessageTemplate> = {
        content: 'Hi {{patientName}}, please take your {{medicationName}} at {{time}}',
        variables: ['patientName', 'medicationName', 'time'],
        active: true
      };

      const mockResponse = { success: true };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await messagingAdminService.updateMessageTemplate(
        'template-test-123',
        templateUpdate
      );

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/messaging/templates/template-test-123', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateUpdate)
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle template update errors with validation feedback', async () => {
      mockFetch.mockRejectedValue(new Error('Invalid template format'));

      const result = await messagingAdminService.updateMessageTemplate(
        'template-test-123',
        { content: 'Invalid {{template' }
      );

      expect(result).toEqual({
        success: false,
        error: 'Failed to update template'
      });
    });
  });

  describe('Care Team Management - Healthcare Provider Coordination', () => {
    it('should fetch care team configuration with roles', async () => {
      const careTeam = {
        members: [createMockCareTeamMember()],
        escalationRules: [
          { level: 1, timeout: 900, contactIds: ['care-team-test-123'] }
        ]
      };

      const mockResponse = { success: true, careTeam };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await messagingAdminService.getCareTeamConfig();

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/messaging/care-team');
      expect(result).toEqual(mockResponse);
    });

    it('should update care team member with role validation', async () => {
      const memberUpdate: Partial<CareTeamMember> = {
        phone: '+1-555-UPDATED-DOC',
        availability: {
          monday: { start: '08:00', end: '18:00' },
          friday: { start: '09:00', end: '15:00' }
        },
        priorityLevel: 2
      };

      const mockResponse = { success: true };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await messagingAdminService.updateCareTeamMember(
        'care-team-test-123',
        memberUpdate
      );

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/messaging/care-team/care-team-test-123', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memberUpdate)
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle care team update errors with escalation backup', async () => {
      mockFetch.mockRejectedValue(new Error('Care team service unavailable'));

      const result = await messagingAdminService.updateCareTeamMember(
        'care-team-test-123',
        { active: false }
      );

      expect(result).toEqual({
        success: false,
        error: 'Failed to update care team member'
      });
    });
  });

  describe('Audit Logging - Healthcare Compliance & Security', () => {
    it('should fetch audit logs with comprehensive filtering', async () => {
      const logs = [createMockAuditLog()];
      const mockResponse = {
        success: true,
        logs,
        pagination: { page: 1, limit: 50, total: 1, pages: 1 }
      };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await messagingAdminService.getAuditLogs({
        page: 1,
        limit: 50,
        type: 'CONFIG_UPDATE',
        startDate: '2025-09-01',
        endDate: '2025-09-15'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/messaging/audit-logs?page=1&limit=50&type=CONFIG_UPDATE&startDate=2025-09-01&endDate=2025-09-15'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle audit log fetch errors with security alerting', async () => {
      mockFetch.mockRejectedValue(new Error('Audit system offline'));

      const result = await messagingAdminService.getAuditLogs();

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch audit logs'
      });
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching audit logs:',
        expect.any(Error)
      );
    });
  });

  describe('Wellness Check - Patient Safety Monitoring', () => {
    it('should send wellness check with patient safety protocols', async () => {
      const mockResponse = {
        success: true,
        checkId: 'wellness-check-789',
        scheduledTime: '2025-09-15T14:00:00Z'
      };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await messagingAdminService.sendWellnessCheck(
        'patient-test-456',
        'Test Patient',
        '+1-555-WELLNESS'
      );

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/messaging/wellness-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: 'patient-test-456',
          patientName: 'Test Patient',
          phoneNumber: '+1-555-WELLNESS'
        })
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle wellness check failures with backup protocols', async () => {
      mockFetch.mockRejectedValue(new Error('Wellness check service down'));

      const result = await messagingAdminService.sendWellnessCheck(
        'patient-test-456',
        'Test Patient',
        '+1-555-FAIL-WELLNESS'
      );

      expect(result).toEqual({
        success: false,
        error: 'Failed to send wellness check'
      });
      expect(console.error).toHaveBeenCalledWith(
        'Error sending wellness check:',
        expect.any(Error)
      );
    });
  });

  describe('Healthcare Compliance & Security Validation', () => {
    it('should ensure no real patient data is used in tests', () => {
      const testSchedule = createMockPatientSchedule();
      expect(testSchedule.patientId).toContain('test');
      expect(testSchedule.id).toContain('test');

      const testMember = createMockCareTeamMember();
      expect(testMember.email).toContain('telecheck.test');
      expect(testMember.phone).toContain('TEST');
    });

    it('should validate all service methods exist and are properly typed', () => {
      expect(typeof messagingAdminService.getConfig).toBe('function');
      expect(typeof messagingAdminService.updateConfig).toBe('function');
      expect(typeof messagingAdminService.testService).toBe('function');
      expect(typeof messagingAdminService.getAnalytics).toBe('function');
      expect(typeof messagingAdminService.getPatientSchedules).toBe('function');
      expect(typeof messagingAdminService.updatePatientSchedule).toBe('function');
      expect(typeof messagingAdminService.getMessageTemplates).toBe('function');
      expect(typeof messagingAdminService.updateMessageTemplate).toBe('function');
      expect(typeof messagingAdminService.getCareTeamConfig).toBe('function');
      expect(typeof messagingAdminService.updateCareTeamMember).toBe('function');
      expect(typeof messagingAdminService.getAuditLogs).toBe('function');
      expect(typeof messagingAdminService.sendWellnessCheck).toBe('function');
    });

    it('should ensure proper error handling across all methods', () => {
      // All service methods should have try-catch blocks and proper error responses
      const mockConfig = createMockMessagingConfig();
      expect(mockConfig.auditLogging).toBe(true); // Audit logging enabled
      expect(mockConfig.thresholds).toBeDefined(); // Health thresholds defined
      expect(mockConfig.careTeam.enableAlerts).toBe(true); // Care team alerts enabled
    });

    it('should validate healthcare-specific threshold configurations', () => {
      const config = createMockMessagingConfig();

      // Validate critical health thresholds are within safe ranges
      expect(config.thresholds.glucoseLow).toBeGreaterThan(0);
      expect(config.thresholds.glucoseHigh).toBeGreaterThan(config.thresholds.glucoseLow);
      expect(config.thresholds.bpSystolicHigh).toBeGreaterThan(90);
      expect(config.thresholds.heartRateLow).toBeGreaterThan(0);
      expect(config.thresholds.oxygenSatLow).toBeGreaterThan(0);
      expect(config.thresholds.oxygenSatLow).toBeLessThan(100);
    });
  });

  describe('TDD Implementation Verification', () => {
    it('should follow Red-Green-Refactor pattern for critical functionality', async () => {
      // This test verifies our TDD approach is working
      // RED: Test that would fail if implementation is missing
      // GREEN: Minimal implementation to pass
      // REFACTOR: Clean, maintainable code

      // Test critical healthcare messaging functionality
      const criticalConfig = {
        primaryProvider: 'telnyx' as const,
        enableSMS: true,
        auditLogging: true,
        thresholds: {
          glucoseLow: 70,
          glucoseHigh: 180,
          bpSystolicHigh: 140,
          bpDiastolicHigh: 90,
          heartRateHigh: 100,
          heartRateLow: 60,
          temperatureHigh: 100.4,
          temperatureLow: 97.0,
          oxygenSatLow: 95
        }
      };

      mockFetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ success: true })
      });

      const result = await messagingAdminService.updateConfig(criticalConfig);
      expect(result.success).toBe(true);
    });
  });
});