# Troubleshooting Guide

This guide helps you diagnose and fix common issues in the NVLP monorepo development environment.

## Table of Contents

- [Installation & Setup Issues](#installation--setup-issues)
- [Package & Dependency Problems](#package--dependency-problems)
- [Build Errors](#build-errors)
- [Mobile Development Issues](#mobile-development-issues)
- [API Development Problems](#api-development-problems)
- [TypeScript & Linting Issues](#typescript--linting-issues)
- [Performance Problems](#performance-problems)
- [Git & Version Control](#git--version-control)

## Installation & Setup Issues

### ❌ `pnpm install` fails with permission errors

**Symptoms:**
```
EACCES: permission denied, mkdir '/usr/local/lib/node_modules'
```

**Solutions:**
```bash
# Fix npm/pnpm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Or use nvm to manage Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### ❌ Node.js version incompatibility

**Symptoms:**
```
The engine "node" is incompatible with this module
```

**Solutions:**
```bash
# Check required version
cat package.json | grep '"node"'

# Install correct Node.js version
nvm install 18
nvm use 18

# Or update .nvmrc if using nvm
echo "18" > .nvmrc
nvm use
```

### ❌ pnpm not found

**Symptoms:**
```
command not found: pnpm
```

**Solutions:**
```bash
# Install pnpm globally
npm install -g pnpm

# Or use corepack (Node.js 16.10+)
corepack enable
corepack prepare pnpm@latest --activate

# Verify installation
pnpm --version
```

### ❌ `pnpm prepare` fails during install

**Symptoms:**
```
prepare$ pnpm run build:packages
turbo: command not found
```

**Solutions:**
```bash
# Install turbo globally first
npm install -g turbo

# Or skip prepare and run manually
pnpm install --ignore-scripts
pnpm build:packages
```

## Package & Dependency Problems

### ❌ Workspace dependency not found

**Symptoms:**
```
Module not found: Can't resolve '@nvlp/types'
```

**Solutions:**
```bash
# Rebuild packages in correct order
pnpm build:packages

# Check package.json workspace references
grep -r "workspace:" packages/*/package.json

# Reinstall with fresh lockfile
rm pnpm-lock.yaml
pnpm install
```

### ❌ Version conflicts between packages

**Symptoms:**
```
Package subpath './types' is not defined by "exports"
```

**Solutions:**
```bash
# Check package exports
cat packages/types/package.json | grep -A 10 "exports"

# Clear node_modules and reinstall
pnpm clean:deep
pnpm install
pnpm build:packages
```

### ❌ Peer dependency warnings

**Symptoms:**
```
WARN  unmet peer dependency typescript@>=4.5.0
```

**Solutions:**
```bash
# Install missing peer dependencies
pnpm add -D typescript@^5.5.2

# Check what needs peer deps
pnpm list --depth 0

# Auto-install peer dependencies
npx install-peerdeps @nvlp/config
```

### ❌ Duplicate packages in different locations

**Symptoms:**
```
Multiple versions of React found
```

**Solutions:**
```bash
# Deduplicate dependencies
pnpm dedupe

# Check for duplicates
pnpm list react

# Remove duplicate manually if needed
rm -rf node_modules
pnpm install
```

## Build Errors

### ❌ TypeScript build fails

**Symptoms:**
```
TS2307: Cannot find module '@nvlp/types'
```

**Solutions:**
```bash
# Build dependencies first
pnpm build:types
pnpm build:client

# Check TypeScript paths
cat packages/client/tsconfig.json | grep -A 5 "paths"

# Clear TypeScript cache
rm -rf packages/*/dist
rm -rf packages/*/*.tsbuildinfo
pnpm build:packages
```

### ❌ Turbo build configuration errors

**Symptoms:**
```
turbo: invalid type: map, expected a boolean
```

**Solutions:**
```bash
# Validate turbo.json
cat turbo.json | jq '.'

# Check for syntax errors
npx turbo --version

# Bypass turbo temporarily
pnpm --filter @nvlp/types build
pnpm --filter @nvlp/client build
```

### ❌ Build artifacts not found

**Symptoms:**
```
ENOENT: no such file or directory, open 'dist/index.js'
```

**Solutions:**
```bash
# Check if build actually completed
ls -la packages/*/dist/

# Rebuild specific package
pnpm --filter @nvlp/types clean
pnpm --filter @nvlp/types build

# Check build scripts
cat packages/types/package.json | grep -A 3 '"build"'
```

### ❌ ESM/CommonJS module conflicts

**Symptoms:**
```
require() of ES modules is not supported
```

**Solutions:**
```bash
# Check package.json type field
grep '"type"' packages/*/package.json

# Check exports configuration
cat packages/client/package.json | grep -A 10 "exports"

# Rebuild with correct format
pnpm --filter @nvlp/client build
```

## Mobile Development Issues

### ❌ Metro bundler won't start

**Symptoms:**
```
Metro Server failed to start
```

**Solutions:**
```bash
# Clear Metro cache
pnpm --filter @nvlp/mobile start:reset

# Kill existing Metro processes
lsof -ti:8081 | xargs kill -9

# Reset React Native cache
npx react-native start --reset-cache

# Check for port conflicts
netstat -an | grep 8081
```

### ❌ iOS build fails

**Symptoms:**
```
Command failed: xcodebuild
```

**Solutions:**
```bash
# Update iOS pods
cd apps/mobile/ios
pod deintegrate
pod install
cd ../../..

# Clean iOS build
rm -rf apps/mobile/ios/build
pnpm --filter @nvlp/mobile build:validate:ios

# Check iOS deployment target
grep IPHONEOS_DEPLOYMENT_TARGET apps/mobile/ios/NVLPMobile.xcodeproj/project.pbxproj

# Reset iOS simulator
xcrun simctl erase all
```

### ❌ Android build fails

**Symptoms:**
```
Execution failed for task ':app:processDebugResources'
```

**Solutions:**
```bash
# Clean Android build
cd apps/mobile/android
./gradlew clean
cd ../../..

# Check Android SDK
echo $ANDROID_HOME
ls $ANDROID_HOME/platforms/

# Reset Android build tools
rm -rf apps/mobile/android/build
rm -rf apps/mobile/android/app/build
pnpm --filter @nvlp/mobile build:validate:android

# Update Gradle wrapper
cd apps/mobile/android
./gradlew wrapper --gradle-version 8.0
```

### ❌ React Native version conflicts

**Symptoms:**
```
Invariant Violation: "main" has not been registered
```

**Solutions:**
```bash
# Check React Native version
grep react-native apps/mobile/package.json

# Clear React Native cache
npx react-native start --reset-cache

# Reinstall React Native
pnpm --filter @nvlp/mobile remove react-native
pnpm --filter @nvlp/mobile add react-native@0.80.1

# Reset Metro config
rm apps/mobile/metro.config.js
# Restore from git or recreate
```

### ❌ New Architecture (Fabric/TurboModules) issues

**Symptoms:**
```
TurboModuleRegistry.getEnforcing(...): 'RNGestureHandlerModule' could not be found
```

**Solutions:**
```bash
# Disable New Architecture temporarily
export RCT_NEW_ARCH_ENABLED=0

# Or enable it properly
export RCT_NEW_ARCH_ENABLED=1
cd apps/mobile/ios && pod install

# Check Gradle settings for Android
grep newArchEnabled apps/mobile/android/gradle.properties
```

## API Development Problems

### ❌ Supabase CLI not found

**Symptoms:**
```
command not found: supabase
```

**Solutions:**
```bash
# Install Supabase CLI
npm install -g supabase

# Or using pnpm
pnpm add -g supabase

# Check installation
supabase --version

# Login to Supabase
supabase login
```

### ❌ Edge Function deployment fails

**Symptoms:**
```
Failed to deploy function: Invalid function
```

**Solutions:**
```bash
# Check function syntax
cd supabase/functions/your-function
deno check index.ts

# Check function structure
ls supabase/functions/
cat supabase/functions/your-function/index.ts

# Deploy with verbose logging
supabase functions deploy your-function --debug

# Check Supabase project settings
supabase status
```

### ❌ CORS issues with Edge Functions

**Symptoms:**
```
Access to fetch blocked by CORS policy
```

**Solutions:**
```bash
# Check CORS headers in function
grep -r "corsHeaders" supabase/functions/

# Update function to include CORS
# Add to your Edge Function:
```

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In your function handler:
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

### ❌ Environment variables not working

**Symptoms:**
```
Deno.env.get('MY_VAR') returns undefined
```

**Solutions:**
```bash
# Check .env file exists
ls -la .env

# Set environment variables in Supabase
supabase secrets set MY_VAR=value

# Check secrets
supabase secrets list

# Use --env-file for local testing
supabase functions serve --env-file .env
```

### ❌ Database connection issues

**Symptoms:**
```
relation "public.users" does not exist
```

**Solutions:**
```bash
# Check database status
supabase status

# Reset database (destructive!)
supabase db reset

# Run migrations
supabase db push

# Generate types
pnpm --filter @nvlp/api db:types
```

## TypeScript & Linting Issues

### ❌ Type errors across packages

**Symptoms:**
```
TS2322: Type 'unknown' is not assignable to type 'User'
```

**Solutions:**
```bash
# Rebuild types package
pnpm --filter @nvlp/types build

# Check type exports
cat packages/types/dist/index.d.ts | grep "export"

# Clear TypeScript cache
rm -rf packages/*/*.tsbuildinfo
pnpm type-check

# Check tsconfig.json paths
grep -A 10 '"paths"' packages/*/tsconfig.json
```

### ❌ ESLint configuration conflicts

**Symptoms:**
```
Failed to load config "@nvlp/config/eslint" to extend from
```

**Solutions:**
```bash
# Check ESLint config exists
ls packages/config/eslint/

# Rebuild config package
pnpm --filter @nvlp/config build

# Check ESLint extends
grep "extends" packages/*/.eslintrc.js apps/*/.eslintrc.js

# Reset ESLint cache
rm -rf packages/*/.eslintcache
rm -rf apps/*/.eslintcache
```

### ❌ Prettier formatting conflicts

**Symptoms:**
```
[error] Code style issues found in the above file(s)
```

**Solutions:**
```bash
# Fix formatting automatically
pnpm format

# Check Prettier config
cat .prettierrc

# Ignore specific files
echo "dist/" >> .prettierignore

# Check for conflicting configs
find . -name ".prettierrc*" -o -name "prettier.config.*"
```

### ❌ Import path resolution errors

**Symptoms:**
```
Module '"@nvlp/types"' has no exported member 'User'
```

**Solutions:**
```bash
# Check actual exports
cat packages/types/src/index.ts

# Rebuild types
pnpm --filter @nvlp/types build

# Check import syntax
grep -r "import.*@nvlp/types" packages/client/src/

# Update import to be more specific
# Change: import { User } from '@nvlp/types'
# To: import type { User } from '@nvlp/types'
```

## Performance Problems

### ❌ Slow build times

**Symptoms:**
- Builds taking > 2 minutes
- High CPU usage during builds

**Solutions:**
```bash
# Enable turbo cache
echo 'TURBO_CACHE=true' >> .env

# Check cache status
pnpm cache:status

# Clean old cache
pnpm cache:clean

# Use parallel builds
pnpm build:packages --parallel

# Profile build performance
time pnpm build:packages
```

### ❌ High memory usage

**Symptoms:**
- Node.js out of memory errors
- System becoming unresponsive

**Solutions:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max_old_space_size=4096"

# Build packages individually
pnpm --filter @nvlp/types build
pnpm --filter @nvlp/client build

# Clear memory periodically
pnpm clean:deep
```

### ❌ Metro bundler performance

**Symptoms:**
- Slow hot reloads
- High CPU usage from Metro

**Solutions:**
```bash
# Optimize Metro config
# Edit apps/mobile/metro.config.js:
module.exports = {
  maxWorkers: 2,
  resetCache: true,
};

# Use Metro cache
rm -rf apps/mobile/.metro-cache
pnpm --filter @nvlp/mobile start

# Reduce watchFolders if needed
```

## Git & Version Control

### ❌ Merge conflicts in lockfile

**Symptoms:**
```
CONFLICT (content): Merge conflict in pnpm-lock.yaml
```

**Solutions:**
```bash
# Delete lockfile and reinstall
rm pnpm-lock.yaml
pnpm install

# Or use git to resolve
git checkout --theirs pnpm-lock.yaml
pnpm install
```

### ❌ Pre-commit hooks failing

**Symptoms:**
```
husky - pre-commit hook exited with code 1
```

**Solutions:**
```bash
# Check what's failing
pnpm verify

# Fix issues individually
pnpm type-check
pnpm lint:fix
pnpm format

# Skip hooks temporarily (not recommended)
git commit --no-verify
```

### ❌ Large file/directory committed accidentally

**Symptoms:**
```
remote: error: File node_modules/... is 100+ MB
```

**Solutions:**
```bash
# Remove from git history
git filter-branch --tree-filter 'rm -rf node_modules' HEAD

# Or use git-filter-repo (recommended)
git filter-repo --path node_modules --invert-paths

# Check .gitignore
echo "node_modules/" >> .gitignore
echo "dist/" >> .gitignore
```

## Emergency Recovery

### 🆘 Complete environment reset

If everything is broken:

```bash
# 1. Save your work
git add .
git commit -m "WIP: saving work before reset"

# 2. Complete cleanup
pnpm clean:deep
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
rm pnpm-lock.yaml

# 3. Fresh install
pnpm install

# 4. Rebuild everything
pnpm build:packages

# 5. Verify
pnpm verify
```

### 🆘 Package corruption recovery

If a specific package is broken:

```bash
# 1. Identify broken package
pnpm list --depth 0

# 2. Remove and reinstall
pnpm --filter @nvlp/broken-package remove all-deps
rm -rf packages/broken-package/node_modules
rm -rf packages/broken-package/dist

# 3. Reinstall
pnpm install
pnpm --filter @nvlp/broken-package build
```

## Getting Additional Help

### Check logs and status

```bash
# Build logs
pnpm build:packages 2>&1 | tee build.log

# Dependency tree
pnpm list --depth 2

# System information
node --version
pnpm --version
npm --version
```

### Useful debugging commands

```bash
# Environment info
npx envinfo --system --binaries --npmPackages

# React Native info
npx react-native info

# Supabase status
supabase status
```

### Documentation resources

- [NVLP Setup Guide](./SETUP_GUIDE.md)
- [Common Tasks](./COMMON_TASKS.md)
- [Getting Started](./GETTING_STARTED.md)
- [Architecture Guide](../ARCHITECTURE.md)

### External resources

- [pnpm Troubleshooting](https://pnpm.io/troubleshooting)
- [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Remember:** When in doubt, start with `pnpm clean:deep && pnpm install && pnpm build:packages` - it solves 80% of issues!