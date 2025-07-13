module.exports = {
  ...require('@nvlp/config/eslint'),
  env: {
    ...require('@nvlp/config/eslint').env,
    node: true,
  },
  rules: {
    ...require('@nvlp/config/eslint').rules,
    // API/Server specific rules
    'no-console': 'off', // Allow console in API/server code
    '@typescript-eslint/no-unused-vars': [
      'error', 
      { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }
    ],
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    'supabase/migrations',
    '*.config.js',
    '*.config.ts',
  ],
};