# @nvlp/types

Shared TypeScript type definitions for the NVLP (Virtual Envelope Budget App) monorepo.

## Overview

This package contains all shared type definitions used across the NVLP ecosystem, including:
- Domain models (User, Budget, Category, Envelope, etc.)
- API request/response types
- Enumeration types and constants
- Authentication types

## Structure

```
src/
├── domain/          # Core business entity types
│   ├── user.ts      # User and profile types
│   ├── budget.ts    # Budget and income source types
│   └── financial.ts # Categories, envelopes, and payees
├── api/             # API-related types
│   ├── requests.ts  # Input types for API operations
│   └── responses.ts # Response and error types
├── enums/           # Enumeration types
│   └── financial.ts # Financial constants and unions
└── index.ts         # Main exports
```

## Usage

```typescript
import { 
  User, 
  Budget, 
  CreateBudgetInput,
  ApiResponse 
} from '@nvlp/types';

// Use shared types in your application
const user: User = {
  id: '123',
  email: 'user@example.com',
  emailConfirmed: true
};
```

## Building

```bash
# Build the package
pnpm build

# Watch for changes during development
pnpm dev

# Type check without building
pnpm type-check
```

## Dependencies

This package has zero runtime dependencies and minimal build dependencies:
- `tsup` for building
- `typescript` for type checking

The package exports both ESM and CommonJS formats for maximum compatibility.