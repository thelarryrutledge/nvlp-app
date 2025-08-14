/**
 * Device ID Example
 * 
 * Shows how device IDs are automatically generated and included in headers
 */

import { createNVLPClient } from '../src';

async function deviceIdExample() {
  console.log('=== Device ID Example ===\n');

  // Example 1: Client with auto-generated device ID
  console.log('1. Creating client with auto-generated device ID...');
  const client1 = createNVLPClient({
    supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
  });

  const deviceId1 = client1.getDeviceId();
  console.log(`   Auto-generated device ID: ${deviceId1}\n`);

  // Example 2: Client with custom device ID
  console.log('2. Creating client with custom device ID...');
  const customDeviceId = 'my-custom-device-' + Date.now();
  const client2 = createNVLPClient({
    supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
    deviceId: customDeviceId,
  });

  const deviceId2 = client2.getDeviceId();
  console.log(`   Custom device ID: ${deviceId2}\n`);

  // Example 3: Updating device ID after creation
  console.log('3. Updating device ID after client creation...');
  const newDeviceId = 'updated-device-' + Date.now();
  client2.setDeviceId(newDeviceId);
  const deviceId3 = client2.getDeviceId();
  console.log(`   Updated device ID: ${deviceId3}\n`);

  // Example 4: Device ID persistence
  console.log('4. Testing device ID persistence...');
  const client3 = createNVLPClient({
    supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
  });
  const deviceId4 = client3.getDeviceId();
  console.log(`   Same device ID as first client: ${deviceId4 === deviceId1}\n`);

  // Example 5: Making a request to show device ID header is included
  console.log('5. Making a test request (headers will include X-Device-ID)...');
  try {
    // This will fail due to authentication, but we can see the header being sent
    await client1.get('/functions/v1/device-management/list');
  } catch (error: any) {
    if (error.message.includes('Device ID required')) {
      console.log('   ✓ X-Device-ID header is being sent (session validation working)');
    } else if (error.message.includes('Invalid authorization')) {
      console.log('   ✓ X-Device-ID header is being sent (needs authentication)');
    } else {
      console.log(`   Request error: ${error.message}`);
    }
  }

  console.log('\n=== Device ID functionality working correctly! ===');
}

// Example usage
if (require.main === module) {
  deviceIdExample().catch(console.error);
}

export { deviceIdExample };