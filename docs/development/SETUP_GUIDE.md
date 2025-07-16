# NVLP Development Setup Guide

Complete guide for setting up the NVLP monorepo development environment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Environment](#development-environment)
- [IDE Configuration](#ide-configuration)
- [Workflow Overview](#workflow-overview)
- [Common Development Tasks](#common-development-tasks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

**Node.js & Package Manager:**
- Node.js 18+ (LTS recommended)
- pnpm 8+ (required for workspace management)

**Mobile Development:**
- **iOS**: macOS with Xcode 14+, CocoaPods, iOS Simulator
- **Android**: JDK 17, Android Studio, Android SDK, Android Emulator

**Backend Development:**
- Supabase CLI (for local development)
- Docker (optional, for local database)

**Recommended Tools:**
- Git 2.30+
- VS Code with recommended extensions
- React Native Debugger
- Flipper (for mobile debugging)

### Environment Verification

```bash
# Check versions
node --version        # Should be 18+
pnpm --version       # Should be 8+
git --version        # Should be 2.30+

# Mobile development (if applicable)
xcode-select --version     # macOS only
java -version             # Should be 17+
adb --version            # Android development

# Supabase
supabase --version       # Latest version
```

## Initial Setup

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-org/nvlp-app.git
cd nvlp-app

# Install dependencies (this handles the entire monorepo)
pnpm install

# Verify installation
pnpm --version
pnpm list --depth=0
```

### 2. Environment Configuration

```bash
# Copy environment templates
cp .env.example .env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/api/.env.example apps/api/.env

# Edit environment files with your configuration
# See Environment Variables section below
```

### 3. Build Shared Packages

```bash
# Build shared packages (required before running apps)
pnpm build:packages

# Verify packages built successfully
ls packages/types/dist
ls packages/client/dist
ls packages/config/dist
```

### 4. Development Environment Check

```bash
# Run comprehensive environment check
pnpm dev:check

# This will verify:
# - Node.js and pnpm versions
# - Environment variables
# - Package builds
# - Platform-specific tools (iOS/Android)
```

## Environment Variables

### Root Level (`.env`)
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Development
NODE_ENV=development
```

### Mobile App (`apps/mobile/.env`)
```bash
# API Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
API_BASE_URL=https://your-project.supabase.co/functions/v1

# App Configuration
APP_ENV=development
DEBUG_MODE=true
```

### API (`apps/api/.env`)
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# JWT
JWT_SECRET=your_jwt_secret

# Development
NODE_ENV=development
SUPABASE_LOG_LEVEL=debug
```

## Development Environment

### Quick Start Development

```bash
# Option 1: Start everything (recommended for full-stack development)
pnpm dev

# Option 2: Start with mobile Metro bundler included
pnpm dev:all

# Option 3: Enhanced hot reload with dependency tracking
pnpm dev:hot
```

### Focused Development

```bash
# Backend only (API + packages)
pnpm dev:api

# Mobile only (Metro bundler)
pnpm dev:mobile

# Packages only (types + client)
pnpm dev:packages

# Database only
pnpm dev:db
```

### Mobile Platform Development

```bash
# iOS Development
pnpm dev:mobile:ios      # Starts Metro + iOS Simulator

# Android Development  
pnpm dev:mobile:android  # Starts Metro + Android Emulator

# Metro only (manual platform launch)
pnpm dev:mobile:metro
```

## IDE Configuration

### VS Code Setup

**Recommended Extensions:**
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "msjsdiag.vscode-react-native",
    "bradlc.vscode-tailwindcss",
    "supabase.supabase-vscode"
  ]
}
```

**Workspace Settings (`.vscode/settings.json`):**
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.workingDirectories": [
    "packages/types",
    "packages/client", 
    "packages/config",
    "apps/mobile",
    "apps/api"
  ],
  "typescript.preferences.includeFilesystem": ["packages/**/*"]
}
```

### TypeScript Configuration

**Monorepo TypeScript Setup:**
- Root `tsconfig.json` includes all packages
- Each package extends base configuration from `@nvlp/config`
- Cross-package type checking enabled
- Go-to-definition works across packages

**Verify TypeScript setup:**
```bash
# Check TypeScript across all packages
pnpm type-check

# Individual package checking
pnpm --filter @nvlp/types type-check
pnpm --filter @nvlp/client type-check
pnpm --filter @nvlp/mobile type-check
```

## Workflow Overview

### Standard Development Workflow

1. **Start Development Environment**
   ```bash
   # Terminal 1: Backend services
   pnpm dev
   
   # Terminal 2: Mobile development (if needed)
   pnpm dev:mobile:ios  # or android
   ```

2. **Make Changes**
   - Edit code in any package or app
   - Hot reload automatically handles rebuilds
   - Mobile app refreshes automatically

3. **Testing and Quality Checks**
   ```bash
   # Run tests
   pnpm test
   
   # Lint and format
   pnpm lint
   pnpm format
   
   # Type checking
   pnpm type-check
   ```

4. **Build and Deploy**
   ```bash
   # Production builds
   pnpm build:production
   
   # Deploy API
   pnpm deploy:api
   ```

### Package Development Workflow

**When working on shared packages (`@nvlp/types`, `@nvlp/client`):**

1. Start package watching:
   ```bash
   pnpm dev:packages
   ```

2. Start consuming apps:
   ```bash
   # In separate terminals
   pnpm dev:api          # For API testing
   pnpm dev:mobile:ios   # For mobile testing
   ```

3. Changes propagate automatically:
   - Types → Client → Apps
   - Hot reload handles the cascade

## Common Development Tasks

### Building

```bash
# Build everything
pnpm build

# Build specific targets
pnpm build:packages     # Shared packages only
pnpm build:production   # Optimized production build
pnpm build:mobile       # Mobile production build
```

### Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# Individual package testing
pnpm --filter @nvlp/client test
pnpm --filter @nvlp/mobile test
```

### Code Quality

```bash
# Linting
pnpm lint              # Check all packages
pnpm lint:fix          # Fix auto-fixable issues

# Formatting
pnpm format            # Format all code
pnpm format:check      # Check formatting

# Type checking
pnpm type-check        # All packages
```

### Cleaning

```bash
# Clean build artifacts
pnpm clean

# Deep clean (including node_modules)
pnpm clean:all

# Platform-specific cleaning
pnpm --filter @nvlp/mobile clean:android
pnpm --filter @nvlp/mobile clean:ios
```

### Database Operations

```bash
# Start local database
pnpm dev:db

# Reset database
pnpm --filter @nvlp/api db:reset

# Apply migrations
pnpm --filter @nvlp/api db:migrate

# Generate types from database
pnpm --filter @nvlp/api db:types
```

### Deployment

```bash
# Deploy API functions
pnpm deploy:api

# Build mobile for production
pnpm --filter @nvlp/mobile build:ios:prod
pnpm --filter @nvlp/mobile build:android:bundle
```

## Development Features

### Hot Reload System

The monorepo includes sophisticated hot reload:

- **Package Changes**: Automatic rebuilding and propagation
- **Mobile Fast Refresh**: React Native component updates
- **API Function Reload**: Supabase Edge Functions hot reload
- **Cross-Package Dependencies**: Changes cascade automatically

See [HOT_RELOAD.md](./HOT_RELOAD.md) for detailed information.

### Development Scripts

The root `package.json` includes comprehensive development scripts:

- `dev:*` - Various development modes
- `build:*` - Different build targets
- `test:*` - Testing variations
- `clean:*` - Cleanup utilities
- `deploy:*` - Deployment commands

### Monorepo Benefits

**Shared Code**:
- Type definitions shared across all packages
- API client used by mobile app
- Shared configurations (ESLint, Prettier, TypeScript)

**Development Experience**:
- Single `pnpm install` for everything
- Cross-package go-to-definition
- Unified testing and linting
- Coordinated versioning

## Troubleshooting

### Common Issues

**Package dependency issues:**
```bash
# Clear and reinstall
pnpm clean:all
pnpm install
pnpm build:packages
```

**Metro bundler issues:**
```bash
# Clear Metro cache
pnpm --filter @nvlp/mobile start --reset-cache

# Clean and restart
pnpm --filter @nvlp/mobile clean
pnpm dev:mobile
```

**TypeScript errors across packages:**
```bash
# Rebuild packages and restart TypeScript
pnpm build:packages
# In VS Code: CMD+Shift+P > "TypeScript: Restart TS Server"
```

**iOS build issues:**
```bash
cd apps/mobile/ios
pod install
cd ../../..
pnpm --filter @nvlp/mobile ios
```

**Android build issues:**
```bash
pnpm --filter @nvlp/mobile clean:android
pnpm --filter @nvlp/mobile android
```

**Supabase connection issues:**
```bash
# Check environment variables
cat .env
cat apps/api/.env

# Restart Supabase services
pnpm --filter @nvlp/api dev:db
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Metro debug
DEBUG=Metro* pnpm dev:mobile

# Supabase debug
SUPABASE_LOG_LEVEL=debug pnpm dev:api

# Package build debug
DEBUG=tsup pnpm dev:packages
```

### Getting Help

**Documentation:**
- [Main README](../../README.md) - Project overview
- [HOT_RELOAD.md](./HOT_RELOAD.md) - Hot reload configuration
- [Mobile Development Guide](../../apps/mobile/docs/DEVELOPMENT_GUIDE.md)
- [API Documentation](../../apps/api/docs/)

**Development Support:**
```bash
# Check development environment
pnpm dev:check

# View development guide
pnpm dev:guide

# Get help with specific commands
pnpm run --help
```

## Next Steps

After completing this setup:

1. **Explore the Codebase**
   - Start with `apps/mobile/src/` for mobile development
   - Review `packages/types/src/` for type definitions
   - Check `apps/api/src/functions/` for API development

2. **Run Example Workflows**
   - Try the mobile app in simulator
   - Test API endpoints in Supabase Studio
   - Make a change and observe hot reload

3. **Review Architecture**
   - Understand the monorepo structure
   - Learn the shared package system
   - Explore the hot reload configuration

4. **Development Best Practices**
   - Follow TypeScript strict mode
   - Use shared configurations
   - Write tests for new features
   - Document significant changes

## Performance Tips

**Development Performance:**
- Use `pnpm dev` instead of `pnpm dev:all` if you don't need mobile
- Keep Metro cache clean during package development
- Use focused development commands for specific tasks
- Monitor build times and optimize if needed

**Memory Usage:**
- Hot reload watchers use ~50-100MB additional memory
- Metro bundler requires ~200-500MB during mobile development
- Consider closing unused development processes

## Security Notes

**Environment Variables:**
- Never commit real API keys to git
- Use `.env.example` files for templates
- Rotate keys regularly for production
- Use different keys for development/staging/production

**Development Safety:**
- Use development databases for local work
- Test with development Supabase projects
- Validate API endpoints before production deployment
- Keep development dependencies up to date

---

This guide provides the foundation for productive NVLP development. For specific questions or issues, refer to the package-specific documentation or create an issue in the repository.