# NVLP - Virtual Envelope Budgeting System

A modern, API-first implementation of the envelope budgeting method with comprehensive money flow tracking and multi-platform support.

## Architecture

This project follows an API-first monorepo architecture:

- **API Package** (`/packages/api`): Service layer for all business logic
- **Types Package** (`/packages/types`): Shared TypeScript definitions
- **Client Package** (`/packages/client`): API client library for frontends

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run type checking
pnpm type-check

# Start development mode
pnpm dev
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Add your Supabase credentials:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (optional)

## Documentation

- [Technical Architecture](./docs/TECHNICAL_ARCHITECTURE.md)
- [Implementation Plan](./docs/IMPLEMENTATION_PLAN.md)
- [AI Context](./CLAUDE.md)

## Development Status

Currently building the core API layer. Mobile and web frontends will be added once the API is complete and tested.