#!/usr/bin/env node

// Simple test runner to work around rollup dependency issues
const { spawn } = require('child_process');
const path = require('path');

// Set environment variables
process.env.NODE_ENV = 'test';
process.env.VITEST_CONFIG = path.join(__dirname, 'vitest.config.ts');

// Try to run vitest directly with node
const testProcess = spawn('node', [
  '--experimental-vm-modules',
  'node_modules/vitest/dist/cli.js',
  'run',
  '--reporter=verbose'
], {
  stdio: 'inherit',
  cwd: __dirname
});

testProcess.on('close', (code) => {
  console.log(`Test process exited with code ${code}`);
  process.exit(code);
});