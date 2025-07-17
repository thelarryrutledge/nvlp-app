# Mobile App Troubleshooting Guide

## Common Issues and Solutions

### Build Issues

#### Metro Bundler Errors

**Problem**: Metro bundler fails to start or crashes
```
Error: Unable to resolve module...
```

**Solution**:
```bash
# Clear Metro cache
cd apps/mobile
npx react-native start --reset-cache

# If that doesn't work, try:
watchman watch-del-all
rm -rf node_modules
cd ../..
pnpm install
pnpm build:packages
cd apps/mobile
pnpm start
```

#### iOS Build Failures

**Problem**: iOS build fails with pod errors
```
error: The sandbox is not in sync with the Podfile.lock
```

**Solution**:
```bash
cd apps/mobile/ios
pod deintegrate
pod install
cd ..
pnpm ios
```

**Problem**: Build fails with signing errors

**Solution**:
1. Open `apps/mobile/ios/nvlp.xcworkspace` in Xcode
2. Select the project in navigator
3. Go to "Signing & Capabilities"
4. Select your team and ensure automatic signing is enabled

#### Android Build Failures

**Problem**: Android build fails with gradle errors
```
Execution failed for task ':app:processDebugMainManifest'
```

**Solution**:
```bash
cd apps/mobile/android
./gradlew clean
cd ..
pnpm android
```

**Problem**: Unable to load script from assets 'index.android.bundle'

**Solution**:
```bash
cd apps/mobile
mkdir -p android/app/src/main/assets
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle
pnpm android
```

### Runtime Issues

#### JavaScript Errors

**Problem**: "Cannot read property 'X' of undefined"

**Solution**:
1. Check that all packages are built: `pnpm build:packages`
2. Ensure TypeScript types are in sync
3. Restart Metro bundler with cache clear

#### API Connection Issues

**Problem**: Network request failed

**Solution**:
1. Check `.env` file has correct `SUPABASE_URL`
2. For Android emulator, ensure you're not using `localhost`
3. Check network connectivity
4. Verify Supabase project is active

#### Authentication Issues

**Problem**: Login/signup not working

**Solution**:
1. Verify Supabase Auth settings
2. Check email templates are configured
3. Ensure redirect URLs are set correctly
4. Check RLS policies in Supabase

### Development Issues

#### Hot Reload Not Working

**Problem**: Changes not reflecting in app

**Solution**:
1. Ensure Metro is running from monorepo root
2. Check `metro.config.js` has correct `watchFolders`
3. Try manual reload (Cmd+R on iOS, R+R on Android)
4. Restart Metro bundler

#### TypeScript Errors

**Problem**: Type errors in IDE but app runs

**Solution**:
```bash
# Rebuild TypeScript definitions
pnpm build:packages
# Restart TypeScript server in VSCode
# Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

#### Debugger Connection Issues

**Problem**: Unable to connect to debugger

**Solution**:
1. Ensure Chrome is open
2. Check debugger URL (usually http://localhost:8081/debugger-ui)
3. Disable any Chrome extensions that might interfere
4. Try using Flipper instead

### Platform-Specific Issues

#### iOS Simulator Issues

**Problem**: Simulator not starting

**Solution**:
```bash
# Reset simulator
xcrun simctl erase all
# List available simulators
xcrun simctl list devices
# Start specific simulator
pnpm ios --simulator="iPhone 15"
```

#### Android Emulator Issues

**Problem**: Emulator not detected

**Solution**:
```bash
# Check if ADB sees the device
adb devices
# If not listed, restart ADB
adb kill-server
adb start-server
# Ensure emulator is running from Android Studio
```

### Monorepo-Specific Issues

#### Package Resolution Issues

**Problem**: Cannot find module '@nvlp/client'

**Solution**:
1. Ensure packages are built: `pnpm build:packages`
2. Check `workspace:*` dependencies in package.json
3. Verify symlinks: `ls -la node_modules/@nvlp`
4. Rebuild from root: `pnpm install`

#### Metro Configuration Issues

**Problem**: Metro can't find workspace packages

**Solution**:
1. Check `metro.config.js` includes all workspace paths
2. Ensure `watchFolders` includes packages directory
3. Clear Metro cache and restart

### Performance Issues

#### Slow Build Times

**Solution**:
1. Enable Hermes on Android (already enabled by default)
2. Use production builds for testing performance
3. Ensure Turbo cache is working: `pnpm build --dry-run`
4. Consider using `--active-arch-only` for iOS debug builds

#### Memory Issues

**Problem**: App crashes with memory errors

**Solution**:
1. Profile memory usage with Flipper
2. Check for memory leaks in components
3. Optimize image sizes and lazy load where possible
4. Increase Java heap size for Android builds

### Getting Help

If you're still experiencing issues:

1. Check the [React Native documentation](https://reactnative.dev/docs/troubleshooting)
2. Search [React Native GitHub issues](https://github.com/facebook/react-native/issues)
3. Ask in the [React Native Community](https://reactnative.dev/community)
4. Check project-specific issues in our repository

### Useful Commands Reference

```bash
# Clear all caches
pnpm clean

# Rebuild everything
pnpm install && pnpm build:packages

# Reset Metro
npx react-native start --reset-cache

# Clean iOS build
cd ios && xcodebuild clean && cd ..

# Clean Android build  
cd android && ./gradlew clean && cd ..

# Check React Native environment
npx react-native doctor
```

Remember to always run commands from the `apps/mobile` directory unless otherwise specified!