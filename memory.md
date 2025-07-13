# NVLP Monorepo Migration Memory

## Current Status
**Phase**: 6.3 Update Projects to Use Shared Config (1/4 complete)
**Next Subtask**: Update API to extend shared configs
**Workflow**: Single subtask → update roadmap → update memory → commit → wait for prompt

## Migration Progress
- Phase 1: Environment Setup ✅ (pnpm, workspace structure)
- Phase 2: Backend/API ✅ (moved to apps/api, edge functions tested)
- Phase 3: Client Library ✅ (extracted to packages/client)
- Phase 4: Shared Types ✅ (created packages/types)
- Phase 5: React Native ✅ (moved to apps/mobile, dependencies resolved)
- Phase 6.1: Config Package ✅ (package.json, base configs, exports, documentation)
- Phase 6.2: Extract Configs ✅ (ESLint, Prettier, TypeScript, Jest moved to shared config)
- Phase 6.3: Use Shared Config → 1/4 complete (mobile app updated with shared configs)

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