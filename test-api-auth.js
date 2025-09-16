/**
 * Test script for API package auth methods
 */

import { createClient } from '@supabase/supabase-js';
import { AuthService } from './packages/api/src/services/auth.service.js';

// Load environment
import dotenv from 'dotenv';
dotenv.config();

async function testAuth() {
  console.log('🧪 Testing API Package Auth Service...\n');
  
  // Create Supabase client
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  // Create auth service
  const authService = new AuthService(client);
  
  try {
    // Test 1: Sign Up
    console.log('1️⃣ Testing signup...');
    const user = await authService.signUp({
      email: 'larryjrutledge@gmail.com',
      password: 'Test1234!',
      displayName: 'Larry Test'
    });
    console.log('✅ Signup successful:', user.id);
    
    // Test 2: Sign In
    console.log('\n2️⃣ Testing signin...');
    const signedInUser = await authService.signInWithPassword({
      email: 'larryjrutledge@gmail.com',
      password: 'Test1234!',
      deviceId: 'test-node-device',
      deviceName: 'Node.js Test',
      deviceType: 'CLI'
    });
    console.log('✅ Signin successful:', signedInUser.id);
    
    // Test 3: Get Current User
    console.log('\n3️⃣ Testing getCurrentUser...');
    const currentUser = await authService.getCurrentUser();
    console.log('✅ Current user:', currentUser?.id || 'null');
    
    // Test 4: Sign Out
    console.log('\n4️⃣ Testing signout...');
    await authService.signOut();
    console.log('✅ Signout successful');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuth();