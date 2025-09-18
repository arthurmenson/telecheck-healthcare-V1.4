/**
 * Jest Test Setup
 * Configures testing environment for React Native healthcare application
 */

import 'react-native-gesture-handler/jestSetup';
import '@testing-library/jest-native/extend-expect';

// Mock react-native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock expo modules
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  deviceName: 'Test Device',
  modelName: 'Test Model',
  osVersion: '15.0',
  DeviceType: {
    PHONE: 1,
    TABLET: 2,
  },
  deviceType: 1,
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    name: 'Test App',
    version: '1.0.0',
  },
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-123'),
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  getCurrentState: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

// Mock react-native-voice
jest.mock('@react-native-voice/voice', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  removeAllListeners: jest.fn(),
  onSpeechStart: null,
  onSpeechEnd: null,
  onSpeechResults: null,
  onSpeechError: null,
}));

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
}));

// Mock react-native-biometrics
jest.mock('react-native-biometrics', () => ({
  isSensorAvailable: jest.fn(() => Promise.resolve({ available: true, biometryType: 'FaceID' })),
  createKeys: jest.fn(() => Promise.resolve({ publicKey: 'test-key' })),
  biometricKeysExist: jest.fn(() => Promise.resolve({ keysExist: true })),
  createSignature: jest.fn(() => Promise.resolve({ success: true, signature: 'test-signature' })),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  multiSet: jest.fn(),
  multiGet: jest.fn(),
  multiRemove: jest.fn(),
  clear: jest.fn(),
}));

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
  })),
}));

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Setup global test timeout
jest.setTimeout(30000);

// Mock Date for consistent testing
const originalDate = Date;
const mockDate = jest.fn(() => new originalDate('2024-01-01T00:00:00.000Z'));
mockDate.now = jest.fn(() => 1704067200000); // 2024-01-01T00:00:00.000Z
global.Date = mockDate as any;

// Mock crypto for consistent testing
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn().mockReturnValue(new Uint32Array([1, 2, 3, 4])),
    randomUUID: jest.fn().mockReturnValue('test-uuid-123'),
  },
});

// Healthcare data mocks
export const mockPatient = {
  id: 'patient-123',
  mrn: 'MRN123456',
  demographics: {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    gender: 'male',
    address: {
      street1: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
      country: 'US',
    },
    phone: '555-123-4567',
    email: 'john.doe@example.com',
    preferredLanguage: 'en',
  },
  insurance: [],
  emergencyContacts: [],
  allergies: [],
  medications: [],
  vitals: [],
  appointments: [],
  visitHistory: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const mockProvider = {
  id: 'provider-123',
  npi: '1234567890',
  firstName: 'Dr. Jane',
  lastName: 'Smith',
  credentials: ['MD'],
  specialties: [],
  licenseNumbers: [],
  contactInfo: {},
  schedule: {},
  preferences: {},
  performance: {},
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const mockAppointment = {
  id: 'appointment-123',
  patientId: 'patient-123',
  providerId: 'provider-123',
  type: 'routine' as const,
  status: 'scheduled' as const,
  scheduledDateTime: '2024-01-02T10:00:00.000Z',
  duration: 30,
  location: {
    type: 'office',
    address: '123 Medical Center Dr',
    room: 'Room 101',
  },
  reason: 'Annual checkup',
  remindersSent: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  profile: {
    firstName: 'Test',
    lastName: 'User',
    organization: {
      id: 'org-123',
      name: 'Test Organization',
      type: 'clinic' as const,
      address: {
        street1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
      },
      phone: '555-123-4567',
      email: 'org@example.com',
    },
    timezone: 'UTC',
    language: 'en',
  },
  roles: [
    {
      id: 'role-123',
      name: 'Provider',
      type: 'provider' as const,
      description: 'Healthcare Provider',
      permissions: [],
      isActive: true,
    },
  ],
  permissions: [],
  mfaEnabled: false,
  biometricEnabled: true,
  loginAttempts: 0,
  isLocked: false,
  passwordChangedAt: '2024-01-01T00:00:00.000Z',
  sessionTimeout: 30,
  preferences: {
    theme: 'light' as const,
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h' as const,
    notifications: {
      push: true,
      email: true,
      sms: false,
      appointments: true,
      reminders: true,
      messages: true,
      alerts: true,
      marketing: false,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
    },
    privacy: {
      shareDataForResearch: false,
      shareDataForMarketing: false,
      allowAnalytics: true,
      allowCrashReporting: true,
      showInDirectory: true,
    },
    accessibility: {
      fontSize: 'medium' as const,
      highContrast: false,
      screenReader: false,
      voiceNavigation: false,
      largeButtons: false,
      reduceMotion: false,
    },
  },
  auditLog: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// Test environment setup complete
console.log('Test environment initialized with healthcare data mocks');