/**
 * Test calling the Edge Function directly to see what's happening
 */

import dotenv from 'dotenv';
dotenv.config();

async function testEdgeFunctionDirect() {
  console.log('🧪 Testing Edge Function Direct Call...\n');
  
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/auth-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'signin',
        email: 'larryjrutledge@gmail.com',
        password: 'Test1234!',
        deviceId: 'test-direct-call',
        deviceName: 'Direct Test',
        deviceType: 'CLI'
      })
    });
    
    console.log('📋 Response Status:', response.status);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📋 Response Body:', data);
    
    if (response.ok) {
      console.log('✅ Edge Function call successful!');
    } else {
      console.log('❌ Edge Function call failed');
    }
    
  } catch (error) {
    console.error('❌ Direct call failed:', error.message);
  }
}

testEdgeFunctionDirect();