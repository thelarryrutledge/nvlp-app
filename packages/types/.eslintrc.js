module.exports = {
  ...require('@nvlp/config/eslint'),
  rules: {
    ...require('@nvlp/config/eslint').rules,
    // Types package specific rules - be more strict
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    'no-console': 'error', // No console in types package
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    '*.config.js',
    '*.config.ts',
  ],
};