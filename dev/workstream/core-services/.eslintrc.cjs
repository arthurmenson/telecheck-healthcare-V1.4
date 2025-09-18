module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended'
  ],
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  env: {
    node: true,
    jest: true,
    es2022: true
  },
  rules: {
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'consistent-return': 'error',
    'no-console': 'warn',
    'eqeqeq': 'error',
    'no-unused-vars': ['error', {
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_',
      'ignoreRestSiblings': true
    }]
  },
  overrides: [
    {
      files: ['src/index.ts', 'src/middleware/errorHandler.ts'],
      rules: {
        'no-console': 'off'
      }
    },
    {
      files: ['**/*.ts'],
      rules: {
        'no-unused-vars': 'off'
      }
    }
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    '*.js',
    '*.cjs'
  ]
};