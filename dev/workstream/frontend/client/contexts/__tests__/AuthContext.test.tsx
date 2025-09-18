import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { AuthProvider, useAuth, User, UserRole } from '../AuthContext';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Test component to access auth context
function TestComponent({ children }: { children?: ReactNode }) {
  const auth = useAuth();

  return (
    <div>
      <div data-testid="authenticated">{auth.isAuthenticated.toString()}</div>
      <div data-testid="loading">{auth.isLoading.toString()}</div>
      <div data-testid="user-email">{auth.user?.email || 'null'}</div>
      <div data-testid="user-role">{auth.user?.role || 'null'}</div>
      <div data-testid="user-name">{auth.user?.name || 'null'}</div>
      <button
        data-testid="login-patient"
        onClick={() => auth.login('patient@telecheck.com', 'password', 'patient')}
      >
        Login Patient
      </button>
      <button
        data-testid="login-doctor"
        onClick={() => auth.login('doctor@telecheck.com', 'password', 'doctor')}
      >
        Login Doctor
      </button>
      <button
        data-testid="login-invalid"
        onClick={() => auth.login('invalid@example.com', 'password', 'patient')}
      >
        Login Invalid
      </button>
      <button data-testid="logout" onClick={() => auth.logout()}>
        Logout
      </button>
      <div data-testid="has-view-records">
        {auth.hasPermission('view_own_records').toString()}
      </div>
      <div data-testid="has-full-access">
        {auth.hasPermission('full_access').toString()}
      </div>
      <div data-testid="is-doctor">{auth.hasRole('doctor').toString()}</div>
      <button
        data-testid="switch-role"
        onClick={() => auth.switchRole('nurse')}
      >
        Switch Role
      </button>
      {children}
    </div>
  );
}

describe('AuthContext - TDD Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);

    // Silence console logs in tests
    console.log = vi.fn();
    console.error = vi.fn();

    // Mock setTimeout for login delay
    vi.useFakeTimers();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    vi.useRealTimers();
  });

  describe('Initial State and Setup', () => {
    it('should throw error when useAuth is used outside AuthProvider', () => {
      // Arrange & Act & Assert
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');
    });

    it('should initialize with unauthenticated state', async () => {
      // Arrange & Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Fast-forward past initialization
      act(() => {
        vi.runAllTimers();
      });

      // Assert
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('user-email')).toHaveTextContent('null');
    });

    it('should restore user from localStorage on initialization', async () => {
      // Arrange
      const storedUser = {
        id: '1',
        email: 'patient@telecheck.com',
        name: 'John Patient',
        role: 'patient',
        permissions: ['view_own_records'],
        isActive: true
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedUser));

      // Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Fast-forward past initialization
      act(() => {
        vi.runAllTimers();
      });

      // Assert
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user-email')).toHaveTextContent('patient@telecheck.com');
      expect(screen.getByTestId('user-name')).toHaveTextContent('John Patient');
    });

    it('should handle corrupted localStorage data gracefully', async () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      // Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Fast-forward past initialization
      act(() => {
        vi.runAllTimers();
      });

      // Assert
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('telecheck_user');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should generate auth token if user exists but no token', async () => {
      // Arrange
      const storedUser = {
        id: '1',
        email: 'patient@telecheck.com',
        name: 'John Patient',
        role: 'patient',
        permissions: ['view_own_records'],
        isActive: true
      };
      mockLocalStorage.getItem
        .mockReturnValueOnce(JSON.stringify(storedUser)) // For user
        .mockReturnValueOnce(null); // For token

      // Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Fast-forward past initialization
      act(() => {
        vi.runAllTimers();
      });

      // Assert
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'auth_token',
        expect.any(String)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Generated startup token'),
        expect.any(Object)
      );
    });

    it('should use existing token if available', async () => {
      // Arrange
      const storedUser = {
        id: '1',
        email: 'patient@telecheck.com',
        name: 'John Patient',
        role: 'patient',
        permissions: ['view_own_records'],
        isActive: true
      };
      const existingToken = 'existing-token-123';
      mockLocalStorage.getItem
        .mockReturnValueOnce(JSON.stringify(storedUser)) // For user
        .mockReturnValueOnce(existingToken); // For token

      // Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Fast-forward past initialization
      act(() => {
        vi.runAllTimers();
      });

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Using existing token'),
        expect.any(Object)
      );
    });
  });

  describe('Login Functionality', () => {
    it('should successfully login with valid patient credentials', async () => {
      // Arrange
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Fast-forward past initialization
      act(() => {
        vi.runAllTimers();
      });

      // Act
      act(() => {
        screen.getByTestId('login-patient').click();
      });

      // Fast-forward past login delay
      act(() => {
        vi.runAllTimers();
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('user-email')).toHaveTextContent('patient@telecheck.com');
        expect(screen.getByTestId('user-role')).toHaveTextContent('patient');
        expect(screen.getByTestId('user-name')).toHaveTextContent('John Patient');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'telecheck_user',
        expect.stringContaining('patient@telecheck.com')
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'auth_token',
        expect.any(String)
      );
    });

    it('should successfully login with valid doctor credentials', async () => {
      // Arrange
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Fast-forward past initialization
      act(() => {
        vi.runAllTimers();
      });

      // Act
      act(() => {
        screen.getByTestId('login-doctor').click();
      });

      // Fast-forward past login delay
      act(() => {
        vi.runAllTimers();
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('user-email')).toHaveTextContent('doctor@telecheck.com');
        expect(screen.getByTestId('user-role')).toHaveTextContent('doctor');
        expect(screen.getByTestId('user-name')).toHaveTextContent('Dr. Sarah Wilson');
      });
    });

    it('should reject login with invalid credentials', async () => {
      // Arrange
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Fast-forward past initialization
      act(() => {
        vi.runAllTimers();
      });

      // Act
      act(() => {
        screen.getByTestId('login-invalid').click();
      });

      // Fast-forward past login delay
      act(() => {
        vi.runAllTimers();
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('user-email')).toHaveTextContent('null');
      });

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should set loading state during login process', async () => {
      // Arrange
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Fast-forward past initialization
      act(() => {
        vi.runAllTimers();
      });

      // Act - start login
      act(() => {
        screen.getByTestId('login-patient').click();
      });

      // Assert - loading should be true during login
      expect(screen.getByTestId('loading')).toHaveTextContent('true');

      // Fast-forward past login delay
      act(() => {
        vi.runAllTimers();
      });

      // Assert - loading should be false after login
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });

    it('should generate valid JWT token with correct payload', async () => {
      // Arrange
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Fast-forward past initialization
      act(() => {
        vi.runAllTimers();
      });

      // Act
      act(() => {
        screen.getByTestId('login-patient').click();
      });

      act(() => {
        vi.runAllTimers();
      });

      // Assert token generation was logged
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Generated token for user patient@telecheck.com'),
          expect.objectContaining({
            tokenPayload: expect.objectContaining({
              userId: '1',
              email: 'patient@telecheck.com',
              role: 'patient',
              permissions: expect.arrayContaining(['view_own_records']),
              exp: expect.any(Number)
            })
          })
        );
      });
    });
  });

  describe('Logout Functionality', () => {
    it('should successfully logout authenticated user', async () => {
      // Arrange - login first
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        screen.getByTestId('login-patient').click();
      });

      act(() => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      // Act - logout
      act(() => {
        screen.getByTestId('logout').click();
      });

      // Assert
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user-email')).toHaveTextContent('null');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('telecheck_user');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('Permission Management', () => {
    it('should correctly check user permissions', async () => {
      // Arrange - login as patient
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        screen.getByTestId('login-patient').click();
      });

      act(() => {
        vi.runAllTimers();
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('has-view-records')).toHaveTextContent('true');
        expect(screen.getByTestId('has-full-access')).toHaveTextContent('false');
      });
    });

    it('should grant full access to admin users', async () => {
      // Arrange - create custom test for admin login
      function AdminTestComponent() {
        const auth = useAuth();

        return (
          <div>
            <div data-testid="has-user-management">
              {auth.hasPermission('user_management').toString()}
            </div>
            <div data-testid="has-any-permission">
              {auth.hasPermission('any_random_permission').toString()}
            </div>
            <button
              data-testid="login-admin"
              onClick={() => auth.login('admin@telecheck.com', 'password', 'admin')}
            >
              Login Admin
            </button>
          </div>
        );
      }

      render(
        <AuthProvider>
          <AdminTestComponent />
        </AuthProvider>
      );

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        screen.getByTestId('login-admin').click();
      });

      act(() => {
        vi.runAllTimers();
      });

      // Assert - admin should have all permissions due to full_access
      await waitFor(() => {
        expect(screen.getByTestId('has-user-management')).toHaveTextContent('true');
        expect(screen.getByTestId('has-any-permission')).toHaveTextContent('true');
      });
    });

    it('should return false for permissions when not authenticated', async () => {
      // Arrange
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      act(() => {
        vi.runAllTimers();
      });

      // Assert
      expect(screen.getByTestId('has-view-records')).toHaveTextContent('false');
      expect(screen.getByTestId('has-full-access')).toHaveTextContent('false');
    });
  });

  describe('Role Management', () => {
    it('should correctly identify user role', async () => {
      // Arrange - login as doctor
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        screen.getByTestId('login-doctor').click();
      });

      act(() => {
        vi.runAllTimers();
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('is-doctor')).toHaveTextContent('true');
      });
    });

    it('should return false for incorrect role', async () => {
      // Arrange - login as patient
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        screen.getByTestId('login-patient').click();
      });

      act(() => {
        vi.runAllTimers();
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('is-doctor')).toHaveTextContent('false');
      });
    });

    it('should return false for role check when not authenticated', async () => {
      // Arrange
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      act(() => {
        vi.runAllTimers();
      });

      // Assert
      expect(screen.getByTestId('is-doctor')).toHaveTextContent('false');
    });
  });

  describe('Role Switching (Admin Only)', () => {
    it('should allow admin to switch roles', async () => {
      // Arrange - create custom admin test component
      function AdminSwitchTestComponent() {
        const auth = useAuth();

        return (
          <div>
            <div data-testid="current-role">{auth.user?.role || 'null'}</div>
            <div data-testid="current-name">{auth.user?.name || 'null'}</div>
            <button
              data-testid="login-admin"
              onClick={() => auth.login('admin@telecheck.com', 'password', 'admin')}
            >
              Login Admin
            </button>
            <button
              data-testid="switch-to-nurse"
              onClick={() => auth.switchRole('nurse')}
            >
              Switch to Nurse
            </button>
          </div>
        );
      }

      render(
        <AuthProvider>
          <AdminSwitchTestComponent />
        </AuthProvider>
      );

      act(() => {
        vi.runAllTimers();
      });

      // Login as admin first
      act(() => {
        screen.getByTestId('login-admin').click();
      });

      act(() => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-role')).toHaveTextContent('admin');
      });

      // Switch to nurse
      act(() => {
        screen.getByTestId('switch-to-nurse').click();
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('current-role')).toHaveTextContent('nurse');
        expect(screen.getByTestId('current-name')).toHaveTextContent('Nurse Jennifer Smith');
      });
    });

    it('should prevent non-admin users from switching roles', async () => {
      // Arrange - login as patient
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        screen.getByTestId('login-patient').click();
      });

      act(() => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-role')).toHaveTextContent('patient');
      });

      // Try to switch role (should fail)
      act(() => {
        screen.getByTestId('switch-role').click();
      });

      // Assert - role should remain unchanged
      expect(screen.getByTestId('user-role')).toHaveTextContent('patient');
    });

    it('should handle invalid role switch requests', async () => {
      // Arrange - create custom admin test for invalid role
      function InvalidRoleTestComponent() {
        const auth = useAuth();

        return (
          <div>
            <div data-testid="current-role">{auth.user?.role || 'null'}</div>
            <button
              data-testid="login-admin"
              onClick={() => auth.login('admin@telecheck.com', 'password', 'admin')}
            >
              Login Admin
            </button>
            <button
              data-testid="switch-invalid"
              onClick={() => auth.switchRole('nonexistent' as UserRole)}
            >
              Switch to Invalid Role
            </button>
          </div>
        );
      }

      render(
        <AuthProvider>
          <InvalidRoleTestComponent />
        </AuthProvider>
      );

      act(() => {
        vi.runAllTimers();
      });

      // Login as admin
      act(() => {
        screen.getByTestId('login-admin').click();
      });

      act(() => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-role')).toHaveTextContent('admin');
      });

      // Try to switch to invalid role
      act(() => {
        screen.getByTestId('switch-invalid').click();
      });

      // Assert - role should remain admin
      expect(screen.getByTestId('current-role')).toHaveTextContent('admin');
    });

    it('should prevent role switching when not authenticated', async () => {
      // Arrange
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      act(() => {
        vi.runAllTimers();
      });

      // Try to switch role without being logged in
      act(() => {
        screen.getByTestId('switch-role').click();
      });

      // Assert - should remain unauthenticated
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('user-role')).toHaveTextContent('null');
    });
  });

  describe('Healthcare Role Permissions Validation', () => {
    it('should validate doctor permissions include medical functions', async () => {
      // Arrange
      function DoctorPermissionsTest() {
        const auth = useAuth();

        return (
          <div>
            <div data-testid="can-prescribe">
              {auth.hasPermission('prescribe_medications').toString()}
            </div>
            <div data-testid="can-review-labs">
              {auth.hasPermission('review_labs').toString()}
            </div>
            <div data-testid="can-telehealth">
              {auth.hasPermission('telehealth_consults').toString()}
            </div>
            <button
              data-testid="login-doctor"
              onClick={() => auth.login('doctor@telecheck.com', 'password', 'doctor')}
            >
              Login Doctor
            </button>
          </div>
        );
      }

      render(
        <AuthProvider>
          <DoctorPermissionsTest />
        </AuthProvider>
      );

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        screen.getByTestId('login-doctor').click();
      });

      act(() => {
        vi.runAllTimers();
      });

      // Assert doctor has medical permissions
      await waitFor(() => {
        expect(screen.getByTestId('can-prescribe')).toHaveTextContent('true');
        expect(screen.getByTestId('can-review-labs')).toHaveTextContent('true');
        expect(screen.getByTestId('can-telehealth')).toHaveTextContent('true');
      });
    });

    it('should validate pharmacist permissions include drug-related functions', async () => {
      // Arrange
      function PharmacistPermissionsTest() {
        const auth = useAuth();

        return (
          <div>
            <div data-testid="can-dispense">
              {auth.hasPermission('dispense_medications').toString()}
            </div>
            <div data-testid="can-check-interactions">
              {auth.hasPermission('drug_interactions').toString()}
            </div>
            <div data-testid="can-counsel">
              {auth.hasPermission('patient_counseling').toString()}
            </div>
            <button
              data-testid="login-pharmacist"
              onClick={() => auth.login('pharmacist@telecheck.com', 'password', 'pharmacist')}
            >
              Login Pharmacist
            </button>
          </div>
        );
      }

      render(
        <AuthProvider>
          <PharmacistPermissionsTest />
        </AuthProvider>
      );

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        screen.getByTestId('login-pharmacist').click();
      });

      act(() => {
        vi.runAllTimers();
      });

      // Assert pharmacist has drug-related permissions
      await waitFor(() => {
        expect(screen.getByTestId('can-dispense')).toHaveTextContent('true');
        expect(screen.getByTestId('can-check-interactions')).toHaveTextContent('true');
        expect(screen.getByTestId('can-counsel')).toHaveTextContent('true');
      });
    });

    it('should validate nurse permissions include patient care functions', async () => {
      // Arrange
      function NursePermissionsTest() {
        const auth = useAuth();

        return (
          <div>
            <div data-testid="can-assess">
              {auth.hasPermission('patient_assessment').toString()}
            </div>
            <div data-testid="can-monitor-vitals">
              {auth.hasPermission('vital_monitoring').toString()}
            </div>
            <div data-testid="can-administer-meds">
              {auth.hasPermission('medication_administration').toString()}
            </div>
            <button
              data-testid="login-nurse"
              onClick={() => auth.login('nurse@telecheck.com', 'password', 'nurse')}
            >
              Login Nurse
            </button>
          </div>
        );
      }

      render(
        <AuthProvider>
          <NursePermissionsTest />
        </AuthProvider>
      );

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        screen.getByTestId('login-nurse').click();
      });

      act(() => {
        vi.runAllTimers();
      });

      // Assert nurse has patient care permissions
      await waitFor(() => {
        expect(screen.getByTestId('can-assess')).toHaveTextContent('true');
        expect(screen.getByTestId('can-monitor-vitals')).toHaveTextContent('true');
        expect(screen.getByTestId('can-administer-meds')).toHaveTextContent('true');
      });
    });
  });
});