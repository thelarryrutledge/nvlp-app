# NVLP Development Workflow

Comprehensive workflow guide for developing in the NVLP monorepo.

## Overview

This guide covers the day-to-day development workflows for different types of development tasks in the NVLP monorepo.

## Quick Reference

### Daily Development Commands

```bash
# Start your development day
pnpm dev:check          # Verify environment
pnpm dev                # Start backend services
pnpm dev:mobile:ios     # Start mobile (separate terminal)

# Quality checks before committing
pnpm lint               # Check linting
pnpm test               # Run tests  
pnpm type-check         # TypeScript validation
pnpm build              # Verify builds work
```

### Development Modes

| Command | Purpose | What It Starts |
|---------|---------|----------------|
| `pnpm dev` | Backend development | API + Packages |
| `pnpm dev:all` | Full-stack development | API + Packages + Mobile Metro |
| `pnpm dev:hot` | Enhanced development | All + dependency-aware hot reload |
| `pnpm dev:mobile:ios` | Mobile iOS development | Metro + iOS Simulator |
| `pnpm dev:mobile:android` | Mobile Android development | Metro + Android Emulator |

## Workflow by Development Type

### 1. Full-Stack Feature Development

**Scenario**: Building a new feature that spans mobile app, API, and shared types.

**Workflow**:
```bash
# Terminal 1: Start backend services
pnpm dev

# Terminal 2: Start mobile development
pnpm dev:mobile:ios

# Development process:
# 1. Define types in packages/types/src/
# 2. Update API client in packages/client/src/
# 3. Implement API endpoints in apps/api/src/functions/
# 4. Build mobile UI in apps/mobile/src/

# Quality checks
pnpm lint && pnpm test && pnpm type-check
```

**Hot Reload Flow**:
1. Edit types → Client rebuilds automatically
2. Edit client → Mobile app refreshes automatically  
3. Edit API functions → Supabase reloads automatically
4. Edit mobile components → React Native Fast Refresh

### 2. Mobile-Only Development

**Scenario**: Working on mobile UI, components, or mobile-specific features.

**Workflow**:
```bash
# Option A: Mobile with backend services (recommended)
pnpm dev                # Terminal 1: Backend
pnpm dev:mobile:ios     # Terminal 2: Mobile

# Option B: Mobile only (if no API changes needed)
pnpm dev:mobile:ios

# Development focus:
# - apps/mobile/src/components/
# - apps/mobile/src/screens/
# - apps/mobile/src/navigation/
# - apps/mobile/src/stores/
```

**Mobile-Specific Commands**:
```bash
# Platform switching
pnpm dev:mobile:ios          # Switch to iOS
pnpm dev:mobile:android      # Switch to Android

# Debugging
pnpm --filter @nvlp/mobile start --reset-cache    # Clear Metro cache
npx react-native log-ios     # View iOS logs
npx react-native log-android # View Android logs

# Building
pnpm --filter @nvlp/mobile build:ios:debug
pnpm --filter @nvlp/mobile build:android:debug
```

### 3. API/Backend Development

**Scenario**: Working on Supabase Edge Functions, database schema, or API endpoints.

**Workflow**:
```bash
# Start API services only
pnpm dev:api

# Or start with packages if you're modifying types/client
pnpm dev:packages       # Terminal 1: Package watching
pnpm dev:api           # Terminal 2: API services

# Development focus:
# - apps/api/src/functions/
# - supabase/functions/
# - Database schema via Supabase Studio
```

**API-Specific Commands**:
```bash
# Database operations
pnpm --filter @nvlp/api db:reset      # Reset local database
pnpm --filter @nvlp/api db:migrate    # Apply migrations
pnpm --filter @nvlp/api db:types      # Generate TypeScript types

# Function deployment
pnpm deploy:api                       # Deploy to production
supabase functions deploy auth        # Deploy specific function

# Debugging
SUPABASE_LOG_LEVEL=debug pnpm dev:api # Debug mode
```

### 4. Package Development

**Scenario**: Working on shared packages (`@nvlp/types`, `@nvlp/client`, `@nvlp/config`).

**Workflow**:
```bash
# Start package watching
pnpm dev:packages

# Start consuming applications to test changes
pnpm dev:api           # Terminal 2: Test API integration
pnpm dev:mobile:ios    # Terminal 3: Test mobile integration

# Development focus:
# - packages/types/src/
# - packages/client/src/
# - packages/config/
```

**Package-Specific Commands**:
```bash
# Individual package development
pnpm --filter @nvlp/types dev        # Types only
pnpm --filter @nvlp/client dev       # Client only
pnpm --filter @nvlp/config dev       # Config only

# Building and testing
pnpm build:packages                  # Build all packages
pnpm --filter @nvlp/client test      # Test specific package
pnpm --filter @nvlp/types type-check # Check types
```

### 5. Database Schema Development

**Scenario**: Modifying database schema, adding tables, updating RLS policies.

**Workflow**:
```bash
# Start database services
pnpm dev:db

# Use Supabase Studio for schema changes
# http://localhost:54323

# After schema changes:
pnpm --filter @nvlp/api db:types     # Regenerate TypeScript types
pnpm build:packages                  # Rebuild packages with new types
```

**Schema Development Process**:
1. Design schema changes in Supabase Studio
2. Create migration files
3. Test migrations on local database
4. Generate TypeScript types
5. Update application code to use new schema
6. Test end-to-end functionality

## Testing Workflows

### Unit Testing

```bash
# Run all tests
pnpm test

# Watch mode for active development
pnpm test:watch

# Test specific packages
pnpm --filter @nvlp/client test
pnpm --filter @nvlp/mobile test

# Coverage reporting
pnpm test:coverage
```

### Integration Testing

```bash
# API integration tests
pnpm --filter @nvlp/api test:integration

# Mobile integration tests
pnpm --filter @nvlp/mobile test:integration

# End-to-end workflow testing
pnpm test:e2e
```

### Manual Testing

```bash
# Mobile testing
pnpm dev:mobile:ios      # Test on iOS Simulator
pnpm dev:mobile:android  # Test on Android Emulator
# Also test on physical devices

# API testing
# Use Supabase Studio: http://localhost:54323
# Use API test tools in apps/api/docs/
```

## Build and Deployment Workflows

### Development Builds

```bash
# Build everything for development
pnpm build

# Build specific targets
pnpm build:packages     # Shared packages only
pnpm build:mobile       # Mobile debug builds
```

### Production Builds

```bash
# Production build process
pnpm build:production

# Mobile production builds
cd apps/mobile
pnpm build:ios:prod         # iOS production build
pnpm build:android:bundle   # Android App Bundle
```

### Deployment

```bash
# API deployment
pnpm deploy:api

# Mobile deployment (manual process)
cd apps/mobile
pnpm archive:ios        # Create iOS archive
pnpm build:android:bundle   # Create Android bundle
# Then upload via App Store Connect / Google Play Console
```

## Code Quality Workflows

### Pre-Commit Workflow

```bash
# Run before every commit
pnpm lint               # Check linting rules
pnpm format:check       # Check code formatting
pnpm type-check         # TypeScript validation
pnpm test               # Run test suite
pnpm build              # Verify builds work
```

### Code Review Workflow

```bash
# Prepare for code review
pnpm lint:fix           # Auto-fix linting issues
pnpm format             # Auto-format code
pnpm test:coverage      # Generate coverage report
pnpm build:production   # Verify production builds
```

## Debugging Workflows

### Mobile Debugging

```bash
# React Native debugging
pnpm dev:mobile:ios
# Then use React Native Debugger or Chrome DevTools

# Metro bundler debugging
DEBUG=Metro* pnpm dev:mobile
pnpm --filter @nvlp/mobile start --reset-cache

# Platform-specific debugging
npx react-native log-ios        # iOS console logs
npx react-native log-android    # Android console logs
```

### API Debugging

```bash
# Supabase debugging
SUPABASE_LOG_LEVEL=debug pnpm dev:api

# Function debugging
# Use console.log in Edge Functions
# Monitor logs in Supabase Studio

# Database debugging
# Use Supabase Studio SQL editor
# Monitor query performance and RLS policies
```

### Package Debugging

```bash
# TypeScript debugging
pnpm type-check          # Check all packages
# Use VS Code TypeScript: Restart TS Server

# Build debugging
DEBUG=tsup pnpm dev:packages    # Debug package builds
pnpm clean && pnpm build:packages  # Clean rebuild
```

## Performance Optimization Workflows

### Development Performance

```bash
# Optimize development experience
pnpm dev                # Use minimal development mode
pnpm --filter @nvlp/mobile start --reset-cache  # Clear Metro cache
pnpm clean:cache        # Clear all build caches

# Monitor performance
# Use React Native Performance Monitor
# Monitor Metro bundle size and build times
```

### Production Performance

```bash
# Analyze bundle sizes
pnpm --filter @nvlp/mobile bundle:analyze

# Optimize mobile builds
pnpm --filter @nvlp/mobile build:ios:prod --verbose
pnpm --filter @nvlp/mobile build:android:bundle --verbose

# Profile API performance
# Use Supabase Analytics
# Monitor Edge Function execution times
```

## Troubleshooting Workflows

### Common Issue Resolution

**Package dependency issues:**
```bash
pnpm clean:all          # Nuclear option: clean everything
pnpm install            # Reinstall dependencies
pnpm build:packages     # Rebuild shared packages
```

**Metro bundler issues:**
```bash
pnpm --filter @nvlp/mobile start --reset-cache
pnpm --filter @nvlp/mobile clean
pnpm dev:mobile
```

**TypeScript issues:**
```bash
pnpm type-check         # Check for type errors
pnpm build:packages     # Rebuild package types
# Restart TypeScript server in VS Code
```

**Supabase connection issues:**
```bash
# Check environment variables
cat .env && cat apps/api/.env
pnpm dev:db             # Restart database
pnpm --filter @nvlp/api dev:functions  # Restart functions
```

## Collaboration Workflows

### Team Development

**Branch Management:**
```bash
# Create feature branch
git checkout -b feature/new-feature
pnpm dev:check          # Verify environment
pnpm build:packages     # Ensure packages work

# Daily sync
git pull origin main
pnpm install            # Update dependencies
pnpm build:packages     # Rebuild packages
```

**Code Sharing:**
```bash
# Share development state
pnpm build              # Ensure everything builds
pnpm test               # Ensure tests pass
git add . && git commit -m "WIP: feature progress"
git push origin feature/new-feature
```

### Documentation Workflow

```bash
# Update documentation when making changes
# 1. Update relevant README files
# 2. Update API documentation
# 3. Update type definitions
# 4. Update migration guides if needed

# Generate documentation
pnpm --filter @nvlp/api docs:generate
```

## Best Practices

### Daily Development

1. **Start with environment check**: `pnpm dev:check`
2. **Use appropriate development mode** for your task
3. **Make incremental changes** and test frequently
4. **Run quality checks** before committing
5. **Keep dependencies updated** regularly

### Code Quality

1. **Follow TypeScript strict mode**
2. **Use shared configurations** from `@nvlp/config`
3. **Write tests** for new features
4. **Document significant changes**
5. **Use meaningful commit messages**

### Performance

1. **Use focused development commands** when possible
2. **Clear caches** when experiencing issues
3. **Monitor build times** and optimize if needed
4. **Profile mobile app performance** regularly
5. **Monitor API function execution times**

### Collaboration

1. **Communicate changes** that affect shared packages
2. **Update documentation** with your changes
3. **Run full test suite** before major commits
4. **Use feature branches** for new development
5. **Review code thoroughly** before merging

This workflow guide provides structure for efficient development in the NVLP monorepo. Adapt these workflows to your specific development needs and team processes.