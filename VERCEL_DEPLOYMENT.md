# Vercel Deployment Configuration

## Overview

This document outlines the Vercel deployment configuration for the NVLP monorepo structure.

## Configuration Files

### Root Configuration (`/vercel.json`)
- **Purpose**: Main deployment configuration for the monorepo
- **Build Command**: `pnpm build:vercel:prod` (production optimized)
- **Install Command**: `pnpm install --frozen-lockfile` (deterministic builds)
- **Framework**: None (static + API proxy)
- **Features**: 
  - Static file serving from `/public`
  - API proxy routing to Supabase Edge Functions
  - Security headers
  - CORS configuration
  - Turbo cache integration for faster builds
  - Selective deployment based on file changes

### API Configuration (`/apps/api/vercel.json`)
- **Purpose**: Documentation and configuration for Supabase Edge Functions
- **Deployment Type**: Supabase (not Vercel functions)
- **Functions**: 8 Edge Functions (auth, dashboard, transactions, reports, audit, export, health, notifications)
- **Base URL**: `https://qnpatlosomopoimtsmsr.supabase.co/functions/v1`

### Mobile Configuration (`/apps/mobile/vercel.json`)
- **Purpose**: Documentation for React Native app deployment
- **Platform**: React Native (not deployed to Vercel)
- **Distribution**: App stores (iOS App Store, Google Play Store)
- **Dependencies**: Uses workspace packages (@nvlp/client, @nvlp/types, @nvlp/config)

## Deployment Process

### Prerequisites
1. Install Vercel CLI: `npm install -g vercel`
2. Ensure all packages are built: `pnpm build:vercel:prod`
3. Verify configuration: `node -e "console.log(require('./vercel.json'))"`
4. Optional: Set up Turbo cache tokens for faster builds

### Deployment Commands

#### Using npm scripts:
```bash
# Dry run (test configuration)
pnpm deploy:vercel dry-run

# Preview deployment
pnpm deploy:vercel:preview

# Production deployment
pnpm deploy:vercel:production
```

#### Using script directly:
```bash
# Test deployment readiness
./scripts/deploy-vercel.sh dry-run

# Deploy to preview
./scripts/deploy-vercel.sh preview

# Deploy to production
./scripts/deploy-vercel.sh production
```

## Monorepo Considerations

### Build Process
1. **Package Building**: All workspace packages are built using `pnpm build:vercel:prod`
2. **Dependency Resolution**: pnpm workspaces with frozen lockfile for deterministic builds
3. **Turbo Integration**: Uses Turbo for efficient package building with caching
4. **Environment Optimization**: Production builds use NODE_ENV=production
5. **Selective Deployment**: Only deploys when relevant files change

### API Routing
- **Edge Functions**: Routed through Vercel to Supabase Edge Functions
- **Database API**: Direct proxy to Supabase PostgREST API
- **Custom Domains**: 
  - `edge-api.nvlp.app` → Supabase Edge Functions
  - `db-api.nvlp.app` → Supabase PostgREST API

### Environment Variables
- **Vercel Project**: Environment variables set in Vercel dashboard
- **Supabase Functions**: Environment variables managed in Supabase
- **Mobile App**: Environment variables via react-native-config

## Security Features

### Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

### CORS
- **Allowed Origins**: `*` (configurable per environment)
- **Allowed Methods**: `GET, POST, PUT, DELETE, OPTIONS`
- **Allowed Headers**: `Content-Type, Authorization, apikey`

## Deployment Verification

### Automated Checks
- Configuration validation
- Package build verification
- Dependency resolution testing
- API routing validation

### Manual Verification
1. Visit deployed URL
2. Test API endpoints
3. Verify static file serving
4. Check security headers
5. Validate CORS functionality

## Troubleshooting

### Common Issues

#### Build Failures
- **Cause**: Missing package builds
- **Solution**: Run `pnpm build:packages` before deployment

#### API Routing Issues
- **Cause**: Incorrect Supabase configuration
- **Solution**: Verify `SUPABASE_URL` and routing configuration

#### Environment Variables
- **Cause**: Missing environment variables
- **Solution**: Check Vercel project settings and Supabase configuration

### Debug Commands
```bash
# Test configuration
node -e "console.log(require('./vercel.json'))"

# Test package builds
pnpm build:vercel:prod

# Test deployment readiness
./scripts/deploy-vercel.sh dry-run
```

## Best Practices

1. **Always run dry-run first** before actual deployment
2. **Build packages locally** to catch build issues early
3. **Use preview deployments** for testing changes
4. **Monitor deployment logs** for any issues
5. **Verify functionality** after each deployment

## Related Documentation

- [Monorepo Migration Roadmap](./monorepo-migration-roadmap.md)
- [API Workflow Validation](./MOBILE_WORKFLOW_VALIDATION.md)
- [Development Guidelines](./guidelines.md)