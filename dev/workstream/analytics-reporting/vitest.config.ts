import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    watch: {
      ignored: ['node_modules', 'dist', 'coverage'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@analytics': resolve(__dirname, './src/analytics'),
      '@dashboards': resolve(__dirname, './src/dashboards'),
      '@validation': resolve(__dirname, './src/validation'),
      '@ml': resolve(__dirname, './src/ml'),
      '@streaming': resolve(__dirname, './src/streaming'),
      '@health': resolve(__dirname, './src/health'),
      '@financial': resolve(__dirname, './src/financial'),
      '@data-quality': resolve(__dirname, './src/data-quality'),
      '@utils': resolve(__dirname, './src/utils'),
    },
  },
});