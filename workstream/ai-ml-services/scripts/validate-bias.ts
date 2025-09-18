#!/usr/bin/env tsx

import { logger } from '../src/core/logger'
import { BiasDetector } from '../src/ethics/biasDetector'
import * as tf from '@tensorflow/tfjs-node'

async function validateBias(): Promise<void> {
  try {
    logger.info('Starting AI/ML model bias validation')

    const detector = new BiasDetector()

    // Generate mock test data with protected attributes
    const batchSize = 1000
    const inputShape = [10]

    const testData = {
      inputs: tf.randomNormal([batchSize, ...inputShape]),
      labels: tf.randomUniform([batchSize], 0, 1).round(),
      protectedAttributes: {
        gender: Array.from({ length: batchSize }, () => Math.random() > 0.5 ? 'male' : 'female'),
        age: Array.from({ length: batchSize }, () => Math.random() > 0.5 ? 'young' : 'old'),
        ethnicity: Array.from({ length: batchSize }, () => {
          const rand = Math.random()
          if (rand < 0.4) return 'white'
          if (rand < 0.7) return 'black'
          if (rand < 0.85) return 'hispanic'
          return 'asian'
        })
      }
    }

    // Create a simple mock model
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

    // Train briefly
    await model.fit(testData.inputs, testData.labels, {
      epochs: 3,
      batchSize: 32,
      verbose: 0
    })

    // Detect bias
    const result = await detector.detectBias(model, testData, 'bias-test-model')

    logger.info('Bias validation completed', {
      modelId: result.modelId,
      fairnessScore: result.overallFairnessScore,
      biasDetected: result.biasDetected,
      demographicParity: result.demographicParity
    })

    // Check HIPAA compliance
    const compliance = await detector.validateHipaaCompliance(result)

    logger.info('HIPAA compliance check completed', {
      isCompliant: compliance.isCompliant,
      violations: compliance.violations,
      recommendations: compliance.recommendations
    })

    // Check if bias is within acceptable limits
    const fairnessThreshold = parseFloat(process.env.FAIRNESS_THRESHOLD || '0.8')
    if (result.overallFairnessScore < fairnessThreshold) {
      logger.error(`Model fairness score ${result.overallFairnessScore} below threshold ${fairnessThreshold}`)
      process.exit(1)
    }

    if (!compliance.isCompliant) {
      logger.error('Model fails HIPAA compliance requirements', {
        violations: compliance.violations
      })
      process.exit(1)
    }

    // Generate report
    const report = detector.generateBiasReport([result])
    console.log('\n' + report)

    // Cleanup
    testData.inputs.dispose()
    testData.labels.dispose()
    model.dispose()

    logger.info('Bias validation completed successfully')

  } catch (error) {
    logger.error('Bias validation failed', { error })
    process.exit(1)
  }
}

// Run validation
validateBias()