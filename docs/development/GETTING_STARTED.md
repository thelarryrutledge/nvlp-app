# Getting Started with NVLP Monorepo

This guide will help you get up and running with the NVLP (Virtual Envelope Budget) monorepo quickly and efficiently.

## What You'll Learn

- How to set up the development environment
- Understanding the monorepo structure
- Basic development workflows
- Key commands and tools
- Testing and debugging procedures

## Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **pnpm** (v8 or higher) - Install with `npm install -g pnpm`
- **Git** - For version control
- **VS Code** (recommended) - With suggested extensions

### Platform-Specific Requirements

#### For Mobile Development:
- **iOS**: macOS with Xcode 14+ and iOS Simulator
- **Android**: Android Studio with SDK 35, JDK 11+

#### For API Development:
- **Deno** (v1.40+) - For Supabase Edge Functions
- **Supabase CLI** - Install with `pnpm add -g supabase`

## Quick Start (5 minutes)

1. **Clone the repository**
   ```bash
   git clone https://github.com/thelarryrutledge/nvlp-app.git
   cd nvlp-app
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build shared packages**
   ```bash
   pnpm build:packages
   ```

4. **Start development**
   ```bash
   pnpm dev
   ```

5. **Verify setup**
   ```bash
   pnpm type-check && pnpm lint
   ```

## Understanding the Monorepo Structure

```
nvlp-app/
├── apps/
│   ├── mobile/          # React Native app
│   └── api/             # Supabase Edge Functions
├── packages/
│   ├── types/           # Shared TypeScript types
│   ├── client/          # API client library
│   └── config/          # Shared configurations
├── docs/                # Documentation
└── scripts/             # Build and utility scripts
```

### Key Concepts

- **Workspace Dependencies**: Packages reference each other with `workspace:*`
- **Build Order**: types → client → apps (automatic dependency resolution)
- **Shared Configuration**: ESLint, Prettier, TypeScript configs in `@nvlp/config`
- **Remote Supabase**: No local database - uses remote instance

## Your First Contribution

### 1. Choose Your Development Focus

**Full-Stack Development:**
```bash
pnpm dev:full  # Starts all packages and apps
```

**Mobile-Only Development:**
```bash
pnpm dev:mobile       # Start Metro bundler
pnpm dev:mobile:ios   # Run iOS simulator
```

**API-Only Development:**
```bash
pnpm dev:api          # Instructions for Edge Functions
pnpm deploy:api       # Deploy to remote Supabase
```

**Package Development:**
```bash
pnpm dev:packages     # Build packages in watch mode
```

### 2. Make Your Changes

Edit files in the relevant package or app. The build system will automatically:
- Rebuild dependent packages
- Type-check across packages
- Hot-reload the mobile app
- Validate API functions

### 3. Test Your Changes

```bash
# Run all tests
pnpm test

# Run specific tests
pnpm test:mobile
pnpm test:api
pnpm test:packages

# Type checking
pnpm type-check

# Linting
pnpm lint
```

### 4. Quality Checks

Before committing, run:
```bash
pnpm verify  # Runs build + test + lint
```

## Common Development Workflows

### Adding a New Feature

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **If adding types**, start in `packages/types/`
   ```bash
   cd packages/types
   # Add types to src/
   pnpm dev  # Watch mode
   ```

3. **If adding API functionality**, work in `apps/api/`
   ```bash
   cd apps/api
   # Edit functions in ../../supabase/functions/
   pnpm deploy:api
   ```

4. **If adding mobile features**, work in `apps/mobile/`
   ```bash
   cd apps/mobile
   pnpm start  # Start Metro
   pnpm ios    # Run iOS simulator
   ```

### Making Package Changes

When modifying shared packages:

1. **Build the package**
   ```bash
   pnpm --filter @nvlp/types build
   ```

2. **Dependent packages rebuild automatically**
   - The build system detects changes
   - Rebuilds consuming packages
   - Updates running apps

3. **Test the changes**
   ```bash
   pnpm test:packages
   ```

### Debugging Common Issues

**Metro bundler issues:**
```bash
pnpm --filter @nvlp/mobile start:reset
```

**Type errors after package changes:**
```bash
pnpm build:packages
pnpm type-check
```

**Dependency issues:**
```bash
pnpm clean:deep
pnpm install
pnpm build:packages
```

## Essential Commands Reference

### Development
```bash
pnpm dev                 # Start main development servers
pnpm dev:mobile         # Mobile development
pnpm dev:api            # API development
pnpm dev:packages       # Package development
```

### Building
```bash
pnpm build:packages     # Build shared packages
pnpm build:mobile:ios   # Build iOS app
pnpm build:mobile:android # Build Android app
```

### Testing
```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode testing
pnpm type-check        # TypeScript validation
pnpm lint              # Code linting
```

### Deployment
```bash
pnpm deploy:api        # Deploy Edge Functions
pnpm deploy:api:auth   # Deploy specific function
```

### Maintenance
```bash
pnpm clean             # Clean build artifacts
pnpm clean:deep        # Deep clean + reinstall
pnpm update:deps       # Update dependencies
```

## IDE Setup (VS Code)

### Recommended Extensions

Install these extensions for the best experience:

1. **TypeScript and JavaScript**
   - TypeScript Importer
   - Auto Rename Tag
   - Bracket Pair Colorizer

2. **React Native**
   - React Native Tools
   - React Native Snippet

3. **Code Quality**
   - ESLint
   - Prettier
   - Error Lens

4. **Monorepo Tools**
   - TypeScript Monorepo
   - Path Intellisense

### Workspace Settings

The repo includes `.vscode/settings.json` with:
- TypeScript configuration
- ESLint integration
- Prettier formatting
- File associations

## Testing Your Setup

Run this comprehensive test to verify everything works:

```bash
# 1. Clean install
pnpm clean:deep

# 2. Build packages
pnpm build:packages

# 3. Run tests
pnpm test

# 4. Type check
pnpm type-check

# 5. Lint code
pnpm lint

# 6. Test mobile build (iOS/Android)
pnpm --filter @nvlp/mobile build:validate:ios
pnpm --filter @nvlp/mobile build:validate:android

# 7. Test API deployment
pnpm deploy:api:health
```

If all commands succeed, you're ready to develop!

## Next Steps

1. **Read the Architecture Guide** - `docs/ARCHITECTURE.md`
2. **Review Development Workflows** - `docs/development/WORKFLOW.md`
3. **Check Deployment Guide** - `docs/development/DEPLOYMENT_OVERVIEW.md`
4. **Explore the Codebase** - Start with `packages/types/src/index.ts`

## Getting Help

- **Documentation**: Check `docs/` directory
- **Issues**: Common problems in `docs/development/SETUP_GUIDE.md`
- **Commands**: Reference `package.json` scripts
- **Architecture**: Review `docs/ARCHITECTURE.md`

## Environment Variables

Create `.env` files as needed:

```bash
# Root .env (for Supabase)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Mobile .env (apps/mobile/.env)
API_URL=your-api-url
```

## Tips for Success

1. **Start Small**: Begin with package modifications before app changes
2. **Use Watch Mode**: Keep `pnpm dev:packages` running while developing
3. **Check Types Often**: Run `pnpm type-check` frequently
4. **Test Early**: Write tests alongside your code
5. **Read the Docs**: The `docs/` directory has comprehensive guides

Happy coding! 🚀