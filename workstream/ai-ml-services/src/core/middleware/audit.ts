import { Request, Response, NextFunction } from 'express'
import { auditLogger } from '@/core/logger'
import { AuthRequest } from './auth'

export interface AuditLogEntry {
  timestamp: string
  userId?: string
  userRole?: string
  action: string
  resource: string
  method: string
  path: string
  ip: string
  userAgent: string
  statusCode?: number
  responseTime?: number
  dataAccessed?: {
    type: string
    recordCount?: number
    patientIds?: string[]
  }
  hipaaRelevant: boolean
}

export const auditMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now()

  // Capture original end function
  const originalEnd = res.end

  // Override end function to capture response details
  res.end = function(chunk?: any, encoding?: any): Response {
    const responseTime = Date.now() - startTime

    // Create audit log entry
    const auditEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      userId: req.user?.id,
      userRole: req.user?.role,
      action: `${req.method} ${req.path}`,
      resource: extractResourceType(req.path),
      method: req.method,
      path: req.path,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      statusCode: res.statusCode,
      responseTime,
      hipaaRelevant: isHipaaRelevant(req.path, req.method)
    }

    // Add data access information for HIPAA compliance
    if (auditEntry.hipaaRelevant) {
      auditEntry.dataAccessed = extractDataAccessInfo(req, res)
    }

    // Log the audit entry
    auditLogger.info('API Access', auditEntry)

    // Call original end function
    return originalEnd.call(this, chunk, encoding)
  }

  next()
}

function extractResourceType(path: string): string {
  if (path.includes('/medical-coding')) return 'medical_coding'
  if (path.includes('/ai-models')) return 'ai_models'
  if (path.includes('/document-processing')) return 'document_processing'
  if (path.includes('/bias-detection')) return 'bias_detection'
  if (path.includes('/monitoring')) return 'monitoring'
  if (path.includes('/health')) return 'health'
  return 'unknown'
}

function isHipaaRelevant(path: string, method: string): boolean {
  // HIPAA relevant endpoints that deal with PHI
  const hipaaEndpoints = [
    '/api/medical-coding',
    '/api/document-processing',
    '/api/ai-models/predict',
    '/api/monitoring/patient-data'
  ]

  return hipaaEndpoints.some(endpoint => path.startsWith(endpoint))
}

function extractDataAccessInfo(req: AuthRequest, res: Response): AuditLogEntry['dataAccessed'] {
  const dataAccessed: AuditLogEntry['dataAccessed'] = {
    type: 'unknown'
  }

  // Extract patient IDs from request
  const patientIds: string[] = []

  // Check query parameters
  if (req.query.patientId) {
    patientIds.push(req.query.patientId as string)
  }

  if (req.query.patientIds) {
    const ids = Array.isArray(req.query.patientIds)
      ? req.query.patientIds
      : [req.query.patientIds]
    patientIds.push(...ids as string[])
  }

  // Check request body
  if (req.body?.patientId) {
    patientIds.push(req.body.patientId)
  }

  if (req.body?.patientIds) {
    patientIds.push(...req.body.patientIds)
  }

  // Check URL parameters
  if (req.params.patientId) {
    patientIds.push(req.params.patientId)
  }

  if (patientIds.length > 0) {
    dataAccessed.patientIds = [...new Set(patientIds)] // Remove duplicates
    dataAccessed.recordCount = patientIds.length
  }

  // Determine data type based on endpoint
  if (req.path.includes('/medical-coding')) {
    dataAccessed.type = 'medical_codes'
  } else if (req.path.includes('/document-processing')) {
    dataAccessed.type = 'medical_documents'
  } else if (req.path.includes('/ai-models')) {
    dataAccessed.type = 'ai_predictions'
  }

  return dataAccessed
}