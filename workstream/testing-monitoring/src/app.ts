import express, { Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { register } from 'prom-client'
import { MetricsCollector } from './utils/metrics'
import { UserService } from './services/UserService'
import { loggingMiddleware, errorLoggingMiddleware } from './middleware/logging'
import { logger } from './utils/logger'
import { healthChecker } from './utils/healthCheck'

const app: Application = express()
const port = process.env.PORT || 3000
const metrics = MetricsCollector.getInstance()
const userService = new UserService()

app.use(helmet())
app.use(cors())
app.use(compression())
app.use(express.json())
app.use(loggingMiddleware as any)

app.use((req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000
    metrics.recordHttpRequest(req.method, req.route?.path || req.path, res.statusCode, duration)
  })

  next()
})

app.get('/health', async (req, res) => {
  try {
    const health = await healthChecker.runHealthChecks()
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503
    res.status(statusCode).json(health)
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed'
    })
  }
})

app.get('/ready', async (req, res) => {
  try {
    const readiness = await healthChecker.runReadinessChecks()
    const statusCode = readiness.status === 'healthy' ? 200 : 503
    res.status(statusCode).json(readiness)
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Readiness check failed'
    })
  }
})

app.get('/live', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() })
})

app.get('/metrics', async (req, res) => {
  try {
    metrics.updateMemoryUsage()
    const activeUserCount = await userService.getActiveUserCount()
    metrics.updateActiveUsers(activeUserCount)

    res.set('Content-Type', register.contentType)
    const metricsString = await metrics.getMetrics()
    res.end(metricsString)
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate metrics' })
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await userService.getAllUsers()
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

app.post('/api/users', async (req, res) => {
  try {
    const { email, name } = req.body
    const user = await userService.createUser({ email, name })
    res.status(201).json(user)
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    return res.json(user)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch user' })
  }
})

app.put('/api/users/:id', async (req, res) => {
  try {
    const { name, isActive } = req.body
    const user = await userService.updateUser(req.params.id, { name, isActive })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    return res.json(user)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update user' })
  }
})

app.delete('/api/users/:id', async (req, res) => {
  try {
    const deleted = await userService.deleteUser(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' })
    }
    return res.status(204).send()
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete user' })
  }
})

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handling middleware should be last
app.use(errorLoggingMiddleware as any)

if (require.main === module) {
  app.listen(port, () => {
    logger.info(`Server starting`, {
      port,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    })
  })
}

export default app