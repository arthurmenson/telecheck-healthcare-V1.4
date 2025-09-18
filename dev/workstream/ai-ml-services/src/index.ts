import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from 'dotenv'
import { createPrometheusMetrics } from 'prometheus-api-metrics'
import { logger } from '@/core/logger'
import { errorHandler } from '@/core/middleware/errorHandler'
import { authMiddleware } from '@/core/middleware/auth'
import { auditMiddleware } from '@/core/middleware/audit'
import { aiModelRouter } from '@/services/aiModel/router'
import { medicalCodingRouter } from '@/services/medicalCoding/router'
import { documentProcessingRouter } from '@/services/documentProcessing/router'
import { biasDetectionRouter } from '@/services/biasDetection/router'
import { monitoringRouter } from '@/monitoring/router'
import { healthRouter } from '@/core/health/router'

// Load environment variables
config()

const app = express()
const PORT = process.env.PORT || 3000

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}))

// Prometheus metrics
app.use(createPrometheusMetrics(app, {
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Audit logging middleware for HIPAA compliance
app.use(auditMiddleware)

// Health check endpoint (no auth required)
app.use('/health', healthRouter)

// Authentication middleware for protected routes
app.use('/api', authMiddleware)

// API Routes
app.use('/api/ai-models', aiModelRouter)
app.use('/api/medical-coding', medicalCodingRouter)
app.use('/api/document-processing', documentProcessingRouter)
app.use('/api/bias-detection', biasDetectionRouter)
app.use('/api/monitoring', monitoringRouter)

// Error handling middleware
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    timestamp: new Date().toISOString()
  })
})

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 AI/ML Services server running on port ${PORT}`)
  logger.info(`📊 Metrics available at http://localhost:${PORT}/metrics`)
  logger.info(`💚 Health check available at http://localhost:${PORT}/health`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

export default app