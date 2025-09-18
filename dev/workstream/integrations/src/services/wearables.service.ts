import { ExternalApiService } from './external-api.service';
import {
  WearableDevice,
  HealthMetric,
  DeviceType,
  SyncStatus,
  DeviceDataValidator,
  MetricType
} from '../domain/wearables/device-data';
import { ValidationError } from '../domain/fhir/validation-error';

export interface WearableServiceConfig {
  appleHealth: {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    timeout: number;
    circuitBreakerConfig: {
      failureThreshold: number;
      recoveryTimeout: number;
      monitoringPeriod: number;
    };
  };
  fitbit: {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    timeout: number;
    circuitBreakerConfig: {
      failureThreshold: number;
      recoveryTimeout: number;
      monitoringPeriod: number;
    };
  };
  syncIntervalMinutes: number;
  retentionDays: number;
}

export interface SyncResult {
  deviceId: string;
  success: boolean;
  metricsCount: number;
  syncedAt: Date;
  errorMessage?: string;
  nextSyncAt?: Date;
}

export interface DataSyncOptions {
  startDate?: Date;
  endDate?: Date;
  metricTypes?: MetricType[];
  forceSync?: boolean;
}

export class WearablesService {
  private appleHealthService: ExternalApiService;
  private fitbitService: ExternalApiService;
  private validator: DeviceDataValidator;
  private config: WearableServiceConfig;

  constructor(config: WearableServiceConfig) {
    this.config = config;
    this.validator = new DeviceDataValidator();

    this.appleHealthService = new ExternalApiService({
      baseUrl: config.appleHealth.baseUrl,
      timeout: config.appleHealth.timeout,
      retryAttempts: 3,
      circuitBreakerConfig: config.appleHealth.circuitBreakerConfig
    });

    this.fitbitService = new ExternalApiService({
      baseUrl: config.fitbit.baseUrl,
      timeout: config.fitbit.timeout,
      retryAttempts: 3,
      circuitBreakerConfig: config.fitbit.circuitBreakerConfig
    });
  }

  async registerDevice(device: WearableDevice): Promise<WearableDevice> {
    const validationResult = this.validator.validateDevice(device);
    const validationError = ValidationError.fromValidationResult(validationResult);
    if (validationError) {
      throw validationError;
    }

    if (device.type === DeviceType.APPLE_WATCH) {
      return await this.registerAppleDevice(device);
    } else if (device.type === DeviceType.FITBIT) {
      return await this.registerFitbitDevice(device);
    }

    throw new Error(`Unsupported device type: ${device.type}`);
  }

  async syncDeviceData(deviceId: string, options: DataSyncOptions = {}): Promise<SyncResult> {
    try {
      const device = await this.getDevice(deviceId);

      if (!device.isActive) {
        throw new Error('Device is not active');
      }

      const updatedDevice = await this.updateDeviceStatus(deviceId, SyncStatus.SYNCING);

      let metrics: HealthMetric[] = [];

      if (device.type === DeviceType.APPLE_WATCH) {
        metrics = await this.syncAppleHealthData(device, options);
      } else if (device.type === DeviceType.FITBIT) {
        metrics = await this.syncFitbitData(device, options);
      }

      // Validate all metrics before storing
      for (const metric of metrics) {
        const validationResult = this.validator.validateMetric(metric);
        const validationError = ValidationError.fromValidationResult(validationResult);
        if (validationError) {
          throw new Error(`Invalid metric data: ${validationError.message}`);
        }
      }

      await this.updateDeviceStatus(deviceId, SyncStatus.SYNCED);

      return {
        deviceId,
        success: true,
        metricsCount: metrics.length,
        syncedAt: new Date(),
        nextSyncAt: this.calculateNextSyncTime()
      };

    } catch (error) {
      await this.updateDeviceStatus(deviceId, SyncStatus.FAILED);

      return {
        deviceId,
        success: false,
        metricsCount: 0,
        syncedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown sync error'
      };
    }
  }

  async getDeviceMetrics(
    deviceId: string,
    startDate: Date,
    endDate: Date,
    metricTypes?: MetricType[]
  ): Promise<HealthMetric[]> {
    const queryParams = new URLSearchParams({
      deviceId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    if (metricTypes && metricTypes.length > 0) {
      queryParams.append('metricTypes', metricTypes.join(','));
    }

    return await this.appleHealthService.get(`/metrics?${queryParams.toString()}`);
  }

  async aggregateMetrics(
    deviceId: string,
    date: Date,
    metricType: MetricType
  ): Promise<HealthMetric> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const metrics = await this.getDeviceMetrics(deviceId, startOfDay, endOfDay, [metricType]);

    return HealthMetric.aggregateDaily(metrics, metricType);
  }

  async refreshDeviceToken(deviceId: string): Promise<WearableDevice> {
    const device = await this.getDevice(deviceId);

    if (!device.refreshToken) {
      throw new Error('No refresh token available for device');
    }

    let refreshedDevice: WearableDevice;

    if (device.type === DeviceType.APPLE_WATCH) {
      refreshedDevice = await this.refreshAppleToken(device);
    } else if (device.type === DeviceType.FITBIT) {
      refreshedDevice = await this.refreshFitbitToken(device);
    } else {
      throw new Error(`Token refresh not supported for device type: ${device.type}`);
    }

    return refreshedDevice;
  }

  getAppleHealthServiceHealth() {
    return this.appleHealthService.getCircuitBreakerState();
  }

  getFitbitServiceHealth() {
    return this.fitbitService.getCircuitBreakerState();
  }

  private async registerAppleDevice(device: WearableDevice): Promise<WearableDevice> {
    const registrationPayload = {
      deviceId: device.id,
      userId: device.userId,
      clientId: this.config.appleHealth.clientId,
      deviceInfo: {
        manufacturer: device.manufacturer,
        model: device.model,
        firmwareVersion: device.firmwareVersion
      }
    };

    const response = await this.appleHealthService.post('/devices/register', registrationPayload);

    return {
      ...device,
      oauthToken: response.accessToken,
      refreshToken: response.refreshToken,
      tokenExpiresAt: new Date(response.expiresAt),
      syncStatus: SyncStatus.PENDING
    };
  }

  private async registerFitbitDevice(device: WearableDevice): Promise<WearableDevice> {
    const registrationPayload = {
      device_id: device.id,
      user_id: device.userId,
      client_id: this.config.fitbit.clientId,
      device_info: {
        manufacturer: device.manufacturer,
        model: device.model,
        firmware_version: device.firmwareVersion
      }
    };

    const response = await this.fitbitService.post('/devices/register', registrationPayload);

    return {
      ...device,
      oauthToken: response.access_token,
      refreshToken: response.refresh_token,
      tokenExpiresAt: new Date(response.expires_at),
      syncStatus: SyncStatus.PENDING
    };
  }

  private async syncAppleHealthData(device: WearableDevice, options: DataSyncOptions): Promise<HealthMetric[]> {
    const queryParams = new URLSearchParams({
      device_id: device.id
    });

    if (options.startDate) {
      queryParams.append('start_date', options.startDate.toISOString());
    }

    if (options.endDate) {
      queryParams.append('end_date', options.endDate.toISOString());
    }

    const headers = {
      Authorization: `Bearer ${device.oauthToken}`
    };

    const rawData = await this.appleHealthService.get(`/health-data?${queryParams.toString()}`);

    // Normalize Apple Health data format
    const normalizedMetrics: HealthMetric[] = [];

    for (const dataPoint of rawData.data || []) {
      const metrics = HealthMetric.normalizeFromAppleHealth(dataPoint, device.id);
      normalizedMetrics.push(...metrics);
    }

    return normalizedMetrics;
  }

  private async syncFitbitData(device: WearableDevice, options: DataSyncOptions): Promise<HealthMetric[]> {
    const queryParams = new URLSearchParams({
      device_id: device.id
    });

    if (options.startDate) {
      queryParams.append('start_date', options.startDate.toISOString().split('T')[0]);
    }

    if (options.endDate) {
      queryParams.append('end_date', options.endDate.toISOString().split('T')[0]);
    }

    const headers = {
      Authorization: `Bearer ${device.oauthToken}`
    };

    const rawData = await this.fitbitService.get(`/activities?${queryParams.toString()}`);

    // Normalize Fitbit data format
    const normalizedMetrics: HealthMetric[] = [];

    for (const dataPoint of rawData.activities || []) {
      const metrics = HealthMetric.normalizeFromFitbit(dataPoint, device.id);
      normalizedMetrics.push(...metrics);
    }

    return normalizedMetrics;
  }

  private async refreshAppleToken(device: WearableDevice): Promise<WearableDevice> {
    const refreshPayload = {
      grant_type: 'refresh_token',
      refresh_token: device.refreshToken,
      client_id: this.config.appleHealth.clientId,
      client_secret: this.config.appleHealth.clientSecret
    };

    const response = await this.appleHealthService.post('/oauth/token', refreshPayload);

    return {
      ...device,
      oauthToken: response.access_token,
      refreshToken: response.refresh_token || device.refreshToken,
      tokenExpiresAt: new Date(response.expires_at)
    };
  }

  private async refreshFitbitToken(device: WearableDevice): Promise<WearableDevice> {
    const refreshPayload = {
      grant_type: 'refresh_token',
      refresh_token: device.refreshToken,
      client_id: this.config.fitbit.clientId,
      client_secret: this.config.fitbit.clientSecret
    };

    const response = await this.fitbitService.post('/oauth2/token', refreshPayload);

    return {
      ...device,
      oauthToken: response.access_token,
      refreshToken: response.refresh_token || device.refreshToken,
      tokenExpiresAt: new Date(Date.now() + response.expires_in * 1000)
    };
  }

  private async getDevice(deviceId: string): Promise<WearableDevice> {
    // This would typically fetch from a database
    // For now, we'll throw an error to indicate this needs implementation
    throw new Error('Device storage not implemented - would fetch from database');
  }

  private async updateDeviceStatus(deviceId: string, status: SyncStatus): Promise<WearableDevice> {
    // This would typically update the database
    // For now, we'll throw an error to indicate this needs implementation
    throw new Error('Device status update not implemented - would update database');
  }

  private calculateNextSyncTime(): Date {
    const next = new Date();
    next.setMinutes(next.getMinutes() + this.config.syncIntervalMinutes);
    return next;
  }
}