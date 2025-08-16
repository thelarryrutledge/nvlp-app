# NVLP Mobile Debugging Guide

## React Native 0.81 Built-in Debugging

React Native 0.81 comes with excellent debugging capabilities out of the box:

### React DevTools
```bash
# Install React DevTools globally
npm install -g react-devtools

# Start React DevTools
react-devtools
```

### Chrome DevTools
1. Start Metro bundler: `pnpm start`
2. Open React Native app in simulator/device
3. Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android) 
4. Select "Debug with Chrome"
5. Chrome will open at `http://localhost:8081/debugger-ui/`

### Metro Inspector
- Network requests: Press `Cmd+D` → "Toggle Inspector" → "Network"
- Component inspector: Press `Cmd+D` → "Toggle Inspector"
- Performance monitoring: Built into React Native 0.81

### Hermes Debugging
React Native 0.81 uses Hermes engine with improved debugging:
- Source maps enabled by default in debug builds
- Better stack traces
- Chrome DevTools integration

### Log Output
```typescript
// Use console.log, console.warn, console.error
console.log('Debug message');
console.warn('Warning message'); 
console.error('Error message');
```

### VS Code Debugging
1. Install "React Native Tools" extension
2. Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug iOS",
      "type": "reactnative",
      "request": "launch",
      "platform": "ios"
    },
    {
      "name": "Debug Android", 
      "type": "reactnative",
      "request": "launch",
      "platform": "android"
    }
  ]
}
```

### Flipper Alternative
Since Flipper has compatibility issues with React 19, we use:
- React DevTools for component inspection
- Chrome DevTools for JavaScript debugging
- Metro Inspector for network and performance
- Native debugging tools (Xcode/Android Studio) for native code

This provides comprehensive debugging without additional dependencies.