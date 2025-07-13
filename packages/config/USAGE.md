# Configuration Usage Guide

This guide shows how to use the shared configurations in different scenarios within the NVLP monorepo.

## Quick Start

### For React Native Projects (apps/mobile)

Create `.eslintrc.js`:
```javascript
module.exports = {
  ...require('@nvlp/config/eslint'),
  extends: [
    ...require('@nvlp/config/eslint').extends,
    '@react-native-community',
  ],
  rules: {
    ...require('@nvlp/config/eslint').rules,
    'react-native/no-unused-styles': 'error',
    'react-native/split-platform-components': 'warn',
  },
};
```

Create `tsconfig.json`:
```json
{
  "extends": "@nvlp/config/typescript",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["react-native", "jest"]
  },
  "include": [
    "src/**/*",
    "*.ts",
    "*.tsx"
  ],
  "exclude": [
    "node_modules",
    "android",
    "ios"
  ]
}
```

### For Node.js/API Projects (apps/api)

Create `.eslintrc.js`:
```javascript
module.exports = {
  ...require('@nvlp/config/eslint'),
  env: {
    ...require('@nvlp/config/eslint').env,
    node: true,
  },
  rules: {
    ...require('@nvlp/config/eslint').rules,
    'no-console': 'off', // Allow console in API
  },
};
```

Create `tsconfig.json`:
```json
{
  "extends": "@nvlp/config/typescript",
  "compilerOptions": {
    "types": ["node"],
    "moduleResolution": "node",
    "target": "ES2022",
    "lib": ["ES2022"]
  },
  "include": [
    "src/**/*",
    "supabase/functions/**/*"
  ]
}
```

### For Package/Library Projects (packages/*)

Create `.eslintrc.js`:
```javascript
module.exports = {
  ...require('@nvlp/config/eslint'),
  rules: {
    ...require('@nvlp/config/eslint').rules,
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
  },
};
```

Create `tsconfig.json`:
```json
{
  "extends": "@nvlp/config/typescript",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## Advanced Configuration

### Custom ESLint Rules by Project Type

#### React Native Specific
```javascript
// .eslintrc.js for mobile app
module.exports = {
  ...require('@nvlp/config/eslint'),
  plugins: [
    ...require('@nvlp/config/eslint').plugins,
    'react',
    'react-hooks',
    'react-native',
  ],
  extends: [
    ...require('@nvlp/config/eslint').extends,
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    '@react-native-community',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    ...require('@nvlp/config/eslint').rules,
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
```

#### Library Package Specific
```javascript
// .eslintrc.js for packages
module.exports = {
  ...require('@nvlp/config/eslint'),
  rules: {
    ...require('@nvlp/config/eslint').rules,
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
  },
};
```

### Jest Configuration Examples

#### For Testing with React Native
```javascript
// jest.config.js
module.exports = {
  ...require('@nvlp/config/jest'),
  preset: 'react-native',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '@testing-library/jest-native/extend-expect',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@nvlp)/)',
  ],
};
```

#### For Testing Node.js/Edge Functions
```javascript
// jest.config.js
module.exports = {
  ...require('@nvlp/config/jest'),
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    'supabase/functions/**/*.{ts,js}',
    '!**/*.d.ts',
  ],
};
```

## IDE Integration

### VS Code Settings
Create `.vscode/settings.json` in project root:
```json
{
  "eslint.workingDirectories": [
    "apps/api",
    "apps/mobile", 
    "packages/client",
    "packages/types",
    "packages/config"
  ],
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## Troubleshooting

### Common Issues

1. **Import Resolution**: Make sure to install `@nvlp/config` as a devDependency in each project
2. **TypeScript Paths**: Use relative paths in tsconfig extends, not package names
3. **ESLint Parser**: Ensure @typescript-eslint/parser is installed where needed
4. **React Native Metro**: May need to add config package to Metro resolver

### Validation Commands

Test configurations work correctly:
```bash
# Test ESLint
pnpm eslint . --ext .ts,.tsx,.js,.jsx

# Test TypeScript
pnpm tsc --noEmit

# Test Prettier
pnpm prettier --check .

# Test Jest (if tests exist)
pnpm jest --passWithNoTests
```