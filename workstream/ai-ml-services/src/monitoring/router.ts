import { Router } from 'express'
import { requireAuditAccess } from '@/core/middleware/auth'

const router = Router()

/**
 * @route GET /api/monitoring/metrics
 * @desc Get monitoring metrics
 * @access Protected (requires audit access)
 */
router.get('/metrics', requireAuditAccess, (req, res) => {
  res.json({
    success: true,
    data: {
      models: 3,
      averageAccuracy: 0.96,
      averageResponseTime: 15000,
      uptime: process.uptime()
    }
  })
})

export { router as monitoringRouter }