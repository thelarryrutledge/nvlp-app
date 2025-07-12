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
   pnpm dev
   ```

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

### iOS
```bash
cd apps/mobile
pnpm ios
```

### Android
```bash
cd apps/mobile
pnpm android
```

## API Development

The API uses Vercel Edge Functions. To develop locally:

```bash
pnpm dev:api
```

## Debugging

### React Native Debugger
- Use React DevTools for component inspection
- Chrome DevTools for JavaScript debugging
- Metro logs for bundler issues

### API Debugging
- Check Vercel function logs
- Use console.log for local debugging
- Monitor network requests in browser DevTools