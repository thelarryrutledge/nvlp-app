# Current NVLP Project Structure

## Overview
This document captures the project structure before monorepo migration for reference.

## Root Directory Structure
```
nvlp-app/
├── .github/                    # GitHub Actions workflows
├── .vercel/                    # Vercel deployment config
├── api/                        # Vercel Edge Functions (endpoints)
├── database/                   # Database schema and documentation
├── dist/                       # Compiled TypeScript output
│   └── client/                 # Compiled client library
├── docs/                       # Project documentation
├── docs-site/                  # Documentation website
├── examples/                   # Example code
├── export-samples/             # Export format samples
├── NVLPMobile/                 # React Native mobile app
├── public/                     # Static files served by Vercel
│   ├── api-docs/              # API documentation
│   ├── assets/                # Static assets
│   ├── auth/                  # Auth pages
│   └── status/                # Status page
├── scripts/                    # Utility scripts
├── src/                        # TypeScript source code
│   └── client/                 # Client library source
│       └── transports/         # Transport implementations
├── supabase/                   # Supabase configuration
│   ├── functions/             # Supabase Edge Functions
│   └── migrations/            # Database migrations
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── guidelines.md              # Development guidelines
├── memory.md                  # Project memory/context
├── package.json               # Node.js dependencies
├── tsconfig.json              # TypeScript configuration
└── vercel.json                # Vercel configuration
```

## Key Directories

### /api/
Vercel Edge Functions serving as API endpoints:
- Authentication endpoints
- Business logic endpoints
- Complex operations

### /src/client/
TypeScript client library:
- `nvlp-client.ts` - Main client class
- `types.ts` - TypeScript type definitions
- `errors.ts` - Error handling
- `token-manager.ts` - Token management
- `transports/` - PostgREST and Edge Function transports

### /dist/client/
Compiled JavaScript version of the client library with source maps and type definitions.

### /NVLPMobile/
React Native app created with React Native CLI:
- Standard React Native structure
- TypeScript configured
- Path aliases set up (@/components, etc.)
- Zustand state management implemented

### /supabase/
Supabase-specific files:
- `/functions/` - Supabase Edge Functions (different from Vercel)
- `/migrations/` - Database migration files
- `config.toml` - Supabase configuration

### /public/
Static files served by Vercel:
- API documentation
- Status page
- Auth pages
- Static assets

## Configuration Files

### Root Level
- `package.json` - Main project dependencies and scripts
- `tsconfig.json` - TypeScript configuration for src/
- `vercel.json` - Vercel deployment configuration
- `.env.example` - Environment variables template

### React Native App
- `NVLPMobile/package.json` - React Native dependencies
- `NVLPMobile/tsconfig.json` - React Native TypeScript config
- `NVLPMobile/metro.config.js` - Metro bundler configuration
- `NVLPMobile/.eslintrc.js` - ESLint configuration
- `NVLPMobile/.prettierrc.js` - Prettier configuration

## Dependencies Structure

### Root package.json
- TypeScript and build tools
- Vercel CLI

### NVLPMobile package.json
- React Native and React
- Navigation libraries
- State management (Zustand)
- Utility libraries

## Build Outputs
- `/dist/` - Compiled TypeScript output
- `/NVLPMobile/ios/build/` - iOS build artifacts
- `/NVLPMobile/android/app/build/` - Android build artifacts

## Deployment
- Vercel handles `/api/` endpoints and `/public/` static files
- Supabase hosts database and Edge Functions
- Mobile apps deployed through App Store/Play Store

## Notes for Migration
1. Client library is currently duplicated (source in /src/client/, compiled in /dist/client/)
2. Two different Edge Function systems (Vercel in /api/, Supabase in /supabase/functions/)
3. Documentation scattered across multiple locations
4. No shared configuration between projects
5. No shared type definitions (each project has its own)