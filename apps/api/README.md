# NVLP API

Backend API services for the NVLP Virtual Envelope Budget App.

## Overview

This package contains:
- Vercel Edge Functions for API endpoints
- Authentication endpoints
- Business logic for complex operations
- Integration with Supabase backend

## Development

### Prerequisites
- Node.js 18+
- pnpm 8+
- Vercel CLI

### Setup

1. Install dependencies from the root:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. Start development server:
   ```bash
   # From root
   pnpm dev:api

   # Or from this directory
   pnpm dev
   ```

The API will be available at `http://localhost:3001`

## Project Structure

```
apps/api/
├── docs/               # API documentation
│   ├── API_TEST_PLAN.md
│   ├── api-specification.yaml
│   └── ...            # Other API docs
├── src/                # Shared utilities (if needed)
│   ├── lib/           # Helper functions
│   ├── types/         # TypeScript types
│   └── utils/         # Utility functions
├── package.json       # Package configuration
├── tsconfig.json      # TypeScript config
└── vercel.json        # Deployment reference

# Note: Actual Supabase functions are at repository root
../../supabase/
├── functions/          # Supabase Edge Functions
│   ├── auth/          # Authentication endpoints
│   ├── dashboard/     # Dashboard data
│   ├── transactions/  # Transaction handling
│   └── ...           # Other functions
├── migrations/        # Database migrations
└── config.toml       # Supabase configuration
```

## Documentation

API documentation is located in the `docs/` directory:

- `docs/API_TEST_PLAN.md` - Comprehensive API testing guide
- `docs/api-specification.yaml` - OpenAPI specification
- `docs/AUTH_QUICK_REFERENCE.md` - Authentication reference
- `docs/RLS_POLICIES.md` - Row Level Security policies
- `docs/test-api.html` - Interactive API testing tool

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build TypeScript
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Check TypeScript types
- `pnpm deploy` - Deploy Supabase Edge Functions to production
- `pnpm deploy:vercel` - Deploy to Vercel (if applicable)

## Environment Variables

Required environment variables:

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# JWT
JWT_SECRET=your_jwt_secret

# Other
NODE_ENV=development
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - User logout

### Resources
- `/api/budgets` - Budget management
- `/api/transactions` - Transaction handling
- `/api/envelopes` - Envelope operations
- `/api/reports` - Reporting endpoints

## Deployment

### Supabase Edge Functions

The primary API endpoints are deployed as Supabase Edge Functions. From the monorepo structure:

```bash
# Deploy all functions from root directory
cd /path/to/nvlp-app
supabase functions deploy

# Deploy specific function
supabase functions deploy [function-name]

# Deploy from apps/api directory (recommended)
cd apps/api
pnpm deploy
```

The `pnpm deploy` script in this package runs `supabase functions deploy` from the repository root, ensuring all functions are deployed correctly from the monorepo structure.

**Available Functions:**
- `auth` - Authentication endpoints
- `dashboard` - Dashboard data aggregation  
- `transactions` - Transaction management
- `envelopes` - Envelope operations
- `reports` - Financial reporting
- `export` - Data export functionality
- `notifications` - User notifications
- `audit` - Audit logging
- `health` - Health check endpoint

**Important Notes:**
- Functions are deployed from `../../supabase/functions/` directory
- Environment variables must be configured in Supabase Dashboard
- Functions use Row Level Security (RLS) for data access control
- All endpoints require JWT authentication except health check

### Vercel Deployment (Legacy)

If needed for additional API endpoints:

```bash
# Deploy to Vercel
pnpm deploy:vercel

# Or from root
pnpm --filter @nvlp/api deploy:vercel
```

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

## Dependencies

This package depends on:
- `@nvlp/client` - Shared API client
- `@nvlp/types` - Shared TypeScript types