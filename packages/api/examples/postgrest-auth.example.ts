/**
 * PostgREST Authentication Headers Example
 * 
 * This example demonstrates how to use PostgREST with proper authentication headers
 * in the NVLP API.
 */

import { createClient } from '@supabase/supabase-js';
import { 
  createPostgRESTHeaders, 
  createEnhancedPostgRESTClient,
  PostgRESTPrefer,
  extractPaginationInfo 
} from '../src/utils';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

// Create Supabase client
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Example 1: Direct PostgREST API calls with proper headers
async function directPostgRESTExample() {
  console.log('=== Direct PostgREST API Example ===');
  
  // Get current session
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (!session) {
    console.log('No active session. Please login first.');
    return;
  }

  // Create proper headers
  const headers = createPostgRESTHeaders(SUPABASE_ANON_KEY, session, {
    prefer: PostgRESTPrefer.combine(
      PostgRESTPrefer.RETURN_REPRESENTATION,
      PostgRESTPrefer.COUNT_EXACT
    ),
  });

  // Make authenticated request to get budgets
  const response = await fetch(`${SUPABASE_URL}/rest/v1/budgets?is_active=eq.true&order=created_at.desc`, {
    headers: headers as Record<string, string>,
  });

  if (!response.ok) {
    console.error('Request failed:', response.status, response.statusText);
    return;
  }

  const budgets = await response.json();
  const paginationInfo = extractPaginationInfo(response.headers);

  console.log('Budgets:', budgets);
  console.log('Total count:', paginationInfo.totalCount);
}

// Example 2: Using Enhanced PostgREST Client
async function enhancedClientExample() {
  console.log('\n=== Enhanced PostgREST Client Example ===');

  // Create enhanced client
  const postgrestClient = createEnhancedPostgRESTClient({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    supabaseClient, // Automatically handles session
    schema: 'public',
  });

  // SELECT with filtering and pagination
  const { data: budgets, error: budgetsError, count } = await postgrestClient.select('budgets', {
    filters: {
      'is_active': 'eq.true',
    },
    order: [{ column: 'created_at', ascending: false }],
    limit: 5,
    count: 'exact',
  });

  if (budgetsError) {
    console.error('Failed to fetch budgets:', budgetsError);
    return;
  }

  console.log(`Found ${count} total budgets, showing first 5:`, budgets);

  if (!budgets || budgets.length === 0) {
    console.log('No budgets found. Creating one...');
    
    // INSERT new budget
    const { data: newBudget, error: createError } = await postgrestClient.insert('budgets', {
      name: 'Test Budget',
      description: 'Created via PostgREST with auth headers',
      user_id: session?.user.id, // Would be set automatically by RLS in practice
    });

    if (createError) {
      console.error('Failed to create budget:', createError);
      return;
    }

    console.log('Created budget:', newBudget);
    return;
  }

  const budgetId = budgets[0].id;

  // Get envelopes with complex query
  const { data: envelopes, error: envelopesError } = await postgrestClient.select('envelopes', {
    columns: '*,category:categories(name)',
    filters: {
      'budget_id': `eq.${budgetId}`,
      'is_active': 'eq.true',
    },
    order: [
      { column: 'current_balance', ascending: false },
      { column: 'name', ascending: true },
    ],
    limit: 10,
  });

  if (envelopesError) {
    console.error('Failed to fetch envelopes:', envelopesError);
    return;
  }

  console.log('Envelopes:', envelopes);

  // UPDATE operation
  if (envelopes && envelopes.length > 0) {
    const envelopeId = envelopes[0].id;
    
    const { data: updatedEnvelope, error: updateError } = await postgrestClient.update(
      'envelopes',
      { description: 'Updated via PostgREST' },
      { 'id': `eq.${envelopeId}` }
    );

    if (updateError) {
      console.error('Failed to update envelope:', updateError);
    } else {
      console.log('Updated envelope:', updatedEnvelope);
    }
  }
}

// Example 3: Handling different response types
async function responseTypeExamples() {
  console.log('\n=== Response Type Examples ===');
  
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (!session) {
    console.log('No active session.');
    return;
  }

  // CSV Export
  const csvHeaders = createPostgRESTHeaders(SUPABASE_ANON_KEY, session, {
    contentType: 'text/csv',
    customHeaders: {
      'Accept': 'text/csv',
    },
  });

  const csvResponse = await fetch(`${SUPABASE_URL}/rest/v1/transactions?budget_id=eq.some-id&limit=10`, {
    headers: csvHeaders as Record<string, string>,
  });

  if (csvResponse.ok) {
    const csvData = await csvResponse.text();
    console.log('CSV data (first 200 chars):', csvData.substring(0, 200));
  }

  // Minimal response (no body)
  const minimalHeaders = createPostgRESTHeaders(SUPABASE_ANON_KEY, session, {
    prefer: PostgRESTPrefer.RETURN_MINIMAL,
  });

  const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/transactions?id=eq.non-existent`, {
    method: 'DELETE',
    headers: minimalHeaders as Record<string, string>,
  });

  console.log('Delete response status:', deleteResponse.status);
  console.log('Delete response has body:', deleteResponse.headers.get('Content-Length') !== '0');
}

// Example 4: Batch operations with proper headers
async function batchOperationsExample() {
  console.log('\n=== Batch Operations Example ===');
  
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (!session) {
    console.log('No active session.');
    return;
  }

  // Bulk insert with proper headers
  const bulkHeaders = createPostgRESTHeaders(SUPABASE_ANON_KEY, session, {
    prefer: PostgRESTPrefer.RETURN_REPRESENTATION,
  });

  const categories = [
    { budget_id: 'some-budget-id', name: 'Housing', is_income: false },
    { budget_id: 'some-budget-id', name: 'Transportation', is_income: false },
    { budget_id: 'some-budget-id', name: 'Food', is_income: false },
  ];

  const bulkResponse = await fetch(`${SUPABASE_URL}/rest/v1/categories`, {
    method: 'POST',
    headers: bulkHeaders as Record<string, string>,
    body: JSON.stringify(categories),
  });

  if (bulkResponse.ok) {
    const created = await bulkResponse.json();
    console.log('Bulk created categories:', created);
  } else {
    console.error('Bulk insert failed:', bulkResponse.status);
  }
}

// Example 5: Error handling with auth headers
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');
  
  const { data: { session } } = await supabaseClient.auth.getSession();

  // Try without session (unauthorized)
  const unauthHeaders = createPostgRESTHeaders(SUPABASE_ANON_KEY);
  
  const unauthResponse = await fetch(`${SUPABASE_URL}/rest/v1/budgets`, {
    headers: unauthHeaders as Record<string, string>,
  });

  console.log('Unauth request status:', unauthResponse.status);
  if (!unauthResponse.ok) {
    const error = await unauthResponse.json();
    console.log('Unauth error:', error);
  }

  // Try with expired token
  const expiredSession = session ? {
    ...session,
    access_token: 'expired-token',
  } : null;

  const expiredHeaders = createPostgRESTHeaders(SUPABASE_ANON_KEY, expiredSession as any);
  
  const expiredResponse = await fetch(`${SUPABASE_URL}/rest/v1/budgets`, {
    headers: expiredHeaders as Record<string, string>,
  });

  console.log('Expired token status:', expiredResponse.status);
  if (!expiredResponse.ok) {
    const error = await expiredResponse.json();
    console.log('Expired token error:', error);
  }

  // Refresh and retry
  if (session && expiredResponse.status === 401) {
    console.log('Refreshing session...');
    const { data: refreshData, error: refreshError } = await supabaseClient.auth.refreshSession();
    
    if (!refreshError && refreshData.session) {
      const refreshedHeaders = createPostgRESTHeaders(SUPABASE_ANON_KEY, refreshData.session);
      
      const retryResponse = await fetch(`${SUPABASE_URL}/rest/v1/budgets?limit=1`, {
        headers: refreshedHeaders as Record<string, string>,
      });

      console.log('Retry after refresh status:', retryResponse.status);
      if (retryResponse.ok) {
        const data = await retryResponse.json();
        console.log('Success after refresh:', data);
      }
    }
  }
}

// Run examples
async function runExamples() {
  try {
    // Login first (for demo purposes, use your actual auth method)
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test-password',
    });

    if (error) {
      console.error('Login failed:', error);
      console.log('Please ensure you have a test user set up.');
      return;
    }

    await directPostgRESTExample();
    await enhancedClientExample();
    await responseTypeExamples();
    await batchOperationsExample();
    await errorHandlingExample();

    // Logout
    await supabaseClient.auth.signOut();
  } catch (error) {
    console.error('Example error:', error);
  }
}

// Uncomment to run
// runExamples();