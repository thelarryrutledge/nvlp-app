# Workspace Commands Reference

This is your complete reference for all available commands in the NVLP monorepo workspace.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Development Commands](#development-commands)
- [Build Commands](#build-commands)
- [Test Commands](#test-commands)
- [Quality & Linting Commands](#quality--linting-commands)
- [Package Management Commands](#package-management-commands)
- [Mobile Development Commands](#mobile-development-commands)
- [API Development Commands](#api-development-commands)
- [Deployment Commands](#deployment-commands)
- [Maintenance Commands](#maintenance-commands)
- [Utility Commands](#utility-commands)

## Quick Reference

### Most Used Commands
```bash
pnpm dev                    # Start development servers
pnpm build:packages         # Build shared packages
pnpm test                   # Run all tests
pnpm type-check            # TypeScript validation
pnpm lint                  # Code linting
pnpm verify                # build + test + lint
```

### Emergency Commands
```bash
pnpm clean:deep            # Complete cleanup + reinstall
pnpm build:packages        # Rebuild all packages
pnpm verify                # Verify everything works
```

## Development Commands

### Start Development Servers

```bash
# Main development (packages only)
pnpm dev

# Full development (all apps + packages)
pnpm dev:all

# Watch mode for packages only
pnpm dev:packages

# Development with all apps
pnpm dev:full

# Specific app development
pnpm dev:mobile            # Mobile app Metro bundler
pnpm dev:api               # API development info
```

### Mobile Development
```bash
# Metro bundler
pnpm dev:mobile:metro      # Start Metro bundler only
pnpm dev:mobile:ios        # Metro + iOS simulator
pnpm dev:mobile:android    # Metro + Android emulator

# Platform-specific
pnpm dev:mobile:ios        # iOS development
pnpm dev:mobile:android    # Android development
```

### Development Utilities
```bash
pnpm dev:watch             # Same as dev:full
pnpm dev:hot               # Hot reload development
pnpm dev:guide             # Development guide
pnpm dev:check             # Check development environment
```

## Build Commands

### Package Builds
```bash
# Build all packages
pnpm build:packages

# Build specific packages
pnpm build:types           # Types package
pnpm build:client          # Client package

# Build all (packages + apps)
pnpm build:all
pnpm build
```

### Mobile App Builds
```bash
# Development builds
pnpm build:mobile:ios      # iOS development build
pnpm build:mobile:android  # Android development build

# Production builds
pnpm build:mobile:ios:prod     # iOS production build
pnpm build:mobile:android:prod # Android production build

# Build validation
pnpm --filter @nvlp/mobile build:validate:ios
pnpm --filter @nvlp/mobile build:validate:android
```

### API Builds
```bash
pnpm build:api             # API build (info only)
```

### Build Utilities
```bash
pnpm build:prod            # Production build
pnpm build:watch           # Watch mode build
pnpm build:analyze         # Build analysis
```

## Test Commands

### Run Tests
```bash
# All tests
pnpm test
pnpm test:all

# Package tests
pnpm test:packages         # All package tests
pnpm test:types            # Types package tests
pnpm test:client           # Client package tests

# App tests
pnpm test:apps             # All app tests
pnpm test:mobile           # Mobile app tests
pnpm test:api              # API tests
```

### Test Utilities
```bash
pnpm test:watch            # Watch mode testing
pnpm test:coverage         # Coverage reports
pnpm test:script           # Run test script
pnpm test:ci               # CI pipeline tests
```

### Workflow Tests
```bash
pnpm test:mobile:workflow  # Mobile workflow test
pnpm test:api:workflow     # API workflow test
pnpm test:production       # Production build test
pnpm test:dependencies     # Dependency test
```

## Quality & Linting Commands

### Linting
```bash
# All linting
pnpm lint
pnpm lint:all

# Package linting
pnpm lint:packages         # All packages
pnpm lint:types            # Types package
pnpm lint:client           # Client package
pnpm lint:config           # Config package

# App linting
pnpm lint:apps             # All apps
pnpm lint:mobile           # Mobile app
pnpm lint:api              # API functions

# Fix linting issues
pnpm lint:fix              # Fix all
pnpm lint:fix:packages     # Fix packages
pnpm lint:fix:apps         # Fix apps
```

### Formatting
```bash
pnpm format                # Format all files
pnpm format:check          # Check formatting
```

### Type Checking
```bash
pnpm typecheck             # Type check all packages
```

### Complete Verification
```bash
pnpm verify                # build + test + lint
```

## Package Management Commands

### Installation
```bash
pnpm install               # Install all dependencies
pnpm install:all           # Same as install
```

### Dependency Updates
```bash
pnpm update:deps           # Update all dependencies
```

### Package-Specific Commands
```bash
# Add dependencies
pnpm --filter @nvlp/mobile add react-native-vector-icons
pnpm --filter @nvlp/client add -D vitest

# Remove dependencies
pnpm --filter @nvlp/mobile remove old-package

# Update specific package deps
pnpm --filter @nvlp/mobile update react-native
```

## Mobile Development Commands

### Metro Bundler
```bash
# Start Metro
pnpm --filter @nvlp/mobile start
pnpm --filter @nvlp/mobile dev

# Reset Metro cache
pnpm --filter @nvlp/mobile start:reset

# Metro with reset
pnpm --filter @nvlp/mobile reset-cache
```

### iOS Development
```bash
# Run iOS simulator
pnpm --filter @nvlp/mobile ios

# Development workflow
pnpm --filter @nvlp/mobile ios:dev

# iOS builds
pnpm --filter @nvlp/mobile build:ios
pnpm --filter @nvlp/mobile build:ios:prod

# iOS utilities
pnpm --filter @nvlp/mobile pod-install
```

### Android Development
```bash
# Run Android emulator
pnpm --filter @nvlp/mobile android

# Development workflow
pnpm --filter @nvlp/mobile android:dev

# Android builds
pnpm --filter @nvlp/mobile build:android
pnpm --filter @nvlp/mobile build:android:bundle
pnpm --filter @nvlp/mobile build:android:prod
```

### Mobile Utilities
```bash
# Code quality
pnpm --filter @nvlp/mobile code-quality
pnpm --filter @nvlp/mobile type-check
pnpm --filter @nvlp/mobile lint
pnpm --filter @nvlp/mobile format

# Debugging
pnpm --filter @nvlp/mobile devtools
pnpm --filter @nvlp/mobile build:analyze
```

## API Development Commands

### Function Development
```bash
pnpm --filter @nvlp/api dev        # Development info
pnpm --filter @nvlp/api dev:remote # Remote info
```

### Function Deployment
```bash
# Deploy all functions
pnpm deploy:api
pnpm --filter @nvlp/api deploy:all

# Deploy specific functions
pnpm deploy:api:auth
pnpm deploy:api:dashboard
pnpm deploy:api:transactions
pnpm deploy:api:reports
pnpm deploy:api:health
pnpm deploy:api:audit
pnpm deploy:api:export
pnpm deploy:api:notifications
```

### Database Commands
```bash
pnpm db:reset              # Reset database
pnpm db:migrate            # Run migrations
pnpm db:types              # Generate types
```

### API Quality
```bash
pnpm --filter @nvlp/api lint           # Deno linting
pnpm --filter @nvlp/api lint:fix       # Fix Deno linting
pnpm --filter @nvlp/api lint:eslint    # ESLint (fallback)
pnpm --filter @nvlp/api format         # Deno formatting
pnpm --filter @nvlp/api typecheck      # Type checking
pnpm --filter @nvlp/api test          # Function tests
```

## Deployment Commands

### API Deployment
```bash
pnpm deploy:api            # Deploy all Edge Functions
```

### Vercel Deployment
```bash
pnpm deploy:vercel         # Deploy to Vercel
pnpm deploy:vercel:preview # Preview deployment
pnpm deploy:vercel:production # Production deployment
```

### Build for Production
```bash
pnpm build:production      # Full production build
pnpm build:vercel          # Vercel-specific build
pnpm build:vercel:prod     # Vercel production build
```

## Maintenance Commands

### Cleaning
```bash
# Basic cleaning
pnpm clean                 # Clean build artifacts
pnpm clean:all             # Clean packages + apps
pnpm clean:root            # Clean root only

# Package cleaning
pnpm clean:packages        # All packages
pnpm clean:types           # Types package
pnpm clean:client          # Client package
pnpm clean:config          # Config package

# App cleaning
pnpm clean:apps            # All apps
pnpm clean:mobile          # Mobile app
pnpm clean:api             # API temp files

# Deep cleaning
pnpm clean:deep            # Complete cleanup + reinstall
pnpm clean:reset           # Deep clean + build
```

### Cache Management
```bash
pnpm cache:status          # Cache status
pnpm cache:clean           # Clean cache
pnpm cache:clean:turbo     # Clean Turbo cache
pnpm cache:stats           # Cache statistics
pnpm cache:optimize        # Optimize cache
pnpm cache:validate        # Validate cache
```

## Utility Commands

### Environment Validation
```bash
pnpm validate:env          # Validate environment variables
pnpm dev:check             # Check development environment
```

### CI/CD Utilities
```bash
pnpm ci:validate           # Validate CI/CD
pnpm ci:test               # Test CI/CD flow
```

### Analysis Commands
```bash
pnpm analyze:dependencies  # Dependency analysis
pnpm optimize:pipeline     # Optimize build pipeline
```

### Demo Commands
```bash
pnpm demo:mobile           # Mobile workflow demo
pnpm demo:api              # API workflow demo
```

### Release Management
```bash
pnpm changeset             # Create changeset
pnpm version               # Version packages
pnpm release               # Release packages
```

## Workspace Filter Commands

### Using pnpm --filter

**Filter by package name:**
```bash
pnpm --filter @nvlp/types <command>
pnpm --filter @nvlp/client <command>
pnpm --filter @nvlp/mobile <command>
```

**Filter by pattern:**
```bash
pnpm --filter './packages/**' <command>    # All packages
pnpm --filter './apps/**' <command>        # All apps
```

**Filter with dependencies:**
```bash
pnpm --filter @nvlp/client... <command>    # Package + dependents
pnpm --filter ...@nvlp/types <command>     # Package + dependencies
```

## Command Combinations

### Common Workflows

**Start development:**
```bash
pnpm build:packages && pnpm dev
```

**Full verification:**
```bash
pnpm clean:deep && pnpm build:packages && pnpm verify
```

**Mobile development setup:**
```bash
pnpm build:packages && pnpm dev:mobile:metro
# In new terminal:
pnpm dev:mobile:ios
```

**API development:**
```bash
pnpm build:packages && pnpm deploy:api:health
```

**Pre-commit check:**
```bash
pnpm type-check && pnpm lint && pnpm test
```

## Environment Variables

### Development
```bash
NODE_ENV=development pnpm dev
NODE_ENV=production pnpm build:prod
```

### Build Configuration
```bash
TURBO_CACHE=true pnpm build:packages
RCT_NEW_ARCH_ENABLED=1 pnpm dev:mobile:ios
```

### CI/CD
```bash
CI=true pnpm test
VERCEL_ENV=production pnpm build:vercel:prod
```

## Package.json Script Locations

### Root Scripts (`package.json`)
- All `pnpm <command>` commands are defined here
- Orchestrates workspace-wide operations
- Handles cross-package dependencies

### Package Scripts (`packages/*/package.json`)
- Package-specific build, test, lint commands
- Called via `pnpm --filter @nvlp/package <command>`

### App Scripts (`apps/*/package.json`)
- App-specific development and build commands
- Platform-specific commands (iOS/Android)

## Tips and Best Practices

### Development Workflow
1. Always run `pnpm build:packages` first
2. Use `pnpm dev` for package development
3. Use `pnpm dev:mobile:metro` + `pnpm dev:mobile:ios` for mobile
4. Run `pnpm verify` before committing

### Performance Tips
1. Use `--parallel` flag for independent operations
2. Use Turbo cache: `TURBO_CACHE=true`
3. Build packages incrementally when possible
4. Clean cache when builds seem slow

### Troubleshooting
1. Start with `pnpm clean:deep` for major issues
2. Check `pnpm build:packages` for type errors
3. Use `pnpm --filter` to isolate problems
4. Check individual package logs for details

## Command Cheat Sheet

```bash
# Daily development
pnpm dev                   # Start development
pnpm build:packages        # Build packages
pnpm verify               # Complete check

# Mobile development
pnpm dev:mobile:metro     # Start Metro
pnpm dev:mobile:ios       # Run iOS
pnpm dev:mobile:android   # Run Android

# Quality checks
pnpm type-check           # TypeScript
pnpm lint                 # Linting
pnpm test                 # Testing

# Maintenance
pnpm clean:deep           # Full reset
pnpm update:deps          # Update deps
pnpm cache:clean          # Clear cache

# Deployment
pnpm deploy:api           # Deploy functions
pnpm build:mobile:ios:prod # iOS production
```

---

**Pro Tip:** Use `pnpm <TAB><TAB>` in your terminal to see available commands with auto-completion!