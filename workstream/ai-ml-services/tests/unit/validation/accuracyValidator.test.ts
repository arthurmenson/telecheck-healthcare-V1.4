import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AccuracyValidator } from '@/validation/accuracyValidator'
import * as tf from '@tensorflow/tfjs-node'

describe('AccuracyValidator', () => {
  let validator: AccuracyValidator
  let mockModel: tf.LayersModel

  beforeEach(() => {
    validator = new AccuracyValidator(0.95, 100)

    // Mock TensorFlow model
    mockModel = {
      predict: vi.fn(),
    } as any
  })

  describe('validateAccuracy', () => {
    it('should validate model accuracy successfully', async () => {
      // Mock prediction results
      const mockPredictions = tf.tensor([0.9, 0.8, 0.95, 0.85])
      const mockLabels = tf.tensor([1, 0, 1, 1])

      vi.mocked(mockModel.predict).mockReturnValue(mockPredictions)

      const validationData = {
        inputs: tf.tensor([[1, 2], [3, 4], [5, 6], [7, 8]]),
        labels: mockLabels
      }

      const result = await validator.validateAccuracy(mockModel, validationData, 'test-model')

      expect(result.modelId).toBe('test-model')
      expect(result.accuracy).toBeGreaterThan(0)
      expect(result.precision).toBeGreaterThan(0)
      expect(result.recall).toBeGreaterThan(0)
      expect(result.f1Score).toBeGreaterThan(0)
      expect(result.isValid).toBeDefined()
      expect(result.confusionMatrix).toHaveLength(2)
      expect(result.confusionMatrix[0]).toHaveLength(2)
    })

    it('should detect when accuracy is below threshold', async () => {
      // Mock low accuracy predictions
      const mockPredictions = tf.tensor([0.3, 0.2, 0.4, 0.1])
      const mockLabels = tf.tensor([1, 1, 1, 1])

      vi.mocked(mockModel.predict).mockReturnValue(mockPredictions)

      const validationData = {
        inputs: tf.tensor([[1, 2], [3, 4], [5, 6], [7, 8]]),
        labels: mockLabels
      }

      const result = await validator.validateAccuracy(mockModel, validationData, 'low-accuracy-model')

      expect(result.accuracy).toBeLessThan(0.95)
      expect(result.isValid).toBe(false)
    })

    it('should throw error for insufficient validation data', async () => {
      const validationData = {
        inputs: tf.tensor([[1, 2]]), // Only 1 sample, need 100
        labels: tf.tensor([1])
      }

      await expect(
        validator.validateAccuracy(mockModel, validationData, 'test-model')
      ).rejects.toThrow('Insufficient validation data')
    })
  })

  describe('validateMedicalCodingAccuracy', () => {
    it('should validate medical coding with code type breakdown', async () => {
      const mockPredictions = tf.tensor([0.9, 0.8, 0.95, 0.85])
      const mockLabels = tf.tensor([1, 0, 1, 1])

      vi.mocked(mockModel.predict).mockReturnValue(mockPredictions)

      const validationData = {
        inputs: tf.tensor([[1, 2], [3, 4], [5, 6], [7, 8]]),
        labels: mockLabels,
        metadata: {
          codeTypes: ['ICD-10', 'ICD-10', 'CPT', 'CPT']
        }
      }

      const result = await validator.validateMedicalCodingAccuracy(
        mockModel,
        validationData,
        'medical-model',
        ['ICD-10', 'CPT']
      )

      expect(result.codeTypeAccuracy).toBeDefined()
      expect(result.codeTypeAccuracy['ICD-10']).toBeDefined()
      expect(result.codeTypeAccuracy['CPT']).toBeDefined()
    })
  })

  describe('generateValidationReport', () => {
    it('should generate comprehensive validation report', () => {
      const results = [
        {
          accuracy: 0.96,
          precision: 0.95,
          recall: 0.97,
          f1Score: 0.96,
          confusionMatrix: [[80, 5], [3, 12]],
          isValid: true,
          threshold: 0.95,
          validationTimestamp: '2023-01-01T00:00:00.000Z',
          modelId: 'model-1',
          testDataSize: 100
        },
        {
          accuracy: 0.92,
          precision: 0.90,
          recall: 0.94,
          f1Score: 0.92,
          confusionMatrix: [[75, 8], [5, 12]],
          isValid: false,
          threshold: 0.95,
          validationTimestamp: '2023-01-01T00:00:00.000Z',
          modelId: 'model-2',
          testDataSize: 100
        }
      ]

      const report = validator.generateValidationReport(results)

      expect(report).toContain('AI/ML Model Accuracy Validation Report')
      expect(report).toContain('Models tested: 2')
      expect(report).toContain('Passed validation: 1')
      expect(report).toContain('Failed validation: 1')
      expect(report).toContain('model-1')
      expect(report).toContain('model-2')
      expect(report).toContain('✅ PASS')
      expect(report).toContain('❌ FAIL')
    })
  })
})