# NVLP Development Guide

## Prerequisites

- Node.js 18+
- pnpm 8+
- iOS development: Xcode 14+, CocoaPods
- Android development: JDK 17, Android Studio

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/thelarryrutledge/nvlp-app.git
   cd nvlp-app
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   # Copy example env files
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/mobile/.env.example apps/mobile/.env
   ```

4. Start development:
   ```bash
   # Start API + packages (recommended for backend development)
   pnpm dev
   
   # Start everything including Metro bundler
   pnpm dev:all
   ```

## Development Scripts

### Quick Start
```bash
# Check your development environment
pnpm dev:check

# View comprehensive development guide
pnpm dev:guide

# Start core development (recommended)
pnpm dev
```

### Main Development Commands

- **`pnpm dev`** - Starts API + packages (watches for changes)
  - 📦 Packages: Auto-rebuilds @nvlp/client and @nvlp/types
  - 🌐 API: Runs Supabase local environment and Edge Functions

- **`pnpm dev:all`** - Starts everything including Metro bundler
  - Includes everything from `pnpm dev` plus:
  - 📱 Mobile: React Native Metro bundler

- **`pnpm dev:full`** - Starts all components individually with detailed output
  - 🔷 Types: Individual watch mode with blue output
  - 🟡 Client: Individual watch mode with yellow output  
  - 🟢 API: Supabase services with green output
  - 🟣 Mobile: Metro bundler with magenta output

### Focused Development Commands

- **`pnpm dev:packages`** - Watch and rebuild packages only
- **`pnpm dev:apps`** - Start apps (API + Mobile Metro) only
- **`pnpm dev:api`** - Start API services only
- **`pnpm dev:mobile`** - Start React Native Metro bundler only
- **`pnpm dev:db`** - Start database only

### Mobile Development Commands

- **`pnpm dev:mobile:ios`** - Start Metro + iOS simulator
- **`pnpm dev:mobile:android`** - Start Metro + Android emulator  
- **`pnpm dev:mobile:metro`** - Start Metro bundler only

### Development Utilities

- **`pnpm dev:check`** - Check development environment and prerequisites
- **`pnpm dev:guide`** - Display comprehensive development workflow guide

## Common Tasks

### Building
```bash
# Build all packages
pnpm build

# Build specific package
pnpm build:client
pnpm build:api
pnpm build:mobile
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Linting & Formatting
```bash
# Check for lint issues
pnpm lint

# Fix lint issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check
```

### Type Checking
```bash
# Run TypeScript type checking
pnpm typecheck
```

### Cleaning
```bash
# Clean build artifacts
pnpm clean

# Deep clean (including node_modules)
pnpm clean:all
```

## Mobile Development

### Development Workflows

#### Option 1: Separate Terminals (Recommended)
```bash
# Terminal 1: Start backend services
pnpm dev

# Terminal 2: Start mobile development
pnpm dev:mobile:ios      # For iOS
# OR
pnpm dev:mobile:android  # For Android
```

#### Option 2: All-in-One
```bash
# Start everything (you'll need to launch simulator separately)
pnpm dev:all

# Then in another terminal or manually:
# For iOS: open -a Simulator
# For Android: Open Android Studio AVD Manager
```

### Platform-Specific Commands
```bash
# iOS development
pnpm --filter @nvlp/mobile ios

# Android development  
pnpm --filter @nvlp/mobile android

# Just Metro bundler
pnpm --filter @nvlp/mobile start
```

## API Development

The API uses Supabase Edge Functions. Development options:

```bash
# Start full dev environment (recommended)
pnpm dev

# Start only API services
pnpm dev:api

# Start only database
pnpm dev:db
```

The API development server includes:
- Local Supabase instance (PostgreSQL)
- Edge Functions runtime
- Authentication services
- Realtime subscriptions

## Debugging

### React Native Debugger
- Use React DevTools for component inspection
- Chrome DevTools for JavaScript debugging
- Metro logs for bundler issues

### API Debugging
- Check Vercel function logs
- Use console.log for local debugging
- Monitor network requests in browser DevTools