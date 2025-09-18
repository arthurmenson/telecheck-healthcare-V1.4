import { register, Counter, Histogram, Gauge } from 'prom-client'

export class MetricsCollector {
  private static instance: MetricsCollector

  public readonly httpRequestsTotal: Counter<string>
  public readonly httpRequestDuration: Histogram<string>
  public readonly activeUsers: Gauge<string>
  public readonly systemMemoryUsage: Gauge<string>
  public readonly databaseConnections: Gauge<string>

  private constructor() {
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    })

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    })

    this.activeUsers = new Gauge({
      name: 'active_users_total',
      help: 'Number of currently active users'
    })

    this.systemMemoryUsage = new Gauge({
      name: 'system_memory_usage_bytes',
      help: 'System memory usage in bytes'
    })

    this.databaseConnections = new Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections'
    })

    register.registerMetric(this.httpRequestsTotal)
    register.registerMetric(this.httpRequestDuration)
    register.registerMetric(this.activeUsers)
    register.registerMetric(this.systemMemoryUsage)
    register.registerMetric(this.databaseConnections)
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector()
    }
    return MetricsCollector.instance
  }

  public recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() })
    this.httpRequestDuration.observe({ method, route }, duration)
  }

  public updateActiveUsers(count: number): void {
    this.activeUsers.set(count)
  }

  public updateMemoryUsage(): void {
    const usage = process.memoryUsage()
    this.systemMemoryUsage.set(usage.heapUsed)
  }

  public updateDatabaseConnections(count: number): void {
    this.databaseConnections.set(count)
  }

  public getMetrics(): Promise<string> {
    return register.metrics()
  }

  public clearMetrics(): void {
    register.clear()
  }
}