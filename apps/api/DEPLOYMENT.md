# NVLP API Deployment Guide

## Overview
The NVLP API uses Supabase Edge Functions for serverless deployment. All functions are deployed directly to Supabase, not Vercel.

## Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Supabase project access credentials
- Deno installed (for local development)

## Deployment from Monorepo

### From Root Directory
```bash
# Deploy all API functions
pnpm deploy:api

# Deploy individual functions
pnpm deploy:api:auth
pnpm deploy:api:dashboard
pnpm deploy:api:transactions
pnpm deploy:api:reports

# Database operations
pnpm db:migrate
pnpm db:reset
pnpm db:types
```

### From apps/api Directory
```bash
cd apps/api

# Start local development
pnpm dev              # Start Supabase + serve functions
pnpm dev:db           # Start database only
pnpm dev:functions    # Serve functions only

# Deploy functions
pnpm deploy           # Deploy all functions
pnpm deploy:auth      # Deploy auth function
pnpm deploy:dashboard # Deploy dashboard function
# ... etc

# Database management
pnpm db:reset         # Reset local database
pnpm db:migrate       # Apply migrations
pnpm db:types         # Generate TypeScript types
```

## Environment Setup

### Local Development
1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Update environment variables in `.env`:
   ```bash
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_KEY=your_service_key
   JWT_SECRET=your_jwt_secret
   ```

3. Start local development:
   ```bash
   pnpm dev
   ```

### Production Deployment
1. Ensure Supabase CLI is logged in:
   ```bash
   supabase login
   ```

2. Link to your project:
   ```bash
   supabase link --project-ref your_project_ref
   ```

3. Deploy all functions:
   ```bash
   pnpm deploy
   ```

## Function Endpoints

After deployment, functions are available at:
- Base URL: `https://your-project.supabase.co/functions/v1/`
- Auth: `/auth`
- Dashboard: `/dashboard`
- Transactions: `/transactions`
- Reports: `/reports`
- Audit: `/audit`
- Export: `/export`
- Health: `/health`
- Notifications: `/notifications`

## Proxy Configuration

The main Vercel deployment proxies requests:
- `edge-api.nvlp.app/*` → Supabase Edge Functions
- `db-api.nvlp.app/*` → Supabase PostgREST API

## Troubleshooting

### Common Issues
1. **Functions not deploying**: Check Supabase CLI login and project linking
2. **Environment variables**: Ensure all required variables are set in Supabase dashboard
3. **CORS issues**: Check function CORS headers in individual function files

### Debugging
1. Check function logs in Supabase dashboard
2. Use `supabase functions logs <function-name>` for real-time logs
3. Test functions locally with `pnpm dev:functions`

## Monorepo Structure Note

The Supabase Edge Functions remain in the root `/supabase/functions/` directory to maintain compatibility with Supabase CLI. The `apps/api` package provides deployment scripts and utilities that work with this structure.