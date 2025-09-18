import { CircuitBreaker } from '../domain/circuit-breaker';
import axios, { AxiosResponse } from 'axios';

export interface ExternalApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  circuitBreakerConfig: {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringPeriod: number;
  };
}

export class ExternalApiService {
  private circuitBreaker: CircuitBreaker;
  private config: ExternalApiConfig;

  constructor(config: ExternalApiConfig) {
    this.config = config;
    this.circuitBreaker = new CircuitBreaker(config.circuitBreakerConfig);
  }

  async get<T>(endpoint: string): Promise<T> {
    const apiCall = () => this.makeHttpRequest<T>('GET', endpoint);
    return await this.circuitBreaker.execute(apiCall);
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const apiCall = () => this.makeHttpRequest<T>('POST', endpoint, data);
    return await this.circuitBreaker.execute(apiCall);
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const apiCall = () => this.makeHttpRequest<T>('PUT', endpoint, data);
    return await this.circuitBreaker.execute(apiCall);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const apiCall = () => this.makeHttpRequest<T>('DELETE', endpoint);
    return await this.circuitBreaker.execute(apiCall);
  }

  getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }

  private async makeHttpRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    let response: AxiosResponse<T>;

    try {
      switch (method) {
        case 'GET':
          response = await axios.get(url, { timeout: this.config.timeout });
          break;
        case 'POST':
          response = await axios.post(url, data, { timeout: this.config.timeout });
          break;
        case 'PUT':
          response = await axios.put(url, data, { timeout: this.config.timeout });
          break;
        case 'DELETE':
          response = await axios.delete(url, { timeout: this.config.timeout });
          break;
      }

      return response.data;
    } catch (error) {
      throw this.transformError(error);
    }
  }

  private transformError(error: any): Error {
    if (error.code === 'ECONNABORTED') {
      return new Error('Request timeout');
    }

    if (error.response) {
      return new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
    }

    if (error.request) {
      return new Error('Network error: Unable to reach server');
    }

    return new Error(`Request failed: ${error.message}`);
  }
}