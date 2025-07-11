# React Native Debugging Setup

## Overview

React Native 0.80.1 comes with modern debugging tools built-in. This setup focuses on the recommended debugging solutions that work with React 19.

## Available Debugging Tools

### 1. Built-in React DevTools (Recommended)

React Native 0.80.1 includes integrated React DevTools for component inspection and debugging.

**Installation**: ✅ Already configured
```bash
npm run devtools
```

**Features**:
- Component tree inspection
- Props and state viewing
- Performance profiler
- React Suspense and Concurrent Features support

### 2. Chrome DevTools Integration

Access Chrome DevTools for JavaScript debugging:

**How to use**:
1. Start your app: `npm run ios` or `npm run android`
2. Open the React Native dev menu:
   - **iOS Simulator**: Cmd+D
   - **Android Emulator**: Cmd+M (Mac) or Ctrl+M (Windows/Linux)
   - **Physical Device**: Shake the device
3. Select "Open DevTools" (replaces "Open Debugger" in newer versions)
4. Chrome will open with DevTools attached

**Features**:
- JavaScript debugging with breakpoints
- Console logging
- Network request monitoring
- Performance profiling

### 3. Metro Inspector

Built-in element inspector for UI debugging:

**How to use**:
1. Start Metro: `npm start`
2. Open browser to `http://localhost:8081/debugger-ui`
3. Or use the dev menu → "Toggle Inspector"

**Features**:
- Element inspection
- Style debugging
- Layout visualization
- Accessibility testing

## Development Workflow

### Basic Debugging Session

**Option 1: Separate terminals (Recommended)**
1. **Start Metro bundler** (Terminal 1):
   ```bash
   npm start
   ```

2. **Run your app** (Terminal 2):
   ```bash
   npm run ios
   # or
   npm run android
   ```

3. **Start React DevTools** (Terminal 3, optional):
   ```bash
   npm run devtools
   ```

**Option 2: Combined (Alternative)**
```bash
npm run ios:dev    # Starts Metro + iOS
npm run android:dev # Starts Metro + Android
```

**Important**: Due to PATH issues with spawned terminals, we use `--no-packager` flag and start Metro separately.

4. **Access debugging tools**:
   - Dev menu: Shake device or Cmd+D/Cmd+M
   - **Open DevTools**: Chrome DevTools for JavaScript debugging
   - **Toggle Element Inspector**: Inspect UI elements in-app
   - **Show Perf Monitor**: Performance metrics overlay
   - React DevTools (optional): `npm run devtools` in separate terminal

### Dev Menu Options Explained

When you press **Cmd+D** (iOS) or **Cmd+M** (Android), you'll see:

- **Reload** - Refresh the app manually (Cmd+R also works)
- **Open DevTools** - Launch Chrome DevTools for JavaScript debugging
- **Toggle Element Inspector** - Inspect UI elements directly in your app
- **Disable Fast Refresh** - Temporarily turn off hot reload
- **Show Perf Monitor** - Display FPS and memory usage overlay
- **Configure Bundler** - Metro bundler configuration options

### Console Logging

Use standard console methods in your code:

```typescript
console.log('Debug info:', data);
console.warn('Warning message');
console.error('Error details:', error);

// Object inspection
console.table(arrayData);
console.group('Group Name');
console.log('Grouped message');
console.groupEnd();
```

### Debugging Network Requests

**Method 1: Chrome DevTools**
1. Open Chrome DevTools (dev menu → "Open Debugger")
2. Go to Network tab
3. All fetch/XMLHttpRequest calls will appear

**Method 2: React Native Debugger Menu**
1. Open dev menu
2. Select "Debug with Chrome"
3. Network requests appear in Chrome DevTools

### Component Debugging

**React DevTools Features**:
- **Components tab**: Browse component hierarchy
- **Profiler tab**: Performance analysis
- **Settings**: Configure DevTools behavior

**Useful techniques**:
```typescript
// Add display names for better debugging
const MyComponent = () => {
  // Component code
};
MyComponent.displayName = 'MyComponent';

// Use React DevTools hooks
import { useDebugValue } from 'react';

const useCustomHook = (value) => {
  useDebugValue(value ? 'Active' : 'Inactive');
  return value;
};
```

## Performance Debugging

### React DevTools Profiler

1. Open React DevTools
2. Go to "Profiler" tab
3. Click record button
4. Interact with your app
5. Stop recording and analyze

**Metrics available**:
- Component render times
- Re-render causes
- Commit phases
- Flame graphs

### Metro Performance

Monitor bundle performance:
```bash
npx react-native start --verbose
```

### Memory Debugging

Use Chrome DevTools Memory tab:
1. Open Chrome debugger
2. Go to Memory tab
3. Take heap snapshots
4. Compare snapshots to find leaks

## Troubleshooting

### Common Issues

1. **"env: node: No such file or directory" error**
   - ✅ **Fixed**: We use custom Metro script with proper PATH
   - Always start Metro separately: `npm start`
   - Then run iOS/Android: `npm run ios` or `npm run android`
   - Scripts now use `--no-packager` flag to prevent spawning new terminals

2. **"No script URL provided" error**
   - Ensure Metro is running before launching app
   - Check Metro is accessible at http://localhost:8081
   - Restart Metro if needed: `npm start`

3. **DevTools won't connect**
   - Ensure Metro is running
   - Check firewall settings
   - Try refreshing the app (Cmd+R / Ctrl+R)

4. **Chrome DevTools shows "Waiting for connection"**
   - Close and reopen debugger
   - Restart Metro bundler
   - Check dev menu is accessible

3. **Performance issues while debugging**
   - Chrome debugging can slow down the app
   - Use React DevTools for lighter inspection
   - Disable debugging for performance testing

### Debug vs Release Builds

**Debug builds** (default):
- Include debugging symbols
- Enable hot reloading
- Connect to DevTools
- Slower performance

**Release builds**:
```bash
# iOS
npx react-native run-ios --configuration Release

# Android
npx react-native run-android --variant=release
```

## Advanced Debugging

### Custom DevTools Integration

Add custom debugging panels:
```typescript
// In your component
useEffect(() => {
  if (__DEV__) {
    console.log('Component mounted:', { props, state });
  }
}, []);
```

### Network Debugging

For production debugging, consider:
- Sentry for error tracking
- LogRocket for session replay
- Custom logging services

### Platform-specific Debugging

**iOS**:
- Xcode debugger for native code
- iOS Simulator → Device → Console for native logs
- Instruments for performance profiling

**Android**:
- Android Studio debugger
- `adb logcat` for native logs
- Android Studio Profiler

## Scripts Reference

```bash
# Start Metro bundler
npm start

# Start React DevTools
npm run devtools

# Run with debugging
npm run ios
npm run android

# Check for common issues
npx react-native doctor

# Clear caches
npm start -- --reset-cache
```

## Next Steps

1. **Set up error boundaries** for better error handling
2. **Configure Sentry** for production error tracking
3. **Add performance monitoring** for production apps
4. **Set up automated testing** with debugging support

This debugging setup provides comprehensive tools for React Native 0.80.1 development without requiring additional heavy dependencies.