/**
 * Example of using the unified NVLP client
 */

import { createClient } from '@supabase/supabase-js';
import { createNVLPClient, SessionProvider } from '../src/unified-client';

// Example session provider implementation using Supabase
class SupabaseSessionProvider implements SessionProvider {
  private supabaseClient: any;

  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
  }

  async getSession() {
    const { data: { session } } = await this.supabaseClient.auth.getSession();
    return session;
  }

  async ensureValidSession() {
    const { data: { session }, error } = await this.supabaseClient.auth.refreshSession();
    if (error || !session) {
      throw new Error(`Failed to refresh session: ${error?.message || 'No session'}`);
    }
    return session;
  }

  onSessionChange(handler: (session: any) => void) {
    const { data: { subscription } } = this.supabaseClient.auth.onAuthStateChange(
      (event: any, session: any) => {
        handler(session);
      }
    );
    
    return () => subscription.unsubscribe();
  }
}

async function demonstrateUnifiedClient() {
  // Create Supabase client for auth
  const supabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  // Create session provider
  const sessionProvider = new SupabaseSessionProvider(supabaseClient);

  // Create unified NVLP client
  const nvlp = createNVLPClient({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    customDomain: 'https://api.mynvlpapp.com', // Optional custom domain
    sessionProvider,
  });

  try {
    // Example 1: Using PostgREST for direct database access
    console.log('=== PostgREST Examples ===');
    
    // Get all budgets (automatically authenticated)
    const budgets = await nvlp.budgets
      .select('*')
      .eq('is_active', true)
      .order('created_at', false)
      .get();
    console.log('Budgets:', budgets);

    // Get envelopes for a specific budget
    if (budgets.length > 0) {
      const envelopes = await nvlp.envelopes
        .select('*')
        .eq('budget_id', budgets[0].id)
        .eq('is_active', true)
        .order('display_order')
        .get();
      console.log('Envelopes:', envelopes);
    }

    // Example 2: Using Edge Functions for complex operations
    console.log('\n=== Edge Function Examples ===');
    
    // Create a new budget with setup (complex business logic)
    const newBudget = await nvlp.post('/budgets', {
      name: 'My Unified Budget',
      description: 'Created with unified client',
    });
    console.log('New budget:', newBudget);

    // Set up default categories and envelopes
    const setupResult = await nvlp.post(`/budgets/${newBudget.id}/setup/defaults`);
    console.log('Setup result:', setupResult);

    // Get dashboard data (complex calculation)
    const dashboard = await nvlp.get(`/budgets/${newBudget.id}/dashboard`);
    console.log('Dashboard:', dashboard);

    // Example 3: Transaction creation (complex validation)
    const transaction = await nvlp.post(`/budgets/${newBudget.id}/transactions`, {
      type: 'INCOME',
      amount: 5000.00,
      description: 'Salary',
      transaction_date: new Date().toISOString(),
      income_source_id: 'some-income-source-id',
    });
    console.log('New transaction:', transaction);

    // Example 4: Mixed usage - PostgREST query with Edge Function follow-up
    const negativeEnvelopes = await nvlp.envelopes
      .select('*')
      .eq('budget_id', newBudget.id)
      .lt('current_balance', 0)
      .get();
    
    if (negativeEnvelopes.length > 0) {
      // Use Edge Function to handle negative balance notifications
      await nvlp.post('/notifications/negative-balance', {
        budget_id: newBudget.id,
        envelope_ids: negativeEnvelopes.map(e => e.id),
      });
    }

    // Example 5: Using withAuth for explicit authentication handling
    const authenticatedResult = await nvlp.withAuth(async (client) => {
      // This ensures we have a valid session before making requests
      const userProfile = await client.userProfiles
        .select('*')
        .single();
      
      return userProfile;
    });
    console.log('Authenticated user:', authenticatedResult);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Clean up resources
    nvlp.dispose();
  }
}

// Example of creating client from environment variables
function createClientFromEnv() {
  // This automatically uses SUPABASE_URL and SUPABASE_ANON_KEY from environment
  const nvlp = createNVLPClientFromEnv({
    customDomain: 'https://api.mynvlpapp.com',
    schema: 'public',
  });

  return nvlp;
}

// Example of adding session provider later
async function addSessionProviderLater() {
  // Create client without session provider initially
  const nvlp = createNVLPClient({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
  });

  // Later, after user logs in, add session provider
  const supabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
  
  const sessionProvider = new SupabaseSessionProvider(supabaseClient);
  nvlp.setSessionProvider(sessionProvider);

  // Now all requests will be authenticated
  const budgets = await nvlp.budgets.select('*').get();
  console.log('Authenticated budgets:', budgets);

  // For logout, clear the session provider
  nvlp.clearSessionProvider();
}

// Export examples for use
export {
  demonstrateUnifiedClient,
  createClientFromEnv,
  addSessionProviderLater,
  SupabaseSessionProvider,
};