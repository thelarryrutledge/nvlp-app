#!/usr/bin/env node
/**
 * Test script for NVLP Client Library - Enhanced Authentication
 * Tests proper login/logout flow and token persistence
 */

const { NVLPClient } = require('./dist/client/index');
const readline = require('readline');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  persistTokens: true, // Enable token persistence
  autoRefresh: true    // Enable auto token refresh
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function hidePassword(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    let password = '';
    stdin.on('data', function(char) {
      char = char + '';
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        default:
          password += char;
          stdout.write('*');
          break;
      }
    });
  });
}

async function testAuthFlow() {
  console.log('\n🔐 Testing NVLP Client Library - Enhanced Authentication\n');
  
  const client = new NVLPClient(config);
  
  let testResults = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Test 1: Check if already authenticated (from persisted tokens)
  try {
    const initialAuthState = client.getAuthState();
    const isInitiallyAuth = client.isAuthenticated();
    
    if (isInitiallyAuth) {
      console.log('✓ Found persisted authentication tokens');
      testResults.passed++;
      
      // Test profile access with persisted tokens
      try {
        const profile = await client.getProfile();
        console.log(`✓ Profile access with persisted tokens: ${profile.display_name}`);
        testResults.passed++;
      } catch (error) {
        console.log('❌ Profile access failed with persisted tokens:', error.message);
        testResults.failed++;
        testResults.errors.push(`Persisted token access failed: ${error.message}`);
      }
    } else {
      console.log('ℹ️  No persisted authentication found');
    }
  } catch (error) {
    console.log('❌ Initial auth check error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Initial auth check error: ${error.message}`);
  }

  // Test 2: Login flow (if not already authenticated or force new login)
  const needsLogin = !client.isAuthenticated();
  let performLogin = needsLogin;
  
  if (!needsLogin) {
    const forceLogin = await askQuestion('Already authenticated. Force new login? (y/n): ');
    performLogin = forceLogin.toLowerCase() === 'y';
  }

  if (performLogin) {
    try {
      const email = await askQuestion('Email: ');
      const password = await hidePassword('Password: ');
      
      console.log('\n🔑 Logging in...');
      const loginResult = await client.login(email, password);
      
      if (loginResult.user && loginResult.session) {
        console.log(`✓ Login successful: ${loginResult.user.email}`);
        testResults.passed++;
      } else {
        console.log('❌ Login failed: Invalid response');
        testResults.failed++;
        testResults.errors.push('Login failed - invalid response');
      }
    } catch (error) {
      console.log('❌ Login error:', error.message);
      testResults.failed++;
      testResults.errors.push(`Login error: ${error.message}`);
    }
  }

  // Test 3: Authenticated operations
  if (client.isAuthenticated()) {
    try {
      const budgets = await client.getBudgets();
      console.log(`✓ Authenticated API call successful (${budgets.length} budgets)`);
      testResults.passed++;
    } catch (error) {
      console.log('❌ Authenticated API call failed:', error.message);
      testResults.failed++;
      testResults.errors.push(`Authenticated API call failed: ${error.message}`);
    }

    // Test 4: Token refresh check
    try {
      const needsRefresh = client.needsTokenRefresh();
      console.log(`✓ Token refresh check: ${needsRefresh ? 'Needs refresh' : 'Token valid'}`);
      testResults.passed++;
    } catch (error) {
      console.log('❌ Token refresh check error:', error.message);
      testResults.failed++;
      testResults.errors.push(`Token refresh check error: ${error.message}`);
    }
  }

  // Test 5: Logout flow
  const testLogout = await askQuestion('Test logout? (y/n): ');
  if (testLogout.toLowerCase() === 'y') {
    try {
      await client.logout();
      const isStillAuth = client.isAuthenticated();
      
      if (!isStillAuth) {
        console.log('✓ Logout successful - authentication cleared');
        testResults.passed++;
      } else {
        console.log('❌ Logout failed - still authenticated');
        testResults.failed++;
        testResults.errors.push('Logout failed - still authenticated');
      }
    } catch (error) {
      console.log('❌ Logout error:', error.message);
      testResults.failed++;
      testResults.errors.push(`Logout error: ${error.message}`);
    }

    // Test 6: Verify logout cleared persisted tokens
    try {
      const postLogoutClient = new NVLPClient(config);
      const isNewClientAuth = postLogoutClient.isAuthenticated();
      
      if (!isNewClientAuth) {
        console.log('✓ Persisted tokens cleared - new client not authenticated');
        testResults.passed++;
      } else {
        console.log('❌ Persisted tokens not cleared - new client still authenticated');
        testResults.failed++;
        testResults.errors.push('Persisted tokens not cleared');
      }
    } catch (error) {
      console.log('❌ Post-logout verification error:', error.message);
      testResults.failed++;
      testResults.errors.push(`Post-logout verification error: ${error.message}`);
    }
  }

  // Final Results
  console.log('\n📊 Authentication Test Results:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  if (testResults.passed + testResults.failed > 0) {
    console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
  }
  
  if (testResults.errors.length > 0) {
    console.log('\n🚨 Errors:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  console.log('\n🎯 Authentication flow testing complete!');
  
  rl.close();
  
  // Exit with error code if any tests failed
  if (testResults.failed > 0) {
    process.exit(1);
  }
}

// Run tests
testAuthFlow().catch(error => {
  console.error('💥 Auth test script failed:', error);
  rl.close();
  process.exit(1);
});