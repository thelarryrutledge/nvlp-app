# CLAUDE.md - Project Context and Preferences

## Project Overview: NVLP (Virtual Envelope Budgeting App)
**App Type**: Personal finance management with virtual envelope budgeting methodology
**Platforms**: React Native mobile app (iOS/Android) + future web app
**Backend**: Supabase (PostgreSQL + Edge Functions) with hybrid API architecture
**Current Focus**: Mobile app development (React Native roadmap phases 3-12)

## Current Status: MONOREPO SETUP COMPLETE ✅
**Migration Progress**: Successfully completed all phases and merged to main branch
**Date Completed**: July 16, 2025
**Next Phase**: Mobile app implementation following react-native-roadmap.md

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

## Architecture Decisions
- **Hybrid API**: PostgREST for fast CRUD (<50ms) + Edge Functions for complex logic
- **Remote-only Supabase**: No local containers, test against production instance
- **Monorepo structure**: Shared packages for types, client, config across mobile/web
- **Performance focus**: PostgREST avoids Edge Function cold starts (2-10s delay)

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
- **App purpose**: Virtual envelope budgeting system for personal finance management
- **Core features**: Budget creation, envelope allocation, transaction tracking, financial insights
- **API architecture**: Hybrid PostgREST (fast CRUD) + Edge Functions (complex logic)

## Mobile App Development Status
**Roadmap**: 12-phase React Native implementation plan
**Current Phase**: Phase 2.2 API Integration (in progress)
**Latest Completed**: Request/response interceptors implementation
**Progress**: Project setup ✅, Core dependencies ✅, State management ✅, API client integration ✅
**Tech Stack**: React Native 0.80, TypeScript, React Navigation 6, Reanimated 3, @nvlp/client

## Development Workflow
1. Install: `pnpm install`
2. Build packages: `pnpm build:packages`
3. Start development: `pnpm dev`
4. Mobile: `cd apps/mobile && pnpm start && pnpm ios/android`
5. Quality checks: `pnpm type-check && pnpm lint && pnpm test`
6. Deploy API: `pnpm deploy:api`

## Key References
- `apps/mobile/docs/react-native-roadmap.md` - 12-phase mobile development plan
- `packages/types/` - Shared TypeScript definitions (@nvlp/types)
- `packages/client/` - API client library (@nvlp/client)
- Supabase dashboard: https://supabase.com/dashboard/project/qnpatlosomopoimtsmsr

## Important Notes for Development
- Always run `pnpm build:packages` before starting development
- Mobile app follows strict roadmap phases - check react-native-roadmap.md
- Use workspace dependencies with `workspace:*` protocol
- Test against remote Supabase only (no local setup)
- Edge Functions deploy with `supabase functions deploy`