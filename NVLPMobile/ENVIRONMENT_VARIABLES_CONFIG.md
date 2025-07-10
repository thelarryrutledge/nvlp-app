# Environment Variables Configuration for NVLP Mobile

## Overview
Environment variables are configured using `react-native-config` to manage different configurations for development, staging, and production environments.

## Setup

### 1. Package Installation
```bash
npm install react-native-config
```

### 2. iOS Configuration
- Auto-linked with React Native 0.60+
- Run `cd ios && pod install` after installation

### 3. Android Configuration
- Added to `android/app/build.gradle`:
```gradle
apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"
```

## Environment Files

### Development (.env)
```bash
API_URL=http://localhost:3000
DB_API_URL=https://db-api.nvlp.app
EDGE_API_URL=https://edge-api.nvlp.app
SUPABASE_URL=https://qnpatlosomopoimtsmsr.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
APP_ENV=development
ENABLE_LOGGING=true
```

### Staging (.env.staging)
```bash
API_URL=https://staging-api.nvlp.app
DB_API_URL=https://staging-db-api.nvlp.app
EDGE_API_URL=https://staging-edge-api.nvlp.app
SUPABASE_URL=https://staging-project.supabase.co
SUPABASE_ANON_KEY=your_staging_anon_key_here
APP_ENV=staging
ENABLE_LOGGING=true
```

### Production (.env.production)
```bash
API_URL=https://api.nvlp.app
DB_API_URL=https://db-api.nvlp.app
EDGE_API_URL=https://edge-api.nvlp.app
SUPABASE_URL=https://qnpatlosomopoimtsmsr.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key_here
APP_ENV=production
ENABLE_LOGGING=false
```

## TypeScript Configuration

### Type Definitions (src/types/env.d.ts)
```typescript
declare module 'react-native-config' {
  export interface NativeConfig {
    API_URL: string;
    DB_API_URL: string;
    EDGE_API_URL: string;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    APP_ENV: 'development' | 'staging' | 'production';
    ENABLE_LOGGING: string;
  }
}
```

### Config Utility (src/config/index.ts)
A centralized configuration utility provides:
- Type-safe access to environment variables
- Default values
- Helper functions (isDev, isProd, log, logError)

## Usage

### Basic Usage
```typescript
import { config } from '@/config';

// Access configuration
const apiUrl = config.api.baseUrl;
const isDevelopment = config.app.isDevelopment;
```

### Using Helper Functions
```typescript
import { isDev, log, logError } from '@/config';

if (isDev()) {
  log('Debug information:', data);
}

try {
  // Some operation
} catch (error) {
  logError('Operation failed:', error);
}
```

### In API Services
```typescript
import { config } from '@/config';

const apiClient = {
  baseURL: config.api.edgeApiUrl,
  headers: {
    'apikey': config.supabase.anonKey,
  },
};
```

## Running with Different Environments

### Development (default)
```bash
npx react-native run-ios
npx react-native run-android
```

### Staging
```bash
ENVFILE=.env.staging npx react-native run-ios
ENVFILE=.env.staging npx react-native run-android
```

### Production
```bash
ENVFILE=.env.production npx react-native run-ios
ENVFILE=.env.production npx react-native run-android
```

## Build Commands

### iOS
```bash
# Development
npx react-native run-ios

# Staging
ENVFILE=.env.staging npx react-native run-ios --configuration Release

# Production
ENVFILE=.env.production npx react-native run-ios --configuration Release
```

### Android
```bash
# Development
npx react-native run-android

# Staging
ENVFILE=.env.staging npx react-native run-android --variant=release

# Production
ENVFILE=.env.production npx react-native run-android --variant=release
```

## Security Considerations

### Git Ignore
All environment files are excluded from version control:
- `.env`
- `.env.staging`
- `.env.production`
- `.env.local`
- `.env.*.local`

### Example File
`.env.example` is provided as a template and IS committed to version control.

### Sensitive Data
- Never commit real API keys or secrets
- Use environment-specific keys
- Rotate keys regularly
- Use read-only keys where possible

## Troubleshooting

### Environment Variables Not Loading
1. Clean build folders:
   ```bash
   cd android && ./gradlew clean
   cd ios && rm -rf build/
   ```

2. Reset Metro cache:
   ```bash
   npx react-native start --reset-cache
   ```

3. Reinstall pods (iOS):
   ```bash
   cd ios && pod install
   ```

### TypeScript Errors
1. Ensure `src/types/env.d.ts` is included in `tsconfig.json`
2. Restart TypeScript server in your IDE
3. Check that all variables in type definition match .env files

### Build Errors
1. Ensure `ENVFILE` is set correctly for builds
2. Check that all required variables are present in environment files
3. Verify Android and iOS configurations are correct

## Best Practices

1. **Use Type-Safe Config**: Always import from `@/config` instead of using `Config` directly
2. **Provide Defaults**: Always provide sensible defaults in the config utility
3. **Environment Checks**: Use helper functions like `isDev()` instead of checking `APP_ENV` directly
4. **Logging**: Use the provided `log()` and `logError()` functions that respect `ENABLE_LOGGING`
5. **Validation**: Validate critical environment variables at app startup

This configuration provides a robust foundation for managing environment-specific settings across different deployment targets.