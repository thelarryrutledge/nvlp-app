# NVLP Mobile App

React Native mobile application for the NVLP Virtual Envelope Budget system.

## Overview

The NVLP mobile app provides a comprehensive personal finance management experience with envelope budgeting, transaction tracking, and financial reporting capabilities.

## Features

- 🔐 **Secure Authentication** - User registration, login, and session management
- 💰 **Budget Management** - Create and manage multiple budgets
- 📊 **Envelope Budgeting** - Organize expenses with digital envelopes
- 💳 **Transaction Tracking** - Record income, expenses, and transfers
- 📈 **Dashboard & Analytics** - Real-time financial insights and trends
- 📱 **Cross-Platform** - Native iOS and Android experience
- 🔔 **Push Notifications** - Budget alerts and reminders
- 📤 **Data Export** - Export financial data in multiple formats

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- React Native development environment set up
- iOS Simulator (macOS) or Android Emulator
- Physical device (optional but recommended)

### Environment Setup

Follow the [React Native environment setup guide](https://reactnative.dev/docs/set-up-your-environment) for your platform.

### Installation & Development

```bash
# From the monorepo root
cd nvlp-app
pnpm install

# Build shared packages first
pnpm build:packages

# Start Metro bundler
cd apps/mobile
pnpm start

# In a new terminal, run the app
pnpm ios      # For iOS Simulator
pnpm android  # For Android Emulator

# Or run on device
pnpm ios --device "Your Device Name"
pnpm android --device
```

### Development Workflow

```bash
# Start all development services from root
pnpm dev

# Mobile-specific commands (from apps/mobile)
pnpm start                    # Start Metro bundler
pnpm ios                      # Run on iOS
pnpm android                  # Run on Android
pnpm test                     # Run tests
pnpm lint                     # Lint code
pnpm type-check               # TypeScript validation
```

## Project Structure

```
apps/mobile/
├── src/
│   ├── components/           # Reusable UI components
│   ├── screens/             # Screen components
│   ├── navigation/          # Navigation configuration
│   ├── stores/              # Zustand state management
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── types/               # Mobile-specific types
│   └── constants/           # App constants
├── android/                 # Android platform code
├── ios/                     # iOS platform code
├── docs/                    # Mobile documentation
├── __tests__/               # Test files
├── package.json            # Dependencies and scripts
├── metro.config.js         # Metro bundler configuration
├── react-native.config.js  # React Native configuration
└── tsconfig.json           # TypeScript configuration
```

## Architecture

### Technology Stack

- **React Native 0.80** - Cross-platform mobile framework
- **TypeScript** - Type-safe development
- **Zustand** - Lightweight state management
- **React Navigation 6** - Navigation library
- **React Hook Form** - Form handling
- **Reanimated 3** - Smooth animations
- **Vector Icons** - Icon system
- **Flipper** - Debugging and profiling

### Monorepo Integration

The mobile app leverages shared packages from the monorepo:

- **@nvlp/types** - Shared TypeScript types
- **@nvlp/client** - API client with authentication
- **@nvlp/config** - Shared ESLint, Prettier, TypeScript configs

### State Management

Uses Zustand for global state management with separate stores for:

- Authentication state
- Budget and financial data
- UI state and preferences
- Offline data persistence

## Build & Deployment

### Development Builds

```bash
# Debug builds (from apps/mobile)
pnpm android:debug           # Android debug APK
pnpm ios:debug              # iOS debug build

# Development with hot reload
pnpm start --reset-cache    # Reset Metro cache if needed
```

### Production Builds

```bash
# Release builds
pnpm build:android:bundle   # Android App Bundle (AAB)
pnpm build:android:apk      # Android APK
pnpm build:ios:prod         # iOS production build

# Archive for distribution
pnpm archive:ios            # iOS archive for App Store
```

### Environment Configuration

Configure environment variables in:
- `.env` - Development environment
- `.env.production` - Production environment

Required variables:
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
API_BASE_URL=your_api_base_url
```

## Testing

### Running Tests

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# E2E tests (if configured)
pnpm test:e2e
```

### Testing Strategy

- **Unit Tests** - Component and utility testing with Jest
- **Integration Tests** - Store and hook testing
- **Snapshot Tests** - Component rendering validation
- **E2E Tests** - Critical user flow validation (optional)

## Development Guidelines

### Code Style

- Follow TypeScript strict mode
- Use ESLint and Prettier configurations from `@nvlp/config`
- Component naming: PascalCase for components, camelCase for utilities
- File naming: kebab-case for files, PascalCase for component files

### Component Architecture

```typescript
// Preferred component structure
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SomeType } from '@nvlp/types';

interface Props {
  data: SomeType;
  onAction: () => void;
}

export const ComponentName: React.FC<Props> = ({ data, onAction }) => {
  return (
    <View style={styles.container}>
      {/* Component content */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Styles
  },
});
```

### Navigation

Uses React Navigation v6 with TypeScript support:

```typescript
// Define navigation types
export type RootStackParamList = {
  Home: undefined;
  Budget: { budgetId: string };
  Transaction: { transactionId?: string };
};

// Use typed navigation
const navigation = useNavigation<NavigationProp<RootStackParamList>>();
```

## Performance Optimization

### Bundle Analysis

```bash
# Analyze bundle size
pnpm bundle:analyze

# Profile performance
npx react-native bundle --platform android --dev false --bundle-output android-bundle.js
```

### Best Practices

1. **Lazy Loading** - Use React.lazy for large components
2. **Memoization** - Use React.memo and useMemo appropriately
3. **Image Optimization** - Optimize images and use appropriate formats
4. **Bundle Splitting** - Code splitting for large features
5. **Performance Monitoring** - Use Flipper for performance profiling

## Debugging

### Development Tools

- **Flipper** - React DevTools, Network inspector, Crash reporter
- **React Native Debugger** - Standalone debugging app
- **VS Code** - With React Native Tools extension

### Debugging Commands

```bash
# Reset Metro cache
pnpm start --reset-cache

# Clean builds
pnpm clean:android
pnpm clean:ios

# Debugging logs
npx react-native log-android    # Android logs
npx react-native log-ios        # iOS logs
```

## Documentation

- **[Development Guide](./docs/DEVELOPMENT_GUIDE.md)** - Detailed development setup
- **[Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)** - Build and deployment processes
- **[Architecture Guide](./docs/ARCHITECTURE.md)** - App architecture overview
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

## Platform-Specific Notes

### iOS

- **Deployment Target**: iOS 15.0+
- **Bundle ID**: `com.nvlp.mobile`
- **Requirements**: Xcode 14+, CocoaPods
- **New Architecture**: Enabled (Fabric + TurboModules)

### Android

- **Min SDK**: API 21 (Android 5.0)
- **Target SDK**: API 35 (Android 15)
- **App ID**: `com.nvlp.mobile`
- **New Architecture**: Enabled
- **ProGuard**: Enabled for release builds

## Contributing

1. Follow the [main contributing guidelines](../../CONTRIBUTING.md)
2. Ensure all tests pass before submitting PRs
3. Update documentation for new features
4. Follow the established code style and patterns
5. Test on both iOS and Android platforms

## Troubleshooting

### Common Issues

**Metro bundler issues:**
```bash
pnpm start --reset-cache
```

**iOS build issues:**
```bash
cd ios && pod install && cd ..
pnpm ios:clean
```

**Android build issues:**
```bash
pnpm android:clean
```

**Workspace dependency issues:**
```bash
# From root
pnpm build:packages
pnpm install
```

For more detailed troubleshooting, see the [Troubleshooting Guide](./docs/TROUBLESHOOTING.md).

## License

ISC - See [LICENSE](../../LICENSE) for details.

---

Part of the [NVLP monorepo](../../README.md) - A comprehensive personal finance management system.