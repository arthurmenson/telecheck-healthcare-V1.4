import axios from 'axios';

// Auth API configuration
const AUTH_API_BASE_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3002';

// Create axios instance for auth requests
const authClient = axios.create({
  baseURL: AUTH_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
authClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
authClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// User roles
export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  PHARMACIST = 'pharmacist',
  ADMIN = 'admin',
  CAREGIVER = 'caregiver',
  PRACTICE_MANAGER = 'practice_manager',
  BILLING_STAFF = 'billing_staff',
  RECEPTIONIST = 'receptionist'
}

// User interface
export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  practiceId?: string;
  permissions?: string[];
  lastLogin?: Date;
  mfaEnabled?: boolean;
}

// Auth response interfaces
export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface AuthError {
  error: string;
  code: string;
  details?: any;
}

// Auth service class
class AuthService {
  // Login with email and password
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await authClient.post<LoginResponse>('/api/auth/login', {
        email,
        password,
      });

      // Store auth data
      this.setAuthData(response.data);

      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Register new user
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    practiceId?: string;
  }): Promise<LoginResponse> {
    try {
      const response = await authClient.post<LoginResponse>('/api/auth/register', userData);

      // Store auth data
      this.setAuthData(response.data);

      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await authClient.post('/api/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthData();
      window.location.href = '/login';
    }
  }

  // Refresh token
  async refreshToken(): Promise<LoginResponse> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await authClient.post<LoginResponse>('/api/auth/refresh', {
        refreshToken,
      });

      // Update auth data
      this.setAuthData(response.data);

      return response.data;
    } catch (error: any) {
      this.clearAuthData();
      throw this.handleError(error);
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  // Check if user has specific role
  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  // Check if user has any of the specified roles
  hasAnyRole(roles: UserRole[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  // Check if user has permission
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return user?.permissions?.includes(permission) || false;
  }

  // Get auth token
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Verify MFA code
  async verifyMFA(code: string): Promise<LoginResponse> {
    try {
      const response = await authClient.post<LoginResponse>('/api/auth/mfa/verify', {
        code,
      });

      // Update auth data
      this.setAuthData(response.data);

      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Enable MFA
  async enableMFA(): Promise<{ qrCode: string; secret: string }> {
    try {
      const response = await authClient.post<{ qrCode: string; secret: string }>(
        '/api/auth/mfa/enable'
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Disable MFA
  async disableMFA(code: string): Promise<void> {
    try {
      await authClient.post('/api/auth/mfa/disable', { code });
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Password reset request
  async requestPasswordReset(email: string): Promise<void> {
    try {
      await authClient.post('/api/auth/password/reset-request', { email });
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await authClient.post('/api/auth/password/reset', {
        token,
        newPassword,
      });
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await authClient.post('/api/auth/password/change', {
        currentPassword,
        newPassword,
      });
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Get user profile
  async getProfile(): Promise<User> {
    try {
      const response = await authClient.get<User>('/api/auth/profile');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Update user profile
  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const response = await authClient.put<User>('/api/auth/profile', updates);

      // Update stored user data
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        const updatedUser = { ...currentUser, ...response.data };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Private methods
  private setAuthData(data: LoginResponse): void {
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
  }

  private clearAuthData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  private handleError(error: any): AuthError {
    if (error.response?.data) {
      return error.response.data as AuthError;
    }
    return {
      error: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export default
export default authService;