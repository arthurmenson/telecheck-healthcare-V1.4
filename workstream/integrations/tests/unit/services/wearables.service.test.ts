import { WearablesService } from '../../../src/services/wearables.service';
import {
  WearableDevice,
  DeviceType,
  SyncStatus,
  MetricType,
  HealthMetric
} from '../../../src/domain/wearables/device-data';
import { ExternalApiService } from '../../../src/services/external-api.service';
import { ValidationError } from '../../../src/domain/fhir/validation-error';

jest.mock('../../../src/services/external-api.service');
const MockedExternalApiService = ExternalApiService as jest.MockedClass<typeof ExternalApiService>;

describe('WearablesService', () => {
  let wearablesService: WearablesService;
  let mockAppleService: jest.Mocked<ExternalApiService>;
  let mockFitbitService: jest.Mocked<ExternalApiService>;

  beforeEach(() => {
    mockAppleService = {
      post: jest.fn(),
      get: jest.fn(),
      getCircuitBreakerState: jest.fn()
    } as any;

    mockFitbitService = {
      post: jest.fn(),
      get: jest.fn(),
      getCircuitBreakerState: jest.fn()
    } as any;

    MockedExternalApiService
      .mockImplementationOnce(() => mockAppleService)
      .mockImplementationOnce(() => mockFitbitService);

    wearablesService = new WearablesService({
      appleHealth: {
        baseUrl: 'https://api.apple.com/health',
        clientId: 'apple-client-id',
        clientSecret: 'apple-secret',
        timeout: 5000,
        circuitBreakerConfig: {
          failureThreshold: 3,
          recoveryTimeout: 5000,
          monitoringPeriod: 10000
        }
      },
      fitbit: {
        baseUrl: 'https://api.fitbit.com/1',
        clientId: 'fitbit-client-id',
        clientSecret: 'fitbit-secret',
        timeout: 5000,
        circuitBreakerConfig: {
          failureThreshold: 3,
          recoveryTimeout: 5000,
          monitoringPeriod: 10000
        }
      },
      syncIntervalMinutes: 30,
      retentionDays: 365
    });
  });

  describe('registerDevice', () => {
    it('should register Apple Watch device successfully', async () => {
      const device: WearableDevice = {
        id: 'apple-watch-123',
        userId: 'user-456',
        type: DeviceType.APPLE_WATCH,
        manufacturer: 'Apple',
        model: 'Series 9',
        firmwareVersion: '10.1.0',
        isActive: true,
        syncStatus: SyncStatus.PENDING,
        registeredAt: new Date()
      };

      const mockResponse = {
        accessToken: 'apple-access-token',
        refreshToken: 'apple-refresh-token',
        expiresAt: '2023-12-15T10:30:00Z'
      };

      mockAppleService.post.mockResolvedValue(mockResponse);

      const result = await wearablesService.registerDevice(device);

      expect(result.oauthToken).toBe('apple-access-token');
      expect(result.refreshToken).toBe('apple-refresh-token');
      expect(result.tokenExpiresAt).toEqual(new Date('2023-12-15T10:30:00Z'));
      expect(result.syncStatus).toBe(SyncStatus.PENDING);

      expect(mockAppleService.post).toHaveBeenCalledWith('/devices/register', {
        deviceId: device.id,
        userId: device.userId,
        clientId: 'apple-client-id',
        deviceInfo: {
          manufacturer: 'Apple',
          model: 'Series 9',
          firmwareVersion: '10.1.0'
        }
      });
    });

    it('should register Fitbit device successfully', async () => {
      const device: WearableDevice = {
        id: 'fitbit-123',
        userId: 'user-456',
        type: DeviceType.FITBIT,
        manufacturer: 'Fitbit',
        model: 'Charge 5',
        firmwareVersion: '1.45.0',
        isActive: true,
        syncStatus: SyncStatus.PENDING,
        registeredAt: new Date()
      };

      const mockResponse = {
        access_token: 'fitbit-access-token',
        refresh_token: 'fitbit-refresh-token',
        expires_at: '2023-12-15T10:30:00Z'
      };

      mockFitbitService.post.mockResolvedValue(mockResponse);

      const result = await wearablesService.registerDevice(device);

      expect(result.oauthToken).toBe('fitbit-access-token');
      expect(result.refreshToken).toBe('fitbit-refresh-token');
      expect(result.tokenExpiresAt).toEqual(new Date('2023-12-15T10:30:00Z'));

      expect(mockFitbitService.post).toHaveBeenCalledWith('/devices/register', {
        device_id: device.id,
        user_id: device.userId,
        client_id: 'fitbit-client-id',
        device_info: {
          manufacturer: 'Fitbit',
          model: 'Charge 5',
          firmware_version: '1.45.0'
        }
      });
    });

    it('should reject invalid device data', async () => {
      const invalidDevice = {
        id: 'device-123',
        type: DeviceType.APPLE_WATCH,
        manufacturer: 'Apple'
        // Missing required fields
      } as any;

      await expect(wearablesService.registerDevice(invalidDevice))
        .rejects.toThrow(ValidationError);

      expect(mockAppleService.post).not.toHaveBeenCalled();
      expect(mockFitbitService.post).not.toHaveBeenCalled();
    });

    it('should reject unsupported device type', async () => {
      const device: WearableDevice = {
        id: 'garmin-123',
        userId: 'user-456',
        type: DeviceType.GARMIN,
        manufacturer: 'Garmin',
        model: 'Forerunner 955',
        firmwareVersion: '15.20',
        isActive: true,
        syncStatus: SyncStatus.PENDING,
        registeredAt: new Date()
      };

      await expect(wearablesService.registerDevice(device))
        .rejects.toThrow('Unsupported device type: GARMIN');
    });
  });

  describe('syncDeviceData', () => {
    beforeEach(() => {
      // Mock the private methods that would normally interact with database
      jest.spyOn(wearablesService as any, 'getDevice').mockResolvedValue({
        id: 'device-123',
        userId: 'user-456',
        type: DeviceType.APPLE_WATCH,
        manufacturer: 'Apple',
        model: 'Series 9',
        firmwareVersion: '10.1.0',
        isActive: true,
        syncStatus: SyncStatus.SYNCED,
        registeredAt: new Date(),
        oauthToken: 'valid-token'
      });

      jest.spyOn(wearablesService as any, 'updateDeviceStatus').mockResolvedValue({});
    });

    it('should sync Apple Health data successfully', async () => {
      const mockHealthData = {
        data: [
          {
            steps: 8500,
            heartRate: 72,
            timestamp: '2023-10-15T10:30:00Z'
          }
        ]
      };

      mockAppleService.get.mockResolvedValue(mockHealthData);

      const result = await wearablesService.syncDeviceData('device-123');

      expect(result.success).toBe(true);
      expect(result.metricsCount).toBe(2); // steps + heart rate
      expect(result.deviceId).toBe('device-123');
      expect(result.syncedAt).toBeInstanceOf(Date);
      expect(result.nextSyncAt).toBeInstanceOf(Date);

      expect(mockAppleService.get).toHaveBeenCalledWith(
        expect.stringContaining('/health-data?device_id=device-123')
      );
    });

    it('should handle sync failure gracefully', async () => {
      mockAppleService.get.mockRejectedValue(new Error('API unavailable'));

      const result = await wearablesService.syncDeviceData('device-123');

      expect(result.success).toBe(false);
      expect(result.metricsCount).toBe(0);
      expect(result.errorMessage).toBe('API unavailable');
    });

    it('should reject sync for inactive device', async () => {
      jest.spyOn(wearablesService as any, 'getDevice').mockResolvedValue({
        id: 'device-123',
        isActive: false,
        type: DeviceType.APPLE_WATCH
      });

      const result = await wearablesService.syncDeviceData('device-123');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Device is not active');
    });

    it('should sync with date range options', async () => {
      const mockHealthData = { data: [] };
      mockAppleService.get.mockResolvedValue(mockHealthData);

      const startDate = new Date('2023-10-01');
      const endDate = new Date('2023-10-15');

      await wearablesService.syncDeviceData('device-123', {
        startDate,
        endDate,
        metricTypes: [MetricType.STEPS, MetricType.HEART_RATE]
      });

      expect(mockAppleService.get).toHaveBeenCalledWith(
        expect.stringContaining('start_date=2023-10-01T00:00:00.000Z')
      );

      expect(mockAppleService.get).toHaveBeenCalledWith(
        expect.stringContaining('end_date=2023-10-15T00:00:00.000Z')
      );
    });
  });

  describe('getDeviceMetrics', () => {
    it('should retrieve device metrics with filters', async () => {
      const mockMetrics: HealthMetric[] = [
        {
          id: 'metric-1',
          deviceId: 'device-123',
          type: MetricType.STEPS,
          value: 8500,
          unit: 'steps',
          timestamp: new Date('2023-10-15T10:30:00Z')
        }
      ];

      mockAppleService.get.mockResolvedValue(mockMetrics);

      const startDate = new Date('2023-10-15T00:00:00Z');
      const endDate = new Date('2023-10-15T23:59:59Z');

      const result = await wearablesService.getDeviceMetrics(
        'device-123',
        startDate,
        endDate,
        [MetricType.STEPS]
      );

      expect(result).toEqual(mockMetrics);
      expect(mockAppleService.get).toHaveBeenCalledWith(
        expect.stringContaining('deviceId=device-123')
      );
      expect(mockAppleService.get).toHaveBeenCalledWith(
        expect.stringContaining('metricTypes=STEPS')
      );
    });
  });

  describe('refreshDeviceToken', () => {
    it('should refresh Apple device token', async () => {
      const device: WearableDevice = {
        id: 'device-123',
        userId: 'user-456',
        type: DeviceType.APPLE_WATCH,
        manufacturer: 'Apple',
        model: 'Series 9',
        firmwareVersion: '10.1.0',
        isActive: true,
        syncStatus: SyncStatus.SYNCED,
        registeredAt: new Date(),
        refreshToken: 'refresh-token-123'
      };

      jest.spyOn(wearablesService as any, 'getDevice').mockResolvedValue(device);

      const mockRefreshResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: '2023-12-16T10:30:00Z'
      };

      mockAppleService.post.mockResolvedValue(mockRefreshResponse);

      const result = await wearablesService.refreshDeviceToken('device-123');

      expect(result.oauthToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.tokenExpiresAt).toEqual(new Date('2023-12-16T10:30:00Z'));

      expect(mockAppleService.post).toHaveBeenCalledWith('/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: 'refresh-token-123',
        client_id: 'apple-client-id',
        client_secret: 'apple-secret'
      });
    });

    it('should reject refresh when no refresh token available', async () => {
      const device: WearableDevice = {
        id: 'device-123',
        userId: 'user-456',
        type: DeviceType.APPLE_WATCH,
        manufacturer: 'Apple',
        model: 'Series 9',
        firmwareVersion: '10.1.0',
        isActive: true,
        syncStatus: SyncStatus.SYNCED,
        registeredAt: new Date()
        // No refreshToken
      };

      jest.spyOn(wearablesService as any, 'getDevice').mockResolvedValue(device);

      await expect(wearablesService.refreshDeviceToken('device-123'))
        .rejects.toThrow('No refresh token available for device');
    });
  });

  describe('service health checks', () => {
    it('should return Apple Health service state', () => {
      mockAppleService.getCircuitBreakerState.mockReturnValue('CLOSED' as any);

      const state = wearablesService.getAppleHealthServiceHealth();

      expect(state).toBe('CLOSED');
      expect(mockAppleService.getCircuitBreakerState).toHaveBeenCalled();
    });

    it('should return Fitbit service state', () => {
      mockFitbitService.getCircuitBreakerState.mockReturnValue('OPEN' as any);

      const state = wearablesService.getFitbitServiceHealth();

      expect(state).toBe('OPEN');
      expect(mockFitbitService.getCircuitBreakerState).toHaveBeenCalled();
    });
  });
});