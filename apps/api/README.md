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
├── api/                 # Vercel Edge Functions
│   ├── auth/           # Authentication endpoints
│   ├── budgets/        # Budget management
│   ├── transactions/   # Transaction handling
│   └── ...            # Other endpoints
├── src/                # Shared utilities
│   ├── lib/           # Helper functions
│   └── middleware/    # Express middleware
├── .env.example       # Environment template
├── package.json       # Package configuration
├── tsconfig.json      # TypeScript config
└── vercel.json        # Vercel configuration
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build TypeScript
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Check TypeScript types
- `pnpm deploy` - Deploy to Vercel

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

The API is deployed to Vercel:

```bash
# Deploy to production
pnpm deploy

# Or from root
pnpm --filter @nvlp/api deploy
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