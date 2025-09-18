/// <reference types="vitest" />
import { defineConfig } from 'vite';
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
  server: {
    port: 5173,
    host: true,
    proxy: {
      // PMS Core Services (main API)
      '/api/patients': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/api/billing': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/api/claims': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/api/revenue': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/api/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // AI/ML Services
      '/api/ai': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/api/models': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/api/validation': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // Analytics & Reporting
      '/api/analytics': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false,
      },
      '/api/reports': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false,
      },
      '/api/metrics': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        secure: false,
      },
      // PMS Integrations
      '/api/integrations': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        secure: false,
      },
      '/api/fhir': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        secure: false,
      },
      '/api/epic': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        secure: false,
      },
      '/api/cerner': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        secure: false,
      },
      // Default fallback to PMS Core Services
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-accordion', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
});