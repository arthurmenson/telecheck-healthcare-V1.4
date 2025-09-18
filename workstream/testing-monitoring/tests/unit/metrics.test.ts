import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MetricsCollector } from '../../src/utils/metrics'
import { register } from 'prom-client'

describe('MetricsCollector', () => {
  let metrics: MetricsCollector

  beforeEach(() => {
    register.clear()
    // Need to create a new instance since the singleton might have cached metrics
    const MetricsClass = MetricsCollector as any
    MetricsClass.instance = undefined
    metrics = MetricsCollector.getInstance()
  })

  afterEach(() => {
    register.clear()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MetricsCollector.getInstance()
      const instance2 = MetricsCollector.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe('HTTP Request Metrics', () => {
    it('should record HTTP request with correct labels', async () => {
      metrics.recordHttpRequest('GET', '/api/users', 200, 0.5)

      const metricsString = await metrics.getMetrics()

      expect(metricsString).toContain('http_requests_total{method="GET",route="/api/users",status_code="200"} 1')
      expect(metricsString).toContain('http_request_duration_seconds_bucket{le="1",method="GET",route="/api/users"}')
    })

    it('should increment counter for multiple requests', async () => {
      metrics.recordHttpRequest('GET', '/api/users', 200, 0.1)
      metrics.recordHttpRequest('GET', '/api/users', 200, 0.2)
      metrics.recordHttpRequest('GET', '/api/users', 404, 0.1)

      const metricsString = await metrics.getMetrics()

      expect(metricsString).toContain('http_requests_total{method="GET",route="/api/users",status_code="200"} 2')
      expect(metricsString).toContain('http_requests_total{method="GET",route="/api/users",status_code="404"} 1')
    })

    it('should record request duration in histogram buckets', async () => {
      metrics.recordHttpRequest('POST', '/api/users', 201, 2.5)

      const metricsString = await metrics.getMetrics()

      expect(metricsString).toContain('http_request_duration_seconds_bucket{le="5",method="POST",route="/api/users"} 1')
      expect(metricsString).toContain('http_request_duration_seconds_bucket{le="2",method="POST",route="/api/users"} 0')
    })
  })

  describe('User Metrics', () => {
    it('should update active users count', async () => {
      metrics.updateActiveUsers(42)

      const metricsString = await metrics.getMetrics()

      expect(metricsString).toContain('active_users_total 42')
    })

    it('should update active users count multiple times', async () => {
      metrics.updateActiveUsers(10)
      metrics.updateActiveUsers(20)

      const metricsString = await metrics.getMetrics()

      expect(metricsString).toContain('active_users_total 20')
      expect(metricsString).not.toContain('active_users_total 10')
    })
  })

  describe('System Metrics', () => {
    it('should update memory usage', async () => {
      metrics.updateMemoryUsage()

      const metricsString = await metrics.getMetrics()

      expect(metricsString).toMatch(/system_memory_usage_bytes \d+/)
    })

    it('should update database connections', async () => {
      metrics.updateDatabaseConnections(5)

      const metricsString = await metrics.getMetrics()

      expect(metricsString).toContain('database_connections_active 5')
    })
  })

  describe('Metrics Export', () => {
    it('should return metrics in Prometheus format', async () => {
      metrics.recordHttpRequest('GET', '/health', 200, 0.01)
      metrics.updateActiveUsers(1)

      const metricsString = await metrics.getMetrics()

      expect(metricsString).toContain('# HELP http_requests_total Total number of HTTP requests')
      expect(metricsString).toContain('# TYPE http_requests_total counter')
      expect(metricsString).toContain('# HELP active_users_total Number of currently active users')
      expect(metricsString).toContain('# TYPE active_users_total gauge')
    })

    it('should clear all metrics', async () => {
      metrics.recordHttpRequest('GET', '/test', 200, 0.1)
      metrics.updateActiveUsers(5)

      let metricsString = await metrics.getMetrics()
      expect(metricsString.length).toBeGreaterThan(0)

      metrics.clearMetrics()

      metricsString = await metrics.getMetrics()
      expect(metricsString.trim()).toBe('')
    })
  })
})