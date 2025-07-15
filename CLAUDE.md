# CLAUDE.md - Project Context and Preferences

## Important Development Notes

### Supabase Configuration
- **We are NOT using local Docker version of Supabase**
- **We only use the remote Supabase service**
- Do not attempt to run `supabase start` or any Docker-related commands
- All Supabase edge functions are deployed to the remote service
- Development uses the remote Supabase instance directly

### API Development Workflow
- Edge functions are developed locally but deployed to remote Supabase
- Use `supabase functions deploy` for deployment
- Testing happens against the remote Supabase instance
- No local database or Docker containers are used

## Commands to Remember
- Build packages: `pnpm build:packages`
- Run tests: `pnpm test`
- Run linting: `pnpm lint`
- Clean build artifacts: `pnpm clean`
- Cache management: `pnpm cache:status`, `pnpm cache:clean`
- CI/CD validation: `pnpm ci:validate`, `pnpm ci:test`

## Project Structure
- Monorepo using pnpm workspaces
- `/apps/mobile` - React Native app
- `/apps/api` - Supabase Edge Functions (deployed to remote)
- `/packages/types` - Shared TypeScript types
- `/packages/client` - API client library
- `/packages/config` - Shared configurations

## Current Status: Phase 9.2 Complete ✅
- ✅ Per-package testing configured 
- ✅ Build caching system implemented
- ✅ Complete CI/CD flow tested and validated
- ✅ GitHub Actions workflows: ci.yml, monorepo-ci.yml, test-packages.yml, build-cache.yml
- ✅ Multi-layer caching strategy (pnpm, Turbo, TypeScript, ESLint)
- ✅ Android build issue resolved (gradle plugin path, codegen dependency)

## CI/CD System Features
- Advanced build caching with Turbo
- Per-package testing with matrix builds (Ubuntu/macOS, Node 18/20)  
- Change detection for optimized CI runs
- Cache performance monitoring and cleanup
- Mobile bundle validation
- Edge Functions linting and type checking
- Workspace integration testing