# NVLP Development Setup Guide

This guide will walk you through setting up the NVLP project on a new development machine.

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Or install via package manager:
     ```bash
     # macOS with Homebrew
     brew install node
     
     # Ubuntu/Debian
     curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
     sudo apt-get install -y nodejs
     ```

2. **pnpm** (v8 or higher)
   ```bash
   # Install via npm
   npm install -g pnpm
   
   # Or via corepack (recommended)
   corepack enable
   corepack prepare pnpm@latest --activate
   ```

3. **Git**
   ```bash
   # macOS
   brew install git
   
   # Ubuntu/Debian
   sudo apt-get install git
   ```

4. **Supabase CLI** (for local development)
   ```bash
   # macOS
   brew install supabase/tap/supabase
   
   # npm/pnpm
   pnpm add -g supabase
   ```

### Recommended Tools

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
- **Git GUI client** (optional): GitHub Desktop, SourceTree, or GitKraken

## Project Setup

### 1. Clone the Repository

```bash
git clone https://github.com/[your-org]/nvlp-app.git
cd nvlp-app
```

### 2. Install Dependencies

```bash
# Install all monorepo dependencies
pnpm install
```

### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
# Required for API package
SUPABASE_URL=https://[PROJECT_ID].supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional: for local Supabase development
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### 4. Build the Project

```bash
# Build all packages in correct order
pnpm build

# Verify TypeScript compilation
pnpm type-check
```

## Supabase Setup

### Option 1: Connect to Existing Supabase Project

If you have access to an existing Supabase project:

1. Get credentials from the Supabase dashboard:
   - Go to Settings → API
   - Copy the Project URL and anon/public key
   - For service role key: Settings → API → Service role key

2. Update your `.env` file with these credentials

### Option 2: Create New Supabase Project

1. Create account at [supabase.com](https://supabase.com)

2. Create new project and wait for provisioning

3. Set up the database schema:
   ```bash
   # Navigate to the Supabase migrations directory
   cd supabase
   
   # Link to your project
   supabase link --project-ref [PROJECT_ID]
   
   # Run migrations (once available)
   supabase db push
   ```

### Option 3: Local Supabase Development

```bash
# Start local Supabase instance
supabase start

# Your local credentials will be:
# SUPABASE_URL=http://localhost:54321
# SUPABASE_ANON_KEY=[shown in terminal]
# SUPABASE_SERVICE_ROLE_KEY=[shown in terminal]
```

## Development Workflow

### Starting Development

```bash
# Start development mode for all packages
pnpm dev

# Or run specific package commands
pnpm --filter @nvlp/api dev
pnpm --filter @nvlp/types build
```

### Common Commands

```bash
# Type checking
pnpm type-check              # Check all packages
pnpm type-check --filter api # Check specific package

# Building
pnpm build                   # Build all packages
pnpm clean                   # Clean all build artifacts

# Testing (when available)
pnpm test                    # Run all tests
pnpm test:watch             # Run tests in watch mode
```

## Verification

### 1. Verify Installation

```bash
# Check Node.js
node --version  # Should be v18+

# Check pnpm
pnpm --version  # Should be v8+

# Check TypeScript compilation
pnpm type-check # Should complete without errors
```

### 2. Verify API Connection

Once your environment is configured:

```bash
# Build and start the API
pnpm build
pnpm --filter @nvlp/api dev

# In another terminal, test the health endpoint
curl http://localhost:3000/health
```

### 3. Test Authentication (if Supabase is configured)

```bash
# Request a magic link
curl -X POST http://localhost:3000/api/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## Troubleshooting

### Common Issues

1. **pnpm install fails**
   - Clear cache: `pnpm store prune`
   - Delete `node_modules` and `pnpm-lock.yaml`, then reinstall

2. **TypeScript errors**
   - Ensure all packages are built: `pnpm build`
   - Check VS Code is using workspace TypeScript version

3. **Supabase connection errors**
   - Verify `.env` file exists and has correct values
   - Check Supabase project is active (not paused)
   - For local dev, ensure `supabase start` is running

4. **Port conflicts**
   - API defaults to port 3000
   - Change in `packages/api/src/index.ts` if needed

### Getting Help

- Check `/docs/` directory for architecture and implementation details
- Review `CLAUDE.md` for AI assistant guidance
- Consult `API_ROADMAP.md` for current development status

## Next Steps

1. Review the technical architecture: `/docs/TECHNICAL_ARCHITECTURE.md`
2. Check current development phase: `/API_ROADMAP.md`
3. Explore the codebase structure:
   - `/packages/types/` - Shared TypeScript definitions
   - `/packages/api/` - Backend service layer
   - `/packages/client/` - Client library (future)

## IDE Setup (VS Code)

### Recommended Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### Debugging Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/packages/api/src/index.ts",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/packages/api/dist/**/*.js"],
      "envFile": "${workspaceFolder}/.env"
    }
  ]
}
```