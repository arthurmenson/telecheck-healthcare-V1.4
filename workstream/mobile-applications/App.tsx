import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { store, persistor } from '@/store';
import { AuthProvider } from '@/services/auth/AuthProvider';
import { SecurityProvider } from '@/services/security/SecurityProvider';
import { AnalyticsProvider } from '@/services/analytics/AnalyticsProvider';
import AppNavigator from '@/navigation/AppNavigator';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ThemeProvider } from '@/components/common/ThemeProvider';
import { NotificationProvider } from '@/services/notifications/NotificationProvider';

// Create QueryClient with healthcare-optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 2,
      retryDelay: 1000,
    },
  },
});

export default function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Provider store={store}>
            <PersistGate loading={<LoadingScreen />} persistor={persistor}>
              <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                  <SecurityProvider>
                    <AuthProvider>
                      <AnalyticsProvider>
                        <NotificationProvider>
                          <AppNavigator />
                          <StatusBar style="auto" />
                        </NotificationProvider>
                      </AnalyticsProvider>
                    </AuthProvider>
                  </SecurityProvider>
                </ThemeProvider>
              </QueryClientProvider>
            </PersistGate>
          </Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}