#!/usr/bin/env node

/**
 * Session Invalidation Event Handling Examples
 * 
 * This script provides comprehensive examples of how to handle session invalidation events
 * in different UI contexts (React Native, Web, etc.) and demonstrates best practices
 * for responding to session invalidation scenarios.
 */

const { NVLPClient, SessionInvalidatedError } = require('./dist/index.js');

// Example 1: React Native App Session Invalidation Handler
function reactNativeSessionHandler() {
  console.log('📱 Example 1: React Native Session Invalidation Handler\n');

  const client = new NVLPClient({
    supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key'
  });

  // React Native specific session invalidation handler
  client.on('sessionInvalidated', async (errorMessage) => {
    console.log('🚨 React Native Session Invalidation Response:');
    console.log('   Error:', errorMessage);
    console.log('   Actions taken:');
    
    // 1. Show user notification
    console.log('   ✅ 1. Show in-app notification to user');
    // In real React Native: Alert.alert() or Toast.show()
    
    // 2. Clear sensitive data from AsyncStorage
    console.log('   ✅ 2. Clear sensitive data from AsyncStorage');
    // In real React Native: AsyncStorage.multiRemove(['userToken', 'userData', etc.])
    
    // 3. Reset navigation stack to login screen
    console.log('   ✅ 3. Reset navigation to login screen');
    // In real React Native: navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
    
    // 4. Clear any cached user data
    console.log('   ✅ 4. Clear cached user data from memory');
    
    // 5. Optionally show specific messaging
    console.log('   ✅ 5. Show specific session invalidation message');
    console.log('      "Your session was ended on another device for security."');
  });

  console.log('✅ React Native handler registered\n');
  return client;
}

// Example 2: Web App Session Invalidation Handler
function webAppSessionHandler() {
  console.log('🌐 Example 2: Web App Session Invalidation Handler\n');

  const client = new NVLPClient({
    supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key'
  });

  // Web app specific session invalidation handler
  client.on('sessionInvalidated', async (errorMessage) => {
    console.log('🚨 Web App Session Invalidation Response:');
    console.log('   Error:', errorMessage);
    console.log('   Actions taken:');
    
    // 1. Clear localStorage/sessionStorage
    console.log('   ✅ 1. Clear browser storage');
    // In real web app: localStorage.clear() or specific keys
    
    // 2. Show modal/toast notification
    console.log('   ✅ 2. Show user notification modal');
    // In real web app: show modal component
    
    // 3. Redirect to login page
    console.log('   ✅ 3. Redirect to login page');
    // In real web app: window.location.href = '/login' or router.push('/login')
    
    // 4. Clear any service workers or cached data
    console.log('   ✅ 4. Clear service worker cache');
    
    // 5. Log security event for analytics
    console.log('   ✅ 5. Log security event');
    // In real web app: analytics.track('session_invalidated', { reason: errorMessage })
  });

  console.log('✅ Web app handler registered\n');
  return client;
}

// Example 3: Background/Service Session Invalidation Handler
function backgroundServiceHandler() {
  console.log('⚙️  Example 3: Background Service Session Invalidation Handler\n');

  const client = new NVLPClient({
    supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key'
  });

  // Background service specific session invalidation handler
  client.on('sessionInvalidated', async (errorMessage) => {
    console.log('🚨 Background Service Session Invalidation Response:');
    console.log('   Error:', errorMessage);
    console.log('   Actions taken:');
    
    // 1. Stop all background sync operations
    console.log('   ✅ 1. Stop background sync operations');
    
    // 2. Clear any queued operations that require auth
    console.log('   ✅ 2. Clear authenticated operation queue');
    
    // 3. Log the invalidation for debugging
    console.log('   ✅ 3. Log invalidation event');
    
    // 4. Notify main app process if applicable
    console.log('   ✅ 4. Notify main app process');
    
    // 5. Set service state to "unauthenticated"
    console.log('   ✅ 5. Update service authentication state');
  });

  console.log('✅ Background service handler registered\n');
  return client;
}

// Example 4: Multiple Device Scenario Handler
function multiDeviceScenarioHandler() {
  console.log('📱📱 Example 4: Multi-Device Scenario Handler\n');

  const client = new NVLPClient({
    supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key'
  });

  // Multi-device specific session invalidation handler
  client.on('sessionInvalidated', async (errorMessage) => {
    console.log('🚨 Multi-Device Session Invalidation Response:');
    console.log('   Error:', errorMessage);
    console.log('   Scenario: User signed out all devices or signed in on new device');
    console.log('   Actions taken:');
    
    // 1. Show explanatory message
    console.log('   ✅ 1. Show context-aware message');
    console.log('      "Security action: All devices were signed out"');
    
    // 2. Offer to sign back in
    console.log('   ✅ 2. Show "Sign In Again" option');
    
    // 3. Clear device-specific data
    console.log('   ✅ 3. Clear device registration data');
    
    // 4. Optionally show device management screen
    console.log('   ✅ 4. Offer device management access');
  });

  console.log('✅ Multi-device handler registered\n');
  return client;
}

// Example 5: Graceful Error Handling
function gracefulErrorHandling() {
  console.log('🛡️  Example 5: Graceful Session Invalidation Error Handling\n');

  const client = new NVLPClient({
    supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key'
  });

  // Demonstrate how to handle SessionInvalidatedError in API calls
  async function makeApiCallWithErrorHandling() {
    try {
      console.log('   🔄 Attempting API call...');
      // This would normally be a real API call
      // await client.get('/functions/v1/budgets');
      
      // Simulate session invalidation error
      throw new SessionInvalidatedError('Your session was invalidated on another device');
      
    } catch (error) {
      if (error instanceof SessionInvalidatedError) {
        console.log('   🚨 SessionInvalidatedError caught:');
        console.log('      Name:', error.name);
        console.log('      Code:', error.code);
        console.log('      Message:', error.message);
        
        // Handle gracefully
        console.log('   ✅ Graceful handling:');
        console.log('      - Show user-friendly message');
        console.log('      - Redirect to login without crash');
        console.log('      - Preserve user\'s work if possible');
        
        return { error: 'session_invalidated', retry: false };
      } else {
        console.log('   ❌ Other error:', error.message);
        throw error; // Re-throw non-session errors
      }
    }
  }

  // Set up the session invalidation handler
  client.on('sessionInvalidated', (errorMessage) => {
    console.log('   🚨 Session invalidation event received:', errorMessage);
    console.log('   ✅ Handled gracefully - no app crash');
  });

  console.log('✅ Graceful error handling configured');
  console.log('✅ Testing API call error handling...');
  
  return makeApiCallWithErrorHandling();
}

// Example 6: Advanced Event Handling with Cleanup
function advancedEventHandling() {
  console.log('🔧 Example 6: Advanced Event Handling with Cleanup\n');

  const client = new NVLPClient({
    supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key'
  });

  // Create named handler function for easier removal
  const sessionInvalidationHandler = (errorMessage) => {
    console.log('   🚨 Advanced handler triggered:', errorMessage);
    console.log('   ✅ Performing comprehensive cleanup...');
    
    // Advanced cleanup operations
    console.log('      - Clear all timers and intervals');
    console.log('      - Cancel pending network requests');
    console.log('      - Clear WebSocket connections');
    console.log('      - Reset UI state to initial');
    console.log('      - Clear sensitive memory objects');
  };

  // Add the handler
  client.on('sessionInvalidated', sessionInvalidationHandler);
  console.log('✅ Advanced handler added');

  // Demonstrate handler removal (useful for component cleanup)
  setTimeout(() => {
    console.log('🧹 Cleaning up event handler...');
    client.off('sessionInvalidated', sessionInvalidationHandler);
    console.log('✅ Event handler removed');
  }, 100);

  console.log('✅ Advanced event handling configured\n');
  return client;
}

// Main test function
async function runSessionInvalidationExamples() {
  console.log('🧪 Session Invalidation Event Handling Examples\n');
  console.log('=' .repeat(60) + '\n');

  // Run all examples
  const reactNativeClient = reactNativeSessionHandler();
  const webAppClient = webAppSessionHandler();
  const backgroundClient = backgroundServiceHandler();
  const multiDeviceClient = multiDeviceScenarioHandler();
  const advancedClient = advancedEventHandling();

  // Test graceful error handling
  console.log('=' .repeat(60) + '\n');
  await gracefulErrorHandling();
  console.log();

  // Demonstrate event firing
  console.log('=' .repeat(60) + '\n');
  console.log('🧪 Testing Event Firing Across All Handlers\n');

  console.log('📱 Triggering React Native handler...');
  reactNativeClient.emit('sessionInvalidated', 'Device limit exceeded');
  console.log();

  console.log('🌐 Triggering Web App handler...');
  webAppClient.emit('sessionInvalidated', 'Suspicious activity detected');
  console.log();

  console.log('⚙️  Triggering Background Service handler...');
  backgroundClient.emit('sessionInvalidated', 'Token expired');
  console.log();

  console.log('📱📱 Triggering Multi-Device handler...');
  multiDeviceClient.emit('sessionInvalidated', 'Signed out all devices');
  console.log();

  console.log('✅ All session invalidation examples completed!\n');
  
  console.log('📋 Summary of Session Invalidation Handling Patterns:');
  console.log('   ✅ React Native: AsyncStorage cleanup + navigation reset');
  console.log('   ✅ Web App: localStorage cleanup + page redirect');
  console.log('   ✅ Background Service: operation cleanup + state reset');
  console.log('   ✅ Multi-Device: context-aware messaging + re-auth');
  console.log('   ✅ Graceful Errors: try/catch SessionInvalidatedError handling');
  console.log('   ✅ Advanced: comprehensive cleanup with removable handlers');
}

// Handle any unexpected errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the examples
runSessionInvalidationExamples().catch((error) => {
  console.error('❌ Examples failed:', error);
  process.exit(1);
});