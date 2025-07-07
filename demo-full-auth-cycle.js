#!/usr/bin/env node
/**
 * Full Authentication Cycle Demo
 * Demonstrates complete login, usage, refresh, and logout flow
 */

const { NVLPClient } = require('./dist/client/index');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  persistTokens: true,
  autoRefresh: true
};

async function demoFullAuthCycle() {
  console.log('🔄 NVLP Client Library - Full Authentication Cycle Demo\n');

  // Step 1: Start fresh (no persisted session)
  console.log('📝 Step 1: Clear any existing session...');
  const initialClient = new NVLPClient(config);
  await initialClient.logout(); // Clear any existing tokens
  console.log('✅ Starting fresh - no persisted tokens\n');

  // Step 2: Create new client and verify no authentication
  console.log('📝 Step 2: Initialize client and check authentication...');
  const client = new NVLPClient(config);
  console.log(`   Authentication status: ${client.isAuthenticated() ? 'Authenticated' : 'Not authenticated'}`);
  
  if (client.isAuthenticated()) {
    console.log('   ⚠️  Unexpected: Found persisted session');
  } else {
    console.log('   ✅ Expected: No authentication found');
  }
  console.log('');

  // Step 3: Perform login
  console.log('📝 Step 3: Perform login...');
  const email = 'larryjrutledge@gmail.com';
  const password = 'Test1234!';
  
  try {
    console.log(`   Logging in as: ${email}`);
    const { user, session } = await client.login(email, password);
    
    console.log(`   ✅ Login successful!`);
    console.log(`      User ID: ${user.id}`);
    console.log(`      Email: ${user.email}`);
    console.log(`      Token expires in: ${Math.round(session.expires_in / 60)} minutes`);
    console.log(`      Tokens persisted: ${config.persistTokens ? 'Yes' : 'No'}`);
  } catch (error) {
    console.error(`   ❌ Login failed: ${error.message}`);
    return;
  }
  console.log('');

  // Step 4: Test session restoration
  console.log('📝 Step 4: Test session restoration...');
  const newClient = new NVLPClient(config);
  
  if (newClient.isAuthenticated()) {
    console.log('   ✅ Session automatically restored from storage');
    const authState = newClient.getAuthState();
    console.log(`      Restored user: ${authState.user?.email}`);
    
    const expiresInMinutes = authState.expiresAt ? 
      Math.round((authState.expiresAt - Date.now()) / (1000 * 60)) : 0;
    console.log(`      Token expires in: ${expiresInMinutes} minutes`);
  } else {
    console.log('   ❌ Session restoration failed');
  }
  console.log('');

  // Step 5: Make authenticated API calls
  console.log('📝 Step 5: Test authenticated API calls...');
  try {
    const profile = await client.getProfile();
    console.log(`   ✅ Profile retrieved: ${profile.display_name}`);
    
    const budgets = await client.getBudgets();
    console.log(`   ✅ Budgets retrieved: ${budgets.length} found`);
    
    // Test auto-refresh trigger (if needed)
    if (client.needsTokenRefresh()) {
      console.log('   🔄 Token needs refresh - will auto-refresh on next API call');
    } else {
      console.log('   ✅ Token is valid - no refresh needed');
    }
  } catch (error) {
    console.error(`   ❌ API calls failed: ${error.message}`);
  }
  console.log('');

  // Step 6: Manual token refresh (if applicable)
  console.log('📝 Step 6: Demonstrate manual token refresh...');
  try {
    const beforeRefresh = client.getAuthState();
    const beforeExpiry = beforeRefresh.expiresAt ? 
      Math.round((beforeRefresh.expiresAt - Date.now()) / (1000 * 60)) : 0;
    
    console.log(`   Current token expires in: ${beforeExpiry} minutes`);
    
    if (beforeRefresh.refreshToken) {
      console.log('   🔄 Performing manual refresh...');
      await client.refreshToken();
      
      const afterRefresh = client.getAuthState();
      const afterExpiry = afterRefresh.expiresAt ? 
        Math.round((afterRefresh.expiresAt - Date.now()) / (1000 * 60)) : 0;
      
      console.log(`   ✅ Token refreshed! New expiry: ${afterExpiry} minutes`);
    } else {
      console.log('   ⚠️  No refresh token available');
    }
  } catch (error) {
    console.error(`   ❌ Token refresh failed: ${error.message}`);
  }
  console.log('');

  // Step 7: Logout and cleanup
  console.log('📝 Step 7: Logout and verify cleanup...');
  try {
    await client.logout();
    console.log('   ✅ Logout completed');
    
    // Verify authentication is cleared
    if (!client.isAuthenticated()) {
      console.log('   ✅ Authentication state cleared');
    } else {
      console.log('   ❌ Authentication state not cleared');
    }
    
    // Verify tokens are removed from storage
    const finalClient = new NVLPClient(config);
    if (!finalClient.isAuthenticated()) {
      console.log('   ✅ Persisted tokens cleared from storage');
    } else {
      console.log('   ❌ Persisted tokens not cleared');
    }
  } catch (error) {
    console.error(`   ❌ Logout failed: ${error.message}`);
  }
  console.log('');

  console.log('🎯 Full authentication cycle demonstration complete!');
  console.log('\n📋 Summary of demonstrated features:');
  console.log('   • Fresh client initialization (no tokens)');
  console.log('   • User login with credentials');
  console.log('   • Automatic token persistence');
  console.log('   • Session restoration across client instances');
  console.log('   • Authenticated API access');
  console.log('   • Manual token refresh');
  console.log('   • Complete logout with token cleanup');
  console.log('   • Cross-platform token storage');
}

// Run the full demo
demoFullAuthCycle().catch(error => {
  console.error('💥 Demo failed:', error);
  process.exit(1);
});