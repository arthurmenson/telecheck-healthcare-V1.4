#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const checkBuildArtifacts = () => {
  const distDir = path.join(process.cwd(), 'dist');

  if (!fs.existsSync(distDir)) {
    console.error('❌ Build failed: dist directory not found');
    process.exit(1);
  }

  const files = fs.readdirSync(distDir);
  if (files.length === 0) {
    console.error('❌ Build failed: no files in dist directory');
    process.exit(1);
  }

  console.log('✅ Build artifacts verified:');
  files.forEach(file => {
    const stats = fs.statSync(path.join(distDir, file));
    console.log(`  - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
  });

  const totalSize = files.reduce((sum, file) => {
    const stats = fs.statSync(path.join(distDir, file));
    return sum + stats.size;
  }, 0);

  console.log(`\nTotal build size: ${(totalSize / 1024).toFixed(2)} KB`);

  if (totalSize > 1024 * 1024) { // 1MB
    console.warn('⚠️  Build size is large, consider optimization');
  }
};

checkBuildArtifacts();