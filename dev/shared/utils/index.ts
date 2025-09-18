/**
 * Shared utility functions for Telecheck Healthcare Platform
 *
 * These utilities are used across all workstreams to maintain consistency
 * and prevent code duplication.
 */

import type { ApiResponse, ApiError } from '../types/index.js';

// API Response Utilities
export function createSuccessResponse<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}

export function createErrorResponse(error: ApiError): ApiResponse {
  return {
    success: false,
    error,
  };
}

export function createApiError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  field?: string
): ApiError {
  return {
    code,
    message,
    ...(details && { details }),
    ...(field && { field }),
  };
}

// Validation Utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  // Basic US phone number validation
  const phoneRegex = /^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)\.]/g, ''));
}

export function isValidMRN(mrn: string): boolean {
  // Medical Record Number validation (8-12 alphanumeric characters)
  const mrnRegex = /^[A-Z0-9]{8,12}$/;
  return mrnRegex.test(mrn);
}

export function isStrongPassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

// Date Utilities
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatDateTime(date: Date): string {
  return date.toISOString();
}

export function isValidDateOfBirth(dob: Date): boolean {
  const now = new Date();
  const age = now.getFullYear() - dob.getFullYear();
  return age >= 0 && age <= 150;
}

export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  return age;
}

// String Utilities
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>\"'&]/g, '');
}

export function generateMRN(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MRN${timestamp}${random}`;
}

export function generateId(): string {
  return crypto.randomUUID();
}

// Pagination Utilities
export function calculatePagination(page: number = 1, limit: number = 10, total: number) {
  const offset = (page - 1) * limit;
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return {
    page,
    limit,
    offset,
    total,
    totalPages,
    hasMore,
  };
}

// Healthcare-specific Utilities
export function normalizeBloodPressure(systolic: number, diastolic: number): {
  systolic: number;
  diastolic: number;
  category: 'normal' | 'elevated' | 'high_stage_1' | 'high_stage_2' | 'crisis';
} {
  let category: 'normal' | 'elevated' | 'high_stage_1' | 'high_stage_2' | 'crisis';

  if (systolic < 120 && diastolic < 80) {
    category = 'normal';
  } else if (systolic < 130 && diastolic < 80) {
    category = 'elevated';
  } else if (systolic < 140 || diastolic < 90) {
    category = 'high_stage_1';
  } else if (systolic < 180 || diastolic < 120) {
    category = 'high_stage_2';
  } else {
    category = 'crisis';
  }

  return { systolic, diastolic, category };
}

export function calculateBMI(weight: number, height: number): {
  bmi: number;
  category: 'underweight' | 'normal' | 'overweight' | 'obese';
} {
  const bmi = weight / Math.pow(height / 100, 2);
  let category: 'underweight' | 'normal' | 'overweight' | 'obese';

  if (bmi < 18.5) {
    category = 'underweight';
  } else if (bmi < 25) {
    category = 'normal';
  } else if (bmi < 30) {
    category = 'overweight';
  } else {
    category = 'obese';
  }

  return { bmi: Math.round(bmi * 10) / 10, category };
}

// Security Utilities
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars) {
    return '*'.repeat(data.length);
  }

  const masked = '*'.repeat(data.length - visibleChars);
  return masked + data.slice(-visibleChars);
}

export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

// Error Handling Utilities
export function isAppError(error: unknown): error is { statusCode: number; code: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    'code' in error &&
    'message' in error
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}

// Type Guards
export function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

export function isNotUndefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

// Async Utilities
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        throw lastError;
      }

      await delay(delayMs * attempt);
    }
  }

  throw lastError!;
}

// Environment Utilities
export function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];

  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required`);
  }

  return value || defaultValue!;
}

export function getEnvVarAsNumber(name: string, defaultValue?: number): number {
  const value = process.env[name];

  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required`);
  }

  if (!value) {
    return defaultValue!;
  }

  const num = parseInt(value, 10);

  if (isNaN(num)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }

  return num;
}

export function getEnvVarAsBoolean(name: string, defaultValue?: boolean): boolean {
  const value = process.env[name];

  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required`);
  }

  if (!value) {
    return defaultValue!;
  }

  return value.toLowerCase() === 'true';
}