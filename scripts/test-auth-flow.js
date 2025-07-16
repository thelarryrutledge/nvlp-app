#!/usr/bin/env node
/**
 * NVLP Authentication Flow Test
 * Tests login, token persistence, refresh, and logout using api.nvlp.app Edge Functions
 */

const { NVLPClient } = require('../packages/client/dist/index');
const readline = require('readline');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Configuration for production API using custom domain
const config = {
  supabaseUrl: 'https://qnpatlosomopoimtsmsr.supabase.co',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key',
  apiBaseUrl: 'https://api.nvlp.app', // Use custom domain for Edge Functions
  persistTokens: true,
  autoRefresh: true
};

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    // Use the current rl instance
    const currentRl = rl || readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    currentRl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Simplified password input for testing - just use regular input
function askPassword(question) {
  return askQuestion(question);
}

function showTokenCacheLocation() {
  const tokenFile = path.join(os.homedir(), '.nvlp', 'auth.json');
  console.log(`🗂️  Token cache location: ${tokenFile}`);
  
  if (fs.existsSync(tokenFile)) {
    const stats = fs.statSync(tokenFile);
    console.log(`   File exists, last modified: ${stats.mtime.toLocaleString()}`);
    
    try {
      const tokenData = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
      const expiresAt = new Date(tokenData.expiresAt);
      const isExpired = expiresAt <= new Date();
      console.log(`   Token expires: ${expiresAt.toLocaleString()} ${isExpired ? '(EXPIRED)' : '(valid)'}`);
      console.log(`   User: ${tokenData.user?.email}`);
    } catch (error) {
      console.log(`   Error reading token data: ${error.message}`);
    }
  } else {
    console.log('   No cached tokens found');
  }
  console.log('');
}

async function testAuthFlow() {
  console.log('🔐 NVLP Authentication Flow Test\n');
  console.log('Using api.nvlp.app Edge Functions for authentication\n');
  
  showTokenCacheLocation();
  
  const client = new NVLPClient(config);
  
  // Step 1: Check existing authentication
  console.log('📝 Step 1: Check existing authentication...');
  const initialAuth = client.isAuthenticated();
  console.log(`   Initial auth status: ${initialAuth ? 'Authenticated' : 'Not authenticated'}`);
  
  if (initialAuth) {
    const authState = client.getAuthState();
    const expiresInMinutes = authState.expiresAt ? 
      Math.round((authState.expiresAt - Date.now()) / (1000 * 60)) : 0;
    console.log(`   User: ${authState.user?.email}`);
    console.log(`   Token expires in: ${expiresInMinutes} minutes`);
    
    const useExisting = await askQuestion('   Use existing session? (y/n): ');
    if (useExisting.toLowerCase() === 'y') {
      console.log('   ✅ Using existing authentication\n');
    } else {
      console.log('   🔄 Clearing existing session...');
      await client.logout();
      console.log('   ✅ Session cleared\n');
    }
  } else {
    console.log('   ✅ No existing session found\n');
  }
  
  // Step 2: Login if needed
  if (!client.isAuthenticated()) {
    console.log('📝 Step 2: Perform login...');
    
    const email = await askQuestion('   Email: ');
    const password = await askPassword('   Password: ');
    
    try {
      console.log('\n   🔑 Logging in via api.nvlp.app...');
      const { user, session } = await client.login(email, password);
      
      console.log('   ✅ Login successful!');
      console.log(`      User ID: ${user.id}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Token expires in: ${Math.round(session.expires_in / 60)} minutes`);
      console.log('      💾 Tokens saved to cache');
    } catch (error) {
      console.error(`   ❌ Login failed: ${error.message}`);
      rl.close();
      return;
    }
    console.log('');
  }
  
  // Step 3: Test authenticated API calls
  console.log('📝 Step 3: Test authenticated API calls...');
  try {
    const profile = await client.getProfile();
    console.log(`   ✅ Profile: ${profile.display_name} (${profile.currency_code})`);
    
    const budgets = await client.getBudgets();
    console.log(`   ✅ Budgets: Found ${budgets.length} budgets`);
  } catch (error) {
    console.error(`   ❌ API calls failed: ${error.message}`);
  }
  console.log('');
  
  // Step 4: Test token persistence across client instances
  console.log('📝 Step 4: Test token persistence...');
  const newClient = new NVLPClient(config);
  
  if (newClient.isAuthenticated()) {
    console.log('   ✅ Token persistence working - new client automatically authenticated');
    
    try {
      const profile = await newClient.getProfile();
      console.log(`   ✅ API call with new client successful: ${profile.display_name}`);
    } catch (error) {
      console.error(`   ❌ API call with new client failed: ${error.message}`);
    }
  } else {
    console.log('   ❌ Token persistence failed - new client not authenticated');
  }
  console.log('');
  
  // Step 5: Show token cache details
  console.log('📝 Step 5: Token cache details...');
  showTokenCacheLocation();
  
  // Step 6: Test refresh (if applicable)
  console.log('📝 Step 6: Test token refresh...');
  const authState = client.getAuthState();
  
  if (authState.refreshToken) {
    console.log('   🔄 Refresh token available');
    
    if (client.needsTokenRefresh()) {
      console.log('   🔄 Token needs refresh - performing refresh...');
      try {
        await client.refreshToken();
        console.log('   ✅ Token refreshed successfully');
      } catch (error) {
        console.error(`   ❌ Token refresh failed: ${error.message}`);
      }
    } else {
      console.log('   ✅ Token is valid - no refresh needed');
    }
  } else {
    console.log('   ⚠️  No refresh token available');
  }
  console.log('');
  
  // Step 7: Test logout
  const testLogout = await askQuestion('📝 Step 7: Test logout? (y/n): ');
  if (testLogout.toLowerCase() === 'y') {
    try {
      console.log('   🚪 Logging out via api.nvlp.app...');
      await client.logout();
      
      if (!client.isAuthenticated()) {
        console.log('   ✅ Logout successful - client authentication cleared');
      } else {
        console.log('   ❌ Logout failed - client still authenticated');
      }
      
      // Check if tokens were cleared from cache
      const finalClient = new NVLPClient(config);
      if (!finalClient.isAuthenticated()) {
        console.log('   ✅ Token cache cleared - new client not authenticated');
      } else {
        console.log('   ❌ Token cache not cleared - new client still authenticated');
      }
      
      console.log('');
      showTokenCacheLocation();
    } catch (error) {
      console.error(`   ❌ Logout failed: ${error.message}`);
    }
  }
  
  console.log('🎯 Authentication flow test complete!');
  
  // Properly close readline interface
  rl.close();
  process.stdin.unref();
}

// Run the test
testAuthFlow().catch(error => {
  console.error('💥 Test failed:', error);
  rl.close();
  process.stdin.unref();
  process.exit(1);
}).finally(() => {
  // Ensure readline is always closed
  if (!rl.closed) {
    rl.close();
    process.stdin.unref();
  }
});