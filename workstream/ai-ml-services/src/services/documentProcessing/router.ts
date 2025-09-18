import { Router } from 'express'
import {
  processDocument,
  getDocumentHistory,
  getDocumentResult,
  validateProcessingAccuracy,
  reprocessDocument,
  getProcessingMetrics,
  uploadMiddleware
} from './controller'
import { requireMedicalCodingAccess, requireMedicalCodingWrite } from '@/core/middleware/auth'

const router = Router()

/**
 * @route POST /api/document-processing/process
 * @desc Process uploaded document
 * @access Protected (requires medical coding write access)
 */
router.post('/process', requireMedicalCodingWrite, uploadMiddleware, processDocument)

/**
 * @route GET /api/document-processing/history/:patientId
 * @desc Get document processing history for patient
 * @access Protected (requires medical coding read access)
 */
router.get('/history/:patientId', requireMedicalCodingAccess, getDocumentHistory)

/**
 * @route GET /api/document-processing/result/:documentId
 * @desc Get specific document processing result
 * @access Protected (requires medical coding read access)
 */
router.get('/result/:documentId', requireMedicalCodingAccess, getDocumentResult)

/**
 * @route POST /api/document-processing/validate/:documentId
 * @desc Validate document processing accuracy
 * @access Protected (requires medical coding write access)
 */
router.post('/validate/:documentId', requireMedicalCodingWrite, validateProcessingAccuracy)

/**
 * @route POST /api/document-processing/reprocess/:documentId
 * @desc Reprocess document with new parameters
 * @access Protected (requires medical coding write access)
 */
router.post('/reprocess/:documentId', requireMedicalCodingWrite, reprocessDocument)

/**
 * @route GET /api/document-processing/metrics
 * @desc Get document processing performance metrics
 * @access Protected (requires medical coding read access)
 */
router.get('/metrics', requireMedicalCodingAccess, getProcessingMetrics)

export { router as documentProcessingRouter }