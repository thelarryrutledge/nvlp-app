// Simplified ESLint config for types package (only type definitions)
module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': 'error', // No console in types package
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    '*.config.js',
    '*.config.ts',
  ],
};