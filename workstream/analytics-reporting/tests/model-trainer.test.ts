import { describe, it, expect, beforeEach } from 'vitest';
import { ModelTrainer } from '@ml/model-trainer';
import type { ModelConfig } from '@ml/model-trainer';

describe('ModelTrainer', () => {
  let trainer: ModelTrainer;

  beforeEach(() => {
    trainer = new ModelTrainer();
  });

  describe('trainModel', () => {
    it('should train a linear regression model', async () => {
      const config: ModelConfig = {
        type: 'linear',
        features: ['x'],
        target: 'y',
        hyperparameters: {},
        validationSplit: 0.2,
        trainingData: Array.from({ length: 100 }, (_, i) => ({
          x: i,
          y: i * 2 + Math.random() * 10 // y = 2x + noise
        }))
      };

      const metrics = await trainer.trainModel('test-linear-model', config);

      expect(metrics.accuracy).toBeGreaterThan(0.5);
      expect(metrics.mse).toBeGreaterThan(0);
      expect(metrics.trainingTime).toBeGreaterThan(0);
      expect(metrics.r2).toBeGreaterThan(0);
    });

    it('should train a polynomial regression model', async () => {
      const config: ModelConfig = {
        type: 'polynomial',
        features: ['x'],
        target: 'y',
        hyperparameters: { degree: 2 },
        validationSplit: 0.2,
        trainingData: Array.from({ length: 100 }, (_, i) => ({
          x: i,
          y: i * i + Math.random() * 10 // y = x² + noise
        }))
      };

      const metrics = await trainer.trainModel('test-poly-model', config);

      expect(metrics.accuracy).toBeGreaterThan(0.3);
      expect(metrics.trainingTime).toBeGreaterThan(0);
    });

    it('should validate model configuration', async () => {
      const invalidConfig: ModelConfig = {
        type: 'linear',
        features: [], // Empty features
        target: 'y',
        hyperparameters: {},
        validationSplit: 0.2,
        trainingData: []
      };

      await expect(trainer.trainModel('invalid-model', invalidConfig)).rejects.toThrow();
    });

    it('should handle insufficient training data', async () => {
      const config: ModelConfig = {
        type: 'linear',
        features: ['x'],
        target: 'y',
        hyperparameters: {},
        validationSplit: 0.2,
        trainingData: [{ x: 1, y: 1 }] // Only one data point
      };

      await expect(trainer.trainModel('insufficient-data-model', config)).rejects.toThrow();
    });
  });

  describe('generateForecast', () => {
    it('should generate forecast predictions', async () => {
      // First train a model
      const config: ModelConfig = {
        type: 'linear',
        features: ['time'],
        target: 'value',
        hyperparameters: {},
        validationSplit: 0.2,
        trainingData: Array.from({ length: 100 }, (_, i) => ({
          time: i,
          value: i * 1.5 + Math.random() * 5
        }))
      };

      await trainer.trainModel('forecast-model', config);

      const forecast = await trainer.generateForecast('forecast-model', 10);

      expect(forecast.predictions).toHaveLength(10);
      expect(forecast.confidence).toBeGreaterThan(0);
      expect(forecast.trend).toMatch(/increasing|decreasing|stable/);
      expect(typeof forecast.seasonality).toBe('boolean');
      expect(forecast.metrics).toBeDefined();
    });

    it('should handle non-existent model', async () => {
      await expect(trainer.generateForecast('non-existent-model', 5)).rejects.toThrow();
    });
  });

  describe('evaluateModelAccuracy', () => {
    it('should evaluate model on test data', async () => {
      // Train a model first
      const config: ModelConfig = {
        type: 'linear',
        features: ['x'],
        target: 'y',
        hyperparameters: {},
        validationSplit: 0.2,
        trainingData: Array.from({ length: 50 }, (_, i) => ({
          x: i,
          y: i * 2
        }))
      };

      await trainer.trainModel('eval-model', config);

      const testData = Array.from({ length: 20 }, (_, i) => ({
        x: i + 50,
        y: (i + 50) * 2
      }));

      const metrics = await trainer.evaluateModelAccuracy('eval-model', testData);

      expect(metrics.accuracy).toBeGreaterThan(0);
      expect(metrics.mse).toBeGreaterThanOrEqual(0);
      expect(metrics.mae).toBeGreaterThanOrEqual(0);
    });
  });

  describe('model management', () => {
    it('should list trained models', () => {
      const models = trainer.listModels();
      expect(Array.isArray(models)).toBe(true);
    });

    it('should retrieve model metrics', async () => {
      const config: ModelConfig = {
        type: 'linear',
        features: ['x'],
        target: 'y',
        hyperparameters: {},
        validationSplit: 0.2,
        trainingData: Array.from({ length: 30 }, (_, i) => ({
          x: i,
          y: i
        }))
      };

      await trainer.trainModel('metrics-model', config);

      const metrics = trainer.getModelMetrics('metrics-model');
      expect(metrics).toBeDefined();
      expect(typeof metrics!.accuracy).toBe('number');
    });

    it('should return null for non-existent model metrics', () => {
      const metrics = trainer.getModelMetrics('non-existent');
      expect(metrics).toBeNull();
    });
  });
});