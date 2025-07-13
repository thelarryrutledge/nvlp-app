module.exports = {
  ...require('@nvlp/config/eslint'),
  extends: [
    ...require('@nvlp/config/eslint').extends,
    '@react-native',
  ],
  plugins: [
    ...require('@nvlp/config/eslint').plugins,
    'react',
    'react-hooks',
    'react-native',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    ...require('@nvlp/config/eslint').rules,
    // React Native specific rules
    'react/react-in-jsx-scope': 'off', // Not needed in React Native
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react-native/no-unused-styles': 'error',
    'react-native/split-platform-components': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
    // Allow console in mobile development
    'no-console': 'off',
  },
  ignorePatterns: [
    'node_modules',
    'android',
    'ios',
    'metro.config.js',
    'babel.config.js',
  ],
};