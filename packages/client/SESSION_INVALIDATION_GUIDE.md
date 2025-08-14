# Session Invalidation Event Handling Guide

This guide provides comprehensive information on how to handle session invalidation events in NVLP client applications.

## Overview

When a user's session is invalidated (due to signing out on another device, security policies, or administrative actions), the NVLP client will automatically:

1. **Detect** the session invalidation from API responses
2. **Emit** a `sessionInvalidated` event 
3. **Clear** local session state
4. **Provide** error information for UI handling

## Basic Event Handling

```typescript
import { NVLPClient } from '@nvlp/client';

const client = new NVLPClient({
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-anon-key'
});

// Listen for session invalidation events
client.on('sessionInvalidated', (errorMessage: string) => {
  console.log('Session invalidated:', errorMessage);
  // Handle in your UI
});
```

## Platform-Specific Handling

### React Native Applications

```typescript
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

client.on('sessionInvalidated', async (errorMessage) => {
  // 1. Clear local storage
  await AsyncStorage.multiRemove([
    'userToken', 
    'userData', 
    'deviceId',
    'lastSyncTime'
  ]);
  
  // 2. Show user notification
  Alert.alert(
    'Session Ended',
    'Your session was ended on another device for security.',
    [{ text: 'Sign In Again', onPress: () => navigateToLogin() }]
  );
  
  // 3. Reset navigation stack
  navigation.reset({
    index: 0,
    routes: [{ name: 'Login' }]
  });
  
  // 4. Clear any cached data
  clearUserDataCache();
});
```

### Web Applications

```typescript
client.on('sessionInvalidated', async (errorMessage) => {
  // 1. Clear browser storage
  localStorage.clear();
  sessionStorage.clear();
  
  // 2. Clear service worker cache
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
  }
  
  // 3. Show notification modal
  showSessionInvalidatedModal(errorMessage);
  
  // 4. Redirect to login
  window.location.href = '/login';
  
  // 5. Log analytics event
  analytics.track('session_invalidated', {
    reason: errorMessage,
    timestamp: new Date().toISOString()
  });
});
```

### Background Services

```typescript
client.on('sessionInvalidated', async (errorMessage) => {
  // 1. Stop all background operations
  stopBackgroundSync();
  clearPendingUploads();
  
  // 2. Update service state
  setServiceState('unauthenticated');
  
  // 3. Notify main application
  if (typeof window !== 'undefined' && window.parent) {
    window.parent.postMessage({
      type: 'SESSION_INVALIDATED',
      error: errorMessage
    }, '*');
  }
  
  // 4. Log the event
  logger.warn('Session invalidated in background service', {
    error: errorMessage,
    timestamp: Date.now()
  });
});
```

## Error Handling Patterns

### Try-Catch Pattern

```typescript
import { SessionInvalidatedError } from '@nvlp/client';

async function makeApiCall() {
  try {
    const result = await client.get('/functions/v1/budgets');
    return result;
  } catch (error) {
    if (error instanceof SessionInvalidatedError) {
      // Handle session invalidation specifically
      console.log('Session invalidated:', error.message);
      // Don't retry - redirect to login instead
      redirectToLogin();
      return null;
    } else {
      // Handle other errors normally
      throw error;
    }
  }
}
```

### Promise Chain Pattern

```typescript
client.get('/functions/v1/budgets')
  .then(result => {
    // Handle successful response
    return result;
  })
  .catch(error => {
    if (error instanceof SessionInvalidatedError) {
      // Session invalidated - don't retry
      handleSessionInvalidation(error.message);
      return null;
    } else {
      // Other errors - might be retryable
      throw error;
    }
  });
```

## Advanced Event Handling

### Multiple Event Listeners

```typescript
// App-level handler
client.on('sessionInvalidated', (error) => {
  console.log('App: Session invalidated');
  clearAppState();
});

// UI-level handler
client.on('sessionInvalidated', (error) => {
  console.log('UI: Session invalidated');
  showNotification(error);
});

// Analytics handler
client.on('sessionInvalidated', (error) => {
  console.log('Analytics: Session invalidated');
  trackSecurityEvent('session_invalidated', error);
});
```

### Event Handler Cleanup

```typescript
const sessionHandler = (error: string) => {
  handleSessionInvalidation(error);
};

// Add handler
client.on('sessionInvalidated', sessionHandler);

// Later, remove handler (e.g., component unmount)
client.off('sessionInvalidated', sessionHandler);
```

### Conditional Handling

```typescript
client.on('sessionInvalidated', (errorMessage) => {
  // Different handling based on error context
  if (errorMessage.includes('device limit')) {
    showDeviceLimitModal();
  } else if (errorMessage.includes('suspicious activity')) {
    showSecurityWarning();
  } else if (errorMessage.includes('signed out all')) {
    showMultiDeviceMessage();
  } else {
    showGenericSessionEndedMessage();
  }
});
```

## Testing Session Invalidation

### Manual Testing

```typescript
// Manually trigger session invalidation for testing
client.emit('sessionInvalidated', 'Test session invalidation');
```

### Unit Testing

```typescript
import { NVLPClient } from '@nvlp/client';

describe('Session Invalidation Handling', () => {
  let client: NVLPClient;
  let mockHandler: jest.Mock;

  beforeEach(() => {
    client = new NVLPClient({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-key'
    });
    mockHandler = jest.fn();
    client.on('sessionInvalidated', mockHandler);
  });

  afterEach(() => {
    client.off('sessionInvalidated', mockHandler);
  });

  test('should handle session invalidation events', () => {
    client.emit('sessionInvalidated', 'Test error');
    
    expect(mockHandler).toHaveBeenCalledWith('Test error');
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});
```

## Best Practices

### 1. **Graceful Degradation**
- Don't crash the app on session invalidation
- Preserve user's unsaved work when possible
- Provide clear next steps

### 2. **User Experience**
- Show context-appropriate messages
- Offer easy re-authentication
- Explain why the session was invalidated

### 3. **Security**
- Clear all sensitive data immediately
- Don't expose detailed error information to users
- Log security events for monitoring

### 4. **Performance**
- Cancel pending requests on session invalidation
- Clear caches and stop background operations
- Remove event listeners when components unmount

### 5. **Multi-Platform Consistency**
- Use consistent messaging across platforms
- Handle platform-specific storage appropriately
- Maintain consistent UX patterns

## Common Scenarios

### Scenario 1: User Signs Out on Another Device
```typescript
client.on('sessionInvalidated', (error) => {
  if (error.includes('signed out')) {
    showMessage({
      title: 'Signed Out',
      message: 'You have been signed out on another device.',
      action: 'Sign In Again'
    });
  }
});
```

### Scenario 2: Security Policy Enforcement
```typescript
client.on('sessionInvalidated', (error) => {
  if (error.includes('policy')) {
    showMessage({
      title: 'Security Policy',
      message: 'Your session ended due to security policy.',
      action: 'Contact Support'
    });
  }
});
```

### Scenario 3: Device Limit Reached
```typescript
client.on('sessionInvalidated', (error) => {
  if (error.includes('device limit')) {
    showMessage({
      title: 'Too Many Devices',
      message: 'You have reached the maximum number of devices.',
      action: 'Manage Devices'
    });
  }
});
```

## Integration with State Management

### Redux Integration

```typescript
// Redux action
const sessionInvalidated = (error: string) => ({
  type: 'SESSION_INVALIDATED',
  payload: { error }
});

// Set up client listener
client.on('sessionInvalidated', (error) => {
  store.dispatch(sessionInvalidated(error));
});

// Redux reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'SESSION_INVALIDATED':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        sessionError: action.payload.error
      };
    default:
      return state;
  }
};
```

### Context API Integration (React)

```typescript
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    sessionError: null
  });

  useEffect(() => {
    const handleSessionInvalidation = (error) => {
      setAuthState({
        isAuthenticated: false,
        sessionError: error
      });
    };

    client.on('sessionInvalidated', handleSessionInvalidation);
    
    return () => {
      client.off('sessionInvalidated', handleSessionInvalidation);
    };
  }, []);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};
```

This comprehensive guide covers all aspects of session invalidation event handling in NVLP client applications, providing practical examples for different platforms and use cases.