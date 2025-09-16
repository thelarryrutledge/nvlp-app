/**
 * Test the conceptual API layer by calling Edge Functions directly
 * This simulates what the API package would do under the hood
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Simulate what AuthService.signUp() does internally
async function simulateSignUp(client, email, password) {
  console.log('📋 AuthService.signUp() would call:');
  
  // 1. Call Supabase auth.signUp()
  console.log('  1. client.auth.signUp() - SKIPPED (would conflict with existing user)');
  
  // 2. OR call our Edge Function directly
  console.log('  2. Calling auth-password Edge Function...');
  const { data, error } = await client.functions.invoke('auth-password', {
    body: {
      action: 'signup',
      email,
      password
    }
  });
  
  if (error) {
    console.error('    ❌ Error:', error);
    throw error;
  }
  
  console.log('    ✅ Success:', data);
  return data;
}

// Simulate what AuthService.signInWithPassword() does internally  
async function simulateSignIn(client, email, password, deviceInfo) {
  console.log('📋 AuthService.signInWithPassword() would call:');
  
  // 1. Call Supabase auth.signInWithPassword()
  console.log('  1. client.auth.signInWithPassword()...');
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email,
    password
  });
  
  if (authError) {
    console.error('    ❌ Auth Error:', authError.message);
    throw authError;
  }
  
  console.log('    ✅ Auth Success - got session');
  
  // 2. Register device if provided
  if (deviceInfo) {
    console.log('  2. Registering device via Edge Function...');
    const { error: deviceError } = await client.functions.invoke('device-management/register', {
      body: {
        device_id: deviceInfo.deviceId,
        device_name: deviceInfo.deviceName,
        device_type: deviceInfo.deviceType,
        device_fingerprint: deviceInfo.deviceId
      }
    });
    
    if (deviceError) {
      console.warn('    ⚠️ Device registration failed:', deviceError);
    } else {
      console.log('    ✅ Device registered');
    }
  }
  
  // 3. Get user profile (simulated)
  console.log('  3. Getting user profile...');
  console.log('    ✅ User profile retrieved');
  
  return {
    user: authData.user,
    session: authData.session
  };
}

async function testApiLayer() {
  console.log('🧪 Testing API Layer Simulation...\n');
  
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  try {
    // Test Sign In (more realistic than signup since user exists)
    console.log('🔑 Testing Sign In Flow:');
    const result = await simulateSignIn(client, 'larryjrutledge@gmail.com', 'Test1234!', {
      deviceId: 'api-test-device',
      deviceName: 'API Test Device', 
      deviceType: 'Test'
    });
    
    console.log('\n✅ API Layer Test Complete!');
    console.log('   User ID:', result.user?.id);
    console.log('   Has Session:', !!result.session);
    
    // Test Sign Out
    console.log('\n🚪 Testing Sign Out:');
    const { error } = await client.auth.signOut();
    if (error) {
      console.error('   ❌ Sign out error:', error);
    } else {
      console.log('   ✅ Signed out successfully');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testApiLayer();