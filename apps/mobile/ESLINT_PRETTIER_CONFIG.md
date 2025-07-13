# ESLint and Prettier Configuration for NVLP Mobile

## Overview

ESLint and Prettier are configured to maintain consistent code quality and
formatting throughout the React Native project.

## ESLint Configuration

### Extends

- `@react-native` - React Native's recommended ESLint configuration
- Includes TypeScript support and React/React Native specific rules

### Key Rules

#### TypeScript Rules

- `@typescript-eslint/no-unused-vars` - Prevent unused variables (ignores
  underscore-prefixed)
- `@typescript-eslint/no-explicit-any` - Warn on explicit `any` usage
- `@typescript-eslint/no-non-null-assertion` - Error on non-null assertions

#### React/React Native Rules

- `react/prop-types` - Disabled (using TypeScript for validation)
- `react-native/no-unused-styles` - Error on unused StyleSheet styles
- `react-native/split-platform-components` - Error on platform-specific
  components
- `react-native/no-inline-styles` - Warn on inline styles
- `react-native/no-color-literals` - Warn on hardcoded colors
- `react-native/no-single-element-style-arrays` - Error on single-element style
  arrays

#### Import/Export Rules

- `import/order` - Enforce import grouping and alphabetical ordering
- Automatic grouping: builtin → external → internal → parent → sibling → index
- Newlines between groups for better readability

#### Code Quality Rules

- `no-console` - Warn on console usage
- `no-debugger` - Error on debugger statements
- `prefer-const` - Prefer const for non-reassigned variables
- `no-var` - Error on var usage (use let/const)
- `object-shorthand` - Prefer object shorthand syntax
- `prefer-template` - Prefer template literals over concatenation

### Path Alias Support

ESLint is configured to resolve imports using the same path aliases as
TypeScript:

- `@` → `src`
- `@/components` → `src/components`
- `@/screens` → `src/screens`
- And all other configured aliases

### Special Overrides

- **Test files**: Allow `any` types and console usage
- **Config files**: Allow `require()` statements in Node.js environment

## Prettier Configuration

### Basic Formatting

- **Print Width**: 100 characters
- **Tab Width**: 2 spaces
- **Semicolons**: Required
- **Quotes**: Single quotes for strings, double quotes for JSX
- **Trailing Commas**: Always on multiline
- **Bracket Spacing**: Enabled
- **Arrow Parens**: Avoid when possible

### File-Specific Overrides

- **JSON files**: 80 character width, 2-space indentation
- **Markdown files**: 80 character width, prose wrapping
- **TypeScript/JavaScript**: Explicit parser specification

## NPM Scripts

### Code Quality Commands

```bash
# Lint all files
npm run lint

# Lint and auto-fix issues
npm run lint:fix

# Format all files
npm run format

# Check formatting without changing files
npm run format:check

# Run TypeScript type checking
npm run type-check

# Run complete quality pipeline
npm run code-quality
```

### Complete Quality Pipeline

The `code-quality` script runs:

1. TypeScript type checking
2. ESLint linting
3. Prettier format checking

## Integration with Development Workflow

### Pre-commit Hooks (Recommended)

Consider adding these to your development workflow:

```bash
# Install husky and lint-staged
npm install --save-dev husky lint-staged

# Add to package.json
"husky": {
  "hooks": {
    "pre-commit": "lint-staged"
  }
},
"lint-staged": {
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ]
}
```

### VS Code Integration

Recommended VS Code extensions:

- ESLint
- Prettier - Code formatter
- TypeScript Importer

Add to VS Code settings:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "prettier.requireConfig": true,
  "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

## Ignore Files

### .eslintignore

- Build outputs (`dist/`, `build/`, `coverage/`)
- Platform-specific code (`android/app/build/`, `ios/build/`, `ios/Pods/`)
- Dependencies (`node_modules/`)
- Environment files (`.env*`)

### .prettierignore

- Similar to ESLint ignore
- Additionally ignores package lock files
- Excludes platform-specific directories entirely

## Benefits

### Code Consistency

- Uniform formatting across the entire codebase
- Consistent import organization
- Standardized code patterns

### Error Prevention

- Early detection of potential issues
- TypeScript integration for type safety
- React Native specific validations

### Developer Experience

- Automatic code formatting
- Clear error messages and suggestions
- IDE integration for real-time feedback

### Maintainability

- Easier code reviews
- Reduced merge conflicts
- Consistent code style across team members

## Customization

### Adding New Rules

To add custom rules, update `.eslintrc.js`:

```javascript
rules: {
  // Add your custom rules here
  'custom-rule': 'error',
}
```

### Prettier Customization

Update `.prettierrc.js` for formatting preferences:

```javascript
module.exports = {
  // Modify existing or add new options
  printWidth: 120, // Example change
};
```

This configuration provides a solid foundation for maintaining high code quality
and consistency throughout the React Native development process.
