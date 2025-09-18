import { ValidationResult } from '../fhir/validation-error';
import Joi from 'joi';

export enum DeviceType {
  APPLE_WATCH = 'APPLE_WATCH',
  FITBIT = 'FITBIT',
  GARMIN = 'GARMIN',
  SAMSUNG_GALAXY = 'SAMSUNG_GALAXY'
}

export enum MetricType {
  HEART_RATE = 'HEART_RATE',
  STEPS = 'STEPS',
  SLEEP_DURATION = 'SLEEP_DURATION',
  CALORIES_BURNED = 'CALORIES_BURNED',
  DISTANCE = 'DISTANCE',
  BLOOD_OXYGEN = 'BLOOD_OXYGEN',
  BLOOD_PRESSURE = 'BLOOD_PRESSURE',
  WEIGHT = 'WEIGHT',
  BODY_TEMPERATURE = 'BODY_TEMPERATURE'
}

export enum SyncStatus {
  SYNCED = 'SYNCED',
  SYNCING = 'SYNCING',
  FAILED = 'FAILED',
  PENDING = 'PENDING'
}

export interface HealthMetric {
  id: string;
  deviceId: string;
  type: MetricType;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  source?: string;
  confidence?: number;
}

export interface WearableDevice {
  id: string;
  userId: string;
  type: DeviceType;
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  isActive: boolean;
  lastSyncAt?: Date;
  syncStatus: SyncStatus;
  registeredAt: Date;
  oauthToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  metadata?: Record<string, any>;
}

export class DeviceDataValidator {
  private metricSchema = Joi.object({
    id: Joi.string().required(),
    deviceId: Joi.string().required(),
    type: Joi.string().valid(...Object.values(MetricType)).required(),
    value: Joi.number().required(),
    unit: Joi.string().required(),
    timestamp: Joi.date().max('now').required().messages({
      'date.max': 'Timestamp cannot be in the future'
    }),
    metadata: Joi.object(),
    source: Joi.string(),
    confidence: Joi.number().min(0).max(1)
  });

  private deviceSchema = Joi.object({
    id: Joi.string().required(),
    userId: Joi.string().required().messages({
      'any.required': 'userId is required'
    }),
    type: Joi.string().valid(...Object.values(DeviceType)).required(),
    manufacturer: Joi.string().required(),
    model: Joi.string().required().messages({
      'any.required': 'model is required'
    }),
    firmwareVersion: Joi.string().required(),
    isActive: Joi.boolean().required(),
    lastSyncAt: Joi.date(),
    syncStatus: Joi.string().valid(...Object.values(SyncStatus)).required().messages({
      'any.only': 'syncStatus must be one of: SYNCED, SYNCING, FAILED, PENDING'
    }),
    registeredAt: Joi.date().required(),
    oauthToken: Joi.string(),
    refreshToken: Joi.string(),
    tokenExpiresAt: Joi.date(),
    metadata: Joi.object()
  });

  validateMetric(metric: HealthMetric): ValidationResult {
    const { error } = this.metricSchema.validate(metric);

    if (error) {
      const errors = error.details.map(detail => detail.message.replace(/"/g, ''));
      return { isValid: false, errors };
    }

    const validationErrors = this.validateMetricSpecificRules(metric);
    if (validationErrors.length > 0) {
      return { isValid: false, errors: validationErrors };
    }

    return { isValid: true, errors: [] };
  }

  validateDevice(device: WearableDevice): ValidationResult {
    const { error } = this.deviceSchema.validate(device);

    if (!error) {
      return { isValid: true, errors: [] };
    }

    const errors = error.details.map(detail => detail.message.replace(/"/g, ''));
    return { isValid: false, errors };
  }

  private validateMetricSpecificRules(metric: HealthMetric): string[] {
    const errors: string[] = [];

    switch (metric.type) {
      case MetricType.HEART_RATE:
        if (metric.value < 30 || metric.value > 220) {
          errors.push('Heart rate must be between 30 and 220 bpm');
        }
        break;
      case MetricType.STEPS:
        if (metric.value < 0 || metric.value > 100000) {
          errors.push('Steps must be between 0 and 100,000');
        }
        break;
      case MetricType.BLOOD_OXYGEN:
        if (metric.value < 70 || metric.value > 100) {
          errors.push('Blood oxygen must be between 70% and 100%');
        }
        break;
      case MetricType.BODY_TEMPERATURE:
        if (metric.value < 90 || metric.value > 110) { // Fahrenheit
          errors.push('Body temperature must be between 90°F and 110°F');
        }
        break;
      case MetricType.WEIGHT:
        if (metric.value < 20 || metric.value > 1000) { // kg
          errors.push('Weight must be between 20kg and 1000kg');
        }
        break;
    }

    return errors;
  }
}

export namespace HealthMetric {
  export function aggregateDaily(metrics: HealthMetric[], type: MetricType): HealthMetric {
    const filteredMetrics = metrics.filter(m => m.type === type);

    if (filteredMetrics.length === 0) {
      throw new Error(`No metrics found for type ${type}`);
    }

    const first = filteredMetrics[0];
    let aggregatedValue: number;

    // Determine aggregation method based on metric type
    if (type === MetricType.STEPS || type === MetricType.CALORIES_BURNED || type === MetricType.DISTANCE) {
      // Sum for cumulative metrics
      aggregatedValue = filteredMetrics.reduce((sum, metric) => sum + metric.value, 0);
    } else {
      // Average for instantaneous metrics
      aggregatedValue = Math.round(
        filteredMetrics.reduce((sum, metric) => sum + metric.value, 0) / filteredMetrics.length
      );
    }

    // Use the date of the first metric for the aggregated timestamp
    const aggregatedDate = new Date(first.timestamp);
    aggregatedDate.setHours(0, 0, 0, 0); // Set to start of day

    return {
      id: `aggregated-${type}-${aggregatedDate.toISOString().split('T')[0]}`,
      deviceId: first.deviceId,
      type,
      value: aggregatedValue,
      unit: first.unit,
      timestamp: aggregatedDate,
      metadata: {
        aggregationType: type === MetricType.STEPS || type === MetricType.CALORIES_BURNED || type === MetricType.DISTANCE ? 'sum' : 'average',
        sourceMetricCount: filteredMetrics.length,
        aggregatedAt: new Date()
      }
    };
  }

  export function normalizeFromAppleHealth(data: any, deviceId: string): HealthMetric[] {
    const metrics: HealthMetric[] = [];
    const timestamp = new Date(data.timestamp);

    if (data.steps !== undefined) {
      metrics.push({
        id: `apple-steps-${Date.now()}`,
        deviceId,
        type: MetricType.STEPS,
        value: data.steps,
        unit: 'steps',
        timestamp,
        source: 'apple-health'
      });
    }

    if (data.heartRate !== undefined) {
      metrics.push({
        id: `apple-hr-${Date.now()}`,
        deviceId,
        type: MetricType.HEART_RATE,
        value: data.heartRate,
        unit: 'bpm',
        timestamp,
        source: 'apple-health'
      });
    }

    if (data.sleepDuration !== undefined) {
      metrics.push({
        id: `apple-sleep-${Date.now()}`,
        deviceId,
        type: MetricType.SLEEP_DURATION,
        value: data.sleepDuration,
        unit: 'minutes',
        timestamp,
        source: 'apple-health'
      });
    }

    return metrics;
  }

  export function normalizeFromFitbit(data: any, deviceId: string): HealthMetric[] {
    const metrics: HealthMetric[] = [];
    const timestamp = new Date(data.recorded_at);

    if (data['steps-count'] !== undefined) {
      metrics.push({
        id: `fitbit-steps-${Date.now()}`,
        deviceId,
        type: MetricType.STEPS,
        value: data['steps-count'],
        unit: 'steps',
        timestamp,
        source: 'fitbit'
      });
    }

    if (data['heart-rate-bpm'] !== undefined) {
      metrics.push({
        id: `fitbit-hr-${Date.now()}`,
        deviceId,
        type: MetricType.HEART_RATE,
        value: data['heart-rate-bpm'],
        unit: 'bpm',
        timestamp,
        source: 'fitbit'
      });
    }

    if (data['sleep-minutes'] !== undefined) {
      metrics.push({
        id: `fitbit-sleep-${Date.now()}`,
        deviceId,
        type: MetricType.SLEEP_DURATION,
        value: data['sleep-minutes'],
        unit: 'minutes',
        timestamp,
        source: 'fitbit'
      });
    }

    return metrics;
  }

  export function createMetric(params: {
    deviceId: string;
    type: MetricType;
    value: number;
    unit: string;
    timestamp?: Date;
    metadata?: Record<string, any>;
  }): HealthMetric {
    return {
      id: `metric-${params.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      deviceId: params.deviceId,
      type: params.type,
      value: params.value,
      unit: params.unit,
      timestamp: params.timestamp || new Date(),
      metadata: params.metadata
    };
  }
}