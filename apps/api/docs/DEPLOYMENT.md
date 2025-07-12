# NVLP API Deployment Guide

## Overview

The NVLP API is built on Supabase Edge Functions and deployed from a monorepo structure. This guide covers the deployment process from the monorepo setup.

## Architecture

```
nvlp-app/                          # Monorepo root
├── apps/api/                      # API package (this directory)
│   ├── package.json               # Contains deployment scripts
│   ├── docs/                      # API documentation
│   └── ...
├── supabase/                      # Supabase configuration (deployed location)
│   ├── functions/                 # Edge Functions source code
│   │   ├── auth/                  # Authentication endpoints
│   │   ├── dashboard/            # Dashboard data aggregation
│   │   ├── transactions/         # Transaction management
│   │   ├── envelopes/            # Envelope operations  
│   │   ├── reports/              # Financial reporting
│   │   ├── export/               # Data export functionality
│   │   ├── notifications/        # User notifications
│   │   ├── audit/                # Audit logging
│   │   ├── health/               # Health check endpoint
│   │   └── _shared/              # Shared utilities and cache
│   ├── migrations/               # Database migrations
│   └── config.toml              # Supabase project configuration
└── ...
```

## Deployment Methods

### Method 1: From API Package (Recommended)

```bash
cd apps/api
pnpm deploy
```

This method:
- Runs from the API package directory
- Executes deployment script that navigates to root
- Ensures proper context and environment
- Provides better error messages

### Method 2: From Root Directory

```bash
cd /path/to/nvlp-app
supabase functions deploy
```

This method:
- Deploys all functions at once
- Good for bulk deployments
- Requires being in the correct root directory

### Method 3: Deploy Specific Function

```bash
cd /path/to/nvlp-app
supabase functions deploy [function-name]
```

Example:
```bash
supabase functions deploy auth
supabase functions deploy transactions
```

## Available Functions

| Function | Purpose | Endpoints |
|----------|---------|-----------|
| `auth` | Authentication | `/auth/login`, `/auth/register`, etc. |
| `dashboard` | Dashboard data | `/dashboard/*` |
| `transactions` | Transaction management | `/transactions/*` |
| `envelopes` | Envelope operations | `/envelopes/*` |
| `reports` | Financial reporting | `/reports/*` |
| `export` | Data export | `/export/*` |
| `notifications` | User notifications | `/notifications/*` |
| `audit` | Audit logging | `/audit/*` |
| `health` | Health checks | `/health` |

## Pre-Deployment Checklist

### 1. Environment Setup

Ensure you have:
- Supabase CLI installed and authenticated
- Access to the Supabase project
- Environment variables configured in Supabase Dashboard

### 2. Code Validation

Run these checks before deployment:

```bash
# From root directory
cd /path/to/nvlp-app

# Check TypeScript compilation
pnpm --filter @nvlp/api typecheck

# Run linting
pnpm --filter @nvlp/api lint

# Verify function syntax
deno lint supabase/functions/
```

### 3. Database Schema

Ensure database migrations are up to date:

```bash
# Check migration status
supabase db status

# Apply pending migrations (if any)
supabase db push
```

## Deployment Process

### Step 1: Navigate to API Package

```bash
cd apps/api
```

### Step 2: Deploy Functions

```bash
# Deploy all functions
pnpm deploy

# Output should show:
# Deployed Functions on project [project-id]: auth, dashboard, export, health, notifications, reports, transactions
```

### Step 3: Verify Deployment

```bash
# Test health endpoint
curl https://[project-ref].supabase.co/functions/v1/health

# Test authenticated endpoint (requires valid JWT)
curl -H "Authorization: Bearer [jwt-token]" \
     https://[project-ref].supabase.co/functions/v1/dashboard
```

## Environment Variables

Functions access environment variables through Supabase. Required variables:

### Supabase Environment
- `SUPABASE_URL` - Automatically provided
- `SUPABASE_ANON_KEY` - Automatically provided  
- `SUPABASE_SERVICE_ROLE_KEY` - May need manual configuration

### Custom Variables
Configure these in Supabase Dashboard > Edge Functions > Environment Variables:

```bash
# JWT Configuration
JWT_SECRET=your_jwt_secret

# External API Keys (if needed)
EXTERNAL_API_KEY=your_external_api_key

# Feature Flags
ENABLE_AUDIT_LOGGING=true
```

## Troubleshooting

### Common Issues

#### 1. "Docker is not running" Warning
```
WARNING: Docker is not running
```
- This is expected in monorepo setup
- Functions still deploy successfully to remote
- Can be safely ignored

#### 2. Permission Denied
```
Error: You do not have permission to access this project
```
- Verify Supabase CLI authentication: `supabase auth status`
- Re-authenticate: `supabase auth login`
- Check project access in Supabase Dashboard

#### 3. Function Fails to Deploy
```
Deploying Function: [function-name]
Error: [error-message]
```
- Check function syntax with: `deno lint supabase/functions/[function-name]/`
- Verify imports and dependencies
- Check function size limits

#### 4. Import Path Issues
```
Error: Cannot resolve module
```
- Ensure relative imports use correct paths
- Shared utilities should be imported from `../_shared/`
- Use absolute URLs for external dependencies

### Debugging Commands

```bash
# Check Supabase CLI status
supabase status

# List deployed functions
supabase functions list

# Get function logs
supabase functions logs [function-name]

# Test function locally (requires Docker)
supabase functions serve [function-name]
```

## Rollback Procedure

If deployment causes issues:

### 1. Identify Last Working Version

```bash
# Check git history
git log --oneline supabase/functions/

# Find last working commit
git show [commit-hash]:supabase/functions/[function-name]/index.ts
```

### 2. Revert to Previous Version

```bash
# Revert specific function
git checkout [working-commit-hash] -- supabase/functions/[function-name]/

# Redeploy
supabase functions deploy [function-name]
```

### 3. Emergency Rollback

If all functions are broken:

```bash
# Revert entire functions directory
git checkout HEAD~1 -- supabase/functions/

# Redeploy all
supabase functions deploy
```

## Monitoring

### Function Health

Monitor function health via:
- Supabase Dashboard > Edge Functions > Logs
- Custom health check endpoint: `/health`
- Application performance monitoring

### Key Metrics

Track these metrics:
- Function execution time
- Error rates
- Authentication failures
- Database query performance

## Best Practices

### 1. Deployment Strategy
- Always deploy from `apps/api` package for consistency
- Test functions individually before bulk deployment
- Deploy during low-traffic periods
- Keep deployment logs for reference

### 2. Code Organization
- Use shared utilities in `_shared/` directory
- Follow consistent error handling patterns
- Implement proper logging in all functions
- Maintain function size under limits

### 3. Security
- Never commit sensitive environment variables
- Use Row Level Security (RLS) for data access
- Validate all inputs and sanitize outputs
- Implement proper CORS headers

### 4. Testing
- Test functions with authentication before deployment
- Verify error handling with invalid inputs
- Check CORS functionality for web clients
- Validate database access patterns

## Related Documentation

- [API Test Plan](./API_TEST_PLAN.md) - Comprehensive testing guide
- [Authentication Quick Reference](./AUTH_QUICK_REFERENCE.md) - Auth implementation
- [RLS Policies](./RLS_POLICIES.md) - Database security
- [API Specification](./api-specification.yaml) - OpenAPI documentation