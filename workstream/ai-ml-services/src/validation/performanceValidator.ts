import { logger } from '@/core/logger'
import * as tf from '@tensorflow/tfjs-node'

export interface PerformanceValidationResult {
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  throughput: number
  memoryUsage: {
    before: NodeJS.MemoryUsage
    after: NodeJS.MemoryUsage
    peak: NodeJS.MemoryUsage
  }
  isValid: boolean
  threshold: number
  validationTimestamp: string
  modelId: string
  testIterations: number
}

export interface PerformanceTestConfig {
  maxResponseTimeMs: number
  minThroughputPerSecond: number
  testIterations: number
  warmupIterations: number
  batchSizes: number[]
}

export class PerformanceValidator {
  private readonly defaultConfig: PerformanceTestConfig = {
    maxResponseTimeMs: 30000, // 30 seconds as per requirements
    minThroughputPerSecond: 10,
    testIterations: 100,
    warmupIterations: 10,
    batchSizes: [1, 5, 10, 25, 50]
  }

  constructor(private config: Partial<PerformanceTestConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config }
  }

  /**
   * Validate model performance against requirements
   */
  async validatePerformance(
    model: tf.LayersModel,
    testData: tf.Tensor,
    modelId: string
  ): Promise<PerformanceValidationResult> {
    logger.info('Starting performance validation', {
      modelId,
      threshold: this.config.maxResponseTimeMs,
      iterations: this.config.testIterations
    })

    const memoryBefore = process.memoryUsage()
    let peakMemory = memoryBefore

    try {
      // Warmup runs
      await this.runWarmup(model, testData)

      // Performance test runs
      const responseTimes: number[] = []

      for (let i = 0; i < this.config.testIterations!; i++) {
        const startTime = process.hrtime.bigint()

        // Make prediction
        const prediction = model.predict(testData) as tf.Tensor
        await prediction.data() // Ensure computation is complete
        prediction.dispose()

        const endTime = process.hrtime.bigint()
        const responseTimeMs = Number(endTime - startTime) / 1000000 // Convert to milliseconds

        responseTimes.push(responseTimeMs)

        // Track peak memory usage
        const currentMemory = process.memoryUsage()
        if (currentMemory.heapUsed > peakMemory.heapUsed) {
          peakMemory = currentMemory
        }

        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const memoryAfter = process.memoryUsage()

      // Calculate performance metrics
      const metrics = this.calculatePerformanceMetrics(responseTimes)

      const result: PerformanceValidationResult = {
        averageResponseTime: metrics.average,
        p95ResponseTime: metrics.p95,
        p99ResponseTime: metrics.p99,
        throughput: 1000 / metrics.average, // requests per second
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          peak: peakMemory
        },
        isValid: metrics.p95 <= this.config.maxResponseTimeMs!,
        threshold: this.config.maxResponseTimeMs!,
        validationTimestamp: new Date().toISOString(),
        modelId,
        testIterations: this.config.testIterations!
      }

      logger.info('Performance validation completed', {
        modelId,
        averageResponseTime: result.averageResponseTime,
        p95ResponseTime: result.p95ResponseTime,
        isValid: result.isValid,
        throughput: result.throughput
      })

      return result

    } catch (error) {
      logger.error('Performance validation failed', {
        modelId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Validate performance across different batch sizes
   */
  async validateBatchPerformance(
    model: tf.LayersModel,
    testData: tf.Tensor,
    modelId: string
  ): Promise<Record<number, PerformanceValidationResult>> {
    const results: Record<number, PerformanceValidationResult> = {}

    for (const batchSize of this.config.batchSizes!) {
      logger.info(`Testing batch size: ${batchSize}`, { modelId })

      // Create batch data
      const batchData = this.createBatchData(testData, batchSize)

      try {
        const result = await this.validatePerformance(model, batchData, modelId)
        results[batchSize] = result

        // Cleanup
        batchData.dispose()

      } catch (error) {
        logger.error(`Batch performance test failed for size ${batchSize}`, {
          modelId,
          batchSize,
          error
        })
        results[batchSize] = {
          averageResponseTime: Infinity,
          p95ResponseTime: Infinity,
          p99ResponseTime: Infinity,
          throughput: 0,
          memoryUsage: {
            before: process.memoryUsage(),
            after: process.memoryUsage(),
            peak: process.memoryUsage()
          },
          isValid: false,
          threshold: this.config.maxResponseTimeMs!,
          validationTimestamp: new Date().toISOString(),
          modelId,
          testIterations: 0
        }
      }
    }

    return results
  }

  /**
   * Load test the model to find breaking points
   */
  async loadTest(
    model: tf.LayersModel,
    testData: tf.Tensor,
    modelId: string,
    maxConcurrentRequests: number = 50
  ): Promise<{
    maxConcurrentHandled: number
    breakingPoint: number
    results: PerformanceValidationResult[]
  }> {
    logger.info('Starting load test', { modelId, maxConcurrentRequests })

    const results: PerformanceValidationResult[] = []
    let maxConcurrentHandled = 0
    let breakingPoint = 0

    for (let concurrent = 1; concurrent <= maxConcurrentRequests; concurrent++) {
      try {
        const startTime = Date.now()

        // Run concurrent predictions
        const promises = Array(concurrent).fill(null).map(async () => {
          const prediction = model.predict(testData) as tf.Tensor
          await prediction.data()
          prediction.dispose()
        })

        await Promise.all(promises)

        const endTime = Date.now()
        const totalTime = endTime - startTime
        const avgResponseTime = totalTime / concurrent

        // Check if still within performance threshold
        if (avgResponseTime <= this.config.maxResponseTimeMs!) {
          maxConcurrentHandled = concurrent
        } else if (breakingPoint === 0) {
          breakingPoint = concurrent
        }

        const result: PerformanceValidationResult = {
          averageResponseTime: avgResponseTime,
          p95ResponseTime: avgResponseTime,
          p99ResponseTime: avgResponseTime,
          throughput: concurrent / (totalTime / 1000),
          memoryUsage: {
            before: process.memoryUsage(),
            after: process.memoryUsage(),
            peak: process.memoryUsage()
          },
          isValid: avgResponseTime <= this.config.maxResponseTimeMs!,
          threshold: this.config.maxResponseTimeMs!,
          validationTimestamp: new Date().toISOString(),
          modelId,
          testIterations: concurrent
        }

        results.push(result)

        logger.info(`Load test iteration completed`, {
          modelId,
          concurrent,
          avgResponseTime,
          isValid: result.isValid
        })

      } catch (error) {
        logger.error(`Load test failed at ${concurrent} concurrent requests`, {
          modelId,
          concurrent,
          error
        })

        if (breakingPoint === 0) {
          breakingPoint = concurrent
        }
        break
      }
    }

    return {
      maxConcurrentHandled,
      breakingPoint,
      results
    }
  }

  private async runWarmup(model: tf.LayersModel, testData: tf.Tensor): Promise<void> {
    logger.info('Running warmup iterations', { iterations: this.config.warmupIterations })

    for (let i = 0; i < this.config.warmupIterations!; i++) {
      const prediction = model.predict(testData) as tf.Tensor
      await prediction.data()
      prediction.dispose()
    }
  }

  private calculatePerformanceMetrics(responseTimes: number[]): {
    average: number
    median: number
    p95: number
    p99: number
    min: number
    max: number
  } {
    const sorted = [...responseTimes].sort((a, b) => a - b)
    const length = sorted.length

    return {
      average: responseTimes.reduce((sum, time) => sum + time, 0) / length,
      median: sorted[Math.floor(length / 2)],
      p95: sorted[Math.floor(length * 0.95)],
      p99: sorted[Math.floor(length * 0.99)],
      min: sorted[0],
      max: sorted[length - 1]
    }
  }

  private createBatchData(testData: tf.Tensor, batchSize: number): tf.Tensor {
    const shape = testData.shape
    const newShape = [batchSize, ...shape.slice(1)]

    // Repeat the test data to create a batch
    const batched = tf.tile(testData.expandDims(0), [batchSize, ...Array(shape.length).fill(1)])
    return batched.reshape(newShape)
  }

  /**
   * Generate performance validation report
   */
  generatePerformanceReport(
    results: PerformanceValidationResult[],
    batchResults?: Record<number, PerformanceValidationResult>
  ): string {
    const report = [
      '# AI/ML Model Performance Validation Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary',
      `- Models tested: ${results.length}`,
      `- Performance threshold: ${this.config.maxResponseTimeMs}ms`,
      `- Passed validation: ${results.filter(r => r.isValid).length}`,
      `- Failed validation: ${results.filter(r => !r.isValid).length}`,
      '',
      '## Performance Requirements',
      '- Maximum response time: 30 seconds',
      '- Target: <5 seconds for 95th percentile',
      '- Continuous monitoring: 24/7',
      '',
      '## Detailed Results'
    ]

    for (const result of results) {
      report.push(
        `### Model: ${result.modelId}`,
        `- Average response time: ${result.averageResponseTime.toFixed(2)}ms`,
        `- 95th percentile: ${result.p95ResponseTime.toFixed(2)}ms`,
        `- 99th percentile: ${result.p99ResponseTime.toFixed(2)}ms`,
        `- Throughput: ${result.throughput.toFixed(2)} requests/second`,
        `- Status: ${result.isValid ? '✅ PASS' : '❌ FAIL'}`,
        `- Test iterations: ${result.testIterations}`,
        `- Memory usage (peak): ${(result.memoryUsage.peak.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        ''
      )
    }

    if (batchResults) {
      report.push('## Batch Performance Results')
      for (const [batchSize, result] of Object.entries(batchResults)) {
        report.push(
          `### Batch Size: ${batchSize}`,
          `- Average response time: ${result.averageResponseTime.toFixed(2)}ms`,
          `- Throughput: ${result.throughput.toFixed(2)} requests/second`,
          `- Status: ${result.isValid ? '✅ PASS' : '❌ FAIL'}`,
          ''
        )
      }
    }

    return report.join('\n')
  }
}