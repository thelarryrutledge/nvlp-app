#!/usr/bin/env node
/**
 * Test script for NVLP Client Library
 * Tests both PostgREST and Edge Function transports
 */

const { NVLPClient } = require('./dist/client/index');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY
};

// Load saved tokens
let accessToken = null;
try {
  const tokenData = fs.readFileSync('/tmp/supabase_tokens.json', 'utf8');
  const tokens = JSON.parse(tokenData);
  accessToken = tokens.access_token;
  console.log('✓ Loaded saved access token');
} catch (error) {
  console.error('❌ Failed to load saved tokens. Run login-and-save-token.sh first');
  process.exit(1);
}

async function testClientLibrary() {
  console.log('\n🧪 Testing NVLP Client Library...\n');
  
  const client = new NVLPClient(config);
  
  // Set authentication
  client.setAuth(accessToken);
  console.log('✓ Authentication set');
  
  let testResults = {
    passed: 0,
    failed: 0,
    errors: []
  };
  
  // Test 1: Health Check
  try {
    const health = await client.healthCheck();
    if (health.status === 'healthy') {
      console.log('✓ Health check passed');
      testResults.passed++;
    } else {
      console.log('❌ Health check failed:', health.status);
      testResults.failed++;
      testResults.errors.push('Health check failed');
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Health check error: ${error.message}`);
  }
  
  // Test 2: Get Profile
  try {
    const profile = await client.getProfile();
    if (profile && profile.id) {
      console.log('✓ Get profile passed');
      testResults.passed++;
    } else {
      console.log('❌ Get profile failed: No profile data');
      testResults.failed++;
      testResults.errors.push('Get profile failed');
    }
  } catch (error) {
    console.log('❌ Get profile error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Get profile error: ${error.message}`);
  }
  
  // Test 3: Get Budgets
  try {
    const budgets = await client.getBudgets();
    if (Array.isArray(budgets)) {
      console.log(`✓ Get budgets passed (found ${budgets.length} budgets)`);
      testResults.passed++;
    } else {
      console.log('❌ Get budgets failed: Invalid response');
      testResults.failed++;
      testResults.errors.push('Get budgets failed');
    }
  } catch (error) {
    console.log('❌ Get budgets error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Get budgets error: ${error.message}`);
  }
  
  // Test 4: Create Test Budget
  let testBudget = null;
  try {
    testBudget = await client.createBudget({
      name: 'Client Library Test Budget',
      description: 'Created by client library test'
    });
    
    if (testBudget && testBudget.id) {
      console.log(`✓ Create budget passed (ID: ${testBudget.id})`);
      testResults.passed++;
    } else {
      console.log('❌ Create budget failed: No budget returned');
      testResults.failed++;
      testResults.errors.push('Create budget failed');
    }
  } catch (error) {
    console.log('❌ Create budget error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Create budget error: ${error.message}`);
  }
  
  // Test 5: Create Test Income Source (requires budget)
  if (testBudget) {
    try {
      const incomeSource = await client.createIncomeSource({
        budget_id: testBudget.id,
        name: 'Test Salary',
        description: 'Created by client library test',
        expected_monthly_amount: 5000.00,
        frequency: 'monthly'
      });
      
      if (incomeSource && incomeSource.id) {
        console.log(`✓ Create income source passed (ID: ${incomeSource.id})`);
        testResults.passed++;
      } else {
        console.log('❌ Create income source failed: No income source returned');
        testResults.failed++;
        testResults.errors.push('Create income source failed');
      }
    } catch (error) {
      console.log('❌ Create income source error:', error.message);
      testResults.failed++;
      testResults.errors.push(`Create income source error: ${error.message}`);
    }
  }
  
  // Test 6: Get Categories
  try {
    const categories = await client.getCategories();
    if (Array.isArray(categories)) {
      console.log(`✓ Get categories passed (found ${categories.length} categories)`);
      testResults.passed++;
    } else {
      console.log('❌ Get categories failed: Invalid response');
      testResults.failed++;
      testResults.errors.push('Get categories failed');
    }
  } catch (error) {
    console.log('❌ Get categories error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Get categories error: ${error.message}`);
  }
  
  // Test 7: Get Envelopes
  try {
    const envelopes = await client.getEnvelopes();
    if (Array.isArray(envelopes)) {
      console.log(`✓ Get envelopes passed (found ${envelopes.length} envelopes)`);
      testResults.passed++;
    } else {
      console.log('❌ Get envelopes failed: Invalid response');
      testResults.failed++;
      testResults.errors.push('Get envelopes failed');
    }
  } catch (error) {
    console.log('❌ Get envelopes error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Get envelopes error: ${error.message}`);
  }
  
  // Test 8: Get Payees
  try {
    const payees = await client.getPayees();
    if (Array.isArray(payees)) {
      console.log(`✓ Get payees passed (found ${payees.length} payees)`);
      testResults.passed++;
    } else {
      console.log('❌ Get payees failed: Invalid response');
      testResults.failed++;
      testResults.errors.push('Get payees failed');
    }
  } catch (error) {
    console.log('❌ Get payees error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Get payees error: ${error.message}`);
  }
  
  // Test 9: Authentication State Management
  try {
    const authState = client.getAuthState();
    const isAuth = client.isAuthenticated();
    
    if (authState && authState.accessToken && isAuth) {
      console.log('✓ Authentication state management passed');
      testResults.passed++;
    } else {
      console.log('❌ Authentication state management failed');
      testResults.failed++;
      testResults.errors.push('Authentication state management failed');
    }
  } catch (error) {
    console.log('❌ Authentication state error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Authentication state error: ${error.message}`);
  }
  
  // Test 10: Transport Access
  try {
    const postgrestTransport = client.getPostgRESTTransport();
    const edgeFunctionTransport = client.getEdgeFunctionTransport();
    
    if (postgrestTransport && edgeFunctionTransport) {
      console.log('✓ Transport access passed');
      testResults.passed++;
    } else {
      console.log('❌ Transport access failed');
      testResults.failed++;
      testResults.errors.push('Transport access failed');
    }
  } catch (error) {
    console.log('❌ Transport access error:', error.message);
    testResults.failed++;
    testResults.errors.push(`Transport access error: ${error.message}`);
  }
  
  // Cleanup: Delete test budget
  if (testBudget) {
    try {
      await client.deleteBudget(testBudget.id);
      console.log('✓ Cleanup: Test budget deleted');
    } catch (error) {
      console.log('⚠️  Cleanup warning: Failed to delete test budget:', error.message);
    }
  }
  
  // Final Results
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n🚨 Errors:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  console.log('\n🎯 Client library validation complete!');
  
  // Exit with error code if any tests failed
  if (testResults.failed > 0) {
    process.exit(1);
  }
}

// Run tests
testClientLibrary().catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});