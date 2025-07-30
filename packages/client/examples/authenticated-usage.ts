/**
 * Authenticated PostgREST Client Usage Examples
 * 
 * This file demonstrates how to use the authenticated PostgREST client that integrates
 * with the existing NVLP authentication system.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { 
  createAuthenticatedPostgRESTClient, 
  defaultConfig,
  SessionProvider 
} from '../src';

// Example implementation of SessionProvider using NVLP's AuthenticatedClient
class NVLPSessionProvider implements SessionProvider {
  constructor(private supabaseClient: SupabaseClient) {}

  async getSession() {
    const { data: { session } } = await this.supabaseClient.auth.getSession();
    return session;
  }

  async ensureValidSession() {
    // This would use the actual AuthenticatedClient.ensureValidSession method
    const { data: { session }, error } = await this.supabaseClient.auth.getSession();
    
    if (!session) {
      throw new Error('No active session');
    }

    // Check if token needs refresh
    if (session.expires_at && session.expires_at * 1000 < Date.now()) {
      const { data: refreshData, error: refreshError } = await this.supabaseClient.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        throw new Error('Failed to refresh session');
      }
      return refreshData.session;
    }

    return session;
  }

  onSessionChange(handler: (session: any) => void) {
    const { data: { subscription } } = this.supabaseClient.auth.onAuthStateChange(
      (event, session) => handler(session)
    );
    
    return () => subscription.unsubscribe();
  }
}

// Example 1: Create authenticated client
async function createAuthenticatedClient() {
  // Assume you have a Supabase client from your auth system
  const supabaseClient = {} as SupabaseClient; // This would be your actual Supabase client
  const sessionProvider = new NVLPSessionProvider(supabaseClient);

  const authClient = createAuthenticatedPostgRESTClient(
    {
      ...defaultConfig,
      supabaseUrl: 'https://your-project.supabase.co',
      supabaseAnonKey: 'your-anon-key',
    },
    sessionProvider
  );

  return authClient;
}

// Example 2: Using convenience methods with automatic auth
async function useConvenienceMethods() {
  const authClient = await createAuthenticatedClient();

  // All these methods automatically handle authentication
  try {
    // Get user's budgets
    const budgets = await authClient.budgets.list();
    console.log('User budgets:', budgets);

    if (budgets.length > 0) {
      const budgetId = budgets[0].id;

      // Get categories for the first budget
      const categories = await authClient.categories.listByBudget(budgetId);
      console.log('Budget categories:', categories);

      // Get category tree (hierarchical view)
      const categoryTree = await authClient.categories.getTree(budgetId);
      console.log('Category tree:', categoryTree);

      // Get envelopes by type
      const savingsEnvelopes = await authClient.envelopes.getByType(budgetId, 'savings');
      console.log('Savings envelopes:', savingsEnvelopes);

      // Get negative balance envelopes
      const negativeEnvelopes = await authClient.envelopes.getNegativeBalance(budgetId);
      console.log('Negative balance envelopes:', negativeEnvelopes);

      // Get recent transactions
      const recentTransactions = await authClient.transactions.listByBudget(budgetId, 20);
      console.log('Recent transactions:', recentTransactions);

      // Get uncleared transactions
      const unclearedTransactions = await authClient.transactions.getUncleared(budgetId);
      console.log('Uncleared transactions:', unclearedTransactions);

      // Search payees
      const groceryPayees = await authClient.payees.search(budgetId, 'grocery');
      console.log('Grocery payees:', groceryPayees);

      // Get upcoming income
      const upcomingIncome = await authClient.incomeSources.getUpcoming(
        budgetId, 
        new Date().toISOString().split('T')[0]
      );
      console.log('Upcoming income:', upcomingIncome);
    }
  } catch (error) {
    console.error('Error in convenience methods:', error);
  }
}

// Example 3: Using withAuth for custom operations
async function useWithAuthWrapper() {
  const authClient = await createAuthenticatedClient();

  try {
    // Custom query with automatic auth handling
    const customResult = await authClient.withAuth(async (client) => {
      // Complex query that's not covered by convenience methods
      return client.transactions
        .eq('budget_id', 'some-budget-id')
        .eq('transaction_type', 'expense')
        .gte('amount', 100)
        .select(`
          *,
          payee:payees(name,payee_type),
          from_envelope:envelopes!from_envelope_id(name,envelope_type),
          category:categories(name,is_income)
        `)
        .order('amount', false)
        .limit(10)
        .get();
    });

    console.log('Large expenses:', customResult);

    // Another custom operation
    const envelopeAnalysis = await authClient.withAuth(async (client) => {
      // Get envelope balances grouped by type
      return client.envelopes
        .eq('budget_id', 'some-budget-id')
        .eq('is_active', true)
        .select('envelope_type,current_balance,target_amount,name')
        .order('envelope_type')
        .order('current_balance', false)
        .get();
    });

    console.log('Envelope analysis:', envelopeAnalysis);

  } catch (error) {
    console.error('Error in withAuth operations:', error);
  }
}

// Example 4: CRUD operations with automatic auth
async function crudWithAuth() {
  const authClient = await createAuthenticatedClient();
  const budgetId = 'your-budget-id';

  try {
    // Create a new envelope
    const newEnvelope = await authClient.envelopes.create({
      budget_id: budgetId,
      name: 'Emergency Fund',
      description: 'For unexpected expenses',
      envelope_type: 'savings',
      target_amount: 1000.00,
      current_balance: 0.00,
    });
    console.log('Created envelope:', newEnvelope);

    // Update the envelope
    const updatedEnvelope = await authClient.envelopes.update(newEnvelope.id, {
      target_amount: 1500.00,
      description: 'Updated emergency fund target',
    });
    console.log('Updated envelope:', updatedEnvelope);

    // Get the envelope details
    const envelopeDetails = await authClient.envelopes.get(newEnvelope.id);
    console.log('Envelope details:', envelopeDetails);

    // Create a payee
    const newPayee = await authClient.payees.create({
      budget_id: budgetId,
      name: 'Local Grocery Store',
      description: 'Main grocery shopping location',
      payee_type: 'regular',
    });
    console.log('Created payee:', newPayee);

    // Create a category
    const newCategory = await authClient.categories.create({
      budget_id: budgetId,
      name: 'Groceries',
      description: 'Food and household items',
      is_income: false,
      display_order: 1,
    });
    console.log('Created category:', newCategory);

  } catch (error) {
    console.error('Error in CRUD operations:', error);
  }
}

// Example 5: Transaction operations (note: for production, use Edge Functions for complex validation)
async function transactionOperations() {
  const authClient = await createAuthenticatedClient();
  const budgetId = 'your-budget-id';

  try {
    // Get transaction with full details
    const transactionDetails = await authClient.transactions.get('transaction-id');
    console.log('Transaction details:', transactionDetails);

    // Get transactions for a specific envelope
    const envelopeTransactions = await authClient.transactions.getByEnvelope('envelope-id');
    console.log('Envelope transactions:', envelopeTransactions);

    // Get transactions for a specific payee
    const payeeTransactions = await authClient.transactions.getByPayee('payee-id');
    console.log('Payee transactions:', payeeTransactions);

    // Soft delete a transaction
    await authClient.transactions.softDelete('transaction-id');
    console.log('Transaction soft deleted');

    // Restore a transaction
    await authClient.transactions.restore('transaction-id');
    console.log('Transaction restored');

    // Get audit trail for a transaction
    const auditTrail = await authClient.transactionEvents.getByTransaction('transaction-id');
    console.log('Transaction audit trail:', auditTrail);

  } catch (error) {
    console.error('Error in transaction operations:', error);
  }
}

// Example 6: Integration with React/React Native
class BudgetService {
  private authClient: any; // AuthenticatedPostgRESTClient

  constructor(authClient: any) {
    this.authClient = authClient;
  }

  // Service methods that components can call
  async getUserBudgets() {
    return this.authClient.budgets.list();
  }

  async getBudgetDetails(budgetId: string) {
    const [budget, categories, envelopes, recentTransactions] = await Promise.all([
      this.authClient.budgets.get(budgetId),
      this.authClient.categories.listByBudget(budgetId),
      this.authClient.envelopes.listByBudget(budgetId),
      this.authClient.transactions.listByBudget(budgetId, 10),
    ]);

    return {
      budget,
      categories,
      envelopes,
      recentTransactions,
    };
  }

  async createQuickExpense(budgetId: string, data: any) {
    // For production, you'd use the Edge Function instead
    return this.authClient.transactions.create({
      budget_id: budgetId,
      transaction_type: 'expense',
      ...data,
    });
  }

  async searchPayees(budgetId: string, query: string) {
    return this.authClient.payees.search(budgetId, query);
  }
}

// Example usage in a React component (pseudo-code)
/*
function BudgetDashboard({ budgetId }: { budgetId: string }) {
  const [budgetData, setBudgetData] = useState(null);
  const budgetService = useBudgetService(); // Custom hook that provides BudgetService

  useEffect(() => {
    budgetService.getBudgetDetails(budgetId)
      .then(setBudgetData)
      .catch(console.error);
  }, [budgetId]);

  if (!budgetData) return <div>Loading...</div>;

  return (
    <div>
      <h1>{budgetData.budget.name}</h1>
      <div>Available: ${budgetData.budget.available_amount}</div>
      
      <h2>Envelopes</h2>
      {budgetData.envelopes.map(envelope => (
        <div key={envelope.id}>
          {envelope.name}: ${envelope.current_balance}
        </div>
      ))}
      
      <h2>Recent Transactions</h2>
      {budgetData.recentTransactions.map(transaction => (
        <div key={transaction.id}>
          {transaction.description}: ${transaction.amount}
        </div>
      ))}
    </div>
  );
}
*/

// Run examples (uncomment to test)
// useConvenienceMethods();
// useWithAuthWrapper();
// crudWithAuth();
// transactionOperations();