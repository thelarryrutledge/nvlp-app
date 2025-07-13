module.exports = {
  ...require('@nvlp/config/eslint'),
  rules: {
    ...require('@nvlp/config/eslint').rules,
    // Library-specific rules
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    'no-console': 'warn',
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    '*.config.js',
    '*.config.ts',
    '*.cjs'
  ]
}