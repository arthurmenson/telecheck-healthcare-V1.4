import { Router } from 'express'
import { healthCheck, readinessCheck, livenessCheck, metricsEndpoint } from './controller'

const router = Router()

/**
 * @route GET /health
 * @desc Basic health check
 * @access Public
 */
router.get('/', healthCheck)

/**
 * @route GET /health/ready
 * @desc Readiness probe for Kubernetes
 * @access Public
 */
router.get('/ready', readinessCheck)

/**
 * @route GET /health/live
 * @desc Liveness probe for Kubernetes
 * @access Public
 */
router.get('/live', livenessCheck)

/**
 * @route GET /health/metrics
 * @desc Prometheus metrics endpoint
 * @access Public
 */
router.get('/metrics', metricsEndpoint)

export { router as healthRouter }