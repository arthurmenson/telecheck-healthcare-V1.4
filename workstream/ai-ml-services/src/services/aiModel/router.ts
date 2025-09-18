import { Router } from 'express'
import { requireModelAccess, requireModelAdmin } from '@/core/middleware/auth'

const router = Router()

/**
 * @route GET /api/ai-models
 * @desc Get list of available AI models
 * @access Protected (requires model access)
 */
router.get('/', requireModelAccess, (req, res) => {
  res.json({
    success: true,
    data: {
      models: [
        {
          id: 'medical-coding-v1',
          name: 'Medical Coding Model',
          version: '1.0.0',
          status: 'active',
          accuracy: 0.96,
          lastUpdated: new Date().toISOString()
        }
      ]
    }
  })
})

export { router as aiModelRouter }