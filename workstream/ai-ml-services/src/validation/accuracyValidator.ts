import { logger } from '@/core/logger'
import * as tf from '@tensorflow/tfjs-node'

export interface AccuracyValidationResult {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  confusionMatrix: number[][]
  isValid: boolean
  threshold: number
  validationTimestamp: string
  modelId: string
  testDataSize: number
}

export interface ValidationDataset {
  inputs: tf.Tensor
  labels: tf.Tensor
  metadata?: {
    patientIds?: string[]
    codeTypes?: string[]
    documentTypes?: string[]
  }
}

export class AccuracyValidator {
  private readonly accuracyThreshold: number
  private readonly requiredSampleSize: number

  constructor(
    accuracyThreshold: number = 0.95,
    requiredSampleSize: number = 1000
  ) {
    this.accuracyThreshold = accuracyThreshold
    this.requiredSampleSize = requiredSampleSize
  }

  /**
   * Validate model accuracy against healthcare standards
   */
  async validateAccuracy(
    model: tf.LayersModel,
    validationData: ValidationDataset,
    modelId: string
  ): Promise<AccuracyValidationResult> {
    const startTime = Date.now()

    try {
      logger.info('Starting accuracy validation', {
        modelId,
        threshold: this.accuracyThreshold,
        sampleSize: validationData.inputs.shape[0]
      })

      // Validate sample size
      const sampleSize = validationData.inputs.shape[0]
      if (sampleSize < this.requiredSampleSize) {
        throw new Error(
          `Insufficient validation data: ${sampleSize} < ${this.requiredSampleSize}`
        )
      }

      // Make predictions
      const predictions = model.predict(validationData.inputs) as tf.Tensor
      const predictionArray = await predictions.data()
      const labelArray = await validationData.labels.data()

      // Calculate metrics
      const metrics = this.calculateMetrics(
        Array.from(predictionArray),
        Array.from(labelArray)
      )

      const result: AccuracyValidationResult = {
        ...metrics,
        isValid: metrics.accuracy >= this.accuracyThreshold,
        threshold: this.accuracyThreshold,
        validationTimestamp: new Date().toISOString(),
        modelId,
        testDataSize: sampleSize
      }

      const endTime = Date.now()
      logger.info('Accuracy validation completed', {
        modelId,
        accuracy: result.accuracy,
        isValid: result.isValid,
        duration: endTime - startTime
      })

      // Cleanup tensors
      predictions.dispose()

      return result

    } catch (error) {
      logger.error('Accuracy validation failed', {
        modelId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Validate medical coding accuracy with specialized metrics
   */
  async validateMedicalCodingAccuracy(
    model: tf.LayersModel,
    validationData: ValidationDataset,
    modelId: string,
    codeTypes: string[]
  ): Promise<AccuracyValidationResult & { codeTypeAccuracy: Record<string, number> }> {
    const baseResult = await this.validateAccuracy(model, validationData, modelId)

    // Calculate accuracy per code type
    const codeTypeAccuracy: Record<string, number> = {}

    if (validationData.metadata?.codeTypes) {
      for (const codeType of codeTypes) {
        // Filter data for specific code type
        const typeIndices = validationData.metadata.codeTypes
          .map((type, index) => type === codeType ? index : -1)
          .filter(index => index !== -1)

        if (typeIndices.length > 0) {
          const typePredictions = model.predict(
            validationData.inputs.gather(typeIndices)
          ) as tf.Tensor
          const typeLabels = validationData.labels.gather(typeIndices)

          const typePredArray = await typePredictions.data()
          const typeLabelArray = await typeLabels.data()

          const typeMetrics = this.calculateMetrics(
            Array.from(typePredArray),
            Array.from(typeLabelArray)
          )

          codeTypeAccuracy[codeType] = typeMetrics.accuracy

          // Cleanup
          typePredictions.dispose()
          typeLabels.dispose()
        }
      }
    }

    return {
      ...baseResult,
      codeTypeAccuracy
    }
  }

  /**
   * Calculate classification metrics
   */
  private calculateMetrics(
    predictions: number[],
    labels: number[]
  ): Omit<AccuracyValidationResult, 'isValid' | 'threshold' | 'validationTimestamp' | 'modelId' | 'testDataSize'> {
    const threshold = 0.5
    const binaryPredictions = predictions.map(p => p > threshold ? 1 : 0)
    const binaryLabels = labels.map(l => Math.round(l))

    // Calculate confusion matrix
    let tp = 0, fp = 0, tn = 0, fn = 0

    for (let i = 0; i < binaryPredictions.length; i++) {
      const pred = binaryPredictions[i]
      const label = binaryLabels[i]

      if (pred === 1 && label === 1) tp++
      else if (pred === 1 && label === 0) fp++
      else if (pred === 0 && label === 0) tn++
      else if (pred === 0 && label === 1) fn++
    }

    const confusionMatrix = [
      [tn, fp],
      [fn, tp]
    ]

    // Calculate metrics
    const accuracy = (tp + tn) / (tp + tn + fp + fn)
    const precision = tp / (tp + fp) || 0
    const recall = tp / (tp + fn) || 0
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix
    }
  }

  /**
   * Generate accuracy validation report
   */
  generateValidationReport(results: AccuracyValidationResult[]): string {
    const report = [
      '# AI/ML Model Accuracy Validation Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary',
      `- Models tested: ${results.length}`,
      `- Accuracy threshold: ${this.accuracyThreshold * 100}%`,
      `- Passed validation: ${results.filter(r => r.isValid).length}`,
      `- Failed validation: ${results.filter(r => !r.isValid).length}`,
      '',
      '## Detailed Results'
    ]

    for (const result of results) {
      report.push(
        `### Model: ${result.modelId}`,
        `- Accuracy: ${(result.accuracy * 100).toFixed(2)}%`,
        `- Precision: ${(result.precision * 100).toFixed(2)}%`,
        `- Recall: ${(result.recall * 100).toFixed(2)}%`,
        `- F1 Score: ${(result.f1Score * 100).toFixed(2)}%`,
        `- Status: ${result.isValid ? '✅ PASS' : '❌ FAIL'}`,
        `- Test data size: ${result.testDataSize}`,
        `- Validation time: ${result.validationTimestamp}`,
        ''
      )
    }

    return report.join('\n')
  }
}