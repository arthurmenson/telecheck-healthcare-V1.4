import { Request, Response } from 'express'
import { logger } from '@/core/logger'
import * as tf from '@tensorflow/tfjs-node'

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  version: string
  environment: string
  services: {
    database: 'healthy' | 'unhealthy'
    tensorflow: 'healthy' | 'unhealthy'
    memory: 'healthy' | 'unhealthy' | 'degraded'
    disk: 'healthy' | 'unhealthy' | 'degraded'
  }
  metrics: {
    memoryUsage: NodeJS.MemoryUsage
    cpuUsage: NodeJS.CpuUsage
    modelCount: number
    activeConnections: number
  }
}

export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await getHealthStatus()
    const httpStatus = status.status === 'healthy' ? 200 : 503

    res.status(httpStatus).json(status)
  } catch (error) {
    logger.error('Health check failed', { error })
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    })
  }
}

export const readinessCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const isReady = await checkReadiness()

    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      })
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    logger.error('Readiness check failed', { error })
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed'
    })
  }
}

export const livenessCheck = (req: Request, res: Response): void => {
  // Simple liveness check - if we can respond, we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
}

export const metricsEndpoint = (req: Request, res: Response): void => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    version: process.version,
    platform: process.platform,
    arch: process.arch
  }

  res.json(metrics)
}

async function getHealthStatus(): Promise<HealthStatus> {
  const startTime = Date.now()

  // Check services
  const services = {
    database: await checkDatabase(),
    tensorflow: await checkTensorFlow(),
    memory: checkMemory(),
    disk: await checkDisk()
  }

  // Determine overall status
  const serviceStatuses = Object.values(services)
  const overallStatus = serviceStatuses.includes('unhealthy')
    ? 'unhealthy'
    : serviceStatuses.includes('degraded')
    ? 'degraded'
    : 'healthy'

  const endTime = Date.now()
  logger.info(`Health check completed in ${endTime - startTime}ms`, {
    status: overallStatus,
    services
  })

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services,
    metrics: {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      modelCount: await getLoadedModelCount(),
      activeConnections: 0 // TODO: Implement connection counting
    }
  }
}

async function checkDatabase(): Promise<'healthy' | 'unhealthy'> {
  try {
    // TODO: Implement actual database health check
    // For now, assume healthy
    return 'healthy'
  } catch (error) {
    logger.error('Database health check failed', { error })
    return 'unhealthy'
  }
}

async function checkTensorFlow(): Promise<'healthy' | 'unhealthy'> {
  try {
    // Test TensorFlow functionality
    const tensor = tf.tensor([1, 2, 3, 4])
    const result = tensor.add(tf.tensor([1, 1, 1, 1]))
    tensor.dispose()
    result.dispose()
    return 'healthy'
  } catch (error) {
    logger.error('TensorFlow health check failed', { error })
    return 'unhealthy'
  }
}

function checkMemory(): 'healthy' | 'unhealthy' | 'degraded' {
  const memUsage = process.memoryUsage()
  const totalMem = memUsage.heapTotal
  const usedMem = memUsage.heapUsed
  const memoryUsagePercent = (usedMem / totalMem) * 100

  if (memoryUsagePercent > 90) return 'unhealthy'
  if (memoryUsagePercent > 80) return 'degraded'
  return 'healthy'
}

async function checkDisk(): Promise<'healthy' | 'unhealthy' | 'degraded'> {
  try {
    // TODO: Implement disk space check
    // For now, assume healthy
    return 'healthy'
  } catch (error) {
    logger.error('Disk health check failed', { error })
    return 'unhealthy'
  }
}

async function checkReadiness(): Promise<boolean> {
  try {
    // Check if all critical services are ready
    const dbReady = await checkDatabase()
    const tfReady = await checkTensorFlow()

    return dbReady === 'healthy' && tfReady === 'healthy'
  } catch (error) {
    logger.error('Readiness check failed', { error })
    return false
  }
}

async function getLoadedModelCount(): Promise<number> {
  try {
    // TODO: Implement model counting logic
    return 0
  } catch (error) {
    logger.error('Failed to get model count', { error })
    return 0
  }
}