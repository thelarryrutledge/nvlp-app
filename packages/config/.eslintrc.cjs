module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    '*.config.js',
    '*.config.ts',
    '**/*.d.ts', // Ignore TypeScript declaration files
    '**/setup.template.js', // Ignore Jest template files
  ],
};