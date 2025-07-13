# Hot Reload and Fast Refresh Setup

## Overview

React Native 0.80.1 includes built-in Hot Reload and Fast Refresh functionality that enables rapid development by automatically reloading components when code changes are detected.

## Current Configuration

### ✅ Fast Refresh (Enabled by Default)
Fast Refresh is automatically enabled in React Native 0.80.1 and provides:
- **Component state preservation** during code changes
- **Automatic reload** for most changes
- **Error recovery** with helpful error messages
- **Hook state preservation** across reloads

### ✅ Metro Configuration
Enhanced Metro configuration in `metro.config.js`:

```javascript
const config = {
  resolver: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // ... other aliases
    },
  },
  server: {
    port: 8081,
  },
  watchFolders: [
    path.resolve(__dirname, 'src'),
    path.resolve(__dirname, 'assets'),
  ],
};
```

**Features:**
- **Watch Folders**: Monitors src/ and assets/ directories for changes
- **Path Aliases**: Enables hot reload for aliased imports
- **Port Configuration**: Ensures consistent Metro server port

## How It Works

### Fast Refresh Behavior

1. **Component Changes**: Updates components while preserving state
2. **Hook Changes**: Reloads components and resets hook state
3. **Export Changes**: Performs full refresh
4. **Syntax Errors**: Shows error overlay with location details

### What Triggers Different Reload Types

**Fast Refresh (State Preserved):**
- Component JSX changes
- Styling updates
- Component logic modifications

**Full Reload (State Reset):**
- Adding/removing hooks
- Changing hook dependencies
- Import/export modifications
- Non-component file changes

## Testing Hot Reload

### Test Component
A `HotReloadTest` component has been added to App.tsx to verify functionality:

```tsx
import HotReloadTest from './src/components/HotReloadTest';
```

### Manual Testing Steps

1. **Start Development Server**:
   ```bash
   npm start
   ```

2. **Run iOS App**:
   ```bash
   npm run ios
   ```

3. **Test Fast Refresh**:
   - Increment the counter in the test component
   - Modify the "Try changing this text..." message
   - Save the file
   - Verify: Counter state is preserved, text updates immediately

4. **Test Full Reload**:
   - Add a new useState hook
   - Save the file
   - Verify: App reloads completely, counter resets

## Development Workflow

### Best Practices for Hot Reload

1. **Component Structure**:
   ```tsx
   // Good: Export default function component
   const MyComponent = () => {
     const [state, setState] = useState(0);
     return <View>...</View>;
   };
   export default MyComponent;
   ```

2. **State Management**:
   - Use local state for UI-specific data
   - Use global state for app-wide data
   - Avoid complex state initialization in components

3. **File Organization**:
   - Keep components in separate files
   - Use descriptive file names
   - Organize by feature/screen

### Dev Menu Options

Access via device shake or **Cmd+D** (iOS) / **Cmd+M** (Android):

- **Reload**: Manual refresh (Cmd+R)
- **Debug**: Open debugger
- **Inspector**: Element inspector
- **Performance**: Performance monitor

## Troubleshooting

### Common Issues

1. **Hot Reload Not Working**:
   - Ensure Metro is running (`npm start`)
   - Check file is being watched (in src/ or assets/)
   - Verify no syntax errors
   - Restart Metro if needed

2. **State Not Preserving**:
   - Check if component exports default function
   - Avoid anonymous arrow functions as default exports
   - Ensure hooks aren't being added/removed

3. **Import Issues**:
   - Verify path aliases in metro.config.js
   - Check TypeScript configuration
   - Restart Metro after config changes

4. **Performance Issues**:
   - Limit watch folder scope
   - Exclude node_modules from watchers
   - Use `.metro.config.js` ignore patterns if needed

### Reset Commands

```bash
# Reset Metro cache
npm start -- --reset-cache

# Clean install
rm -rf node_modules
npm install

# iOS clean build
cd ios && rm -rf build/ && cd ..
```

## Advanced Configuration

### Custom Watch Patterns

```javascript
// metro.config.js
const config = {
  watchFolders: [
    path.resolve(__dirname, 'src'),
    path.resolve(__dirname, 'assets'),
    path.resolve(__dirname, '../shared-code'), // External folder
  ],
  resolver: {
    platforms: ['ios', 'android', 'native', 'web'],
  },
};
```

### Performance Optimization

```javascript
// metro.config.js
const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    alias: {
      // Path aliases for faster resolution
    },
  },
};
```

## Environment Variables

Hot reload works seamlessly with `react-native-config`:

```bash
# .env.development
API_URL=http://localhost:3000
DEBUG=true
```

Changes to .env files require app restart, not just hot reload.

## Next Steps

1. ✅ **Hot Reload**: Configured and tested
2. ✅ **Fast Refresh**: Working with state preservation
3. 🔄 **Device Testing**: Set up physical device testing
4. 🔄 **Simulator Testing**: Configure additional simulators

## Verification Checklist

- [x] Metro server starts on port 8081
- [x] Fast Refresh preserves component state
- [x] Style changes update immediately
- [x] Error overlay shows syntax errors
- [x] Dev menu accessible
- [x] Path aliases work with hot reload
- [x] Test component demonstrates functionality

Hot reload and fast refresh are now fully configured and operational for efficient React Native development.