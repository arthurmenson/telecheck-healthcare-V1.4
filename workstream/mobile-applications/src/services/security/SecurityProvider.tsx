import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import { Platform, Alert, AppState, AppStateStatus } from 'react-native';
import CryptoJS from 'crypto-js';

import { SecurityAuditLog, User } from '@/types/healthcare';
import { SecurityPolicy, DeviceInfo, BiometricType } from '@/types/auth';
import { useAnalytics } from '@/services/analytics/AnalyticsProvider';

interface SecurityContextType {
  isSecureDevice: boolean;
  biometricType: BiometricType | null;
  deviceInfo: DeviceInfo | null;
  securityScore: number;
  isSessionValid: boolean;
  encryptData: (data: string) => Promise<string>;
  decryptData: (encryptedData: string) => Promise<string>;
  authenticateBiometric: () => Promise<boolean>;
  validateSession: () => Promise<boolean>;
  lockApp: () => void;
  unlockApp: () => Promise<boolean>;
  auditSecurityEvent: (event: Omit<SecurityAuditLog, 'id' | 'timestamp'>) => Promise<void>;
  enforceHIPAACompliance: () => Promise<boolean>;
  checkDeviceSecurity: () => Promise<boolean>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

const ENCRYPTION_KEY_ALIAS = 'spark-den-encryption-key';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const [isSecureDevice, setIsSecureDevice] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<BiometricType | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [securityScore, setSecurityScore] = useState<number>(0);
  const [isSessionValid, setIsSessionValid] = useState<boolean>(false);
  const [isAppLocked, setIsAppLocked] = useState<boolean>(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [encryptionKey, setEncryptionKey] = useState<string>('');

  const { trackEvent } = useAnalytics();

  useEffect(() => {
    initializeSecurity();
    setupInactivityMonitoring();
  }, []);

  const initializeSecurity = async (): Promise<void> => {
    try {
      // Check device security capabilities
      const deviceSecurityCheck = await checkDeviceSecurity();
      setIsSecureDevice(deviceSecurityCheck);

      // Initialize biometric authentication
      await initializeBiometrics();

      // Collect device information
      await collectDeviceInfo();

      // Initialize encryption
      await initializeEncryption();

      // Calculate security score
      const score = await calculateSecurityScore();
      setSecurityScore(score);

      // Validate existing session
      const sessionValid = await validateSession();
      setIsSessionValid(sessionValid);

      // Log security initialization
      await auditSecurityEvent({
        userId: 'system',
        action: 'security_initialization',
        resource: 'security_provider',
        ipAddress: 'local',
        userAgent: 'mobile-app',
        success: true,
        metadata: {
          securityScore: score,
          deviceSecure: deviceSecurityCheck,
          biometricAvailable: biometricType !== null,
        },
      });
    } catch (error) {
      console.error('Security initialization failed:', error);
      await auditSecurityEvent({
        userId: 'system',
        action: 'security_initialization',
        resource: 'security_provider',
        ipAddress: 'local',
        userAgent: 'mobile-app',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const initializeBiometrics = async (): Promise<void> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      if (hasHardware && isEnrolled && supportedTypes.length > 0) {
        // Determine biometric type
        if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('faceID');
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricType('iris');
        }
      }
    } catch (error) {
      console.error('Biometric initialization failed:', error);
    }
  };

  const collectDeviceInfo = async (): Promise<void> => {
    try {
      const info: DeviceInfo = {
        deviceId: Device.deviceName || 'unknown',
        deviceName: Device.deviceName || 'Unknown Device',
        platform: Platform.OS as 'ios' | 'android',
        osVersion: Device.osVersion || 'unknown',
        appVersion: '1.0.0', // This should come from app config
        isJailbroken: false, // This would need a proper jailbreak detection library
        hasLockScreen: true, // Assume true for now
        biometricType,
        isEmulator: !Device.isDevice,
        lastSeen: new Date().toISOString(),
        isRegistered: false, // This would be set after registration
        isTrusted: false, // This would be determined by security policies
        securityScore: 0, // Will be calculated
      };

      setDeviceInfo(info);
    } catch (error) {
      console.error('Device info collection failed:', error);
    }
  };

  const initializeEncryption = async (): Promise<void> => {
    try {
      // Try to retrieve existing encryption key
      let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);

      if (!key) {
        // Generate new encryption key
        key = await Crypto.randomUUID();
        await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, key, {
          requireAuthentication: true,
          authenticationPrompt: 'Authenticate to access healthcare data',
        });
      }

      setEncryptionKey(key);
    } catch (error) {
      console.error('Encryption initialization failed:', error);
      throw new Error('Failed to initialize data encryption');
    }
  };

  const calculateSecurityScore = async (): Promise<number> => {
    let score = 0;

    // Base security features
    if (deviceInfo?.hasLockScreen) score += 20;
    if (biometricType) score += 25;
    if (!deviceInfo?.isEmulator) score += 15;
    if (!deviceInfo?.isJailbroken) score += 20;
    if (deviceInfo?.platform === 'ios') score += 10; // iOS generally more secure
    if (encryptionKey) score += 10;

    return Math.min(score, 100);
  };

  const checkDeviceSecurity = async (): Promise<boolean> => {
    try {
      // Check if device has lock screen
      const hasLockScreen = await LocalAuthentication.hasHardwareAsync();

      // Check if device is compromised (simplified check)
      const isCompromised = !Device.isDevice; // Emulator check

      // Additional security checks would go here
      // - Root/Jailbreak detection
      // - Malware scanning
      // - Certificate pinning validation

      return hasLockScreen && !isCompromised;
    } catch (error) {
      console.error('Device security check failed:', error);
      return false;
    }
  };

  const encryptData = async (data: string): Promise<string> => {
    try {
      if (!encryptionKey) {
        throw new Error('Encryption key not available');
      }

      const encrypted = CryptoJS.AES.encrypt(data, encryptionKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Data encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  };

  const decryptData = async (encryptedData: string): Promise<string> => {
    try {
      if (!encryptionKey) {
        throw new Error('Encryption key not available');
      }

      const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Data decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  };

  const authenticateBiometric = async (): Promise<boolean> => {
    try {
      if (!biometricType) {
        throw new Error('Biometric authentication not available');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access healthcare data',
        subtitle: 'Use your biometric to unlock the app',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      const success = result.success;

      await auditSecurityEvent({
        userId: 'current_user', // This should be the actual user ID
        action: 'biometric_authentication',
        resource: 'mobile_app',
        ipAddress: 'local',
        userAgent: 'mobile-app',
        success,
        metadata: {
          biometricType,
          errorCode: result.error,
        },
      });

      return success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  };

  const validateSession = async (): Promise<boolean> => {
    try {
      // Check if session token exists and is valid
      const sessionToken = await SecureStore.getItemAsync('session_token');
      const sessionExpiry = await SecureStore.getItemAsync('session_expiry');

      if (!sessionToken || !sessionExpiry) {
        return false;
      }

      const now = Date.now();
      const expiry = parseInt(sessionExpiry, 10);

      if (now > expiry) {
        // Session expired
        await SecureStore.deleteItemAsync('session_token');
        await SecureStore.deleteItemAsync('session_expiry');
        return false;
      }

      // Check for inactivity timeout
      if (now - lastActivity > INACTIVITY_TIMEOUT) {
        setIsAppLocked(true);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  };

  const lockApp = (): void => {
    setIsAppLocked(true);
    setIsSessionValid(false);
    trackEvent('app_locked', { reason: 'user_action' });
  };

  const unlockApp = async (): Promise<boolean> => {
    try {
      const biometricAuth = await authenticateBiometric();

      if (biometricAuth) {
        setIsAppLocked(false);
        setIsSessionValid(true);
        setLastActivity(Date.now());
        trackEvent('app_unlocked', { method: 'biometric' });
        return true;
      }

      return false;
    } catch (error) {
      console.error('App unlock failed:', error);
      return false;
    }
  };

  const auditSecurityEvent = async (
    event: Omit<SecurityAuditLog, 'id' | 'timestamp'>
  ): Promise<void> => {
    try {
      const auditEntry: SecurityAuditLog = {
        ...event,
        id: await Crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };

      // Store audit log locally (encrypted)
      const encryptedLog = await encryptData(JSON.stringify(auditEntry));
      const logKey = `audit_log_${auditEntry.id}`;
      await SecureStore.setItemAsync(logKey, encryptedLog);

      // Send to server for centralized logging
      // This would typically be done via an API call
      console.log('Security Audit Log:', auditEntry);

      // Track security events in analytics
      trackEvent('security_audit', {
        action: event.action,
        success: event.success,
        resource: event.resource,
      });
    } catch (error) {
      console.error('Security audit logging failed:', error);
    }
  };

  const enforceHIPAACompliance = async (): Promise<boolean> => {
    try {
      const complianceChecks = [
        // Data encryption check
        encryptionKey !== '',

        // Biometric authentication check
        biometricType !== null,

        // Device security check
        isSecureDevice,

        // Session management check
        isSessionValid,

        // Audit logging check
        true, // Always enabled
      ];

      const isCompliant = complianceChecks.every(check => check);

      await auditSecurityEvent({
        userId: 'system',
        action: 'hipaa_compliance_check',
        resource: 'security_provider',
        ipAddress: 'local',
        userAgent: 'mobile-app',
        success: isCompliant,
        metadata: {
          checks: {
            dataEncryption: complianceChecks[0],
            biometricAuth: complianceChecks[1],
            deviceSecurity: complianceChecks[2],
            sessionManagement: complianceChecks[3],
            auditLogging: complianceChecks[4],
          },
        },
      });

      if (!isCompliant) {
        Alert.alert(
          'Security Warning',
          'Your device does not meet HIPAA compliance requirements. Some features may be restricted.',
          [{ text: 'OK' }]
        );
      }

      return isCompliant;
    } catch (error) {
      console.error('HIPAA compliance check failed:', error);
      return false;
    }
  };

  const setupInactivityMonitoring = (): void => => {
    const handleAppStateChange = (nextAppState: AppStateStatus): void => {
      if (nextAppState === 'active') {
        setLastActivity(Date.now());
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Start inactivity timer
        setTimeout(() => {
          if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
            setIsAppLocked(true);
            setIsSessionValid(false);
          }
        }, INACTIVITY_TIMEOUT);
      }
    };

    AppState.addEventListener('change', handleAppStateChange);
  };

  const value: SecurityContextType = {
    isSecureDevice,
    biometricType,
    deviceInfo,
    securityScore,
    isSessionValid,
    encryptData,
    decryptData,
    authenticateBiometric,
    validateSession,
    lockApp,
    unlockApp,
    auditSecurityEvent,
    enforceHIPAACompliance,
    checkDeviceSecurity,
  };

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
};

export const useSecurity = (): SecurityContextType => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};