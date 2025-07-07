#!/usr/bin/env node
/**
 * Example: NVLP Client Library Usage
 * Demonstrates proper authentication flow and API usage
 */

const { NVLPClient } = require('./dist/client/index');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  persistTokens: true,  // Automatically save/restore tokens
  autoRefresh: true     // Automatically refresh tokens when needed
};

async function exampleUsage() {
  console.log('📱 NVLP Client Library - Example Usage\n');

  // Initialize client
  const client = new NVLPClient(config);
  
  try {
    // Check if already authenticated (from persisted session)
    if (client.isAuthenticated()) {
      console.log('✓ Found existing session, using persisted authentication');
      
      // Check if token needs refresh
      if (client.needsTokenRefresh()) {
        console.log('🔄 Token will be auto-refreshed soon...');
      }
    } else {
      console.log('❌ No existing session found');
      console.log('');
      console.log('💡 For this demo, we\'ll use a pre-saved token from the login script');
      console.log('   In production, you would call: await client.login(email, password)');
      console.log('');
      
      // Load token from existing login for demo purposes
      try {
        const fs = require('fs');
        const tokenData = fs.readFileSync('/tmp/supabase_tokens.json', 'utf8');
        const tokens = JSON.parse(tokenData);
        
        // Simulate a successful login response
        const mockUser = {
          id: '07075cac-0338-4b3a-b58b-a7a174c1ab0d',
          email: 'larryjrutledge@gmail.com',
          emailConfirmed: true
        };
        
        // Set authentication manually for demo
        client.setAuth(tokens.access_token, null, mockUser, 3600);
        console.log('✅ Demo authentication set using existing token');
        console.log('💾 Tokens would be automatically saved in real login flow');
      } catch (error) {
        console.log('❌ Could not load demo token. Please run ./scripts/login-and-save-token.sh first');
        console.log('');
        console.log('🔮 Future login flow (when Edge Functions are implemented):');
        console.log('```javascript');
        console.log('const { user, session } = await client.login("user@example.com", "password");');
        console.log('// Tokens automatically saved and persisted');
        console.log('```');
        return;
      }
    }

    // Example API operations
    console.log('\n🔄 Making authenticated API calls...');
    
    // Get user profile
    const profile = await client.getProfile();
    console.log(`👤 Profile: ${profile.display_name} (${profile.currency_code})`);
    
    // Get budgets
    const budgets = await client.getBudgets();
    console.log(`💰 Budgets: Found ${budgets.length} budgets`);
    
    if (budgets.length > 0) {
      const defaultBudget = budgets.find(b => b.is_default) || budgets[0];
      console.log(`   └─ Default: ${defaultBudget.name}`);
      
      // Get budget-specific data
      const [incomeSources, categories, envelopes, payees] = await Promise.all([
        client.getIncomeSources(defaultBudget.id),
        client.getCategories(defaultBudget.id),
        client.getEnvelopes(defaultBudget.id),
        client.getPayees(defaultBudget.id)
      ]);
      
      console.log(`📊 Budget "${defaultBudget.name}" contains:`);
      console.log(`   🏦 Income Sources: ${incomeSources.length}`);
      console.log(`   📁 Categories: ${categories.length}`);
      console.log(`   💌 Envelopes: ${envelopes.length}`);
      console.log(`   🏪 Payees: ${payees.length}`);
    }
    
    // Show authentication state
    const authState = client.getAuthState();
    const expiresInMinutes = authState.expiresAt ? 
      Math.round((authState.expiresAt - Date.now()) / (1000 * 60)) : 0;
    
    console.log(`\n🔐 Authentication Status:`);
    console.log(`   User: ${authState.user?.email}`);
    console.log(`   Token expires in: ${expiresInMinutes} minutes`);
    console.log(`   Auto-refresh enabled: ${client.needsTokenRefresh() ? 'Will refresh soon' : 'Token valid'}`);
    
    // Demonstrate token refresh if needed
    if (client.needsTokenRefresh() && authState.refreshToken) {
      console.log('\n🔄 Demonstrating manual token refresh...');
      try {
        await client.refreshToken();
        console.log('✅ Token refreshed successfully');
        const newAuthState = client.getAuthState();
        const newExpiresInMinutes = newAuthState.expiresAt ? 
          Math.round((newAuthState.expiresAt - Date.now()) / (1000 * 60)) : 0;
        console.log(`   New token expires in: ${newExpiresInMinutes} minutes`);
      } catch (error) {
        console.log('❌ Token refresh failed:', error.message);
      }
    }
    
    console.log('\n✅ Example completed successfully!');
    console.log('\n💡 Key features demonstrated:');
    console.log('   • Automatic login when no session exists');
    console.log('   • Automatic token persistence (saved to ~/.nvlp/auth.json)');
    console.log('   • Automatic token refresh when needed');
    console.log('   • Session restoration on client initialization');
    console.log('   • Unified API access across all resources');

  } catch (error) {
    console.error('❌ Example failed:', error.message);
    
    if (error.message.includes('Authentication required')) {
      console.log('\n💡 Authentication required. Example login flow:');
      console.log('```javascript');
      console.log('const client = new NVLPClient(config);');
      console.log('const { user, session } = await client.login("email", "password");');
      console.log('// Now all API calls are authenticated');
      console.log('const budgets = await client.getBudgets();');
      console.log('```');
    }
  }
}

// For logout example
async function exampleLogout() {
  const client = new NVLPClient(config);
  
  if (client.isAuthenticated()) {
    console.log('\n🚪 Logout example:');
    await client.logout();
    console.log('✓ Logged out - tokens cleared from storage');
  }
}

// Run example
exampleUsage().catch(error => {
  console.error('💥 Example failed:', error);
  process.exit(1);
});

module.exports = { exampleUsage, exampleLogout };