# @nvlp/config

Shared configuration files for the NVLP monorepo.

## Available Configurations

### ESLint
```typescript
import eslintConfig from '@nvlp/config/eslint';
// or
const eslintConfig = require('@nvlp/config/eslint');
```

### Prettier
```typescript
import prettierConfig from '@nvlp/config/prettier';
// or
const prettierConfig = require('@nvlp/config/prettier');
```

### TypeScript
```typescript
import tsConfig from '@nvlp/config/typescript';
// or
const tsConfig = require('@nvlp/config/typescript');
```

### Jest
```typescript
import jestConfig from '@nvlp/config/jest';
// or
const jestConfig = require('@nvlp/config/jest');
```

## Usage in Projects

### ESLint Configuration
Create `.eslintrc.js` in your project:

```javascript
module.exports = {
  ...require('@nvlp/config/eslint'),
  // Override or extend as needed
  rules: {
    // Project-specific rules
  }
};
```

### Prettier Configuration
Create `.prettierrc.js` in your project:

```javascript
module.exports = require('@nvlp/config/prettier');
```

### TypeScript Configuration
Create `tsconfig.json` in your project:

```json
{
  "extends": "@nvlp/config/typescript",
  "compilerOptions": {
    // Project-specific overrides
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Jest Configuration
Create `jest.config.js` in your project:

```javascript
module.exports = {
  ...require('@nvlp/config/jest'),
  // Project-specific overrides
};
```

## Features

- **Dual Format Support**: Both ESM and CommonJS exports
- **TypeScript Support**: Full type definitions included
- **Consistent Standards**: Shared formatting and linting rules across the monorepo
- **Extensible**: Easy to override or extend in individual packages