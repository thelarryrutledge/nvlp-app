# CLAUDE.md - Project Context and Preferences

## Current Status: Phase 10.1 Complete ✅ | Phase 10.2 Next
**Migration Progress**: Phase 10.1 Update Documentation (5/5 complete) → Phase 10.2 Migration Cleanup
**Workflow**: Single subtask → update roadmap → update memory → commit → wait for prompt

## Important Development Notes

### Supabase Configuration
- **Remote-only Supabase** - NO local Docker/containers
- Edge functions developed locally, deployed to remote
- Testing against remote Supabase instance only
- Use `supabase functions deploy` for deployment

### Project Structure (Monorepo)
- `/apps/mobile` - React Native app with workspace deps
- `/apps/api` - Supabase Edge Functions (remote deployment)
- `/packages/types` - Shared TypeScript types (@nvlp/types)
- `/packages/client` - API client library (@nvlp/client)
- `/packages/config` - Shared configurations (@nvlp/config)

### Commands to Remember
- `pnpm build:packages` - Build shared packages first
- `pnpm dev` - Start all development servers
- `pnpm test`, `pnpm lint`, `pnpm type-check` - Quality checks
- `pnpm clean` - Clean build artifacts
- `pnpm deploy:api` - Deploy Edge Functions

## Migration Progress Summary

### ✅ Completed Phases
- **Phase 1-5**: Environment, API, Client, Types, Mobile → monorepo structure
- **Phase 6**: Shared Configuration (@nvlp/config with ESLint/Prettier/TS/Jest)
- **Phase 7**: Root-level scripts (dev, build, test, lint, clean systems)
- **Phase 8**: Testing & Validation (functionality, dev experience, build/deploy)
- **Phase 9.1**: Vercel Configuration (monorepo builds, deployment validation)
- **Phase 9.2**: CI/CD (GitHub Actions, caching, per-package testing, build optimization)
- **Phase 9.3**: Mobile Deployment Prep (iOS/Android build config, production builds, deployment docs)

### 🚀 Current Phase: 10.1 Update Documentation
- Documentation reorganization complete (removed 16 obsolete files, consolidated guides)
- Next: Final documentation updates and cleanup

## Key Technical Details

### Workspace Configuration
- **pnpm workspaces** with `workspace:*` protocol
- **Metro bundler** configured for monorepo with watchFolders
- **TypeScript** strict mode with cross-package type checking
- **Build order**: types → client → apps (dependency-aware)

### Mobile App Configuration
- **iOS**: Bundle ID `com.nvlp.mobile`, deployment target iOS 15.0
- **Android**: App ID `com.nvlp.mobile`, SDK 35, ProGuard enabled
- **Version sync**: Automatic from package.json to platform configs
- **New Architecture**: Enabled, Hermes JS engine

### CI/CD Features
- **Multi-layer caching**: pnpm, Turbo, TypeScript, ESLint
- **Matrix builds**: Ubuntu/macOS, Node 18/20
- **Change detection**: Selective CI runs for monorepo optimization
- **Build validation**: Mobile bundle validation, Edge Functions linting

## Error Fixes Applied (Reference)
- JWT parsing null checks in token-manager.ts
- TypeScript strict mode compatibility (null vs undefined)
- ESLint config renamed to .cjs for CommonJS
- Types package exports fixed for ESM/CJS dual mode
- Metro config updated for workspace package resolution
- Android build issues: gradle plugin path, codegen dependency, package structure

## Core App Info
- **Supabase project**: qnpatlosomopoimtsmsr
- **Test user**: larryjrutledge@gmail.com / Test1234!
- **App type**: Virtual envelope budgeting with React Native + Supabase
- **API architecture**: Hybrid PostgREST + Edge Functions

## Development Workflow
1. Install: `pnpm install`
2. Build packages: `pnpm build:packages`
3. Start development: `pnpm dev`
4. Mobile: `cd apps/mobile && pnpm start && pnpm ios/android`
5. Quality checks: `pnpm type-check && pnpm lint && pnpm test`
6. Deploy API: `pnpm deploy:api`

## Documentation Structure (After Reorganization)
- `docs/README.md` - Documentation index and navigation
- `docs/migration/` - Migration plan, roadmap, and status
- `docs/development/` - Development guides and workflows
- `apps/mobile/docs/` - Mobile development and deployment guides
- `apps/api/docs/` - API documentation and deployment
- Main `README.md` - Project overview with quick links

## Next Phase Tasks (Phase 10)
- Phase 10.1: Update Documentation ← **CURRENT**
- Phase 10.2: Migration Cleanup
- Phase 10.3: Developer Guide
- Phase 11: Final Validation

Migration is 95% complete - primarily documentation and cleanup remaining.