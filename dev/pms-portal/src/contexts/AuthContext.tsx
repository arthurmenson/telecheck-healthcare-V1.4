import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService, { type User, UserRole, type LoginResponse } from '../services/authService';
import auditService from '../services/auditService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    practiceId?: string;
  }) => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);

      // Check for stored auth data
      const storedUser = authService.getCurrentUser();
      const token = authService.getToken();

      if (storedUser && token) {
        // Verify token is still valid by fetching profile
        try {
          const profile = await authService.getProfile();
          setUser(profile);
        } catch (error) {
          // Token expired or invalid
          authService.logout();
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      setUser(response.user);

      // Log successful login
      await auditService.logLogin(true, email);

      // Set up token refresh timer
      setupTokenRefresh(response.expiresIn);
    } catch (error: any) {
      // Log failed login
      await auditService.logLogin(false, email, error?.message || 'Login failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Log logout before clearing data
      await auditService.logLogout();

      await authService.logout();
      setUser(null);
      clearTokenRefresh();
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
      setUser(null);
      clearTokenRefresh();
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    practiceId?: string;
  }) => {
    try {
      const response = await authService.register(userData);
      setUser(response.user);

      // Set up token refresh timer
      setupTokenRefresh(response.expiresIn);
    } catch (error) {
      throw error;
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) || false;
  };

  const refreshAuth = async () => {
    try {
      const response = await authService.refreshToken();
      setUser(response.user);

      // Reset token refresh timer
      setupTokenRefresh(response.expiresIn);
    } catch (error) {
      // Refresh failed, logout user
      await logout();
      throw error;
    }
  };

  // Token refresh timer
  let refreshTimer: NodeJS.Timeout | null = null;

  const setupTokenRefresh = (expiresIn: number) => {
    // Clear existing timer
    clearTokenRefresh();

    // Set up new timer to refresh token before expiry
    // Refresh 5 minutes before expiry
    const refreshTime = (expiresIn - 300) * 1000;

    if (refreshTime > 0) {
      refreshTimer = setTimeout(() => {
        refreshAuth();
      }, refreshTime);
    }
  };

  const clearTokenRefresh = () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      clearTokenRefresh();
    };
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
    hasRole,
    hasAnyRole,
    hasPermission,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Role-based access constants
export const ADMIN_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.PRACTICE_MANAGER];

export const CLINICAL_ROLES: UserRole[] = [
  UserRole.DOCTOR,
  UserRole.NURSE,
  UserRole.PHARMACIST,
];

export const STAFF_ROLES: UserRole[] = [
  ...ADMIN_ROLES,
  ...CLINICAL_ROLES,
  UserRole.BILLING_STAFF,
  UserRole.RECEPTIONIST,
];

export const ALL_ROLES: UserRole[] = [...STAFF_ROLES, UserRole.PATIENT, UserRole.CAREGIVER];

// Permission constants
export const PERMISSIONS = {
  // Patient management
  VIEW_PATIENTS: 'view_patients',
  EDIT_PATIENTS: 'edit_patients',
  DELETE_PATIENTS: 'delete_patients',

  // Appointment management
  VIEW_APPOINTMENTS: 'view_appointments',
  EDIT_APPOINTMENTS: 'edit_appointments',
  DELETE_APPOINTMENTS: 'delete_appointments',

  // Billing management
  VIEW_BILLING: 'view_billing',
  EDIT_BILLING: 'edit_billing',
  PROCESS_PAYMENTS: 'process_payments',
  SUBMIT_CLAIMS: 'submit_claims',

  // Clinical documentation
  VIEW_CLINICAL_NOTES: 'view_clinical_notes',
  EDIT_CLINICAL_NOTES: 'edit_clinical_notes',
  SIGN_CLINICAL_NOTES: 'sign_clinical_notes',

  // Reports and analytics
  VIEW_REPORTS: 'view_reports',
  EXPORT_REPORTS: 'export_reports',
  VIEW_ANALYTICS: 'view_analytics',

  // System administration
  MANAGE_USERS: 'manage_users',
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_INTEGRATIONS: 'manage_integrations',

  // Practice management
  MANAGE_PRACTICE: 'manage_practice',
  VIEW_FINANCIAL_DATA: 'view_financial_data',
  MANAGE_INVENTORY: 'manage_inventory',
};

export default AuthContext;