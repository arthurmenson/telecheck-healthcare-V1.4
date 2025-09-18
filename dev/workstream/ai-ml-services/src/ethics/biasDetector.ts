import { logger } from '@/core/logger'
import * as tf from '@tensorflow/tfjs-node'

export interface BiasDetectionResult {
  overallFairnessScore: number
  demographicParity: number
  equalizedOdds: number
  calibration: number
  biasDetected: boolean
  protectedAttributes: string[]
  recommendations: string[]
  detectionTimestamp: string
  modelId: string
  testDataSize: number
  groupMetrics: Record<string, GroupMetrics>
}

export interface GroupMetrics {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  sampleSize: number
  positiveRate: number
  falsePositiveRate: number
  falseNegativeRate: number
}

export interface BiasTestData {
  inputs: tf.Tensor
  labels: tf.Tensor
  protectedAttributes: Record<string, (string | number)[]>
  metadata?: {
    patientIds?: string[]
    demographics?: Record<string, any>[]
  }
}

export class BiasDetector {
  private readonly fairnessThreshold: number
  private readonly demographicParityThreshold: number

  constructor(
    fairnessThreshold: number = 0.8,
    demographicParityThreshold: number = 0.1
  ) {
    this.fairnessThreshold = fairnessThreshold
    this.demographicParityThreshold = demographicParityThreshold
  }

  /**
   * Detect bias in AI model predictions
   */
  async detectBias(
    model: tf.LayersModel,
    testData: BiasTestData,
    modelId: string
  ): Promise<BiasDetectionResult> {
    const startTime = Date.now()

    try {
      logger.info('Starting bias detection', {
        modelId,
        protectedAttributes: Object.keys(testData.protectedAttributes),
        sampleSize: testData.inputs.shape[0]
      })

      // Make predictions
      const predictions = model.predict(testData.inputs) as tf.Tensor
      const predictionArray = await predictions.data()
      const labelArray = await testData.labels.data()

      // Calculate group metrics for each protected attribute
      const groupMetrics: Record<string, GroupMetrics> = {}
      const protectedAttributes = Object.keys(testData.protectedAttributes)

      for (const attribute of protectedAttributes) {
        const attributeValues = testData.protectedAttributes[attribute]
        const uniqueValues = [...new Set(attributeValues)]

        for (const value of uniqueValues) {
          const groupKey = `${attribute}_${value}`
          const groupIndices = attributeValues
            .map((val, idx) => val === value ? idx : -1)
            .filter(idx => idx !== -1)

          if (groupIndices.length > 0) {
            const groupPredictions = groupIndices.map(idx => predictionArray[idx])
            const groupLabels = groupIndices.map(idx => labelArray[idx])

            groupMetrics[groupKey] = this.calculateGroupMetrics(
              groupPredictions,
              groupLabels
            )
          }
        }
      }

      // Calculate fairness metrics
      const fairnessMetrics = this.calculateFairnessMetrics(groupMetrics, protectedAttributes)

      // Generate recommendations
      const recommendations = this.generateRecommendations(fairnessMetrics, groupMetrics)

      const result: BiasDetectionResult = {
        overallFairnessScore: fairnessMetrics.overallScore,
        demographicParity: fairnessMetrics.demographicParity,
        equalizedOdds: fairnessMetrics.equalizedOdds,
        calibration: fairnessMetrics.calibration,
        biasDetected: fairnessMetrics.overallScore < this.fairnessThreshold,
        protectedAttributes,
        recommendations,
        detectionTimestamp: new Date().toISOString(),
        modelId,
        testDataSize: testData.inputs.shape[0],
        groupMetrics
      }

      const endTime = Date.now()
      logger.info('Bias detection completed', {
        modelId,
        fairnessScore: result.overallFairnessScore,
        biasDetected: result.biasDetected,
        duration: endTime - startTime
      })

      // Cleanup
      predictions.dispose()

      return result

    } catch (error) {
      logger.error('Bias detection failed', {
        modelId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Validate HIPAA compliance for bias and fairness
   */
  async validateHipaaCompliance(
    biasResult: BiasDetectionResult
  ): Promise<{
    isCompliant: boolean
    violations: string[]
    recommendations: string[]
  }> {
    const violations: string[] = []
    const recommendations: string[] = []

    // Check demographic parity
    if (biasResult.demographicParity > this.demographicParityThreshold) {
      violations.push('Demographic parity violation detected')
      recommendations.push('Ensure equal treatment rates across demographic groups')
    }

    // Check overall fairness
    if (biasResult.overallFairnessScore < this.fairnessThreshold) {
      violations.push('Overall fairness score below threshold')
      recommendations.push('Review model training data for representational bias')
    }

    // Check group-specific performance
    const groupKeys = Object.keys(biasResult.groupMetrics)
    const accuracies = groupKeys.map(key => biasResult.groupMetrics[key].accuracy)
    const maxAccuracy = Math.max(...accuracies)
    const minAccuracy = Math.min(...accuracies)

    if (maxAccuracy - minAccuracy > 0.1) { // 10% difference threshold
      violations.push('Significant accuracy disparity between groups')
      recommendations.push('Balance training data across demographic groups')
    }

    // Check for protected attributes in medical contexts
    const medicalProtectedAttributes = ['race', 'gender', 'age', 'ethnicity', 'religion']
    const detectedProtectedAttributes = biasResult.protectedAttributes.filter(
      attr => medicalProtectedAttributes.some(medical =>
        attr.toLowerCase().includes(medical.toLowerCase())
      )
    )

    if (detectedProtectedAttributes.length > 0) {
      recommendations.push(
        'Ensure protected attribute usage complies with medical necessity requirements'
      )
    }

    return {
      isCompliant: violations.length === 0,
      violations,
      recommendations: [...recommendations, ...biasResult.recommendations]
    }
  }

  /**
   * Monitor ongoing bias in deployed models
   */
  async monitorBiasDrift(
    currentResult: BiasDetectionResult,
    historicalResults: BiasDetectionResult[]
  ): Promise<{
    isDrifting: boolean
    driftMagnitude: number
    trendDirection: 'improving' | 'degrading' | 'stable'
    alerts: string[]
  }> {
    if (historicalResults.length === 0) {
      return {
        isDrifting: false,
        driftMagnitude: 0,
        trendDirection: 'stable',
        alerts: []
      }
    }

    const recent = historicalResults.slice(-5) // Last 5 results
    const averageHistoricalScore = recent.reduce(
      (sum, result) => sum + result.overallFairnessScore, 0
    ) / recent.length

    const driftMagnitude = Math.abs(currentResult.overallFairnessScore - averageHistoricalScore)
    const isDrifting = driftMagnitude > 0.05 // 5% threshold

    // Determine trend
    let trendDirection: 'improving' | 'degrading' | 'stable' = 'stable'
    if (currentResult.overallFairnessScore > averageHistoricalScore + 0.02) {
      trendDirection = 'improving'
    } else if (currentResult.overallFairnessScore < averageHistoricalScore - 0.02) {
      trendDirection = 'degrading'
    }

    const alerts: string[] = []
    if (isDrifting) {
      alerts.push(`Bias drift detected: ${(driftMagnitude * 100).toFixed(2)}% change`)
    }

    if (trendDirection === 'degrading') {
      alerts.push('Fairness score trending downward - investigate immediately')
    }

    if (currentResult.biasDetected && !recent.some(r => r.biasDetected)) {
      alerts.push('New bias detected - immediate review required')
    }

    return {
      isDrifting,
      driftMagnitude,
      trendDirection,
      alerts
    }
  }

  private calculateGroupMetrics(predictions: number[], labels: number[]): GroupMetrics {
    const threshold = 0.5
    const binaryPredictions = predictions.map(p => p > threshold ? 1 : 0)
    const binaryLabels = labels.map(l => Math.round(l))

    let tp = 0, fp = 0, tn = 0, fn = 0

    for (let i = 0; i < binaryPredictions.length; i++) {
      const pred = binaryPredictions[i]
      const label = binaryLabels[i]

      if (pred === 1 && label === 1) tp++
      else if (pred === 1 && label === 0) fp++
      else if (pred === 0 && label === 0) tn++
      else if (pred === 0 && label === 1) fn++
    }

    const accuracy = (tp + tn) / (tp + tn + fp + fn) || 0
    const precision = tp / (tp + fp) || 0
    const recall = tp / (tp + fn) || 0
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0
    const positiveRate = (tp + fp) / (tp + tn + fp + fn) || 0
    const falsePositiveRate = fp / (fp + tn) || 0
    const falseNegativeRate = fn / (fn + tp) || 0

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      sampleSize: predictions.length,
      positiveRate,
      falsePositiveRate,
      falseNegativeRate
    }
  }

  private calculateFairnessMetrics(
    groupMetrics: Record<string, GroupMetrics>,
    protectedAttributes: string[]
  ): {
    overallScore: number
    demographicParity: number
    equalizedOdds: number
    calibration: number
  } {
    const groupKeys = Object.keys(groupMetrics)

    // Demographic Parity: difference in positive rates between groups
    const positiveRates = groupKeys.map(key => groupMetrics[key].positiveRate)
    const demographicParity = Math.max(...positiveRates) - Math.min(...positiveRates)

    // Equalized Odds: difference in true positive rates and false positive rates
    const tpRates = groupKeys.map(key => groupMetrics[key].recall)
    const fpRates = groupKeys.map(key => groupMetrics[key].falsePositiveRate)

    const tpRateDiff = Math.max(...tpRates) - Math.min(...tpRates)
    const fpRateDiff = Math.max(...fpRates) - Math.min(...fpRates)
    const equalizedOdds = Math.max(tpRateDiff, fpRateDiff)

    // Calibration: difference in precision between groups
    const precisions = groupKeys.map(key => groupMetrics[key].precision)
    const calibration = Math.max(...precisions) - Math.min(...precisions)

    // Overall fairness score (inverse of average unfairness)
    const overallScore = 1 - (demographicParity + equalizedOdds + calibration) / 3

    return {
      overallScore: Math.max(0, overallScore),
      demographicParity,
      equalizedOdds,
      calibration
    }
  }

  private generateRecommendations(
    fairnessMetrics: any,
    groupMetrics: Record<string, GroupMetrics>
  ): string[] {
    const recommendations: string[] = []

    if (fairnessMetrics.demographicParity > this.demographicParityThreshold) {
      recommendations.push('Balance positive prediction rates across demographic groups')
      recommendations.push('Review training data distribution for underrepresented groups')
    }

    if (fairnessMetrics.equalizedOdds > 0.1) {
      recommendations.push('Ensure equal true positive rates across groups')
      recommendations.push('Consider bias mitigation techniques during model training')
    }

    if (fairnessMetrics.calibration > 0.1) {
      recommendations.push('Improve prediction calibration across demographic groups')
      recommendations.push('Use calibration techniques like Platt scaling')
    }

    // Check for specific group performance issues
    const groupKeys = Object.keys(groupMetrics)
    const accuracies = groupKeys.map(key => groupMetrics[key].accuracy)
    const avgAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length

    for (const [groupKey, metrics] of Object.entries(groupMetrics)) {
      if (metrics.accuracy < avgAccuracy - 0.1) {
        recommendations.push(`Improve performance for group: ${groupKey}`)
      }

      if (metrics.sampleSize < 100) {
        recommendations.push(`Increase training data for underrepresented group: ${groupKey}`)
      }
    }

    return recommendations
  }

  /**
   * Generate bias detection report
   */
  generateBiasReport(results: BiasDetectionResult[]): string {
    const report = [
      '# AI/ML Model Bias Detection Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Executive Summary',
      `- Models analyzed: ${results.length}`,
      `- Bias detected: ${results.filter(r => r.biasDetected).length}`,
      `- Fairness threshold: ${this.fairnessThreshold}`,
      `- Average fairness score: ${(results.reduce((sum, r) => sum + r.overallFairnessScore, 0) / results.length).toFixed(3)}`,
      '',
      '## HIPAA Compliance Requirements',
      '- Equal treatment across demographic groups',
      '- No discrimination based on protected attributes',
      '- Continuous monitoring and documentation',
      '- Regular bias audits and corrections',
      '',
      '## Detailed Analysis'
    ]

    for (const result of results) {
      report.push(
        `### Model: ${result.modelId}`,
        `- Overall Fairness Score: ${result.overallFairnessScore.toFixed(3)}`,
        `- Demographic Parity: ${result.demographicParity.toFixed(3)}`,
        `- Equalized Odds: ${result.equalizedOdds.toFixed(3)}`,
        `- Calibration: ${result.calibration.toFixed(3)}`,
        `- Bias Status: ${result.biasDetected ? '⚠️ BIAS DETECTED' : '✅ NO BIAS'}`,
        `- Protected Attributes: ${result.protectedAttributes.join(', ')}`,
        `- Test Data Size: ${result.testDataSize}`,
        ''
      )

      if (result.recommendations.length > 0) {
        report.push('**Recommendations:**')
        result.recommendations.forEach(rec => report.push(`- ${rec}`))
        report.push('')
      }
    }

    return report.join('\n')
  }
}