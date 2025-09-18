export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: ServiceError };

export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}