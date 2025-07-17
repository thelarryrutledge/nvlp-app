# Hot Reload Configuration

This document explains the hot reload setup for the NVLP monorepo and how changes propagate across packages.

## Hot Reload Architecture

### Dependency Chain
```
@nvlp/types → @nvlp/client → mobile app
                        ↘ → API functions
```

### How It Works

1. **Types Package (`@nvlp/types`)**
   - Uses `tsup` with `--watch` flag
   - Rebuilds on `.ts` file changes in `src/`
   - Generates ESM/CJS outputs with TypeScript declarations

2. **Client Package (`@nvlp/client`)**
   - Depends on `@nvlp/types`
   - Uses `tsup` with `--watch` flag  
   - Automatically rebuilds when types change
   - Generates ESM/CJS outputs

3. **Mobile App (`@nvlp/mobile`)**
   - Metro bundler watches workspace packages
   - Configured watch folders include:
     - `packages/types/src` and `packages/types/dist`
     - `packages/client/src` and `packages/client/dist`
   - React Native Fast Refresh for component changes
   - Automatic reload when package dependencies change

4. **API Functions (`@nvlp/api`)**
   - Supabase edge runtime with `oneshot` policy for hot reload
   - Import map configured for workspace packages
   - Deno runtime automatically reloads functions on change
   - Package changes trigger function reload via import map

## Development Commands

### Standard Hot Reload
```bash
# Start all services with standard hot reload
pnpm dev:all
```

### Enhanced Hot Reload
```bash
# Start with enhanced dependency-aware hot reload
pnpm dev:hot
```

### Individual Package Development
```bash
# Watch mode for types only
pnpm --filter @nvlp/types dev

# Watch mode for client only  
pnpm --filter @nvlp/client dev

# Mobile Metro only
pnpm --filter @nvlp/mobile dev

# API functions only
pnpm --filter @nvlp/api dev
```

## Hot Reload Features

### ✅ What Works
- **Types → Client**: Automatic rebuild when types change
- **Client → Mobile**: Metro detects package changes and refreshes
- **Client → API**: Supabase functions reload when imports change
- **Mobile Components**: React Native Fast Refresh
- **API Functions**: Supabase edge runtime hot reload
- **Source Maps**: Available for debugging across packages

### ⚡ Performance Optimizations
- **Incremental builds**: Only changed files are rebuilt
- **Parallel watching**: All packages watch simultaneously
- **Metro caching**: Metro caches unchanged dependencies
- **Deno caching**: Edge functions cache unchanged modules

### 🔧 Configuration Files

#### Metro (Mobile)
- `apps/mobile/metro.config.js`
- Watches `packages/*/src` and `packages/*/dist`
- Configured for monorepo workspace resolution

#### Supabase (API)
- `supabase/config.toml` - Edge runtime with `oneshot` policy
- `supabase/functions/_shared/import_map.json` - Package imports

#### TSup (Packages)
- `packages/types/package.json` - Types build config
- `packages/client/tsup.config.ts` - Client build config

## Troubleshooting

### Common Issues

**Metro not detecting package changes:**
```bash
# Clear Metro cache and restart
pnpm --filter @nvlp/mobile start --reset-cache
```

**Types not updating in mobile:**
```bash
# Force rebuild packages
pnpm build:packages
# Clear Metro cache
pnpm --filter @nvlp/mobile start --reset-cache
```

**API functions not reloading:**
```bash
# Restart Supabase services
pnpm --filter @nvlp/api dev:db
pnpm --filter @nvlp/api dev:functions
```

**Package build errors:**
```bash
# Clean and rebuild everything
pnpm clean:deep
pnpm build:packages
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Metro debug mode
DEBUG=Metro* pnpm --filter @nvlp/mobile dev

# Supabase debug mode  
SUPABASE_LOG_LEVEL=debug pnpm --filter @nvlp/api dev

# TSup debug mode
DEBUG=tsup pnpm --filter @nvlp/client dev
```

## Best Practices

### For Package Development
1. Always run `pnpm build:packages` after major changes
2. Use `pnpm dev:hot` for dependency-aware development
3. Monitor console output for build success/failure
4. Test changes in both mobile and API consumers

### For Mobile Development  
1. Use `pnpm dev` (packages + API) in one terminal
2. Use `pnpm dev:mobile:ios` or `pnpm dev:mobile:android` in another
3. Keep Metro cache clear during package development
4. Use React DevTools for component debugging

### For API Development
1. Use `pnpm dev:api` for isolated API development
2. Run `pnpm dev:packages` in parallel for package changes
3. Monitor Supabase logs for function reload confirmation
4. Test functions in Supabase Studio after package changes

## File Watching

The hot reload system watches these locations:

```
├── packages/types/src/          # Source changes trigger rebuild
├── packages/types/dist/         # Metro watches for rebuild completion
├── packages/client/src/         # Source changes trigger rebuild  
├── packages/client/dist/        # Metro watches for rebuild completion
├── apps/mobile/src/             # React Native Fast Refresh
├── apps/api/src/functions/      # Supabase hot reload
└── supabase/functions/          # Deno runtime reload
```

## Performance Impact

Hot reload adds minimal overhead:
- **Package builds**: ~100-500ms per change
- **Metro refresh**: ~50-200ms after package rebuild
- **API reload**: ~50-100ms via Deno runtime
- **Memory usage**: +50-100MB for file watchers

The benefits of instant feedback far outweigh the minimal performance cost.