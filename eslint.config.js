// eslint.config.js — Flat config (ESLint 9+)
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'bin/**/*.js', 'test/**/*.js', 'examples/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      // Correctness
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off',

      // Style
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'prefer-const': 'error',
      'no-var': 'error',

      // Best practices
      'no-throw-literal': 'error',
      'no-return-assign': 'error',
    },
  },
  {
    // Relax rules for test files
    files: ['test/**/*.js'],
    rules: {
      'no-unused-vars': 'warn',
    },
  },
];
