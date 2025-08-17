# Reactotron Setup and Usage Guide

## Overview

Reactotron is a powerful debugging tool for React Native applications that provides real-time insights into your app's behavior, state, and network activity. This setup includes custom commands, error reporting integration, and development tools.

## Prerequisites

1. **Reactotron Desktop App**: Download from [https://github.com/infinitered/reactotron/releases](https://github.com/infinitered/reactotron/releases)
2. **Development Environment**: React Native development environment set up

## Features

### ✅ Configured Features

- **🔧 Development Debugging Interface**: Real-time app monitoring
- **📊 State Inspection**: View and modify app state in real-time
- **🌐 Network Monitoring**: Track API requests and responses
- **📱 Storage Inspection**: View AsyncStorage and SecureStorage data
- **🐛 Error Reporting**: Integrated error logging and display
- **⚡ Performance Benchmarking**: Measure code execution timing
- **🎛️ Custom Commands**: Pre-built debugging commands
- **📝 Custom Logging**: Enhanced logging with data display

### 🛠️ Custom Commands Available

1. **Clear AsyncStorage**: Remove all AsyncStorage data
2. **Clear Secure Storage**: Remove all keychain/secure storage data
3. **Show Error Reports**: Display stored error reports
4. **Trigger Test Error**: Generate test error for debugging
5. **Show Environment**: Display environment configuration

## Getting Started

### 1. Install Reactotron Desktop App

Download and install the Reactotron desktop application for your operating system from the official releases page.

### 2. Start Reactotron Desktop

1. Launch the Reactotron desktop app
2. Configure it to listen on `localhost:9090` (default)
3. For device testing, use your machine's IP address instead of localhost

### 3. Start React Native App

```bash
# In the mobile package directory
pnpm start
# or
pnpm dev

# In another terminal
pnpm ios
# or
pnpm android
```

### 4. Verify Connection

The app should automatically connect to Reactotron when running in development mode. You'll see:
- Connection status in the ReactotronDevPanel
- Initial log messages in Reactotron desktop
- API client configuration data

## Usage

### In-App Development Panel

The `ReactotronDevPanel` is automatically included in the HomeScreen during development:

1. **Custom Messages**: Send custom log messages to Reactotron
2. **Quick Actions**: Test errors, warnings, benchmarks, and data display
3. **Connection Status**: View real-time connection status

### Reactotron Desktop Commands

Use the command palette in Reactotron desktop to execute custom commands:

1. Open Reactotron desktop
2. Click on the "Commands" tab
3. Execute any of the pre-configured commands
4. View results in the timeline

### Custom Logging

From anywhere in your code:

```typescript
import reactotron from '../config/reactotron';

// Simple logging
reactotron.log('Debug message');
reactotron.warn('Warning message');
reactotron.error('Error message', error);

// Display structured data
reactotron.display({
  name: 'User Data',
  value: userData,
  preview: 'Current user information'
});

// Performance benchmarking
const stop = reactotron.benchmark('Expensive Operation');
// ... your code ...
stop();
```

### Service Integration

The following services automatically log to Reactotron:

- **ErrorHandlingService**: All errors are logged with full context
- **ApiClientService**: Initialization and configuration data
- **SecureStorageService**: Available via custom commands
- **LocalStorageService**: Available via custom commands

## Configuration

### Environment-Based Configuration

Reactotron is automatically configured based on your environment:

- **Development**: Fully enabled with all features
- **Production**: Completely disabled for security and performance

### Custom Configuration

Modify `src/config/reactotron.ts` to customize:

```typescript
reactotron.configure({
  host: 'your-machine-ip', // For device testing
  port: 9090,              // Custom port
  name: 'Your App Name',   // App identifier
});
```

## Troubleshooting

### Connection Issues

1. **Desktop App Not Running**: Ensure Reactotron desktop is running and listening
2. **Port Conflicts**: Check if port 9090 is available or change the port
3. **Network Issues**: Use your machine's IP address for device testing
4. **Firewall**: Ensure firewall allows connections on the configured port

### Device Testing

For testing on physical devices:

1. Find your machine's IP address
2. Update the host configuration in `reactotron.ts`
3. Ensure both device and machine are on the same network
4. Restart the React Native app

### Performance Impact

Reactotron is designed for development only:
- Automatically disabled in production builds
- No performance impact on release builds
- All logging calls are no-ops in production

## Best Practices

### Development Workflow

1. **Start Reactotron First**: Launch desktop app before starting React Native
2. **Use Custom Commands**: Leverage pre-built commands for common debugging tasks
3. **Monitor Network**: Watch API calls and responses in real-time
4. **Track Errors**: Use error reports for debugging issues
5. **Benchmark Performance**: Measure critical code paths

### Debugging Tips

1. **State Inspection**: Monitor app state changes in real-time
2. **Network Debugging**: Inspect request/response data
3. **Error Analysis**: Use error reports with full stack traces
4. **Performance Monitoring**: Identify bottlenecks with benchmarking
5. **Storage Inspection**: Debug data persistence issues

### Security Considerations

- Reactotron is development-only and automatically disabled in production
- Sensitive data (API keys) is masked in environment displays
- Custom commands respect security boundaries
- No production data exposure risk

## Support

For issues specific to this setup:
1. Check the test script: `node scripts/test-reactotron.js`
2. Verify all components are properly configured
3. Check console logs for initialization errors

For general Reactotron support:
- [Official Documentation](https://github.com/infinitered/reactotron)
- [Troubleshooting Guide](https://github.com/infinitered/reactotron/blob/master/docs/troubleshooting.md)
- [GitHub Issues](https://github.com/infinitered/reactotron/issues)