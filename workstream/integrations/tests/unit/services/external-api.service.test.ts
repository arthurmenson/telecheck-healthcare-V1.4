import { ExternalApiService } from '../../../src/services/external-api.service';
import { CircuitBreakerState } from '../../../src/domain/circuit-breaker';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ExternalApiService', () => {
  let service: ExternalApiService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    service = new ExternalApiService({
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      retryAttempts: 3,
      circuitBreakerConfig: {
        failureThreshold: 2,
        recoveryTimeout: 3000,
        monitoringPeriod: 10000
      }
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const responseData = { id: 1, name: 'Test' };
      mockedAxios.get.mockResolvedValue({ data: responseData });

      const result = await service.get('/users/1');

      expect(result).toEqual(responseData);
      expect(mockedAxios.get).toHaveBeenCalledWith('https://api.example.com/users/1', { timeout: 5000 });
      expect(service.getCircuitBreakerState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should handle network errors and transform them', async () => {
      mockedAxios.get.mockRejectedValue({ request: {} });

      await expect(service.get('/users/1')).rejects.toThrow('Network error: Unable to reach server');
    });

    it('should handle HTTP errors and transform them', async () => {
      mockedAxios.get.mockRejectedValue({
        response: { status: 404, statusText: 'Not Found' }
      });

      await expect(service.get('/users/1')).rejects.toThrow('HTTP 404: Not Found');
    });

    it('should handle timeout errors', async () => {
      mockedAxios.get.mockRejectedValue({ code: 'ECONNABORTED' });

      await expect(service.get('/users/1')).rejects.toThrow('Request timeout');
    });
  });

  describe('Circuit breaker integration', () => {
    it('should open circuit breaker after consecutive failures', async () => {
      mockedAxios.get.mockRejectedValue({ request: {} });

      // First failure
      await expect(service.get('/users/1')).rejects.toThrow('Network error: Unable to reach server');
      expect(service.getCircuitBreakerState()).toBe(CircuitBreakerState.CLOSED);

      // Second failure - should open circuit breaker
      await expect(service.get('/users/1')).rejects.toThrow('Network error: Unable to reach server');
      expect(service.getCircuitBreakerState()).toBe(CircuitBreakerState.OPEN);

      // Third call should be rejected by circuit breaker without making HTTP call
      mockedAxios.get.mockClear();
      await expect(service.get('/users/1')).rejects.toThrow('Circuit breaker is OPEN');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should transition to half-open and recover after timeout', async () => {
      mockedAxios.get
        .mockRejectedValueOnce({ request: {} })
        .mockRejectedValueOnce({ request: {} })
        .mockResolvedValueOnce({ data: { success: true } });

      // Trigger failures to open circuit breaker
      await expect(service.get('/users/1')).rejects.toThrow();
      await expect(service.get('/users/1')).rejects.toThrow();
      expect(service.getCircuitBreakerState()).toBe(CircuitBreakerState.OPEN);

      // Wait for recovery timeout
      jest.advanceTimersByTime(3000);
      expect(service.getCircuitBreakerState()).toBe(CircuitBreakerState.HALF_OPEN);

      // Successful call should close circuit breaker
      const result = await service.get('/users/1');
      expect(result).toEqual({ success: true });
      expect(service.getCircuitBreakerState()).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request', async () => {
      const requestData = { name: 'New User' };
      const responseData = { id: 2, name: 'New User' };
      mockedAxios.post.mockResolvedValue({ data: responseData });

      const result = await service.post('/users', requestData);

      expect(result).toEqual(responseData);
      expect(mockedAxios.post).toHaveBeenCalledWith('https://api.example.com/users', requestData, { timeout: 5000 });
    });
  });

  describe('PUT requests', () => {
    it('should make successful PUT request', async () => {
      const requestData = { name: 'Updated User' };
      const responseData = { id: 1, name: 'Updated User' };
      mockedAxios.put.mockResolvedValue({ data: responseData });

      const result = await service.put('/users/1', requestData);

      expect(result).toEqual(responseData);
      expect(mockedAxios.put).toHaveBeenCalledWith('https://api.example.com/users/1', requestData, { timeout: 5000 });
    });
  });

  describe('DELETE requests', () => {
    it('should make successful DELETE request', async () => {
      mockedAxios.delete.mockResolvedValue({ data: { success: true } });

      const result = await service.delete('/users/1');

      expect(result).toEqual({ success: true });
      expect(mockedAxios.delete).toHaveBeenCalledWith('https://api.example.com/users/1', { timeout: 5000 });
    });
  });
});