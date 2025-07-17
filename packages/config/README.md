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
// Base Node.js configuration
import jestConfig from '@nvlp/config/jest';
// or
const jestConfig = require('@nvlp/config/jest');

// React Native configuration
import jestRNConfig from '@nvlp/config/jest/react-native';
// or  
const jestRNConfig = require('@nvlp/config/jest/react-native');

// jsdom (browser) configuration
import jestDOMConfig from '@nvlp/config/jest/jsdom';
// or
const jestDOMConfig = require('@nvlp/config/jest/jsdom');
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

#### For React Native projects:
```javascript
// jest.config.js
module.exports = {
  ...require('@nvlp/config/jest/react-native'),
  // Project-specific overrides
};
```

#### For Node.js/API projects:
```javascript
// jest.config.js
module.exports = {
  ...require('@nvlp/config/jest'),
  // Project-specific overrides
};
```

#### For Browser/DOM projects:
```javascript
// jest.config.js
module.exports = {
  ...require('@nvlp/config/jest/jsdom'),
  // Project-specific overrides
};
```

#### Setup file
Copy the setup template and customize:
```bash
cp node_modules/@nvlp/config/jest/setup.template.js jest.setup.js
```

## Features

- **Dual Format Support**: Both ESM and CommonJS exports
- **TypeScript Support**: Full type definitions included
- **Consistent Standards**: Shared formatting and linting rules across the monorepo
- **Extensible**: Easy to override or extend in individual packages
- **Project-Specific Examples**: Tailored configurations for React Native, Node.js, and library packages
- **IDE Integration**: VS Code settings and workspace configuration

## Documentation

- [Usage Guide](./USAGE.md) - Detailed examples for different project types
- [Changelog](./CHANGELOG.md) - Version history and changes

## Package Structure

```
packages/config/
├── eslint/
│   ├── index.js      # ESM export
│   ├── index.cjs     # CommonJS export
│   └── index.d.ts    # TypeScript declarations
├── prettier/
│   ├── index.js
│   ├── index.cjs
│   └── index.d.ts
├── typescript/
│   ├── index.js
│   ├── index.cjs
│   └── index.d.ts
├── jest/
│   ├── index.js
│   ├── index.cjs
│   └── index.d.ts
├── README.md
├── USAGE.md
├── CHANGELOG.md
├── package.json
└── tsconfig.json
```