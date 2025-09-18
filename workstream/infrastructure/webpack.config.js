import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/index.ts',
  target: 'node',

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.js'],
  },

  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },

  optimization: {
    minimize: true,
    usedExports: true,
    sideEffects: false,
  },

  stats: {
    assets: true,
    modules: false,
    chunks: false,
    colors: true,
    timings: true,
    builtAt: true,
    version: false,
  },

  performance: {
    maxEntrypointSize: 250000,
    maxAssetSize: 250000,
    hints: 'warning',
  },

  externals: {
    // Exclude node_modules from bundle for Node.js apps
  },
};