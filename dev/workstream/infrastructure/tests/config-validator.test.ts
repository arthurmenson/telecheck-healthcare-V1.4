import { validateConfiguration, type Configuration } from '../src/config-validator';

describe('ConfigValidator', () => {
  describe('validateConfiguration', () => {
    it('should throw error when configuration is undefined', () => {
      expect(() => validateConfiguration(undefined)).toThrow(
        'Configuration cannot be undefined'
      );
    });

    it('should throw error when required fields are missing', () => {
      const invalidConfig = {} as Configuration;

      expect(() => validateConfiguration(invalidConfig)).toThrow(
        'Required field "environment" is missing'
      );
    });

    it('should throw error when environment is not valid', () => {
      const invalidConfig: Configuration = {
        environment: 'invalid' as any,
        logLevel: 'info',
        port: 3000
      };

      expect(() => validateConfiguration(invalidConfig)).toThrow(
        'Environment must be one of: development, staging, production'
      );
    });

    it('should throw error when port is not a valid number', () => {
      const invalidConfig: Configuration = {
        environment: 'development',
        logLevel: 'info',
        port: -1
      };

      expect(() => validateConfiguration(invalidConfig)).toThrow(
        'Port must be between 1 and 65535'
      );
    });

    it('should return validated configuration when all fields are valid', () => {
      const validConfig: Configuration = {
        environment: 'development',
        logLevel: 'info',
        port: 3000
      };

      const result = validateConfiguration(validConfig);

      expect(result).toEqual(validConfig);
    });

    it('should apply default values when optional fields are missing', () => {
      const minimalConfig: Partial<Configuration> = {
        environment: 'development'
      };

      const result = validateConfiguration(minimalConfig as Configuration);

      expect(result).toEqual({
        environment: 'development',
        logLevel: 'info',
        port: 3000
      });
    });
  });
});