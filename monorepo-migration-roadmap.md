# Monorepo Migration Roadmap

## Phase 1: Preparation & Setup

### 1.1 Environment Setup
- [x] Install pnpm globally (`npm install -g pnpm`)
- [x] Verify pnpm installation and version (10.13.1)
- [x] Create migration branch (`feat/monorepo-migration`)
- [x] Document current project structure
- [x] Backup current working state (tag: pre-monorepo-migration-v1)

### 1.2 Root Configuration
- [x] Create root `package.json` with workspace configuration
- [x] Create `pnpm-workspace.yaml` file
- [x] Set up root-level scripts for common tasks
- [x] Configure root `.gitignore` for monorepo
- [x] Add root-level documentation files

### 1.3 Directory Structure
- [x] Create `apps/` directory
- [x] Create `packages/` directory
- [x] Create `apps/api/` directory
- [x] Create `apps/mobile/` directory
- [x] Create `apps/web/` placeholder directory
- [x] Create `packages/client/` directory
- [x] Create `packages/types/` directory
- [x] Create `packages/config/` directory

## Phase 2: Move Backend/API

### 2.1 Prepare API Package
- [x] Create `apps/api/package.json`
- [x] Create `apps/api/tsconfig.json`
- [x] Create `apps/api/README.md`
- [x] Set up API-specific environment configuration

### 2.2 Move Edge Functions
- [x] Move Supabase functions to `apps/api/src/functions/`
- [x] Update import paths in edge functions (no changes needed - relative imports work)
- [x] Move API-specific dependencies to `apps/api/package.json`
- [x] Test edge function imports (all passed ✅)

### 2.3 Move API Configuration
- [x] Move Vercel configuration for API
- [x] Update API deployment settings
- [x] Move API-specific documentation
- [x] Verify API structure

### 2.4 Test Supabase Edge Function Deployment
- [x] Create test edge function (`/api/test-deploy`)
- [x] Test local Supabase function development
- [x] Deploy test function to Supabase
- [x] Verify function executes correctly
- [x] Test function with dependencies (+ Fix schema mismatch)
- [x] Verify existing functions still deploy
- [x] Document new deployment process from monorepo
- [x] Remove test function after validation

## Phase 3: Extract Client Library

### 3.1 Prepare Client Package
- [x] Create `packages/client/package.json`
- [x] Create `packages/client/tsconfig.json`
- [x] Create `packages/client/README.md`
- [x] Set up client build configuration

### 3.2 Move Client Code
- [x] Move `/src/client/` to `packages/client/src/`
- [x] Move client type definitions
- [x] Update client import paths
- [x] Remove client code from original location

### 3.3 Configure Client Package
- [x] Set up TypeScript build for client
- [x] Configure client package exports
- [x] Add build scripts to client package.json
- [x] Test client package build

## Phase 4: Extract Shared Types

### 4.1 Prepare Types Package
- [x] Create `packages/types/package.json`
- [x] Create `packages/types/tsconfig.json`
- [x] Create `packages/types/README.md`
- [x] Set up types build configuration

### 4.2 Identify & Move Shared Types
- [x] Identify types used across packages
- [x] Create organized type structure
- [x] Move shared types from client
- [x] Move shared types from API

### 4.3 Update Type Imports
- [x] Update client to use `@nvlp/types`
- [x] Update API to use `@nvlp/types`
- [x] Ensure no circular dependencies
- [x] Test type resolution

## Phase 5: Move React Native App

### 5.1 Prepare Mobile Package
- [x] Create `apps/mobile/package.json`
- [x] Move React Native specific configs
- [x] Update mobile app metadata
- [x] Set up mobile-specific scripts

### 5.2 Move Mobile Code
- [x] Move `/NVLPMobile/` contents to `apps/mobile/`
- [x] Update React Native configuration files
- [x] Move mobile assets and resources
- [x] Remove old mobile directory

### 5.3 Configure Mobile for Monorepo
- [x] Update Metro configuration for monorepo
- [x] Configure Metro to resolve workspace packages
- [x] Update TypeScript configuration
- [x] Update path aliases for monorepo structure

### 5.4 Update Mobile Dependencies
- [x] Add `@nvlp/client` as dependency
- [x] Add `@nvlp/types` as dependency
- [x] Update import paths to use workspace packages
- [x] Test dependency resolution

## Phase 6: Shared Configuration

### 6.1 Prepare Config Package
- [x] Create `packages/config/package.json`
- [x] Create base configuration files
- [x] Set up configuration exports
- [x] Document configuration usage

### 6.2 Extract Common Configs
- [x] Move shared ESLint configuration
- [x] Move shared Prettier configuration
- [x] Move shared TypeScript base config
- [x] Create shared Jest configuration

### 6.3 Update Projects to Use Shared Config
- [x] Update mobile app to extend shared configs
- [x] Update API to extend shared configs
- [x] Update client to extend shared configs
- [x] Test all configurations

## Phase 7: Build & Development Setup

### 7.1 Root-Level Scripts
- [x] Create `dev` script to run all services
- [x] Create `build` script for all packages
- [x] Create `test` script for all packages
- [x] Create `lint` script for all packages
- [x] Create `clean` script for cleanup

### 7.2 Development Workflow
- [x] Set up concurrent development tasks
- [x] Configure hot reloading across packages
- [x] Test mobile development workflow
- [x] Test API development workflow

### 7.3 Build Pipeline
- [x] Configure production builds
- [x] Set up build order dependencies
- [x] Test complete build process
- [x] Optimize build performance

## Phase 8: Testing & Validation

### 8.1 Functionality Testing
- [x] Test mobile app startup and hot reload
- [x] Test API endpoints functionality
- [x] Test client library in mobile app
- [ ] Test type checking across packages

### 8.2 Development Experience
- [ ] Verify IntelliSense works across packages
- [ ] Test go-to-definition across packages
- [ ] Verify TypeScript errors propagate correctly
- [ ] Test debugging capabilities

### 8.3 Build & Deploy Testing
- [ ] Test production build of mobile app
- [ ] Test API deployment process
- [ ] Verify all environment variables work
- [ ] Test CI/CD pipeline

## Phase 9: Deployment & CI/CD

### 9.1 Update Vercel Configuration
- [ ] Configure Vercel for monorepo
- [ ] Set up API deployment from `apps/api`
- [ ] Update build commands
- [ ] Test Vercel deployment

### 9.2 Update CI/CD
- [ ] Update GitHub Actions for monorepo
- [ ] Configure per-package testing
- [ ] Set up build caching
- [ ] Test complete CI/CD flow

### 9.3 Mobile Deployment Prep
- [ ] Update iOS build configuration
- [ ] Update Android build configuration
- [ ] Test mobile production builds
- [ ] Document deployment process

## Phase 10: Documentation & Cleanup

### 10.1 Update Documentation
- [ ] Update root README.md
- [ ] Create package-specific READMEs
- [ ] Document development setup
- [ ] Document deployment process
- [ ] Create architecture diagrams

### 10.2 Migration Cleanup
- [ ] Remove old directory structure
- [ ] Clean up obsolete files
- [ ] Update all import paths
- [ ] Remove duplicate dependencies

### 10.3 Developer Guide
- [ ] Create getting started guide
- [ ] Document common tasks
- [ ] Create troubleshooting guide
- [ ] Document workspace commands

## Phase 11: Final Validation

### 11.1 Complete Testing
- [ ] Full end-to-end testing
- [ ] Performance testing
- [ ] Security audit
- [ ] Dependency audit

### 11.2 Team Review
- [ ] Code review of structure
- [ ] Documentation review
- [ ] Deployment process review
- [ ] Merge to main branch

## Success Criteria
- [ ] Mobile app runs with shared client library
- [ ] API deploys successfully from monorepo
- [ ] Type safety works across all packages
- [ ] Single `pnpm install` sets up everything
- [ ] Development workflow is smooth
- [ ] All tests pass
- [ ] Documentation is complete

## Current Status
**Phase**: 8.1 Functionality Testing (3/4 complete)
**Next Task**: Phase 8.1 subtask 4 - Test type checking across packages