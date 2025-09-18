// Core domain models
export { CircuitBreaker, CircuitBreakerState } from './domain/circuit-breaker';
export { FhirPatient, PatientValidator } from './domain/fhir/patient';
export { Message, MessageStatus, MessageType, MessageValidator } from './domain/messaging/message';
export { ValidationError } from './domain/fhir/validation-error';

// Wearable device domain
export {
  WearableDevice,
  HealthMetric,
  DeviceType,
  MetricType,
  SyncStatus,
  DeviceDataValidator
} from './domain/wearables/device-data';

// Logging and observability domain
export {
  Logger,
  ErrorLogger,
  IntegrationError,
  LogLevel,
  ErrorSeverity,
  ErrorCategory
} from './domain/logging/logger';

// Core services
export { ExternalApiService } from './services/external-api.service';
export { FhirService } from './services/fhir.service';
export { MessagingService } from './services/messaging.service';
export { WearablesService } from './services/wearables.service';
export { ObservabilityService } from './services/observability.service';

// Type exports
export type { ExternalApiConfig } from './services/external-api.service';
export type { FhirServiceConfig } from './services/fhir.service';
export type {
  MessagingServiceConfig,
  MessageProviderConfig,
  MessageDeliveryStatus
} from './services/messaging.service';
export type {
  WearableServiceConfig,
  SyncResult,
  DataSyncOptions
} from './services/wearables.service';
export type {
  ObservabilityConfig,
  HealthCheck,
  ServiceMetrics
} from './services/observability.service';