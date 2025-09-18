/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './client'),
      '@shared': resolve(__dirname, '../../shared'),
      '@ui': resolve(__dirname, './client/components/ui'),
      '@hooks': resolve(__dirname, './client/hooks'),
      '@services': resolve(__dirname, './client/services'),
      '@types': resolve(__dirname, './client/types'),
      '@utils': resolve(__dirname, './client/utils'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportOnFailure: true,
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.test.*',
        '**/*.spec.*',
        '**/index.ts',
        '**/*.config.*',
        '**/main.tsx',
        '**/App.tsx',
        'client/pages/Index.tsx',
        'client/pages/NotFound.tsx',
        'client/components/ui/**',
        'client/examples/**',
        'client/data/**',
      ],
      include: [
        'client/**/*.{ts,tsx}',
      ],
      // Healthcare-specific coverage thresholds
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Critical healthcare modules require higher coverage
        'client/services/**': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        'client/lib/api-client.ts': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        'client/contexts/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'client/hooks/**': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
      watermarks: {
        statements: [80, 95],
        functions: [80, 95],
        branches: [80, 95],
        lines: [80, 95],
      },
    },
  },
});