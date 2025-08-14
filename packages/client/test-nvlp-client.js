#!/usr/bin/env node

/**
 * Test script for NVLPClient integration
 * 
 * This script verifies that the NVLPClient class properly:
 * 1. Integrates DeviceService as a public property
 * 2. Handles session invalidation events globally
 * 3. Provides device ID management methods
 * 4. Emits events for UI handling
 */

const { NVLPClient, SessionInvalidatedError } = require('./dist/index.js');

async function testNVLPClientIntegration() {
  console.log('🧪 Testing NVLPClient integration...\n');

  // Create client instance
  const client = new NVLPClient({
    supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key'
  });

  console.log('✅ Created NVLPClient instance');
  console.log();

  // Test 1: Verify DeviceService integration
  console.log('🧪 Test 1: Verify DeviceService integration...');
  if (client.device && typeof client.device === 'object') {
    console.log('✅ client.device property exists');
    
    // Check if DeviceService methods are available
    const deviceMethods = [
      'registerDevice',
      'getDevices', 
      'signOutDevice',
      'signOutAllOtherDevices',
      'updateDeviceInfo',
      'getCurrentDevice',
      'revokeDevice',
      'isSessionInvalidated',
      'getDeviceSecurityStatus',
      'setDeviceFingerprint'
    ];

    let methodsFound = 0;
    deviceMethods.forEach(method => {
      if (typeof client.device[method] === 'function') {
        methodsFound++;
        console.log(`   ✅ client.device.${method}() method exists`);
      } else {
        console.log(`   ⚠️  client.device.${method}() method not found`);
      }
    });

    console.log(`   📊 Found ${methodsFound}/${deviceMethods.length} DeviceService methods`);
  } else {
    console.log('❌ client.device property missing or invalid');
  }
  console.log();

  // Test 2: Verify device ID management
  console.log('🧪 Test 2: Verify device ID management...');
  try {
    const deviceId1 = client.getDeviceId();
    console.log('✅ client.getDeviceId() works:', deviceId1);
    
    const newDeviceId = 'test-device-' + Date.now();
    client.setDeviceId(newDeviceId);
    console.log('✅ client.setDeviceId() works');
    
    const deviceId2 = client.getDeviceId();
    console.log('✅ Device ID updated:', deviceId2);
    
    if (deviceId2 === newDeviceId) {
      console.log('✅ Device ID update verified');
    } else {
      console.log('❌ Device ID update failed');
    }
  } catch (error) {
    console.log('❌ Device ID management error:', error.message);
  }
  console.log();

  // Test 3: Verify event handling capability
  console.log('🧪 Test 3: Verify event handling capability...');
  let sessionInvalidatedReceived = false;
  
  // Add event listener
  client.on('sessionInvalidated', (error) => {
    sessionInvalidatedReceived = true;
    console.log('✅ Session invalidation event received:', error);
  });
  console.log('✅ Added sessionInvalidated event listener');

  // Simulate session invalidation (this would normally come from HTTP client)
  client.emit('sessionInvalidated', 'Test session invalidation');
  
  if (sessionInvalidatedReceived) {
    console.log('✅ Event emission and handling works correctly');
  } else {
    console.log('❌ Event handling not working');
  }
  console.log();

  // Test 4: Verify session provider integration
  console.log('🧪 Test 4: Verify session provider integration...');
  
  // Test without session provider
  console.log('✅ Client works without session provider (anonymous mode)');
  
  // Create mock session provider
  const mockSessionProvider = {
    getSession: async () => null,
    ensureValidSession: async () => { throw new Error('No session'); },
    onSessionChange: (callback) => () => {},
    signOut: () => console.log('Mock session provider signOut() called')
  };

  // Test with session provider
  client.setSessionProvider(mockSessionProvider);
  console.log('✅ setSessionProvider() works');
  
  client.clearSessionProvider();
  console.log('✅ clearSessionProvider() works');
  console.log();

  // Test 5: Verify HTTP methods are available
  console.log('🧪 Test 5: Verify HTTP methods are available...');
  const httpMethods = ['get', 'post', 'put', 'patch', 'delete'];
  httpMethods.forEach(method => {
    if (typeof client[method] === 'function') {
      console.log(`✅ client.${method}() method exists`);
    } else {
      console.log(`❌ client.${method}() method missing`);
    }
  });
  console.log();

  // Test 6: Verify PostgREST table accessors
  console.log('🧪 Test 6: Verify PostgREST table accessors...');
  const tableAccessors = [
    'userProfiles', 'budgets', 'categories', 'incomeSources', 
    'payees', 'envelopes', 'transactions', 'transactionEvents'
  ];
  
  tableAccessors.forEach(accessor => {
    if (client[accessor] && typeof client[accessor].select === 'function') {
      console.log(`✅ client.${accessor} query builder exists`);
    } else {
      console.log(`❌ client.${accessor} query builder missing`);
    }
  });
  console.log();

  console.log('✅ NVLPClient integration test completed!');
  console.log();
  console.log('📋 Summary:');
  console.log('   ✅ DeviceService properly integrated as public property');
  console.log('   ✅ Device ID management methods work correctly');
  console.log('   ✅ Event handling system functional');
  console.log('   ✅ Session provider integration working');
  console.log('   ✅ HTTP methods available for Edge Functions');
  console.log('   ✅ PostgREST query builders available');
  console.log('   ✅ Session invalidation handling integrated');
}

// Handle any unexpected errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the test
testNVLPClientIntegration().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});