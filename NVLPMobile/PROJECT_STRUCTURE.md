# NVLP Mobile Project Structure

## Overview

This React Native project follows a modular, scalable architecture with clear
separation of concerns.

## Folder Structure

```
NVLPMobile/
├── src/                          # Source code
│   ├── components/               # Reusable UI components
│   │   ├── common/              # Common components (Button, Header, etc.)
│   │   ├── forms/               # Form-specific components
│   │   ├── charts/              # Chart and visualization components
│   │   ├── ui/                  # Basic UI elements
│   │   └── index.ts             # Export all components
│   ├── screens/                  # Screen components
│   │   ├── auth/                # Authentication screens
│   │   ├── budget/              # Budget management screens
│   │   ├── envelope/            # Envelope management screens
│   │   ├── transaction/         # Transaction screens
│   │   ├── profile/             # User profile screens
│   │   ├── settings/            # App settings screens
│   │   └── index.ts             # Export all screens
│   ├── utils/                    # Utility functions
│   │   ├── format/              # Data formatting utilities
│   │   ├── validation/          # Input validation utilities
│   │   ├── storage/             # Local storage utilities
│   │   ├── date/                # Date manipulation utilities
│   │   └── index.ts             # Export all utilities
│   ├── services/                 # Business logic and API calls
│   │   ├── api/                 # API service layer
│   │   ├── auth/                # Authentication services
│   │   ├── cache/               # Caching services
│   │   ├── sync/                # Data synchronization services
│   │   └── index.ts             # Export all services
│   ├── types/                    # TypeScript type definitions
│   │   └── index.ts             # Export all types
│   ├── hooks/                    # Custom React hooks
│   │   └── index.ts             # Export all hooks
│   ├── constants/                # App constants and configuration
│   │   └── index.ts             # Export all constants
│   ├── navigation/               # Navigation configuration
│   │   └── index.ts             # Export navigation components
│   ├── context/                  # React Context providers
│   │   └── index.ts             # Export all context providers
│   └── index.ts                  # Main src export file
├── assets/                       # Static assets
│   ├── images/                  # Image files
│   ├── icons/                   # Icon files
│   └── fonts/                   # Custom fonts
├── android/                      # Android-specific code
├── ios/                          # iOS-specific code
└── __tests__/                    # Test files
```

## Architecture Principles

### 1. Modular Design

- Each folder has a specific responsibility
- Components are organized by type and functionality
- Clear separation between UI, business logic, and data

### 2. TypeScript First

- All code written in TypeScript with strict mode
- Comprehensive type definitions
- Import/export types from centralized location

### 3. Clean Imports

- Index files allow for clean imports: `import { Button } from '@/components'`
- Absolute imports with path aliases (configured separately)
- Consistent export patterns

### 4. Scalability

- Structure supports growing codebase
- Easy to add new features without restructuring
- Clear guidelines for where new code belongs

## Import Strategy

### Barrel Exports

Each major folder has an `index.ts` file that exports all modules from that
folder, enabling clean imports:

```typescript
// Instead of:
import Button from '../components/common/Button';
import Header from '../components/common/Header';

// Use:
import { Button, Header } from '@/components';
```

### Path Aliases (To be configured)

- `@/components` → `src/components`
- `@/screens` → `src/screens`
- `@/utils` → `src/utils`
- `@/services` → `src/services`
- `@/types` → `src/types`
- `@/constants` → `src/constants`
- `@/hooks` → `src/hooks`
- `@/navigation` → `src/navigation`
- `@/context` → `src/context`

## Guidelines

### Components

- Keep components small and focused
- Use TypeScript interfaces for props
- Include proper prop validation
- Follow React Native best practices

### Screens

- One screen per file
- Use descriptive names (e.g., `LoginScreen`, `BudgetListScreen`)
- Include proper navigation typing
- Handle loading and error states

### Services

- Separate API calls from component logic
- Include proper error handling
- Use async/await patterns
- Implement retry logic where appropriate

### Types

- Define interfaces for all data structures
- Use union types for controlled values
- Extend base interfaces when appropriate
- Keep types close to where they're used

### Utils

- Pure functions only
- Include comprehensive unit tests
- Use descriptive function names
- Group related utilities together

This structure provides a solid foundation for building a scalable, maintainable
React Native application while following industry best practices.
