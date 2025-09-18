import {
  WearableDevice,
  DeviceType,
  HealthMetric,
  MetricType,
  DeviceDataValidator,
  SyncStatus
} from '../../../../src/domain/wearables/device-data';

describe('Wearable Device Data Domain', () => {
  let validator: DeviceDataValidator;

  beforeEach(() => {
    validator = new DeviceDataValidator();
  });

  describe('HealthMetric validation', () => {
    it('should validate heart rate metric', () => {
      const metric: HealthMetric = {
        id: 'metric-123',
        deviceId: 'device-456',
        type: MetricType.HEART_RATE,
        value: 72,
        unit: 'bpm',
        timestamp: new Date('2023-10-15T10:30:00Z'),
        metadata: {
          accuracy: 'high',
          activity: 'resting'
        }
      };

      const result = validator.validateMetric(metric);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate steps metric', () => {
      const metric: HealthMetric = {
        id: 'metric-789',
        deviceId: 'device-456',
        type: MetricType.STEPS,
        value: 8500,
        unit: 'steps',
        timestamp: new Date('2023-10-15T23:59:59Z')
      };

      const result = validator.validateMetric(metric);
      expect(result.isValid).toBe(true);
    });

    it('should reject metric with invalid heart rate value', () => {
      const metric: HealthMetric = {
        id: 'metric-123',
        deviceId: 'device-456',
        type: MetricType.HEART_RATE,
        value: 300, // Invalid heart rate
        unit: 'bpm',
        timestamp: new Date()
      };

      const result = validator.validateMetric(metric);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Heart rate must be between 30 and 220 bpm');
    });

    it('should reject metric with future timestamp', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const metric: HealthMetric = {
        id: 'metric-123',
        deviceId: 'device-456',
        type: MetricType.HEART_RATE,
        value: 72,
        unit: 'bpm',
        timestamp: futureDate
      };

      const result = validator.validateMetric(metric);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timestamp cannot be in the future');
    });

    it('should validate sleep duration metric', () => {
      const metric: HealthMetric = {
        id: 'metric-sleep-1',
        deviceId: 'device-456',
        type: MetricType.SLEEP_DURATION,
        value: 480, // 8 hours in minutes
        unit: 'minutes',
        timestamp: new Date('2023-10-15T07:00:00Z'),
        metadata: {
          sleepQuality: 'good',
          deepSleepMinutes: 120,
          remSleepMinutes: 90
        }
      };

      const result = validator.validateMetric(metric);
      expect(result.isValid).toBe(true);
    });
  });

  describe('WearableDevice validation', () => {
    it('should validate Apple Watch device', () => {
      const device: WearableDevice = {
        id: 'device-apple-123',
        userId: 'user-456',
        type: DeviceType.APPLE_WATCH,
        manufacturer: 'Apple',
        model: 'Series 9',
        firmwareVersion: '10.1.0',
        isActive: true,
        lastSyncAt: new Date('2023-10-15T10:00:00Z'),
        syncStatus: SyncStatus.SYNCED,
        registeredAt: new Date('2023-10-01T09:00:00Z'),
        oauthToken: 'encrypted-token-data'
      };

      const result = validator.validateDevice(device);
      expect(result.isValid).toBe(true);
    });

    it('should validate Fitbit device', () => {
      const device: WearableDevice = {
        id: 'device-fitbit-789',
        userId: 'user-456',
        type: DeviceType.FITBIT,
        manufacturer: 'Fitbit',
        model: 'Charge 5',
        firmwareVersion: '1.45.0',
        isActive: true,
        lastSyncAt: new Date('2023-10-15T09:30:00Z'),
        syncStatus: SyncStatus.SYNCING,
        registeredAt: new Date('2023-09-15T14:00:00Z'),
        oauthToken: 'encrypted-fitbit-token'
      };

      const result = validator.validateDevice(device);
      expect(result.isValid).toBe(true);
    });

    it('should reject device with missing required fields', () => {
      const incompleteDevice = {
        id: 'device-123',
        type: DeviceType.APPLE_WATCH,
        manufacturer: 'Apple'
        // Missing required fields
      } as any;

      const result = validator.validateDevice(incompleteDevice);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('userId is required');
      expect(result.errors).toContain('model is required');
    });

    it('should reject device with invalid sync status', () => {
      const device = {
        id: 'device-123',
        userId: 'user-456',
        type: DeviceType.APPLE_WATCH,
        manufacturer: 'Apple',
        model: 'Series 9',
        firmwareVersion: '10.1.0',
        isActive: true,
        syncStatus: 'INVALID_STATUS',
        registeredAt: new Date()
      } as any;

      const result = validator.validateDevice(device);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('syncStatus must be one of: SYNCED, SYNCING, FAILED, PENDING');
    });
  });

  describe('Data aggregation and normalization', () => {
    it('should aggregate daily steps correctly', () => {
      const metrics: HealthMetric[] = [
        {
          id: 'step-1',
          deviceId: 'device-123',
          type: MetricType.STEPS,
          value: 2000,
          unit: 'steps',
          timestamp: new Date('2023-10-15T08:00:00Z')
        },
        {
          id: 'step-2',
          deviceId: 'device-123',
          type: MetricType.STEPS,
          value: 3000,
          unit: 'steps',
          timestamp: new Date('2023-10-15T12:00:00Z')
        },
        {
          id: 'step-3',
          deviceId: 'device-123',
          type: MetricType.STEPS,
          value: 3500,
          unit: 'steps',
          timestamp: new Date('2023-10-15T18:00:00Z')
        }
      ];

      const aggregated = HealthMetric.aggregateDaily(metrics, MetricType.STEPS);

      expect(aggregated.value).toBe(8500);
      expect(aggregated.type).toBe(MetricType.STEPS);
      expect(aggregated.unit).toBe('steps');
    });

    it('should calculate average heart rate correctly', () => {
      const metrics: HealthMetric[] = [
        {
          id: 'hr-1',
          deviceId: 'device-123',
          type: MetricType.HEART_RATE,
          value: 70,
          unit: 'bpm',
          timestamp: new Date('2023-10-15T08:00:00Z')
        },
        {
          id: 'hr-2',
          deviceId: 'device-123',
          type: MetricType.HEART_RATE,
          value: 75,
          unit: 'bpm',
          timestamp: new Date('2023-10-15T12:00:00Z')
        },
        {
          id: 'hr-3',
          deviceId: 'device-123',
          type: MetricType.HEART_RATE,
          value: 68,
          unit: 'bpm',
          timestamp: new Date('2023-10-15T18:00:00Z')
        }
      ];

      const averaged = HealthMetric.aggregateDaily(metrics, MetricType.HEART_RATE);

      expect(averaged.value).toBe(71); // (70 + 75 + 68) / 3 = 71
      expect(averaged.type).toBe(MetricType.HEART_RATE);
    });

    it('should normalize data from different device types', () => {
      const appleHealthData = {
        steps: 8500,
        heartRate: 72,
        timestamp: '2023-10-15T10:30:00Z'
      };

      const fitbitData = {
        'steps-count': 8500,
        'heart-rate-bpm': 72,
        recorded_at: '2023-10-15T10:30:00Z'
      };

      const normalizedApple = HealthMetric.normalizeFromAppleHealth(appleHealthData, 'device-apple-123');
      const normalizedFitbit = HealthMetric.normalizeFromFitbit(fitbitData, 'device-fitbit-456');

      expect(normalizedApple).toHaveLength(2);
      expect(normalizedFitbit).toHaveLength(2);

      // Both should produce the same normalized structure
      expect(normalizedApple[0].type).toBe(MetricType.STEPS);
      expect(normalizedApple[0].value).toBe(8500);
      expect(normalizedFitbit[0].type).toBe(MetricType.STEPS);
      expect(normalizedFitbit[0].value).toBe(8500);
    });
  });
});