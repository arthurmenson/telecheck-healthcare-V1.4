import { Request, Response } from 'express'
import { logger } from '@/core/logger'
import { asyncHandler, createError } from '@/core/middleware/errorHandler'
import { DocumentProcessor } from './documentProcessor'
import { z } from 'zod'
import multer from 'multer'

const documentProcessingSchema = z.object({
  documentType: z.enum(['pdf', 'image', 'text']),
  extractionType: z.enum(['text', 'medical_codes', 'structured_data', 'all']),
  patientId: z.string().optional(),
  options: z.object({
    ocrEnabled: z.boolean().default(true),
    confidenceThreshold: z.number().min(0).max(1).default(0.8),
    languageCode: z.string().default('en'),
    medicalCodingStandard: z.enum(['ICD-10', 'CPT', 'SNOMED']).optional()
  }).optional()
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 'text/plain']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  }
})

const documentProcessor = new DocumentProcessor()

/**
 * Process uploaded document for text extraction and medical coding
 */
export const processDocument = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now()

  try {
    // Validate request body
    const validatedData = documentProcessingSchema.parse(req.body)

    if (!req.file) {
      throw createError('No file uploaded', 400)
    }

    logger.info('Processing document', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      documentType: validatedData.documentType,
      extractionType: validatedData.extractionType,
      patientId: validatedData.patientId
    })

    // Process the document
    const result = await documentProcessor.processDocument(
      req.file.buffer,
      req.file.mimetype,
      validatedData
    )

    const processingTime = Date.now() - startTime

    logger.info('Document processing completed', {
      filename: req.file.originalname,
      processingTime,
      extractedTextLength: result.extractedText?.length || 0,
      medicalCodesFound: result.medicalCodes?.length || 0,
      confidence: result.confidence
    })

    res.json({
      success: true,
      data: {
        documentId: result.documentId,
        extractedText: result.extractedText,
        medicalCodes: result.medicalCodes,
        structuredData: result.structuredData,
        confidence: result.confidence,
        processingTime,
        metadata: {
          filename: req.file.originalname,
          fileSize: req.file.size,
          documentType: validatedData.documentType,
          timestamp: new Date().toISOString()
        }
      }
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Document processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
      filename: req.file?.originalname
    })
    throw error
  }
})

/**
 * Get document processing history for a patient
 */
export const getDocumentHistory = asyncHandler(async (req: Request, res: Response) => {
  const { patientId } = req.params
  const { limit = 50, offset = 0 } = req.query

  if (!patientId) {
    throw createError('Patient ID is required', 400)
  }

  logger.info('Retrieving document history', {
    patientId,
    limit: Number(limit),
    offset: Number(offset)
  })

  const history = await documentProcessor.getDocumentHistory(
    patientId,
    Number(limit),
    Number(offset)
  )

  res.json({
    success: true,
    data: {
      documents: history.documents,
      totalCount: history.totalCount,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: history.totalCount > Number(offset) + Number(limit)
      }
    }
  })
})

/**
 * Get specific document processing result
 */
export const getDocumentResult = asyncHandler(async (req: Request, res: Response) => {
  const { documentId } = req.params

  if (!documentId) {
    throw createError('Document ID is required', 400)
  }

  logger.info('Retrieving document result', { documentId })

  const result = await documentProcessor.getDocumentResult(documentId)

  if (!result) {
    throw createError('Document not found', 404)
  }

  res.json({
    success: true,
    data: result
  })
})

/**
 * Validate document processing accuracy
 */
export const validateProcessingAccuracy = asyncHandler(async (req: Request, res: Response) => {
  const { documentId } = req.params
  const { groundTruth } = req.body

  if (!documentId || !groundTruth) {
    throw createError('Document ID and ground truth data are required', 400)
  }

  logger.info('Validating processing accuracy', { documentId })

  const validation = await documentProcessor.validateAccuracy(documentId, groundTruth)

  res.json({
    success: true,
    data: {
      documentId,
      accuracy: validation.accuracy,
      precision: validation.precision,
      recall: validation.recall,
      f1Score: validation.f1Score,
      errors: validation.errors,
      recommendations: validation.recommendations
    }
  })
})

/**
 * Reprocess document with updated parameters
 */
export const reprocessDocument = asyncHandler(async (req: Request, res: Response) => {
  const { documentId } = req.params
  const validatedData = documentProcessingSchema.parse(req.body)

  if (!documentId) {
    throw createError('Document ID is required', 400)
  }

  logger.info('Reprocessing document', { documentId, newOptions: validatedData.options })

  const result = await documentProcessor.reprocessDocument(documentId, validatedData)

  res.json({
    success: true,
    data: result
  })
})

/**
 * Get document processing performance metrics
 */
export const getProcessingMetrics = asyncHandler(async (req: Request, res: Response) => {
  const { timeframe = '24h' } = req.query

  logger.info('Retrieving processing metrics', { timeframe })

  const metrics = await documentProcessor.getPerformanceMetrics(timeframe as string)

  res.json({
    success: true,
    data: {
      timeframe,
      totalDocuments: metrics.totalDocuments,
      averageProcessingTime: metrics.averageProcessingTime,
      successRate: metrics.successRate,
      averageAccuracy: metrics.averageAccuracy,
      topDocumentTypes: metrics.topDocumentTypes,
      errorBreakdown: metrics.errorBreakdown,
      performanceTrends: metrics.performanceTrends
    }
  })
})

/**
 * Middleware for file upload
 */
export const uploadMiddleware = upload.single('document')