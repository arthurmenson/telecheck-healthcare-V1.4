import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: [
      'tests/unit/fhir/**/*.test.ts',
      'tests/integration/fhir/**/*.test.ts'
    ],
    testTimeout: 60000, // Extended timeout for FHIR compliance tests
    coverage: {
      ...baseConfig.test?.coverage,
      include: ['src/fhir/**/*.ts'],
      exclude: [
        ...baseConfig.test?.coverage?.exclude || [],
        'src/fhir/**/*.d.ts'
      ],
      thresholds: {
        // Strict coverage requirements for FHIR implementation
        global: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    }
  }
});