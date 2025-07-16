# NVLP Monorepo Migration Plan

## Overview
Migrate the NVLP project to a monorepo structure to support code sharing between React Native mobile app, future web app, and backend services.

## Chosen Tool: pnpm workspaces
- **Why pnpm**: Fast, disk-efficient, built-in workspace support, great for React Native
- **Alternative considered**: Turborepo (can be added later for build optimization)

## Target Structure
```
nvlp-app/
├── apps/
│   ├── mobile/          # React Native app (current NVLPMobile)
│   ├── api/             # Edge functions & API endpoints
│   └── web/             # Future web app (placeholder)
├── packages/
│   ├── client/          # Shared NVLP TypeScript client
│   ├── types/           # Shared TypeScript types
│   └── config/          # Shared configuration (ESLint, TypeScript)
├── docs/                # All documentation
├── .github/             # GitHub Actions
├── pnpm-workspace.yaml  # Workspace configuration
├── package.json         # Root package.json
├── .gitignore          
├── README.md
└── turbo.json          # Optional: for build optimization later
```

## Migration Steps

### Phase 1: Setup Monorepo Structure
1. Install pnpm globally
2. Create pnpm-workspace.yaml
3. Create root package.json with workspace scripts
4. Create directory structure

### Phase 2: Move Backend/API
1. Move edge functions to `apps/api/`
2. Move API-specific dependencies
3. Update import paths
4. Test edge function deployments

### Phase 3: Extract Client Library
1. Move `src/client/` to `packages/client/`
2. Create package.json for client package
3. Build and publish locally
4. Update TypeScript configuration

### Phase 4: Extract Shared Types
1. Identify shared types across projects
2. Create `packages/types/` with common interfaces
3. Update client and API to use shared types

### Phase 5: Move React Native App
1. Move `NVLPMobile/` contents to `apps/mobile/`
2. Update Metro configuration for monorepo
3. Update package.json dependencies
4. Fix import paths to use workspace packages

### Phase 6: Shared Configuration
1. Create `packages/config/` for shared configs
2. Move ESLint, Prettier, TypeScript base configs
3. Extend configs in each app/package

### Phase 7: Update Build & Deploy
1. Update Vercel configuration for monorepo
2. Create root-level build scripts
3. Update CI/CD workflows
4. Test all deployment paths

### Phase 8: Documentation & Cleanup
1. Update all documentation for monorepo structure
2. Update README files
3. Remove old directory structure
4. Update developer setup instructions

## Benefits
1. **Code Sharing**: Client library, types, and utilities shared across all apps
2. **Type Safety**: Single source of truth for TypeScript types
3. **Consistency**: Shared ESLint, Prettier, and TypeScript configs
4. **Efficiency**: Change once, update everywhere
5. **Scalability**: Easy to add new apps (web, desktop, etc.)
6. **Developer Experience**: Better intellisense, type checking across projects

## Risks & Mitigation
1. **Complexity**: Monorepos add complexity
   - Mitigation: Start simple, add tooling as needed
2. **Build Times**: Can increase as project grows
   - Mitigation: Use Turborepo later for caching
3. **Learning Curve**: Team needs to understand workspace concepts
   - Mitigation: Good documentation and examples

## Success Criteria
- [ ] All existing functionality works
- [ ] Mobile app can import and use shared client
- [ ] Types are shared across all packages
- [ ] Single `pnpm install` at root installs everything
- [ ] Vercel deployments continue to work
- [ ] Development workflow is documented

## Next Steps
1. Get approval for monorepo migration
2. Create feature branch for migration
3. Execute migration plan step by step
4. Test thoroughly before merging