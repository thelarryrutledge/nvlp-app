/**
 * Test the fixed API approach - calling Edge Functions directly
 * This simulates what the mobile app will do
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Mock AuthService class that calls Edge Functions
class MockAuthService {
  constructor(client) {
    this.client = client;
  }

  async signUp(options) {
    console.log('📋 AuthService.signUp() calling Edge Function...');
    
    const { data, error } = await this.client.functions.invoke('auth-password', {
      body: {
        action: 'signup',
        email: options.email,
        password: options.password,
        displayName: options.displayName,
      },
    });

    if (error) {
      throw new Error(`Account creation request failed: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to create account');
    }

    console.log('✅ AuthService.signUp() successful:', data.userId);
    
    return {
      user: { id: data.userId, email: options.email },
      requiresVerification: true,
    };
  }

  async signInWithPassword(options) {
    console.log('📋 AuthService.signInWithPassword() calling Edge Function...');
    
    const { data, error } = await this.client.functions.invoke('auth-password', {
      body: {
        action: 'signin',
        email: options.email,
        password: options.password,
        deviceId: options.deviceId,
        deviceName: options.deviceName,
        deviceType: options.deviceType,
      },
    });

    if (error) {
      throw new Error(`Authentication request failed: ${error.message}`);
    }

    if (!data.success) {
      if (data.code === 'EMAIL_NOT_VERIFIED') {
        throw new Error('Please verify your email before signing in');
      }
      throw new Error(data.error || 'Invalid email or password');
    }

    // Store the session in the Supabase client for future requests
    if (data.session) {
      await this.client.auth.setSession(data.session);
      console.log('📋 Session stored in Supabase client');
    }

    console.log('✅ AuthService.signInWithPassword() successful:', data.user.id);
    return data.user;
  }

  async resetPassword(email) {
    console.log('📋 AuthService.resetPassword() calling Edge Function...');
    
    const { data, error } = await this.client.functions.invoke('auth-password', {
      body: {
        action: 'reset_password',
        email,
      },
    });

    if (error) {
      throw new Error(`Password reset request failed: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to send password reset email');
    }

    console.log('✅ AuthService.resetPassword() successful');
  }
}

async function testMobileCompatibleAPI() {
  console.log('🧪 Testing Mobile-Compatible API Layer...\n');
  
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  const authService = new MockAuthService(client);
  
  try {
    // Test Sign In (the user already exists and is verified)
    console.log('🔑 Testing Sign In:');
    const user = await authService.signInWithPassword({
      email: 'larryjrutledge+api@gmail.com',
      password: 'Test1234!',
      deviceId: 'mobile-api-test',
      deviceName: 'Mobile API Test',
      deviceType: 'Test'
    });
    
    console.log('\n✅ Mobile API Layer Test Complete!');
    console.log('   User ID:', user.id);
    console.log('   Email:', user.email);
    
    // Test getting current user (should work now that we have a session)
    console.log('\n🔍 Testing getCurrentUser:');
    const { data: { user: currentUser } } = await client.auth.getUser();
    console.log('   Current User:', currentUser?.email || 'none');
    
    // Test Sign Out
    console.log('\n🚪 Testing Sign Out:');
    const { error } = await client.auth.signOut();
    if (error) {
      console.error('   ❌ Sign out error:', error.message);
    } else {
      console.log('   ✅ Signed out successfully');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMobileCompatibleAPI();