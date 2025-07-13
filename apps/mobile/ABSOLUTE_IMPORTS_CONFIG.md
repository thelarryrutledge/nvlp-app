# Absolute Imports Configuration for NVLP Mobile

## Overview
Absolute imports are configured to provide cleaner, more maintainable import statements throughout the React Native project. Instead of relative imports like `../../../components/Button`, you can use `@/components/Button`.

## Path Aliases
The following path aliases are configured:

| Alias | Maps To | Example Usage |
|-------|---------|---------------|
| `@` | `./src` | `import { something } from '@/something'` |
| `@/components` | `./src/components` | `import { Button } from '@/components'` |
| `@/screens` | `./src/screens` | `import { HomeScreen } from '@/screens'` |
| `@/utils` | `./src/utils` | `import { formatCurrency } from '@/utils'` |
| `@/services` | `./src/services` | `import { apiService } from '@/services'` |
| `@/types` | `./src/types` | `import type { User } from '@/types'` |
| `@/constants` | `./src/constants` | `import { COLORS } from '@/constants'` |
| `@/hooks` | `./src/hooks` | `import { useAuth } from '@/hooks'` |
| `@/navigation` | `./src/navigation` | `import { RootNavigator } from '@/navigation'` |
| `@/context` | `./src/context` | `import { AuthProvider } from '@/context'` |
| `@/assets` | `./assets` | `import logo from '@/assets/logo.png'` |

## Configuration Files

### 1. TypeScript Configuration (`tsconfig.json`)
TypeScript is configured with path mappings in the `compilerOptions.paths` section:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components": ["src/components"],
      // ... other aliases
    }
  }
}
```

### 2. Babel Configuration (`babel.config.js`)
Babel uses the `babel-plugin-module-resolver` to transform imports:

```javascript
module.exports = {
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
          '@/components': './src/components',
          // ... other aliases
        },
        extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.json', '.tsx', '.ts', '.native.js'],
      },
    ],
  ],
};
```

### 3. Metro Configuration (`metro.config.js`)
Metro bundler is configured with resolver aliases:

```javascript
const config = {
  resolver: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      // ... other aliases
    },
  },
};
```

### 4. ESLint Configuration (`.eslintrc.js`)
ESLint is configured to resolve the aliases for import/order rules:

```javascript
module.exports = {
  settings: {
    'import/resolver': {
      alias: {
        map: [
          ['@', './src'],
          ['@/components', './src/components'],
          // ... other aliases
        ],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    },
  },
};
```

## Usage Examples

### Before (Relative Imports)
```typescript
// From src/screens/auth/LoginScreen.tsx
import { Button } from '../../../components/common/Button';
import { useAuth } from '../../../hooks/useAuth';
import { COLORS } from '../../../constants';
import type { User } from '../../../types';
```

### After (Absolute Imports)
```typescript
// From src/screens/auth/LoginScreen.tsx
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants';
import type { User } from '@/types';
```

## Benefits

### 1. Cleaner Code
- No more counting directory levels (`../../../`)
- More readable and maintainable imports
- Consistent import paths across the project

### 2. Easier Refactoring
- Moving files doesn't break imports
- Renaming directories only requires updating the alias configuration
- Less prone to errors during restructuring

### 3. Better Developer Experience
- Autocomplete works better with absolute paths
- Easier to understand project structure from imports
- Less cognitive load when writing imports

### 4. Consistency
- All configuration files (TypeScript, Babel, Metro, ESLint) use the same aliases
- Ensures imports work correctly across all tools
- Prevents configuration drift

## Adding New Aliases

To add a new path alias:

1. Add to `tsconfig.json` paths
2. Add to `babel.config.js` alias section
3. Add to `metro.config.js` resolver.alias
4. Add to `.eslintrc.js` import/resolver settings
5. Restart Metro bundler and TypeScript compiler

## Troubleshooting

### Import Not Resolving
1. Ensure all configuration files have the alias
2. Restart Metro bundler (`npx react-native start --reset-cache`)
3. Clear watchman: `watchman watch-del-all`
4. Restart TypeScript server in your IDE

### ESLint Import Errors
1. Check `.eslintrc.js` has the alias in import/resolver settings
2. Ensure `eslint-import-resolver-alias` is installed
3. Run `npm run lint:fix` to auto-fix import ordering

### IDE Autocomplete Not Working
1. Restart your IDE/TypeScript service
2. Ensure `tsconfig.json` is in the project root
3. Check that your IDE is using the project's TypeScript version

This configuration provides a solid foundation for using absolute imports throughout the React Native development process.