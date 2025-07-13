# NVLP Monorepo Migration Memory

## Current Status
**Phase**: 7.1 Root-Level Scripts ✅ COMPLETE (5/5)
**Next Phase**: 7.2 Development Workflow
**Workflow**: Single subtask → update roadmap → update memory → commit → wait for prompt

## Migration Progress
- Phase 1: Environment Setup ✅ (pnpm, workspace structure)
- Phase 2: Backend/API ✅ (moved to apps/api, edge functions tested)
- Phase 3: Client Library ✅ (extracted to packages/client)
- Phase 4: Shared Types ✅ (created packages/types)
- Phase 5: React Native ✅ (moved to apps/mobile, dependencies resolved)
- Phase 6.1: Config Package ✅ (package.json, base configs, exports, documentation)
- Phase 6.2: Extract Configs ✅ (ESLint, Prettier, TypeScript, Jest moved to shared config)
- Phase 6: Shared Configuration ✅ COMPLETE
  - Created @nvlp/config package with ESLint, Prettier, TypeScript, Jest configs
  - All packages (mobile, API, client) using shared configurations
  - Tested all configurations successfully
- Phase 7.1: Root-Level Scripts ✅ COMPLETE
  - Created comprehensive dev scripts with concurrently for process management
  - Added dev:all, dev:packages, platform-specific mobile commands
  - Created development environment check script
  - Built complete build system with proper dependency ordering (types → client → apps)
  - Added platform-specific mobile build scripts and custom build-all.sh with progress visualization
  - Implemented comprehensive test suite with graceful handling of environment-specific issues
  - Created test-all.sh script with color-coded output and test:packages/test:apps separation
  - Deployed comprehensive linting system with package/app separation and Deno/ESLint fallbacks
  - Fixed ESLint configurations across all packages, created lint-all.sh with progress visualization
  - Implemented multi-tier cleanup system with clean, clean:all, clean:deep, clean:reset options
  - Created clean-all.sh script with --deep and --reset flags for comprehensive cleanup workflows

## Key Technical Details
- **pnpm workspaces** with workspace:* protocol for internal deps
- **Metro bundler** configured for monorepo with watchFolders
- **Client package** (@nvlp/client) builds ESM/CJS with tsup
- **Types package** (@nvlp/types) shared across all packages
- **Mobile app** successfully imports workspace packages
- **Edge functions** deploy correctly from apps/api structure

## Architecture
- `apps/api/` - Supabase Edge Functions
- `apps/mobile/` - React Native app  
- `packages/client/` - @nvlp/client library
- `packages/types/` - @nvlp/types shared types
- `packages/config/` - @nvlp/config shared tooling configs

## Error Fixes Applied
- JWT parsing null checks in token-manager.ts
- TypeScript strict mode compatibility in fetch body (null vs undefined)
- ESLint config renamed to .cjs for CommonJS
- Types package exports fixed for ESM/CJS dual mode
- Metro config updated for workspace package resolution

## Core App Info (for context)
- Supabase project: qnpatlosomopoimtsmsr
- Test user: larryjrutledge@gmail.com / Test1234!
- Virtual envelope budgeting app with hybrid PostgREST + Edge Functions API