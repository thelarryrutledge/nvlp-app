module.exports = {
  root: true,
  extends: ['@react-native'],
  plugins: ['react-native', 'import'],
  settings: {
    'import/resolver': {
      alias: {
        map: [
          ['@', './src'],
          ['@/components', './src/components'],
          ['@/screens', './src/screens'],
          ['@/utils', './src/utils'],
          ['@/services', './src/services'],
          ['@/types', './src/types'],
          ['@/constants', './src/constants'],
          ['@/hooks', './src/hooks'],
          ['@/navigation', './src/navigation'],
          ['@/context', './src/context'],
          ['@/assets', './assets'],
        ],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    },
  },
  rules: {
    // TypeScript specific rules (already covered by @react-native config)
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'error',

    // React/React Native specific rules
    'react/prop-types': 'off', // We use TypeScript for prop validation
    'react-native/no-unused-styles': 'error',
    'react-native/split-platform-components': 'error',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
    'react-native/no-raw-text': 'off',
    'react-native/no-single-element-style-arrays': 'error',

    // Import/Export rules
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],

    // General code quality rules
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',

    // Code formatting (let Prettier handle most of this)
    quotes: ['error', 'single', { avoidEscape: true }],
    'jsx-quotes': ['error', 'prefer-double'],
    'comma-dangle': ['error', 'always-multiline'],
    semi: ['error', 'always'],
  },
  overrides: [
    {
      files: ['*.test.ts', '*.test.tsx', '__tests__/**/*'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
    {
      files: ['metro.config.js', 'babel.config.js'],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};
