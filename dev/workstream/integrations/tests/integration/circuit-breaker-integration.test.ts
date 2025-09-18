import { CircuitBreaker } from '../../src/domain/circuit-breaker';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CircuitBreaker Integration', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 2,
      recoveryTimeout: 5000,
      monitoringPeriod: 10000
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('External API calls', () => {
    it('should protect against failing external API calls', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Service unavailable'));

      const apiCall = () => axios.get('https://external-api.example.com/data');

      // First failure
      await expect(circuitBreaker.execute(apiCall)).rejects.toThrow('Service unavailable');

      // Second failure - should trigger circuit breaker to OPEN
      await expect(circuitBreaker.execute(apiCall)).rejects.toThrow('Service unavailable');

      // Third call should be rejected by circuit breaker
      await expect(circuitBreaker.execute(apiCall)).rejects.toThrow('Circuit breaker is OPEN');

      // Verify axios wasn't called for the third attempt
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should allow calls through when service recovers', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce({ data: 'success' });

      const apiCall = () => axios.get('https://external-api.example.com/data');

      // Trigger circuit breaker to OPEN
      await expect(circuitBreaker.execute(apiCall)).rejects.toThrow('Service unavailable');
      await expect(circuitBreaker.execute(apiCall)).rejects.toThrow('Service unavailable');

      // Wait for recovery timeout
      jest.advanceTimersByTime(5000);

      // Service should now be available again
      const result = await circuitBreaker.execute(apiCall);
      expect(result.data).toBe('success');
    });
  });
});