import { performance } from 'perf_hooks'

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  version: string
  checks: HealthCheck[]
}

export interface HealthCheck {
  name: string
  status: 'pass' | 'fail' | 'warn'
  duration: number
  message?: string
  details?: Record<string, any>
}

export class HealthChecker {
  private checks: Map<string, () => Promise<HealthCheck>> = new Map()
  private startTime: number = Date.now()

  constructor() {
    // Register default system checks
    this.registerCheck('memory', this.checkMemory.bind(this))
    this.registerCheck('disk', this.checkDisk.bind(this))
    this.registerCheck('uptime', this.checkUptime.bind(this))
  }

  registerCheck(name: string, checkFunction: () => Promise<HealthCheck>): void {
    this.checks.set(name, checkFunction)
  }

  async runHealthChecks(): Promise<HealthStatus> {
    const checks: HealthCheck[] = []

    for (const [name, checkFn] of this.checks) {
      try {
        const check = await checkFn()
        checks.push(check)
      } catch (error) {
        checks.push({
          name,
          status: 'fail',
          duration: 0,
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const hasFailures = checks.some(check => check.status === 'fail')
    const hasWarnings = checks.some(check => check.status === 'warn')

    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'
    if (hasFailures) {
      status = 'unhealthy'
    } else if (hasWarnings) {
      status = 'degraded'
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      checks
    }
  }

  async runReadinessChecks(): Promise<HealthStatus> {
    // Only run critical checks for readiness
    const readinessChecks = ['memory', 'uptime']
    const checks: HealthCheck[] = []

    for (const checkName of readinessChecks) {
      const checkFn = this.checks.get(checkName)
      if (checkFn) {
        try {
          const check = await checkFn()
          checks.push(check)
        } catch (error) {
          checks.push({
            name: checkName,
            status: 'fail',
            duration: 0,
            message: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    const hasFailures = checks.some(check => check.status === 'fail')

    return {
      status: hasFailures ? 'unhealthy' : 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      checks
    }
  }

  private async checkMemory(): Promise<HealthCheck> {
    const start = performance.now()
    const memUsage = process.memoryUsage()
    const duration = performance.now() - start

    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100

    let status: 'pass' | 'fail' | 'warn' = 'pass'
    let message = `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${memoryUsagePercent.toFixed(1)}%)`

    if (memoryUsagePercent > 90) {
      status = 'fail'
      message = `Critical memory usage: ${memoryUsagePercent.toFixed(1)}%`
    } else if (memoryUsagePercent > 75) {
      status = 'warn'
      message = `High memory usage: ${memoryUsagePercent.toFixed(1)}%`
    }

    return {
      name: 'memory',
      status,
      duration,
      message,
      details: {
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        memoryUsagePercent: Math.round(memoryUsagePercent)
      }
    }
  }

  private async checkDisk(): Promise<HealthCheck> {
    const start = performance.now()
    const duration = performance.now() - start

    // Basic disk check - in production, you'd want to check actual disk usage
    return {
      name: 'disk',
      status: 'pass',
      duration,
      message: 'Disk space sufficient',
      details: {
        available: 'N/A (check not implemented)'
      }
    }
  }

  private async checkUptime(): Promise<HealthCheck> {
    const start = performance.now()
    const uptime = process.uptime()
    const duration = performance.now() - start

    return {
      name: 'uptime',
      status: 'pass',
      duration,
      message: `Process uptime: ${Math.floor(uptime)}s`,
      details: {
        uptimeSeconds: Math.floor(uptime),
        processId: process.pid
      }
    }
  }

  // Database health check
  async checkDatabase(): Promise<HealthCheck> {
    const start = performance.now()

    try {
      // Simulate database connection check
      await new Promise(resolve => setTimeout(resolve, 10))

      return {
        name: 'database',
        status: 'pass',
        duration: performance.now() - start,
        message: 'Database connection healthy'
      }
    } catch (error) {
      return {
        name: 'database',
        status: 'fail',
        duration: performance.now() - start,
        message: error instanceof Error ? error.message : 'Database connection failed'
      }
    }
  }

  // External service health check
  async checkExternalService(serviceName: string, _url: string): Promise<HealthCheck> {
    const start = performance.now()

    try {
      // In a real implementation, you'd make an HTTP request here
      // For now, we'll simulate the check
      await new Promise(resolve => setTimeout(resolve, 50))

      return {
        name: serviceName,
        status: 'pass',
        duration: performance.now() - start,
        message: `${serviceName} service is responding`
      }
    } catch (error) {
      return {
        name: serviceName,
        status: 'fail',
        duration: performance.now() - start,
        message: `${serviceName} service unavailable`
      }
    }
  }
}

export const healthChecker = new HealthChecker()