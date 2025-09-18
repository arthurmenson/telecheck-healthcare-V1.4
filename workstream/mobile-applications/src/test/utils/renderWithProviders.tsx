/**
 * Test utility for rendering components with all necessary providers
 * Healthcare application context wrapper for testing
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistGate } from 'redux-persist/integration/react';

import { store, persistor } from '@/store';
import { AuthProvider } from '@/services/auth/AuthProvider';
import { SecurityProvider } from '@/services/security/SecurityProvider';
import { AnalyticsProvider } from '@/services/analytics/AnalyticsProvider';
import { HealthcareWorkflowProvider } from '@/services/workflow/HealthcareWorkflowProvider';
import { PatientEngagementProvider } from '@/services/engagement/PatientEngagementProvider';
import { ThemeProvider } from '@/components/common/ThemeProvider';
import { NotificationProvider } from '@/services/notifications/NotificationProvider';

// Create a test query client with no retry and no cache time for faster tests
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: any;
  queryClient?: QueryClient;
  withAuth?: boolean;
  withSecurity?: boolean;
  withAnalytics?: boolean;
  withWorkflow?: boolean;
  withEngagement?: boolean;
  withNotifications?: boolean;
}

interface AllProvidersProps {
  children: React.ReactNode;
  queryClient: QueryClient;
  withAuth: boolean;
  withSecurity: boolean;
  withAnalytics: boolean;
  withWorkflow: boolean;
  withEngagement: boolean;
  withNotifications: boolean;
}

const AllProviders: React.FC<AllProvidersProps> = ({
  children,
  queryClient,
  withAuth,
  withSecurity,
  withAnalytics,
  withWorkflow,
  withEngagement,
  withNotifications,
}) => {
  let wrappedChildren = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider>
                {children}
              </ThemeProvider>
            </QueryClientProvider>
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  if (withSecurity) {
    wrappedChildren = <SecurityProvider>{wrappedChildren}</SecurityProvider>;
  }

  if (withAuth) {
    wrappedChildren = <AuthProvider>{wrappedChildren}</AuthProvider>;
  }

  if (withAnalytics) {
    wrappedChildren = <AnalyticsProvider>{wrappedChildren}</AnalyticsProvider>;
  }

  if (withWorkflow) {
    wrappedChildren = <HealthcareWorkflowProvider>{wrappedChildren}</HealthcareWorkflowProvider>;
  }

  if (withEngagement) {
    wrappedChildren = <PatientEngagementProvider>{wrappedChildren}</PatientEngagementProvider>;
  }

  if (withNotifications) {
    wrappedChildren = <NotificationProvider>{wrappedChildren}</NotificationProvider>;
  }

  return wrappedChildren;
};

/**
 * Renders component with all providers needed for healthcare app testing
 */
export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    queryClient = createTestQueryClient(),
    withAuth = true,
    withSecurity = true,
    withAnalytics = false,
    withWorkflow = false,
    withEngagement = false,
    withNotifications = false,
    ...renderOptions
  } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllProviders
      queryClient={queryClient}
      withAuth={withAuth}
      withSecurity={withSecurity}
      withAnalytics={withAnalytics}
      withWorkflow={withWorkflow}
      withEngagement={withEngagement}
      withNotifications={withNotifications}
    >
      {children}
    </AllProviders>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
};

/**
 * Renders component with minimal providers for unit testing
 */
export const renderWithMinimalProviders = (
  ui: ReactElement,
  options: RenderOptions = {}
) => {
  const queryClient = createTestQueryClient();

  const MinimalWrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );

  return {
    ...render(ui, { wrapper: MinimalWrapper, ...options }),
    queryClient,
  };
};

/**
 * Renders component with healthcare-specific providers
 */
export const renderWithHealthcareProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  return renderWithProviders(ui, {
    ...options,
    withAuth: true,
    withSecurity: true,
    withAnalytics: true,
    withWorkflow: true,
    withEngagement: true,
    withNotifications: true,
  });
};

/**
 * Custom render function specifically for testing authentication flows
 */
export const renderWithAuthFlow = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  return renderWithProviders(ui, {
    ...options,
    withAuth: true,
    withSecurity: true,
    withAnalytics: false,
    withWorkflow: false,
    withEngagement: false,
    withNotifications: false,
  });
};

/**
 * Custom render function for testing clinical workflows
 */
export const renderWithClinicalWorkflow = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  return renderWithProviders(ui, {
    ...options,
    withAuth: true,
    withSecurity: true,
    withAnalytics: true,
    withWorkflow: true,
    withEngagement: false,
    withNotifications: true,
  });
};

/**
 * Custom render function for testing patient engagement features
 */
export const renderWithPatientEngagement = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  return renderWithProviders(ui, {
    ...options,
    withAuth: true,
    withSecurity: true,
    withAnalytics: true,
    withWorkflow: false,
    withEngagement: true,
    withNotifications: true,
  });
};

// Re-export everything from React Native Testing Library
export * from '@testing-library/react-native';