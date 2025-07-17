# Production Build Guide

This guide explains how to build NVLP for production deployment.

## Overview

The production build pipeline uses Turborepo for orchestration and includes:
- Environment validation
- Type checking and linting
- Optimized builds with minification
- Bundle size analysis
- Platform-specific mobile builds

## Prerequisites

1. **Environment Variables**
   ```bash
   # Required for all builds
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   API_URL=your-api-url
   NODE_ENV=production
   ```

2. **Dependencies**
   ```bash
   pnpm install --frozen-lockfile
   ```

## Quick Start

### Build Everything
```bash
pnpm build:production
```

### Build Specific Targets
```bash
# Packages only (types, client)
pnpm build:production:packages

# Mobile app (requires packages)
pnpm build:production:mobile

# API (deployment info)
pnpm build:production:api
```

## Build Commands

### Package Builds

#### Development Builds
```bash
pnpm build              # Standard build with Turbo
pnpm build:packages     # Build only packages
pnpm build:types        # Build @nvlp/types only
pnpm build:client       # Build @nvlp/client only
```

#### Production Builds
```bash
pnpm build:prod         # Production build with Turbo
NODE_ENV=production pnpm build:prod  # Explicit production
```

### Mobile Builds

#### iOS Production Build
```bash
pnpm build:mobile:ios:prod
```
- Creates optimized release build
- Uses version from package.json
- Output: `apps/mobile/ios/build/Release/NVLPMobile.xcarchive`

#### Android Production Build
```bash
pnpm build:mobile:android:prod
```
- Creates Android App Bundle (AAB)
- Uses version from package.json
- Output: `apps/mobile/android/app/build/outputs/bundle/release/`

### API Deployment
```bash
# Deploy all functions
pnpm deploy:api

# Deploy specific function
pnpm deploy:auth
pnpm deploy:dashboard
# etc...
```

## Build Pipeline Features

### 1. Environment Validation
```bash
pnpm validate:env
```
Checks for required environment variables before building.

### 2. Turborepo Orchestration
- Automatic dependency ordering
- Parallel builds where possible
- Build caching
- Incremental builds

### 3. Production Optimizations

#### Packages
- Minification enabled
- Source maps disabled
- Console logs removed
- Tree shaking enabled
- Comments stripped

#### Mobile
- Release configuration
- ProGuard/R8 enabled (Android)
- Bitcode enabled (iOS)
- Debug symbols stripped

### 4. Bundle Analysis
```bash
pnpm build:analyze
```
Generates bundle size visualizations for optimization.

## Build Script Options

The main build script supports options:
```bash
./scripts/build-prod.sh [options]

Options:
  --target [all|packages|mobile|api]  Build specific target
  --skip-tests                        Skip test suite
  --skip-env-check                    Skip environment validation
```

## Production Configuration Files

### Turbo Configuration
- `turbo.json` - Build pipeline configuration

### Package Configurations
- `packages/types/tsup.config.prod.ts` - Types production build
- `packages/client/tsup.config.prod.ts` - Client production build

### Build Scripts
- `scripts/build-prod.sh` - Main production build orchestrator
- `scripts/validate-env.js` - Environment validation

## Build Outputs

### Package Outputs
```
packages/types/dist/
├── index.js       (CommonJS)
├── index.mjs      (ES Module)
├── index.d.ts     (TypeScript declarations)
└── index.d.mts    (ESM TypeScript declarations)

packages/client/dist/
├── index.js       (CommonJS)
├── index.cjs      (CommonJS)
├── index.d.ts     (TypeScript declarations)
└── index.d.cts    (CommonJS TypeScript declarations)
```

### Mobile Outputs
```
# iOS
apps/mobile/ios/build/Release/NVLPMobile.xcarchive

# Android
apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Install dependencies
  run: pnpm install --frozen-lockfile

- name: Validate environment
  run: pnpm validate:env

- name: Production build
  run: pnpm build:production
  env:
    NODE_ENV: production
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    # ... other secrets
```

### Deployment Workflow
1. Push to main branch
2. CI runs production build
3. Deploy packages to npm (if public)
4. Deploy API to Supabase
5. Build and distribute mobile apps

## Troubleshooting

### Build Failures
```bash
# Clean everything and rebuild
pnpm clean:all
pnpm install --frozen-lockfile
pnpm build:production
```

### Environment Issues
```bash
# Check what's missing
pnpm validate:env

# Set required variables
export SUPABASE_URL=your-url
export NODE_ENV=production
```

### Bundle Size Issues
```bash
# Analyze bundle
pnpm build:analyze

# Check package sizes
du -sh packages/*/dist
```

## Best Practices

1. **Always validate environment** before production builds
2. **Use frozen lockfile** for reproducible builds
3. **Run tests** before building for production
4. **Check bundle sizes** regularly
5. **Version bump** before releases
6. **Tag releases** in git

## Performance Metrics

Typical build times:
- Packages: ~5-10 seconds
- Mobile iOS: ~2-5 minutes
- Mobile Android: ~3-8 minutes
- Full pipeline: ~10-15 minutes

Bundle sizes (minified):
- @nvlp/types: ~5-10 KB
- @nvlp/client: ~30-50 KB
- Mobile app: ~30-50 MB (varies by platform)

## Security Considerations

1. **Never commit** `.env` files
2. **Use secrets** in CI/CD environments
3. **Validate** all environment variables
4. **Strip debug** information in production
5. **Enable ProGuard** for Android builds
6. **Code signing** for mobile apps