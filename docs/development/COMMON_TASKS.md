# Common Development Tasks

This guide covers the most frequent tasks you'll perform while developing in the NVLP monorepo.

## Table of Contents

- [Package Development](#package-development)
- [Mobile App Development](#mobile-app-development)
- [API Development](#api-development)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Dependency Management](#dependency-management)
- [Build & Deployment](#build--deployment)
- [Debugging & Troubleshooting](#debugging--troubleshooting)

## Package Development

### Adding a New Shared Type

1. **Edit the types package**
   ```bash
   cd packages/types/src
   # Add your types to index.ts or create new files
   ```

2. **Example: Adding a new interface**
   ```typescript
   // packages/types/src/budget.ts
   export interface BudgetCategory {
     id: string;
     name: string;
     allocated: number;
     spent: number;
   }
   
   // packages/types/src/index.ts
   export * from './budget';
   ```

3. **Build and test**
   ```bash
   pnpm --filter @nvlp/types build
   pnpm --filter @nvlp/types test
   ```

### Updating the API Client

1. **Add new client methods**
   ```bash
   cd packages/client/src
   # Edit existing files or create new ones
   ```

2. **Example: Adding a budget service**
   ```typescript
   // packages/client/src/services/budget.ts
   import { BudgetCategory } from '@nvlp/types';
   
   export class BudgetService {
     async getCategories(): Promise<BudgetCategory[]> {
       // Implementation
     }
   }
   
   // packages/client/src/index.ts
   export { BudgetService } from './services/budget';
   ```

3. **Build and test**
   ```bash
   pnpm --filter @nvlp/client build
   pnpm --filter @nvlp/client test
   ```

### Modifying Shared Configuration

1. **Update ESLint rules**
   ```bash
   cd packages/config/eslint
   # Edit base.js, react.js, or react-native.js
   ```

2. **Update TypeScript config**
   ```bash
   cd packages/config/typescript
   # Edit base configs or create new ones
   ```

3. **Test across packages**
   ```bash
   pnpm lint
   pnpm type-check
   ```

## Mobile App Development

### Adding a New Screen

1. **Create screen component**
   ```bash
   cd apps/mobile/src/screens
   mkdir BudgetScreen
   ```

2. **Example screen structure**
   ```typescript
   // apps/mobile/src/screens/BudgetScreen/BudgetScreen.tsx
   import React from 'react';
   import { View, Text, StyleSheet } from 'react-native';
   
   export const BudgetScreen: React.FC = () => {
     return (
       <View style={styles.container}>
         <Text>Budget Screen</Text>
       </View>
     );
   };
   
   const styles = StyleSheet.create({
     container: {
       flex: 1,
       justifyContent: 'center',
       alignItems: 'center',
     },
   });
   ```

3. **Add to navigation**
   ```typescript
   // apps/mobile/src/navigation/AppNavigator.tsx
   import { BudgetScreen } from '../screens/BudgetScreen/BudgetScreen';
   
   // Add to stack navigator
   ```

4. **Test the screen**
   ```bash
   pnpm --filter @nvlp/mobile start
   pnpm --filter @nvlp/mobile ios
   ```

### Adding a New Component

1. **Create component**
   ```bash
   cd apps/mobile/src/components
   mkdir BudgetCard
   ```

2. **Example component**
   ```typescript
   // apps/mobile/src/components/BudgetCard/BudgetCard.tsx
   import React from 'react';
   import { View, Text, StyleSheet } from 'react-native';
   import { BudgetCategory } from '@nvlp/types';
   
   interface BudgetCardProps {
     category: BudgetCategory;
   }
   
   export const BudgetCard: React.FC<BudgetCardProps> = ({ category }) => {
     return (
       <View style={styles.container}>
         <Text style={styles.name}>{category.name}</Text>
         <Text>Allocated: ${category.allocated}</Text>
         <Text>Spent: ${category.spent}</Text>
       </View>
     );
   };
   
   const styles = StyleSheet.create({
     container: {
       padding: 16,
       backgroundColor: '#f5f5f5',
       borderRadius: 8,
       marginVertical: 4,
     },
     name: {
       fontSize: 18,
       fontWeight: 'bold',
     },
   });
   ```

3. **Export component**
   ```typescript
   // apps/mobile/src/components/index.ts
   export { BudgetCard } from './BudgetCard/BudgetCard';
   ```

### Integrating API Client

1. **Use client in component**
   ```typescript
   import React, { useEffect, useState } from 'react';
   import { NVLPClient } from '@nvlp/client';
   import { BudgetCategory } from '@nvlp/types';
   
   export const BudgetScreen: React.FC = () => {
     const [categories, setCategories] = useState<BudgetCategory[]>([]);
     const [client] = useState(() => new NVLPClient());
   
     useEffect(() => {
       const loadCategories = async () => {
         try {
           const data = await client.budget.getCategories();
           setCategories(data);
         } catch (error) {
           console.error('Failed to load categories:', error);
         }
       };
   
       loadCategories();
     }, [client]);
   
     return (
       // Render categories
     );
   };
   ```

### Running on Different Platforms

**iOS Development:**
```bash
# Start Metro bundler
pnpm --filter @nvlp/mobile start

# Run on iOS simulator (in new terminal)
pnpm --filter @nvlp/mobile ios

# Run on specific iOS device
pnpm --filter @nvlp/mobile ios --device "iPhone 14"
```

**Android Development:**
```bash
# Start Metro bundler
pnpm --filter @nvlp/mobile start

# Run on Android emulator (in new terminal)
pnpm --filter @nvlp/mobile android

# Run on physical device
pnpm --filter @nvlp/mobile android --device
```

## API Development

### Adding a New Edge Function

1. **Create function directory**
   ```bash
   mkdir supabase/functions/budget
   cd supabase/functions/budget
   ```

2. **Create function file**
   ```typescript
   // supabase/functions/budget/index.ts
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
   import { corsHeaders } from '../_shared/cors.ts';
   
   serve(async (req) => {
     if (req.method === 'OPTIONS') {
       return new Response('ok', { headers: corsHeaders });
     }
   
     try {
       const { method } = req;
       
       switch (method) {
         case 'GET':
           return await handleGetBudget(req);
         case 'POST':
           return await handleCreateBudget(req);
         default:
           return new Response('Method not allowed', { status: 405 });
       }
     } catch (error) {
       return new Response(JSON.stringify({ error: error.message }), {
         status: 500,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
   });
   
   async function handleGetBudget(req: Request) {
     // Implementation
     return new Response(JSON.stringify({ categories: [] }), {
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
   }
   ```

3. **Deploy function**
   ```bash
   pnpm deploy:api:budget
   # Or deploy all functions
   pnpm deploy:api
   ```

### Updating Existing Function

1. **Edit function**
   ```bash
   cd supabase/functions/existing-function
   # Edit index.ts
   ```

2. **Test locally (if possible)**
   ```bash
   deno run --allow-net --allow-env index.ts
   ```

3. **Deploy**
   ```bash
   pnpm deploy:api:existing-function
   ```

### Adding Database Types

1. **Generate types from database**
   ```bash
   pnpm --filter @nvlp/api db:types
   ```

2. **Use generated types**
   ```typescript
   // supabase/functions/budget/index.ts
   import { Database } from '../_shared/database.types.ts';
   
   type BudgetCategory = Database['public']['Tables']['budget_categories']['Row'];
   ```

## Testing & Quality Assurance

### Running Tests

**All tests:**
```bash
pnpm test
```

**Package-specific tests:**
```bash
pnpm test:types      # Types package
pnpm test:client     # Client package
pnpm test:mobile     # Mobile app
pnpm test:api        # API functions
```

**Watch mode:**
```bash
pnpm test:watch
```

**Coverage:**
```bash
pnpm --filter @nvlp/client test:coverage
```

### Writing Tests

**Client package test example:**
```typescript
// packages/client/src/services/__tests__/budget.test.ts
import { describe, it, expect, vi } from 'vitest';
import { BudgetService } from '../budget';

describe('BudgetService', () => {
  it('should fetch categories', async () => {
    const service = new BudgetService();
    const categories = await service.getCategories();
    expect(categories).toBeInstanceOf(Array);
  });
});
```

**Mobile component test example:**
```typescript
// apps/mobile/src/components/__tests__/BudgetCard.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { BudgetCard } from '../BudgetCard/BudgetCard';

describe('BudgetCard', () => {
  it('renders category information', () => {
    const category = {
      id: '1',
      name: 'Groceries',
      allocated: 500,
      spent: 250,
    };

    const { getByText } = render(<BudgetCard category={category} />);
    
    expect(getByText('Groceries')).toBeTruthy();
    expect(getByText('Allocated: $500')).toBeTruthy();
    expect(getByText('Spent: $250')).toBeTruthy();
  });
});
```

### Code Quality Checks

**Type checking:**
```bash
pnpm type-check
```

**Linting:**
```bash
pnpm lint           # Check all packages
pnpm lint:fix       # Fix auto-fixable issues
pnpm lint:mobile    # Mobile-specific linting
```

**Formatting:**
```bash
pnpm format         # Format all files
pnpm format:check   # Check formatting
```

**Complete verification:**
```bash
pnpm verify         # build + test + lint
```

## Dependency Management

### Adding Dependencies

**Production dependency:**
```bash
# To specific package
pnpm --filter @nvlp/mobile add react-native-vector-icons

# To root (shared)
pnpm add -D typescript
```

**Development dependency:**
```bash
# To specific package
pnpm --filter @nvlp/client add -D vitest

# To root workspace
pnpm add -D eslint
```

**Workspace dependency:**
```bash
# Reference another package in monorepo
pnpm --filter @nvlp/mobile add @nvlp/types@workspace:*
```

### Updating Dependencies

**Update all:**
```bash
pnpm update:deps
```

**Update specific package:**
```bash
pnpm --filter @nvlp/mobile update react-native
```

**Check outdated:**
```bash
pnpm outdated
```

### Removing Dependencies

```bash
# From specific package
pnpm --filter @nvlp/mobile remove old-package

# From root
pnpm remove old-package
```

## Build & Deployment

### Building Packages

**Build all packages:**
```bash
pnpm build:packages
```

**Build specific package:**
```bash
pnpm build:types
pnpm build:client
```

**Build with analysis:**
```bash
pnpm build:analyze
```

### Building Mobile Apps

**iOS:**
```bash
# Development build
pnpm build:mobile:ios

# Production build
pnpm build:mobile:ios:prod
```

**Android:**
```bash
# Development build
pnpm build:mobile:android

# Production build (AAB)
pnpm build:mobile:android:prod
```

**Validate build config:**
```bash
pnpm --filter @nvlp/mobile build:validate:ios
pnpm --filter @nvlp/mobile build:validate:android
```

### Deploying API

**Deploy all functions:**
```bash
pnpm deploy:api
```

**Deploy specific function:**
```bash
pnpm deploy:api:auth
pnpm deploy:api:dashboard
pnpm deploy:api:budget
```

## Debugging & Troubleshooting

### Common Issues and Solutions

**Metro bundler cache issues:**
```bash
pnpm --filter @nvlp/mobile start:reset
```

**Type errors after package changes:**
```bash
pnpm build:packages
pnpm type-check
```

**Dependency issues:**
```bash
pnpm clean:deep
pnpm install
pnpm build:packages
```

**iOS build issues:**
```bash
cd apps/mobile/ios
pod install
cd ../../..
pnpm --filter @nvlp/mobile build:validate:ios
```

**Android build issues:**
```bash
cd apps/mobile/android
./gradlew clean
cd ../../..
pnpm --filter @nvlp/mobile build:validate:android
```

### Debugging Mobile Apps

**React Native Debugger:**
```bash
pnpm --filter @nvlp/mobile devtools
```

**Flipper (if installed):**
```bash
# Flipper will auto-connect to running app
pnpm --filter @nvlp/mobile ios
```

**Console logging:**
```bash
# View Metro logs
pnpm --filter @nvlp/mobile start

# View device logs (iOS)
xcrun simctl spawn booted log stream --predicate 'process == "NVLPMobile"'

# View device logs (Android)
adb logcat
```

### Debugging API Functions

**Local testing with curl:**
```bash
curl -X GET https://your-project.supabase.co/functions/v1/budget \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**View function logs:**
```bash
# In Supabase dashboard > Functions > Logs
# Or use Supabase CLI
supabase functions logs budget
```

### Performance Profiling

**Bundle analysis:**
```bash
pnpm --filter @nvlp/mobile build:analyze
```

**Build performance:**
```bash
time pnpm build:packages
```

**Dependency analysis:**
```bash
pnpm analyze:dependencies
```

## Git Workflow

### Creating Feature Branches

```bash
git checkout -b feature/budget-categories
# Make changes
git add .
git commit -m "Add budget categories feature"
git push origin feature/budget-categories
```

### Commit Message Format

Follow this format:
```
type(scope): description

- Detailed change 1
- Detailed change 2

Co-Authored-By: Claude <noreply@anthropic.com>
```

Examples:
```bash
git commit -m "feat(mobile): add budget category screen

- Create BudgetScreen component
- Add navigation integration
- Implement category listing

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Pre-commit Checks

Always run before committing:
```bash
pnpm verify
```

## Quick Reference Commands

```bash
# Development
pnpm dev                    # Start development
pnpm dev:mobile            # Mobile development
pnpm build:packages        # Build shared packages

# Testing
pnpm test                  # Run all tests
pnpm type-check           # Type checking
pnpm lint                 # Code linting

# Building
pnpm build:mobile:ios     # iOS build
pnpm build:mobile:android # Android build

# Deployment
pnpm deploy:api           # Deploy API functions

# Maintenance
pnpm clean:deep           # Deep clean
pnpm update:deps          # Update dependencies
```

This guide covers the most common tasks you'll encounter. For more specific scenarios, check the other documentation files or ask for help!