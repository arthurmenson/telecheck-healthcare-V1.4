import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApiClient, ApiError } from '../api-client';

// Mock global fetch
const mockFetch = vi.fn();
Object.defineProperty(globalThis, 'fetch', {
  value: mockFetch,
  writable: true,
});

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
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

describe('ApiClient - TDD Implementation', () => {
  let apiClient: ApiClient;
  let mockResponse: any;

  beforeEach(() => {
    apiClient = new ApiClient('https://api.test.com');
    mockFetch.mockClear();
    mockLocalStorage.getItem.mockClear();

    // Mock successful response
    mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({ data: 'test' }),
      headers: new Headers(),
    };

    // Silence console warnings/errors in tests
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    vi.clearAllTimers();
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('Authentication Header Injection', () => {
    it('should include Authorization header when token is available', async () => {
      // Arrange
      const token = 'test-token-123';
      mockLocalStorage.getItem.mockReturnValue(token);
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await apiClient.get('/test-endpoint');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-endpoint',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`,
          }),
        })
      );
    });

    it('should skip Authorization header when skipAuth is true', async () => {
      // Arrange
      const token = 'test-token-123';
      mockLocalStorage.getItem.mockReturnValue(token);
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await apiClient.get('/test-endpoint', { skipAuth: true });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test-endpoint',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String),
          }),
        })
      );
    });

    it('should warn when no auth token is available for authenticated requests', async () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await apiClient.get('/test-endpoint');

      // Assert
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('No auth token available')
      );
    });
  });

  describe('Error Handling & Status Codes', () => {
    it('should handle 404 Not Found errors correctly', async () => {
      // Arrange
      const errorResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValue({
          message: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND'
        }),
        headers: new Headers(),
        url: 'https://api.test.com/test-endpoint'
      };
      mockFetch.mockResolvedValue(errorResponse);

      // Act & Assert
      await expect(apiClient.get('/test-endpoint')).rejects.toThrow('Resource not found');
      await expect(apiClient.get('/test-endpoint')).rejects.toMatchObject({
        status: 404,
        code: 'RESOURCE_NOT_FOUND'
      });
    });

    it('should handle 500 Internal Server Error with retry logic', async () => {
      // Arrange
      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({
          message: 'Server error occurred'
        }),
        headers: new Headers(),
        url: 'https://api.test.com/test-endpoint'
      };
      mockFetch.mockResolvedValue(errorResponse);

      // Act & Assert
      await expect(apiClient.get('/test-endpoint')).rejects.toThrow('Server error occurred');

      // Should retry 3 times + initial attempt = 4 total calls
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      const networkError = new Error('Network error: fetch failed');
      mockFetch.mockRejectedValue(networkError);

      // Act & Assert
      await expect(apiClient.get('/test-endpoint')).rejects.toThrow('Network error: fetch failed');
    });

    it('should handle malformed JSON responses', async () => {
      // Arrange
      const badJsonResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: new Headers(),
        url: 'https://api.test.com/test-endpoint'
      };
      mockFetch.mockResolvedValue(badJsonResponse);

      // Act & Assert
      await expect(apiClient.get('/test-endpoint')).rejects.toThrow('API Error: 400 Bad Request');
    });
  });

  describe('Retry Logic & Rate Limiting', () => {
    it('should retry on 429 Rate Limited with exponential backoff', async () => {
      // Arrange
      vi.useFakeTimers();
      const rateLimitResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: vi.fn().mockResolvedValue({
          message: 'Rate limit exceeded'
        }),
        headers: new Headers(),
        url: 'https://api.test.com/test-endpoint'
      };
      mockFetch.mockResolvedValue(rateLimitResponse);

      // Act
      const promise = apiClient.get('/test-endpoint');

      // Fast-forward timers to trigger retries
      await vi.runAllTimersAsync();

      // Assert
      await expect(promise).rejects.toThrow('Rate limit exceeded');
      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 + 3 retries

      vi.useRealTimers();
    });

    it('should not retry on 401 Unauthorized', async () => {
      // Arrange
      const unauthorizedResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValue({
          message: 'Authentication required'
        }),
        headers: new Headers(),
        url: 'https://api.test.com/test-endpoint'
      };
      mockFetch.mockResolvedValue(unauthorizedResponse);

      // Act & Assert
      await expect(apiClient.get('/test-endpoint')).rejects.toThrow('Authentication required');
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
    });

    it('should not retry on 400 Bad Request', async () => {
      // Arrange
      const badRequestResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({
          message: 'Invalid request data'
        }),
        headers: new Headers(),
        url: 'https://api.test.com/test-endpoint'
      };
      mockFetch.mockResolvedValue(badRequestResponse);

      // Act & Assert
      await expect(apiClient.get('/test-endpoint')).rejects.toThrow('Invalid request data');
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Request Timeout Handling', () => {
    it('should timeout requests after specified duration', async () => {
      // Arrange
      vi.useFakeTimers();
      mockFetch.mockImplementation(() => {
        return new Promise(() => {}); // Never resolves
      });

      // Act
      const promise = apiClient.get('/test-endpoint', { timeout: 5000 });

      // Fast-forward past timeout
      vi.advanceTimersByTime(6000);

      // Assert
      await expect(promise).rejects.toThrow();

      vi.useRealTimers();
    });

    it('should use default timeout when not specified', async () => {
      // Arrange
      vi.useFakeTimers();
      mockFetch.mockImplementation(() => {
        return new Promise(() => {}); // Never resolves
      });

      // Act
      const promise = apiClient.get('/test-endpoint');

      // Fast-forward past default timeout (30 seconds)
      vi.advanceTimersByTime(31000);

      // Assert
      await expect(promise).rejects.toThrow();

      vi.useRealTimers();
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('should make GET requests correctly', async () => {
      // Act
      await apiClient.get('/users');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should make POST requests with JSON data', async () => {
      // Arrange
      const testData = { name: 'John Doe', email: 'john@example.com' };

      // Act
      await apiClient.post('/users', testData);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should make PUT requests with JSON data', async () => {
      // Arrange
      const updateData = { name: 'Jane Doe' };

      // Act
      await apiClient.put('/users/123', updateData);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users/123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      );
    });

    it('should make PATCH requests with JSON data', async () => {
      // Arrange
      const patchData = { email: 'newemail@example.com' };

      // Act
      await apiClient.patch('/users/123', patchData);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users/123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(patchData),
        })
      );
    });

    it('should make DELETE requests correctly', async () => {
      // Act
      await apiClient.delete('/users/123');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users/123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('File Upload Functionality', () => {
    it('should upload files with FormData', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await apiClient.upload('/upload', mockFile);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/upload',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );

      // Verify FormData contains the file
      const call = mockFetch.mock.calls[0];
      const formData = call[1].body as FormData;
      expect(formData.get('file')).toBe(mockFile);
    });

    it('should not set Content-Type header for file uploads', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await apiClient.upload('/upload', mockFile);

      // Assert
      const call = mockFetch.mock.calls[0];
      const headers = call[1].headers as Record<string, string>;
      expect(headers['Content-Type']).toBeUndefined();
    });
  });

  describe('URL Construction', () => {
    it('should handle endpoints with leading slash', async () => {
      // Arrange
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await apiClient.get('/api/users');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/users',
        expect.any(Object)
      );
    });

    it('should handle endpoints without leading slash', async () => {
      // Arrange
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await apiClient.get('api/users');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/users',
        expect.any(Object)
      );
    });
  });

  describe('Request Interceptors', () => {
    it('should apply custom request interceptors', async () => {
      // Arrange
      mockFetch.mockResolvedValue(mockResponse);

      // Add custom interceptor
      apiClient.addRequestInterceptor((config) => {
        config.headers = {
          ...config.headers,
          'X-Custom-Header': 'custom-value',
        };
        return config;
      });

      // Act
      await apiClient.get('/test');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });
  });

  describe('Healthcare-Specific Error Logging', () => {
    it('should log detailed error information for debugging', async () => {
      // Arrange
      const errorResponse = {
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: vi.fn().mockResolvedValue({
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: { field: 'email', reason: 'invalid format' }
        }),
        headers: new Headers({ 'x-request-id': 'req-123' }),
        url: 'https://api.test.com/patients'
      };
      mockFetch.mockResolvedValue(errorResponse);

      // Act & Assert
      await expect(apiClient.post('/patients', {})).rejects.toThrow();

      // Verify error logging includes all relevant details
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('API Error - Status: 422')
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error details:'),
        expect.stringContaining('"status":422')
      );
    });
  });

  describe('Additional Coverage - Edge Cases', () => {
    it('should handle custom request with all interceptors', async () => {
      // Arrange
      let requestInterceptorCalled = false;
      let responseInterceptorCalled = false;
      let errorInterceptorCalled = false;

      apiClient.addRequestInterceptor((config) => {
        requestInterceptorCalled = true;
        config.headers = {
          ...config.headers,
          'X-Test-Header': 'test-value',
        };
        return config;
      });

      apiClient.addResponseInterceptor((response) => {
        responseInterceptorCalled = true;
        return response;
      });

      apiClient.addErrorInterceptor((error) => {
        errorInterceptorCalled = true;
        return error;
      });

      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await apiClient.request('/test', { method: 'GET' });

      // Assert
      expect(requestInterceptorCalled).toBe(true);
      expect(responseInterceptorCalled).toBe(true);
      expect(errorInterceptorCalled).toBe(false); // No error occurred
    });

    it('should handle response error creation with non-JSON response', async () => {
      // Arrange
      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: new Headers(),
        url: 'https://api.test.com/test'
      };
      mockFetch.mockResolvedValue(errorResponse);

      // Act & Assert
      await expect(apiClient.get('/test')).rejects.toMatchObject({
        message: 'API Error: 500 Internal Server Error',
        status: 500
      });
    });

    it('should handle retry with exponential backoff correctly', async () => {
      // Arrange
      vi.useFakeTimers();
      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ message: 'Server error' }),
        headers: new Headers(),
        url: 'https://api.test.com/test'
      };
      mockFetch.mockResolvedValue(errorResponse);

      // Act
      const promise = apiClient.get('/test', { retries: 2 });

      // Fast-forward timers for retries
      await vi.runAllTimersAsync();

      // Assert
      await expect(promise).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries

      vi.useRealTimers();
    });

    it('should handle AbortController timeout correctly', async () => {
      // Arrange
      vi.useFakeTimers();
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 10000))
      );

      // Act
      const promise = apiClient.get('/test', { timeout: 1000 });

      // Fast-forward past timeout
      vi.advanceTimersByTime(1500);

      // Assert
      await expect(promise).rejects.toThrow();

      vi.useRealTimers();
    });

    it('should set response property on ApiError', async () => {
      // Arrange
      const errorResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValue({ message: 'Resource not found' }),
        headers: new Headers(),
        url: 'https://api.test.com/test'
      };
      mockFetch.mockResolvedValue(errorResponse);

      // Act & Assert
      try {
        await apiClient.get('/test');
      } catch (error: any) {
        expect(error.response).toBe(errorResponse);
      }
    });

    it('should handle default baseURL when none provided', async () => {
      // Arrange
      const defaultApiClient = new ApiClient();
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await defaultApiClient.get('/test');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.any(Object)
      );
    });

    it('should handle POST with no data', async () => {
      // Arrange
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await apiClient.post('/test');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });

    it('should preserve custom headers in upload method', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      mockFetch.mockResolvedValue(mockResponse);

      // Act
      await apiClient.upload('/upload', mockFile, {
        headers: {
          'X-Custom-Header': 'custom-value',
          'Content-Type': 'application/json', // Should be filtered out
        }
      });

      // Assert
      const call = mockFetch.mock.calls[0];
      const headers = call[1].headers as Record<string, string>;
      expect(headers['X-Custom-Header']).toBe('custom-value');
      expect(headers['Content-Type']).toBeUndefined();
    });

    it('should handle all error interceptors in sequence', async () => {
      // Arrange
      const interceptorCalls: string[] = [];

      apiClient.addErrorInterceptor(async (error) => {
        interceptorCalls.push('interceptor1');
        return error;
      });

      apiClient.addErrorInterceptor(async (error) => {
        interceptorCalls.push('interceptor2');
        return error;
      });

      const errorResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({ message: 'Bad request' }),
        headers: new Headers(),
        url: 'https://api.test.com/test'
      };
      mockFetch.mockResolvedValue(errorResponse);

      // Act & Assert
      await expect(apiClient.get('/test')).rejects.toThrow();
      expect(interceptorCalls).toEqual(['interceptor1', 'interceptor2']);
    });

    it('should handle network errors during fetch', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new TypeError('Network error'));

      // Act & Assert
      await expect(apiClient.get('/test')).rejects.toThrow('Network error');
    });

    it('should handle shouldRetry logic correctly for different status codes', async () => {
      // Test case 1: Should retry 503 Service Unavailable
      const serviceUnavailableResponse = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: vi.fn().mockResolvedValue({ message: 'Service unavailable' }),
        headers: new Headers(),
        url: 'https://api.test.com/test'
      };
      mockFetch.mockResolvedValue(serviceUnavailableResponse);

      await expect(apiClient.get('/test', { retries: 1 })).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry

      // Reset for next test
      mockFetch.mockClear();

      // Test case 2: Should not retry 403 Forbidden
      const forbiddenResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: vi.fn().mockResolvedValue({ message: 'Forbidden' }),
        headers: new Headers(),
        url: 'https://api.test.com/test'
      };
      mockFetch.mockResolvedValue(forbiddenResponse);

      await expect(apiClient.get('/test', { retries: 1 })).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
    });
  });
});