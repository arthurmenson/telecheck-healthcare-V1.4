import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  usePatientStats,
  useSearchPatients,
  usePatients,
  usePatient,
  usePatientAppointments,
  usePatientVitals,
  useCreatePatient,
  useUpdatePatient,
  useArchivePatient,
  useDebouncedPatientSearch,
  useOptimisticPatientUpdate,
  usePrefetchPatient,
  useBulkPatientOperations,
  patientKeys
} from '../usePatients';

// Mock the patient service
vi.mock('../../../services/patient.service', () => ({
  PatientService: {
    getPatientStats: vi.fn(),
    searchPatients: vi.fn(),
    getPatients: vi.fn(),
    getPatientById: vi.fn(),
    getPatientAppointments: vi.fn(),
    getPatientVitals: vi.fn(),
    createPatient: vi.fn(),
    updatePatient: vi.fn(),
    archivePatient: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('../../use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { PatientService } from '../../../services/patient.service';
const mockedPatientService = vi.mocked(PatientService);

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('usePatients Hook - TDD Implementation', () => {
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = createWrapper();

    // Mock timers for debouncing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('usePatientStats Hook', () => {
    it('should fetch patient statistics successfully', async () => {
      // Arrange
      const mockStats = {
        total_patients: 1250,
        active_patients: 1100,
        inactive_patients: 150,
        new_this_month: 45,
        pediatric_patients: 320,
        senior_patients: 480
      };

      mockedPatientService.getPatientStats.mockResolvedValue(mockStats);

      // Act
      const { result } = renderHook(() => usePatientStats(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.data).toEqual(mockStats);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
      });

      expect(mockedPatientService.getPatientStats).toHaveBeenCalledTimes(1);
    });

    it('should provide placeholder data while loading', async () => {
      // Arrange
      mockedPatientService.getPatientStats.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      // Act
      const { result } = renderHook(() => usePatientStats(), { wrapper });

      // Assert
      expect(result.current.data).toEqual({
        total_patients: 0,
        active_patients: 0,
        inactive_patients: 0,
        new_this_month: 0,
        pediatric_patients: 0,
        senior_patients: 0
      });
      expect(result.current.isLoading).toBe(true);
    });

    it('should handle errors gracefully without retry', async () => {
      // Arrange
      const error = new Error('Stats API Error');
      mockedPatientService.getPatientStats.mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => usePatientStats(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.isLoading).toBe(false);
      });

      // Should not retry due to configuration
      expect(mockedPatientService.getPatientStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('useSearchPatients Hook', () => {
    it('should search patients with filters successfully', async () => {
      // Arrange
      const mockResults = {
        patients: [
          { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      };

      const filters = { status: 'active', firstName: 'John' };
      mockedPatientService.searchPatients.mockResolvedValue(mockResults);

      // Act
      const { result } = renderHook(() => useSearchPatients(filters, 1, 20), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.data).toEqual(mockResults);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedPatientService.searchPatients).toHaveBeenCalledWith(filters, 1, 20);
    });

    it('should provide placeholder data for search results', async () => {
      // Arrange
      mockedPatientService.searchPatients.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      // Act
      const { result } = renderHook(() => useSearchPatients({}, 2, 10), { wrapper });

      // Assert
      expect(result.current.data).toEqual({
        patients: [],
        total: 0,
        page: 2,
        limit: 10,
        totalPages: 0
      });
      expect(result.current.isLoading).toBe(true);
    });

    it('should handle search errors without retry', async () => {
      // Arrange
      const error = new Error('Search API Error');
      mockedPatientService.searchPatients.mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useSearchPatients({}, 1, 20), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedPatientService.searchPatients).toHaveBeenCalledTimes(1);
    });
  });

  describe('usePatients Hook (Paginated)', () => {
    it('should fetch paginated patients successfully', async () => {
      // Arrange
      const mockPatients = {
        patients: [
          { id: '1', firstName: 'Alice', lastName: 'Johnson', status: 'active' },
          { id: '2', firstName: 'Bob', lastName: 'Williams', status: 'active' }
        ],
        total: 100,
        page: 2,
        limit: 20,
        totalPages: 5
      };

      mockedPatientService.getPatients.mockResolvedValue(mockPatients);

      // Act
      const { result } = renderHook(() => usePatients(2, 20, 'active'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.data).toEqual(mockPatients);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedPatientService.getPatients).toHaveBeenCalledWith(2, 20, 'active');
    });

    it('should handle different status filters', async () => {
      // Arrange
      const mockArchivedPatients = {
        patients: [
          { id: '3', firstName: 'Charlie', lastName: 'Brown', status: 'archived' }
        ],
        total: 25,
        page: 1,
        limit: 20,
        totalPages: 2
      };

      mockedPatientService.getPatients.mockResolvedValue(mockArchivedPatients);

      // Act
      const { result } = renderHook(() => usePatients(1, 20, 'archived'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.data).toEqual(mockArchivedPatients);
      });

      expect(mockedPatientService.getPatients).toHaveBeenCalledWith(1, 20, 'archived');
    });
  });

  describe('usePatient Hook (Single Patient)', () => {
    it('should fetch single patient by ID successfully', async () => {
      // Arrange
      const mockPatient = {
        id: 'patient-123',
        firstName: 'Test',
        lastName: 'Patient',
        email: 'test@example.com',
        phone: '555-0123'
      };

      mockedPatientService.getPatientById.mockResolvedValue(mockPatient);

      // Act
      const { result } = renderHook(() => usePatient('patient-123'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.data).toEqual(mockPatient);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedPatientService.getPatientById).toHaveBeenCalledWith('patient-123');
    });

    it('should be disabled when no patientId is provided', async () => {
      // Arrange & Act
      const { result } = renderHook(() => usePatient(''), { wrapper });

      // Assert
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(mockedPatientService.getPatientById).not.toHaveBeenCalled();
    });

    it('should be disabled when enabled is false', async () => {
      // Arrange & Act
      const { result } = renderHook(() => usePatient('patient-123', false), { wrapper });

      // Assert
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(mockedPatientService.getPatientById).not.toHaveBeenCalled();
    });

    it('should retry once on failure with delay', async () => {
      // Arrange
      const error = new Error('Patient API Error');
      mockedPatientService.getPatientById
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error);

      // Act
      const { result } = renderHook(() => usePatient('patient-123'), { wrapper });

      // Wait for retries
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Assert - should retry once (2 total calls)
      expect(mockedPatientService.getPatientById).toHaveBeenCalledTimes(2);
    });
  });

  describe('usePatientAppointments Hook', () => {
    it('should fetch patient appointments successfully', async () => {
      // Arrange
      const mockAppointments = [
        { id: 'apt-1', date: '2024-01-15', time: '10:00', type: 'Follow-up' },
        { id: 'apt-2', date: '2024-01-22', time: '14:30', type: 'Consultation' }
      ];

      mockedPatientService.getPatientAppointments.mockResolvedValue(mockAppointments);

      // Act
      const { result } = renderHook(() => usePatientAppointments('patient-123'), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.data).toEqual(mockAppointments);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedPatientService.getPatientAppointments).toHaveBeenCalledWith('patient-123');
    });

    it('should be disabled when patientId is empty', async () => {
      // Arrange & Act
      const { result } = renderHook(() => usePatientAppointments(''), { wrapper });

      // Assert
      expect(result.current.data).toBeUndefined();
      expect(mockedPatientService.getPatientAppointments).not.toHaveBeenCalled();
    });

    it('should be disabled when enabled is false', async () => {
      // Arrange & Act
      const { result } = renderHook(() => usePatientAppointments('patient-123', false), { wrapper });

      // Assert
      expect(result.current.data).toBeUndefined();
      expect(mockedPatientService.getPatientAppointments).not.toHaveBeenCalled();
    });
  });

  describe('usePatientVitals Hook', () => {
    it('should fetch patient vitals with pagination', async () => {
      // Arrange
      const mockVitals = [
        { id: 'vital-1', date: '2024-01-15', bloodPressure: '120/80', heartRate: 75 },
        { id: 'vital-2', date: '2024-01-14', bloodPressure: '118/78', heartRate: 72 }
      ];

      mockedPatientService.getPatientVitals.mockResolvedValue(mockVitals);

      // Act
      const { result } = renderHook(() => usePatientVitals('patient-123', 10, 0), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.data).toEqual(mockVitals);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedPatientService.getPatientVitals).toHaveBeenCalledWith('patient-123', 10, 0);
    });

    it('should handle custom limit and offset parameters', async () => {
      // Arrange
      mockedPatientService.getPatientVitals.mockResolvedValue([]);

      // Act
      const { result } = renderHook(() => usePatientVitals('patient-123', 50, 25), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockedPatientService.getPatientVitals).toHaveBeenCalledWith('patient-123', 50, 25);
    });

    it('should be disabled when patientId is empty', async () => {
      // Arrange & Act
      const { result } = renderHook(() => usePatientVitals(''), { wrapper });

      // Assert
      expect(result.current.data).toBeUndefined();
      expect(mockedPatientService.getPatientVitals).not.toHaveBeenCalled();
    });
  });

  describe('useCreatePatient Mutation', () => {
    it('should create patient successfully', async () => {
      // Arrange
      const newPatientData = {
        firstName: 'New',
        lastName: 'Patient',
        email: 'new@example.com',
        phone: '555-0199'
      };

      const createdPatient = {
        id: 'new-patient-123',
        ...newPatientData,
        createdAt: '2024-01-15T10:00:00Z'
      };

      mockedPatientService.createPatient.mockResolvedValue(createdPatient);

      // Act
      const { result } = renderHook(() => useCreatePatient(), { wrapper });

      act(() => {
        result.current.mutate(newPatientData);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(createdPatient);
      });

      expect(mockedPatientService.createPatient).toHaveBeenCalledWith(newPatientData);
    });

    it('should handle create patient errors', async () => {
      // Arrange
      const error = new Error('Create Patient Error');
      mockedPatientService.createPatient.mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useCreatePatient(), { wrapper });

      act(() => {
        result.current.mutate({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com'
        });
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('useUpdatePatient Mutation', () => {
    it('should update patient successfully', async () => {
      // Arrange
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com'
      };

      const updatedPatient = {
        id: 'patient-123',
        ...updateData,
        updatedAt: '2024-01-15T10:00:00Z'
      };

      mockedPatientService.updatePatient.mockResolvedValue(updatedPatient);

      // Act
      const { result } = renderHook(() => useUpdatePatient(), { wrapper });

      act(() => {
        result.current.mutate({
          patientId: 'patient-123',
          updateData: updateData
        });
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(updatedPatient);
      });

      expect(mockedPatientService.updatePatient).toHaveBeenCalledWith('patient-123', updateData);
    });

    it('should handle update patient errors', async () => {
      // Arrange
      const error = new Error('Update Patient Error');
      mockedPatientService.updatePatient.mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useUpdatePatient(), { wrapper });

      act(() => {
        result.current.mutate({
          patientId: 'patient-123',
          updateData: { firstName: 'Test' }
        });
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('useArchivePatient Mutation', () => {
    it('should archive patient successfully', async () => {
      // Arrange
      mockedPatientService.archivePatient.mockResolvedValue({ success: true });

      // Act
      const { result } = renderHook(() => useArchivePatient(), { wrapper });

      act(() => {
        result.current.mutate('patient-123');
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedPatientService.archivePatient).toHaveBeenCalledWith('patient-123');
    });

    it('should handle archive patient errors', async () => {
      // Arrange
      const error = new Error('Archive Patient Error');
      mockedPatientService.archivePatient.mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useArchivePatient(), { wrapper });

      act(() => {
        result.current.mutate('patient-123');
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('useDebouncedPatientSearch Hook', () => {
    it('should debounce search filters', async () => {
      // Arrange
      const mockResults = {
        patients: [{ id: '1', firstName: 'John', lastName: 'Doe' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      };

      mockedPatientService.searchPatients.mockResolvedValue(mockResults);

      // Act
      const { result } = renderHook(() => useDebouncedPatientSearch({}, 1, 20, 300), { wrapper });

      // Update filters
      act(() => {
        result.current.setFilters({ firstName: 'John' });
      });

      // Assert - should be searching during debounce
      expect(result.current.isSearching).toBe(true);

      // Fast-forward past debounce period
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Wait for query to resolve
      await waitFor(() => {
        expect(result.current.data).toEqual(mockResults);
        expect(result.current.isSearching).toBe(false);
      });

      expect(mockedPatientService.searchPatients).toHaveBeenCalledWith({ firstName: 'John' }, 1, 20);
    });

    it('should handle rapid filter changes with debouncing', async () => {
      // Arrange
      mockedPatientService.searchPatients.mockResolvedValue({
        patients: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      });

      // Act
      const { result } = renderHook(() => useDebouncedPatientSearch({}, 1, 20, 200), { wrapper });

      // Rapid filter changes
      act(() => {
        result.current.setFilters({ firstName: 'A' });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      act(() => {
        result.current.setFilters({ firstName: 'Al' });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      act(() => {
        result.current.setFilters({ firstName: 'Alice' });
      });

      // Assert - only the final filter should trigger search after debounce
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(mockedPatientService.searchPatients).toHaveBeenCalledTimes(1);
        expect(mockedPatientService.searchPatients).toHaveBeenCalledWith({ firstName: 'Alice' }, 1, 20);
      });
    });
  });

  describe('useOptimisticPatientUpdate Hook', () => {
    it('should update patient optimistically', async () => {
      // This test would need access to the query client
      // For now, we test that the hook returns the expected functions
      const { result } = renderHook(() => useOptimisticPatientUpdate(), { wrapper });

      expect(typeof result.current.updatePatientOptimistically).toBe('function');
      expect(typeof result.current.revertOptimisticUpdate).toBe('function');
    });
  });

  describe('usePrefetchPatient Hook', () => {
    it('should return prefetch function', async () => {
      // Arrange & Act
      const { result } = renderHook(() => usePrefetchPatient(), { wrapper });

      // Assert
      expect(typeof result.current).toBe('function');
    });
  });

  describe('useBulkPatientOperations Hook', () => {
    it('should handle bulk archive operations', async () => {
      // Arrange
      const patientIds = ['patient-1', 'patient-2', 'patient-3'];
      mockedPatientService.archivePatient.mockResolvedValue({ success: true });

      // Act
      const { result } = renderHook(() => useBulkPatientOperations(), { wrapper });

      await act(async () => {
        await result.current.bulkArchive(patientIds);
      });

      // Assert
      expect(mockedPatientService.archivePatient).toHaveBeenCalledTimes(3);
      expect(mockedPatientService.archivePatient).toHaveBeenCalledWith('patient-1');
      expect(mockedPatientService.archivePatient).toHaveBeenCalledWith('patient-2');
      expect(mockedPatientService.archivePatient).toHaveBeenCalledWith('patient-3');
    });

    it('should handle bulk archive errors', async () => {
      // Arrange
      const patientIds = ['patient-1', 'patient-2'];
      const error = new Error('Bulk Archive Error');
      mockedPatientService.archivePatient.mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useBulkPatientOperations(), { wrapper });

      await act(async () => {
        await result.current.bulkArchive(patientIds);
      });

      // Assert - should attempt all operations even if some fail
      expect(mockedPatientService.archivePatient).toHaveBeenCalledTimes(2);
    });
  });

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      // Test query key generation for consistency
      expect(patientKeys.all).toEqual(['patients']);
      expect(patientKeys.lists()).toEqual(['patients', 'list']);
      expect(patientKeys.list({ status: 'active' }, 1, 20)).toEqual([
        'patients',
        'list',
        { filters: { status: 'active' }, page: 1, limit: 20 }
      ]);
      expect(patientKeys.details()).toEqual(['patients', 'detail']);
      expect(patientKeys.detail('patient-123')).toEqual(['patients', 'detail', 'patient-123']);
      expect(patientKeys.stats()).toEqual(['patients', 'stats']);
      expect(patientKeys.appointments('patient-123')).toEqual([
        'patients',
        'detail',
        'patient-123',
        'appointments'
      ]);
      expect(patientKeys.vitals('patient-123', 20, 0)).toEqual([
        'patients',
        'detail',
        'patient-123',
        'vitals',
        { limit: 20, offset: 0 }
      ]);
    });
  });
});