#!/usr/bin/env ts-node

import { createHttpClient, HttpError, NetworkError } from '../src';

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function authenticateAndGetProfile() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file');
    process.exit(1);
  }

  console.log('🔗 Connecting to Supabase:', supabaseUrl);

  // Create auth client for authentication
  const authClient = createHttpClient({
    baseUrl: `${supabaseUrl}/auth/v1`,
    defaultHeaders: {
      'apikey': anonKey,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  try {
    console.log('🔐 Authenticating with email/password...');
    
    // Sign in with email and password
    const authResponse = await authClient.post('/token?grant_type=password', {
      email: 'larryjrutledge@gmail.com',
      password: 'Test1234!'
    });

    console.log('✅ Authentication successful!');
    const { access_token, user } = authResponse;
    console.log('👤 User ID:', user.id);
    console.log('📧 Email:', user.email);

    // Now create authenticated client for data access
    const dataClient = createHttpClient({
      baseUrl: `${supabaseUrl}/rest/v1`,
      defaultHeaders: {
        'apikey': anonKey,
        'Authorization': `Bearer ${access_token}`,
        'Content-Profile': 'public',
        'Accept-Profile': 'public',
        'User-Agent': 'NVLP-Client/1.0.0'
      },
      timeout: 30000
    });

    console.log('📊 Getting user profile...');
    const profiles = await dataClient.get('/user_profiles');
    console.log('👤 User profiles:', profiles);

    console.log('💰 Getting user budgets...');
    const budgets = await dataClient.get('/budgets');
    console.log('💰 Budgets:', budgets);

    if (budgets.length > 0) {
      const budgetId = budgets[0].id;
      console.log(`📈 Getting envelopes for budget ${budgetId}...`);
      const envelopes = await dataClient.get(`/envelopes?budget_id=eq.${budgetId}`);
      console.log('📈 Envelopes:', envelopes);
    }

    return { access_token, user };

  } catch (error) {
    if (error instanceof HttpError) {
      console.log(`📋 HTTP Response ${error.status}: ${error.statusText}`);
      
      if (error.status === 400) {
        console.log('🔑 Invalid credentials - check email/password');
      } else if (error.status === 401) {
        console.log('🔐 Authentication failed');
      } else {
        console.error('❌ HTTP Error:', error.message);
      }
    } else if (error instanceof NetworkError) {
      console.error('🌐 Network Error:', error.message);
    } else {
      console.error('❓ Unknown error:', error);
    }
    
    return null;
  }
}

async function supabaseHttpExample() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('❌ Missing environment variables');
    return null;
  }

  // Create unauthenticated client for basic testing
  const client = createHttpClient({
    baseUrl: `${supabaseUrl}/rest/v1`,
    defaultHeaders: {
      'apikey': anonKey,
      'Content-Profile': 'public',
      'Accept-Profile': 'public',
      'User-Agent': 'NVLP-Client/1.0.0'
    },
    timeout: 30000
  });

  try {
    console.log('📡 Testing unauthenticated connection...');
    
    // Test connection by querying user_profiles table (will likely be restricted)
    const profiles = await client.get('/user_profiles?limit=1');
    console.log('📊 Public user profiles:', profiles);
    
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.status === 401) {
        console.log('🔐 User profiles require authentication (expected)');
      } else {
        console.log(`📋 HTTP Response ${error.status}: ${error.statusText}`);
      }
    }
  }

  return null;
}

async function testSupabaseEdgeFunctions(accessToken?: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('❌ Missing environment variables');
    return;
  }

  // Create client for Edge Functions
  const headers: Record<string, string> = {
    'apikey': anonKey,
    'Content-Type': 'application/json'
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
    console.log('🔑 Using authenticated access token for edge functions');
  } else {
    headers['Authorization'] = `Bearer ${anonKey}`;
    console.log('🔓 Using anonymous access for edge functions');
  }

  const edgeClient = createHttpClient({
    baseUrl: `${supabaseUrl}/functions/v1`,
    defaultHeaders: headers,
    timeout: 30000
  });

  try {
    console.log('🚀 Testing Edge Functions...');
    
    // Test the auth-user function (should require authentication)
    try {
      const userResult = await edgeClient.get('/auth-user');
      console.log('✅ Auth user function response:', userResult);
    } catch (authError) {
      if (authError instanceof HttpError && authError.status === 401) {
        console.log('🔐 Auth user function correctly requires authentication');
      } else {
        console.log('⚠️  Auth user function error:', authError instanceof HttpError ? `HTTP ${authError.status}` : authError);
      }
    }

    // Test the verify-handler function
    try {
      const verifyResult = await edgeClient.post('/verify-handler', {});
      console.log('✅ Verify handler response:', verifyResult);
    } catch (verifyError) {
      console.log('📋 Verify handler response:', verifyError instanceof HttpError ? `HTTP ${verifyError.status}` : verifyError);
    }
    
  } catch (error) {
    console.log('⚠️  Edge function test error:', error instanceof HttpError ? `${error.status}` : error);
  }
}

async function main() {
  console.log('🚀 Running Supabase HTTP Client Examples...\n');
  
  // First test basic unauthenticated connection
  await supabaseHttpExample();
  console.log('');
  
  // Then authenticate and get real data
  const authResult = await authenticateAndGetProfile();
  console.log('');
  
  // Test edge functions (with auth if available)
  await testSupabaseEdgeFunctions(authResult?.access_token);
  
  console.log('\n✅ Examples completed!');
}

main().catch(console.error);