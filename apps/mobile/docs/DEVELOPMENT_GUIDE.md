# NVLP Mobile Development Guide

## Overview

Complete development guide for the NVLP React Native mobile application in a monorepo structure.

## Quick Start

```bash
# Install dependencies (from project root)
pnpm install

# Start Metro bundler (from apps/mobile)
cd apps/mobile
pnpm start

# Run on iOS (separate terminal)
pnpm ios

# Run on Android (separate terminal) 
pnpm android
```

## Development Environment Setup

### Prerequisites

- **Node.js 18+** and **pnpm**
- **React Native CLI**: `npm install -g @react-native-community/cli`
- **Watchman**: `brew install watchman` (macOS)

### iOS Development

**Requirements:**
- **macOS** (required for iOS development)
- **Xcode 15+** with iOS 15.0+ SDK
- **CocoaPods**: `brew install cocoapods`

**Setup:**
```bash
# Install Xcode from App Store
# Install Command Line Tools
sudo xcode-select --install

# Install CocoaPods dependencies
cd apps/mobile/ios
pod install
```

**Verification:**
```bash
# Check iOS simulator
xcrun simctl list devices

# Test iOS build
cd apps/mobile
pnpm ios
```

### Android Development

**Requirements:**
- **Java Development Kit 17+**: `brew install openjdk@17`
- **Android Studio** with Android SDK
- **Android SDK 35** (compile), **SDK 24+** (minimum)

**Setup:**
```bash
# Install OpenJDK 17
brew install openjdk@17
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc

# Install Android Studio
# - Download from developer.android.com
# - Install Android SDK Platform 35
# - Install Android Build Tools 35.0.0
# - Configure Android Virtual Device (AVD)

# Set environment variables
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/emulator' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zshrc
source ~/.zshrc
```

**Verification:**
```bash
# Check Android setup
cd apps/mobile
npx react-native doctor

# Test Android build
pnpm android
```

## Project Structure

```
apps/mobile/
├── docs/                    # Documentation
├── src/                     # Source code
│   ├── components/          # Reusable UI components
│   ├── screens/            # Screen components
│   ├── navigation/         # Navigation configuration
│   ├── services/           # API and external services
│   ├── stores/             # State management (Zustand)
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript types
│   └── config/             # App configuration
├── android/                # Android-specific code
├── ios/                    # iOS-specific code
├── assets/                 # Static assets
└── __tests__/              # Test files
```

## Configuration

### Environment Variables

Create environment files for different stages:

```bash
# .env (development)
NODE_ENV=development
API_URL=http://localhost:54321
SUPABASE_URL=your-dev-supabase-url
SUPABASE_ANON_KEY=your-dev-anon-key

# .env.production
NODE_ENV=production
API_URL=https://your-production-api.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key
```

### TypeScript Configuration

The app uses strict TypeScript configuration:
- Absolute imports with path aliases
- Strict type checking enabled
- Integration with workspace packages (`@nvlp/types`, `@nvlp/client`)

### Code Quality Tools

**ESLint Configuration:**
```bash
# Run linting
pnpm lint

# Fix lint issues
pnpm lint:fix
```

**Prettier Configuration:**
```bash
# Format code
pnpm format

# Check formatting
pnpm format:check
```

**Type Checking:**
```bash
# Run TypeScript checks
pnpm type-check
```

## Development Workflow

### Hot Reload Setup

The app supports Fast Refresh for rapid development:

1. **Start Metro bundler**: `pnpm start`
2. **Enable Fast Refresh** in dev menu (⌘D on iOS, ⌘M on Android)
3. **Save files** to see changes instantly

**Troubleshooting Hot Reload:**
```bash
# Reset Metro cache
pnpm start --reset-cache

# Clear React Native cache
npx react-native start --reset-cache

# Clean build folders
cd ios && xcodebuild clean
cd ../android && ./gradlew clean
```

### Debugging

**React DevTools:**
```bash
# Install React DevTools
npm install -g react-devtools

# Start DevTools
pnpm devtools
```

**Flipper Integration:**
- Network inspector
- Layout inspector  
- Crash reporting
- Performance monitoring

**Debug Menu:**
- **iOS**: ⌘D in simulator or shake device
- **Android**: ⌘M in emulator or shake device

### Testing

**Unit Testing:**
```bash
# Run tests
pnpm test

# Watch mode
pnpm test --watch

# Coverage report
pnpm test --coverage
```

**Test Structure:**
- **Jest** for unit testing
- **React Native Testing Library** for component testing
- **Test files** co-located with components

## Build Process

### Development Builds

```bash
# iOS development build
pnpm ios

# Android development build  
pnpm android

# Build with specific simulator/emulator
pnpm ios --simulator="iPhone 15 Pro"
pnpm android --deviceId=emulator-5554
```

### Production Builds

```bash
# iOS production archive
pnpm build:ios:prod

# Android APK
pnpm build:android

# Android App Bundle (for Play Store)
pnpm build:android:bundle
```

### Build Validation

```bash
# Validate iOS build configuration
pnpm build:validate:ios

# Validate Android build configuration
pnpm build:validate:android
```

## Workspace Integration

### Shared Packages

The mobile app uses workspace packages:

- **@nvlp/types**: Shared TypeScript definitions
- **@nvlp/client**: API client library
- **@nvlp/config**: Shared configuration (ESLint, Prettier, TypeScript)

### Package Development

```bash
# Build workspace packages (from project root)
pnpm build:packages

# Watch package changes during development
pnpm dev
```

## Performance Optimization

### Bundle Analysis

```bash
# Analyze bundle size
pnpm build:analyze

# Generate bundle report
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android-bundle.js --analyze
```

### Optimization Features

- **Hermes JS Engine**: Enabled for both platforms
- **ProGuard/R8**: Enabled for Android release builds
- **New Architecture**: React Native's new architecture enabled
- **Fast Refresh**: Instant code updates during development

## Common Issues & Solutions

### Metro Bundler Issues

```bash
# Clear Metro cache
pnpm start --reset-cache

# Clear node_modules and reinstall
rm -rf node_modules && pnpm install

# Reset React Native cache
npx react-native start --reset-cache
```

### iOS Build Issues

```bash
# Clean iOS build
cd ios && xcodebuild clean

# Reinstall pods
cd ios && rm -rf Pods Podfile.lock && pod install

# Reset iOS simulator
xcrun simctl erase all
```

### Android Build Issues

```bash
# Clean Android build
cd android && ./gradlew clean

# Clear gradle cache
rm -rf ~/.gradle/caches

# Reset Android emulator
$ANDROID_HOME/emulator/emulator -avd YourAVDName -wipe-data
```

### Dependency Issues

```bash
# Clear all caches
pnpm clean

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Rebuild workspace packages
pnpm build:packages
```

## VS Code Integration

### Recommended Extensions

- **React Native Tools**: Debug and run React Native
- **ES7+ React/Redux/React-Native snippets**: Code snippets
- **Prettier**: Code formatting
- **ESLint**: Code linting
- **TypeScript Importer**: Auto import management

### Debug Configuration

```json
{
  "name": "Debug in Exponent",
  "type": "reactnative",
  "request": "launch",
  "platform": "ios"
}
```

## Testing on Devices

### iOS Device Testing

1. **Developer Account**: Apple Developer Program membership
2. **Provisioning Profile**: Development profile for your device
3. **Code Signing**: Configure in Xcode project settings
4. **Install on Device**: Connect device and run from Xcode

### Android Device Testing

1. **Enable Developer Options**: Settings → About → Tap Build Number 7 times
2. **USB Debugging**: Enable in Developer Options
3. **Connect Device**: USB connection with debugging enabled
4. **Install APK**: `adb install path/to/app.apk`

## Continuous Integration

### GitHub Actions

The project includes CI/CD workflows for:
- **Code Quality**: TypeScript, ESLint, Prettier checks
- **Testing**: Unit test execution
- **Build Validation**: iOS and Android build verification
- **Deployment**: App store deployment workflows

### Local CI Simulation

```bash
# Run all quality checks
pnpm type-check && pnpm lint && pnpm test

# Validate build configurations
pnpm build:validate:ios && pnpm build:validate:android

# Test production builds
pnpm build:ios:prod && pnpm build:android
```

## Release Process

1. **Version Bump**: Update `package.json` version
2. **Quality Checks**: Run tests, linting, type checking
3. **Build Validation**: Test both platform builds
4. **Production Builds**: Generate release artifacts
5. **Store Submission**: Upload to App Store / Play Store
6. **Tag Release**: Create git tag for version

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

## Support

### Documentation Links

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Metro Bundler](https://facebook.github.io/metro/)

### Troubleshooting Resources

- [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting)
- [iOS Simulator Issues](https://developer.apple.com/documentation/xcode/running-your-app-in-the-simulator-or-on-a-device)
- [Android Emulator Issues](https://developer.android.com/studio/run/emulator-troubleshooting)

---

For deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)  
For API integration, see [../../api/docs/](../../api/docs/)