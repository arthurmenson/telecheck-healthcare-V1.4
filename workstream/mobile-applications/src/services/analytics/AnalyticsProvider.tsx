import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform, Dimensions } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AnalyticsEvent {
  name: string;
  properties: Record<string, any>;
  timestamp: string;
  sessionId: string;
  userId?: string;
  category: EventCategory;
  value?: number;
  duration?: number;
}

interface UserSession {
  id: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  screenViews: ScreenView[];
  events: AnalyticsEvent[];
  deviceInfo: DeviceInfo;
  appInfo: AppInfo;
  performance: PerformanceMetrics;
}

interface ScreenView {
  screenName: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  interactions: UserInteraction[];
}

interface UserInteraction {
  type: InteractionType;
  element: string;
  timestamp: string;
  coordinates?: { x: number; y: number };
  value?: any;
}

interface PerformanceMetrics {
  appLaunchTime: number;
  screenLoadTimes: Record<string, number>;
  apiResponseTimes: Record<string, number>;
  crashCount: number;
  errorCount: number;
  memoryUsage: number[];
  batteryImpact: number;
  networkUsage: {
    sent: number;
    received: number;
  };
}

interface DeviceInfo {
  platform: string;
  osVersion: string;
  deviceModel: string;
  screenSize: { width: number; height: number };
  isTablet: boolean;
  hasNotch: boolean;
  orientation: 'portrait' | 'landscape';
  networkType: string;
  batteryLevel?: number;
  isLowPowerMode?: boolean;
}

interface AppInfo {
  version: string;
  buildNumber: string;
  bundleId: string;
  installTime: string;
  updateTime: string;
  firstLaunch: boolean;
  launchCount: number;
}

interface UserProperties {
  userId?: string;
  userRole: string;
  accountType: string;
  subscriptionTier: string;
  registrationDate: string;
  lastActiveDate: string;
  totalSessions: number;
  averageSessionDuration: number;
  engagementScore?: number;
  journeyStage?: string;
  npsScore?: number;
  customProperties: Record<string, any>;
}

interface AnalyticsMetrics {
  userEngagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    sessionDuration: number;
    screenViewsPerSession: number;
    retentionRate: {
      day1: number;
      day7: number;
      day30: number;
    };
  };
  featureUsage: {
    topFeatures: Array<{ name: string; usage: number }>;
    featureAdoption: Record<string, number>;
    abandonmentRate: Record<string, number>;
  };
  performance: {
    averageLoadTime: number;
    crashRate: number;
    errorRate: number;
    apiLatency: number;
  };
  healthcareSpecific: {
    appointmentBookingConversion: number;
    medicationAdherenceRate: number;
    clinicalWorkflowEfficiency: number;
    patientSatisfactionScore: number;
    providerProductivityGain: number;
  };
}

interface AnalyticsConfig {
  enabled: boolean;
  anonymizeData: boolean;
  collectCrashReports: boolean;
  collectPerformanceMetrics: boolean;
  batchSize: number;
  flushInterval: number; // milliseconds
  maxStorageSize: number; // bytes
  debugMode: boolean;
}

type EventCategory =
  | 'user_action'
  | 'navigation'
  | 'feature_usage'
  | 'performance'
  | 'error'
  | 'healthcare'
  | 'engagement';

type InteractionType =
  | 'tap'
  | 'swipe'
  | 'scroll'
  | 'input'
  | 'voice'
  | 'biometric'
  | 'long_press';

interface AnalyticsContextType {
  isInitialized: boolean;
  currentSession: UserSession | null;
  userProperties: UserProperties | null;
  metrics: AnalyticsMetrics | null;

  // Core Analytics Methods
  trackEvent: (name: string, properties?: Record<string, any>, category?: EventCategory) => void;
  trackScreenView: (screenName: string, properties?: Record<string, any>) => void;
  trackTiming: (name: string, duration: number, properties?: Record<string, any>) => void;
  trackError: (error: Error, context?: Record<string, any>) => void;

  // User Management
  identifyUser: (userId: string, properties?: Record<string, any>) => void;
  setUserProperties: (properties: Record<string, any>) => void;
  clearUser: () => void;

  // Healthcare-Specific Tracking
  trackClinicalAction: (action: string, context: Record<string, any>) => void;
  trackAppointmentFlow: (stage: string, properties?: Record<string, any>) => void;
  trackMedicationEvent: (action: string, medication: string, properties?: Record<string, any>) => void;
  trackPatientInteraction: (type: string, duration?: number, satisfaction?: number) => void;

  // Performance Monitoring
  trackAppLaunch: (duration: number) => void;
  trackScreenLoad: (screenName: string, duration: number) => void;
  trackApiCall: (endpoint: string, duration: number, success: boolean) => void;
  trackCrash: (error: Error, fatal: boolean) => void;

  // Engagement Tracking
  trackFeatureDiscovery: (feature: string, method: string) => void;
  trackFeatureAdoption: (feature: string, adopted: boolean) => void;
  trackUserFlow: (flowName: string, step: string, completed: boolean) => void;

  // Data Management
  flush: () => Promise<void>;
  getMetrics: (timeRange?: string) => Promise<AnalyticsMetrics>;
  exportData: () => Promise<string>;
  clearData: () => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

interface AnalyticsProviderProps {
  children: ReactNode;
  config?: Partial<AnalyticsConfig>;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({
  children,
  config: userConfig
}) => {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [currentSession, setCurrentSession] = useState<UserSession | null>(null);
  const [userProperties, setUserPropertiesState] = useState<UserProperties | null>(null);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [eventQueue, setEventQueue] = useState<AnalyticsEvent[]>([]);

  const config: AnalyticsConfig = {
    enabled: true,
    anonymizeData: false,
    collectCrashReports: true,
    collectPerformanceMetrics: true,
    batchSize: 50,
    flushInterval: 30000, // 30 seconds
    maxStorageSize: 10 * 1024 * 1024, // 10MB
    debugMode: __DEV__,
    ...userConfig,
  };

  useEffect(() => {
    initializeAnalytics();
    startSession();
    setupPerformanceMonitoring();
    setupAutoFlush();

    return () => {
      endSession();
    };
  }, []);

  const initializeAnalytics = async (): Promise<void> => {
    try {
      // Load stored user properties
      const storedUserProperties = await AsyncStorage.getItem('analytics_user_properties');
      if (storedUserProperties) {
        setUserPropertiesState(JSON.parse(storedUserProperties));
      }

      // Load stored event queue
      const storedEvents = await AsyncStorage.getItem('analytics_event_queue');
      if (storedEvents) {
        setEventQueue(JSON.parse(storedEvents));
      }

      setIsInitialized(true);

      if (config.debugMode) {
        console.log('Analytics initialized successfully');
      }
    } catch (error) {
      console.error('Analytics initialization failed:', error);
    }
  };

  const startSession = async (): Promise<void> => {
    try {
      const deviceInfo = await getDeviceInfo();
      const appInfo = await getAppInfo();

      const session: UserSession = {
        id: generateSessionId(),
        userId: userProperties?.userId,
        startTime: new Date().toISOString(),
        screenViews: [],
        events: [],
        deviceInfo,
        appInfo,
        performance: {
          appLaunchTime: 0,
          screenLoadTimes: {},
          apiResponseTimes: {},
          crashCount: 0,
          errorCount: 0,
          memoryUsage: [],
          batteryImpact: 0,
          networkUsage: { sent: 0, received: 0 },
        },
      };

      setCurrentSession(session);

      trackEvent('session_start', {
        sessionId: session.id,
        deviceInfo,
        appInfo,
      }, 'user_action');
    } catch (error) {
      console.error('Failed to start analytics session:', error);
    }
  };

  const endSession = async (): Promise<void> => {
    if (!currentSession) return;

    try {
      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(currentSession.startTime).getTime();

      const completedSession: UserSession = {
        ...currentSession,
        endTime,
        duration,
      };

      setCurrentSession(completedSession);

      trackEvent('session_end', {
        sessionId: completedSession.id,
        duration,
        screenViews: completedSession.screenViews.length,
        events: completedSession.events.length,
      }, 'user_action');

      // Flush events before ending
      await flush();
    } catch (error) {
      console.error('Failed to end analytics session:', error);
    }
  };

  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const getDeviceInfo = async (): Promise<DeviceInfo> => {
    const { width, height } = Dimensions.get('window');

    return {
      platform: Platform.OS,
      osVersion: Platform.Version.toString(),
      deviceModel: Device.modelName || 'unknown',
      screenSize: { width, height },
      isTablet: Device.deviceType === Device.DeviceType.TABLET,
      hasNotch: false, // This would need platform-specific detection
      orientation: width > height ? 'landscape' : 'portrait',
      networkType: 'unknown', // This would need NetInfo
    };
  };

  const getAppInfo = async (): Promise<AppInfo> => {
    return {
      version: Application.nativeApplicationVersion || '1.0.0',
      buildNumber: Application.nativeBuildVersion || '1',
      bundleId: Application.applicationId || 'com.sparkden.healthcare',
      installTime: new Date().toISOString(), // This would be stored on first launch
      updateTime: new Date().toISOString(),
      firstLaunch: false, // This would be determined on first launch
      launchCount: 1, // This would be tracked
    };
  };

  const setupPerformanceMonitoring = (): void => {
    if (!config.collectPerformanceMetrics) return;

    // Monitor memory usage
    const memoryInterval = setInterval(() => {
      // This would use a native module to get actual memory usage
      const memoryUsage = Math.random() * 100; // Placeholder

      if (currentSession) {
        setCurrentSession(prev => ({
          ...prev!,
          performance: {
            ...prev!.performance,
            memoryUsage: [...prev!.performance.memoryUsage.slice(-9), memoryUsage],
          },
        }));
      }
    }, 5000);

    return () => clearInterval(memoryInterval);
  };

  const setupAutoFlush = (): void => {
    const flushInterval = setInterval(() => {
      if (eventQueue.length >= config.batchSize) {
        flush();
      }
    }, config.flushInterval);

    return () => clearInterval(flushInterval);
  };

  const trackEvent = (
    name: string,
    properties: Record<string, any> = {},
    category: EventCategory = 'user_action'
  ): void => {
    if (!config.enabled || !isInitialized) return;

    const event: AnalyticsEvent = {
      name,
      properties: {
        ...properties,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      sessionId: currentSession?.id || 'no_session',
      userId: userProperties?.userId,
      category,
    };

    // Add to current session
    if (currentSession) {
      setCurrentSession(prev => ({
        ...prev!,
        events: [...prev!.events, event],
      }));
    }

    // Add to event queue
    setEventQueue(prev => [...prev, event]);

    // Store event queue
    AsyncStorage.setItem('analytics_event_queue', JSON.stringify([...eventQueue, event]));

    if (config.debugMode) {
      console.log('Analytics Event:', event);
    }
  };

  const trackScreenView = (screenName: string, properties: Record<string, any> = {}): void => {
    const screenView: ScreenView = {
      screenName,
      startTime: new Date().toISOString(),
      interactions: [],
    };

    // End previous screen view
    if (currentSession && currentSession.screenViews.length > 0) {
      const lastScreenView = currentSession.screenViews[currentSession.screenViews.length - 1];
      if (!lastScreenView.endTime) {
        const endTime = new Date().toISOString();
        const duration = new Date(endTime).getTime() - new Date(lastScreenView.startTime).getTime();

        lastScreenView.endTime = endTime;
        lastScreenView.duration = duration;
      }
    }

    // Add new screen view
    if (currentSession) {
      setCurrentSession(prev => ({
        ...prev!,
        screenViews: [...prev!.screenViews, screenView],
      }));
    }

    trackEvent('screen_view', {
      screenName,
      ...properties,
    }, 'navigation');
  };

  const trackTiming = (name: string, duration: number, properties: Record<string, any> = {}): void => {
    trackEvent(name, {
      ...properties,
      duration,
      timing: true,
    }, 'performance');
  };

  const trackError = (error: Error, context: Record<string, any> = {}): void => {
    if (!config.collectCrashReports) return;

    trackEvent('error', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      ...context,
    }, 'error');

    // Update session error count
    if (currentSession) {
      setCurrentSession(prev => ({
        ...prev!,
        performance: {
          ...prev!.performance,
          errorCount: prev!.performance.errorCount + 1,
        },
      }));
    }
  };

  const identifyUser = (userId: string, properties: Record<string, any> = {}): void => {
    const newUserProperties: UserProperties = {
      userId,
      userRole: properties.userRole || 'unknown',
      accountType: properties.accountType || 'standard',
      subscriptionTier: properties.subscriptionTier || 'free',
      registrationDate: properties.registrationDate || new Date().toISOString(),
      lastActiveDate: new Date().toISOString(),
      totalSessions: 1,
      averageSessionDuration: 0,
      customProperties: properties,
    };

    setUserPropertiesState(newUserProperties);
    AsyncStorage.setItem('analytics_user_properties', JSON.stringify(newUserProperties));

    trackEvent('user_identified', {
      userId,
      ...properties,
    }, 'user_action');
  };

  const setUserProperties = (properties: Record<string, any>): void => {
    if (!userProperties) return;

    const updatedProperties = {
      ...userProperties,
      customProperties: {
        ...userProperties.customProperties,
        ...properties,
      },
    };

    setUserPropertiesState(updatedProperties);
    AsyncStorage.setItem('analytics_user_properties', JSON.stringify(updatedProperties));
  };

  const clearUser = (): void => {
    setUserPropertiesState(null);
    AsyncStorage.removeItem('analytics_user_properties');

    trackEvent('user_cleared', {}, 'user_action');
  };

  // Healthcare-Specific Tracking Methods
  const trackClinicalAction = (action: string, context: Record<string, any>): void => {
    trackEvent('clinical_action', {
      action,
      ...context,
    }, 'healthcare');
  };

  const trackAppointmentFlow = (stage: string, properties: Record<string, any> = {}): void => {
    trackEvent('appointment_flow', {
      stage,
      ...properties,
    }, 'healthcare');
  };

  const trackMedicationEvent = (action: string, medication: string, properties: Record<string, any> = {}): void => {
    trackEvent('medication_event', {
      action,
      medication,
      ...properties,
    }, 'healthcare');
  };

  const trackPatientInteraction = (type: string, duration?: number, satisfaction?: number): void => {
    trackEvent('patient_interaction', {
      type,
      duration,
      satisfaction,
    }, 'healthcare');
  };

  // Performance Tracking Methods
  const trackAppLaunch = (duration: number): void => {
    if (currentSession) {
      setCurrentSession(prev => ({
        ...prev!,
        performance: {
          ...prev!.performance,
          appLaunchTime: duration,
        },
      }));
    }

    trackTiming('app_launch', duration);
  };

  const trackScreenLoad = (screenName: string, duration: number): void => {
    if (currentSession) {
      setCurrentSession(prev => ({
        ...prev!,
        performance: {
          ...prev!.performance,
          screenLoadTimes: {
            ...prev!.performance.screenLoadTimes,
            [screenName]: duration,
          },
        },
      }));
    }

    trackTiming('screen_load', duration, { screenName });
  };

  const trackApiCall = (endpoint: string, duration: number, success: boolean): void => {
    if (currentSession) {
      setCurrentSession(prev => ({
        ...prev!,
        performance: {
          ...prev!.performance,
          apiResponseTimes: {
            ...prev!.performance.apiResponseTimes,
            [endpoint]: duration,
          },
        },
      }));
    }

    trackTiming('api_call', duration, { endpoint, success });
  };

  const trackCrash = (error: Error, fatal: boolean): void => {
    if (currentSession) {
      setCurrentSession(prev => ({
        ...prev!,
        performance: {
          ...prev!.performance,
          crashCount: prev!.performance.crashCount + 1,
        },
      }));
    }

    trackEvent('crash', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      fatal,
    }, 'error');
  };

  // Engagement Tracking Methods
  const trackFeatureDiscovery = (feature: string, method: string): void => {
    trackEvent('feature_discovery', {
      feature,
      method,
    }, 'engagement');
  };

  const trackFeatureAdoption = (feature: string, adopted: boolean): void => {
    trackEvent('feature_adoption', {
      feature,
      adopted,
    }, 'engagement');
  };

  const trackUserFlow = (flowName: string, step: string, completed: boolean): void => {
    trackEvent('user_flow', {
      flowName,
      step,
      completed,
    }, 'engagement');
  };

  // Data Management Methods
  const flush = async (): Promise<void> => {
    if (eventQueue.length === 0) return;

    try {
      // In a real implementation, this would send events to an analytics service
      if (config.debugMode) {
        console.log('Flushing analytics events:', eventQueue.length);
      }

      // Clear the event queue
      setEventQueue([]);
      await AsyncStorage.removeItem('analytics_event_queue');
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
    }
  };

  const getMetrics = async (timeRange?: string): Promise<AnalyticsMetrics> => {
    // This would typically fetch metrics from a backend service
    // For now, return mock data
    const mockMetrics: AnalyticsMetrics = {
      userEngagement: {
        dailyActiveUsers: 150,
        weeklyActiveUsers: 800,
        monthlyActiveUsers: 2500,
        sessionDuration: 420000, // 7 minutes
        screenViewsPerSession: 8.5,
        retentionRate: {
          day1: 0.75,
          day7: 0.45,
          day30: 0.25,
        },
      },
      featureUsage: {
        topFeatures: [
          { name: 'appointment_booking', usage: 0.85 },
          { name: 'patient_portal', usage: 0.72 },
          { name: 'medication_tracking', usage: 0.68 },
        ],
        featureAdoption: {
          'voice_to_text': 0.35,
          'biometric_auth': 0.68,
          'telemedicine': 0.42,
        },
        abandonmentRate: {
          'appointment_booking': 0.15,
          'patient_registration': 0.25,
        },
      },
      performance: {
        averageLoadTime: 2.3,
        crashRate: 0.002,
        errorRate: 0.015,
        apiLatency: 450,
      },
      healthcareSpecific: {
        appointmentBookingConversion: 0.78,
        medicationAdherenceRate: 0.85,
        clinicalWorkflowEfficiency: 0.72,
        patientSatisfactionScore: 4.6,
        providerProductivityGain: 0.25,
      },
    };

    setMetrics(mockMetrics);
    return mockMetrics;
  };

  const exportData = async (): Promise<string> => {
    const data = {
      userProperties,
      currentSession,
      eventQueue,
      metrics,
    };

    return JSON.stringify(data, null, 2);
  };

  const clearData = async (): Promise<void> => {
    setEventQueue([]);
    setMetrics(null);
    await AsyncStorage.multiRemove([
      'analytics_event_queue',
      'analytics_user_properties',
    ]);

    trackEvent('analytics_data_cleared', {}, 'user_action');
  };

  const value: AnalyticsContextType = {
    isInitialized,
    currentSession,
    userProperties,
    metrics,
    trackEvent,
    trackScreenView,
    trackTiming,
    trackError,
    identifyUser,
    setUserProperties,
    clearUser,
    trackClinicalAction,
    trackAppointmentFlow,
    trackMedicationEvent,
    trackPatientInteraction,
    trackAppLaunch,
    trackScreenLoad,
    trackApiCall,
    trackCrash,
    trackFeatureDiscovery,
    trackFeatureAdoption,
    trackUserFlow,
    flush,
    getMetrics,
    exportData,
    clearData,
  };

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
};

export const useAnalytics = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};