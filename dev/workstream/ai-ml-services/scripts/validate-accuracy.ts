#!/usr/bin/env tsx

import { logger } from '../src/core/logger'
import { AccuracyValidator } from '../src/validation/accuracyValidator'
import * as tf from '@tensorflow/tfjs-node'

async function validateAccuracy(): Promise<void> {
  try {
    logger.info('Starting AI/ML model accuracy validation')

    const validator = new AccuracyValidator()

    // Generate mock validation data
    const batchSize = 1000
    const inputShape = [10]

    const validationData = {
      inputs: tf.randomNormal([batchSize, ...inputShape]),
      labels: tf.randomUniform([batchSize], 0, 1).round()
    }

    // Create a simple mock model for testing
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape, units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    })

    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    })

    // Train briefly to get reasonable predictions
    await model.fit(validationData.inputs, validationData.labels, {
      epochs: 5,
      batchSize: 32,
      verbose: 0
    })

    // Validate accuracy
    const result = await validator.validateAccuracy(model, validationData, 'test-model-v1')

    logger.info('Accuracy validation completed', {
      modelId: result.modelId,
      accuracy: result.accuracy,
      precision: result.precision,
      recall: result.recall,
      f1Score: result.f1Score,
      isValid: result.isValid
    })

    // Check if accuracy meets threshold
    const threshold = parseFloat(process.env.ACCURACY_THRESHOLD || '0.95')
    if (result.accuracy < threshold) {
      logger.error(`Model accuracy ${result.accuracy} below threshold ${threshold}`)
      process.exit(1)
    }

    // Generate report
    const report = validator.generateValidationReport([result])
    console.log('\n' + report)

    // Cleanup
    validationData.inputs.dispose()
    validationData.labels.dispose()
    model.dispose()

    logger.info('Accuracy validation completed successfully')

  } catch (error) {
    logger.error('Accuracy validation failed', { error })
    process.exit(1)
  }
}

// Run validation
validateAccuracy()