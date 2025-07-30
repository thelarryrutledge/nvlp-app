/**
 * Basic PostgREST Client Usage Examples
 * 
 * This file demonstrates how to use the PostgREST client for direct database access.
 */

import { createClientFromConfig, defaultConfig } from '../src';

// Example 1: Create a basic client
const client = createClientFromConfig({
  ...defaultConfig,
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-anon-key',
});

// Set authentication token (you would get this from your auth system)
client.setToken('your-jwt-token');

// Example 2: Basic CRUD operations

async function basicCrudExamples() {
  // Get all budgets for the authenticated user
  const budgets = await client.budgets
    .eq('is_active', true)
    .order('created_at', false)
    .get();
  
  console.log('User budgets:', budgets);

  // Get a specific budget
  const budget = await client.budgets
    .eq('id', 'budget-uuid')
    .single();
  
  console.log('Budget details:', budget);

  // Create a new budget
  const newBudget = await client.budgets.post({
    name: 'My New Budget',
    description: 'Budget created via PostgREST',
    user_id: 'user-uuid', // This would come from the JWT token in practice
  });
  
  console.log('Created budget:', newBudget);

  // Update a budget
  const updatedBudget = await client.budgets
    .eq('id', newBudget.id)
    .patch({
      description: 'Updated description'
    });
  
  console.log('Updated budget:', updatedBudget);
}

// Example 3: Advanced queries

async function advancedQueryExamples() {
  const budgetId = 'your-budget-id';
  
  // Get categories with their envelopes (embedded resources)
  const categoriesWithEnvelopes = await client.categories
    .eq('budget_id', budgetId)
    .select('*,envelopes(*)')
    .order('display_order')
    .get();
  
  console.log('Categories with envelopes:', categoriesWithEnvelopes);

  // Get transactions in date range with related data
  const recentTransactions = await client.transactions
    .eq('budget_id', budgetId)
    .eq('is_deleted', false)
    .gte('transaction_date', '2025-01-01')
    .select(`
      *,
      from_envelope:envelopes!from_envelope_id(name),
      to_envelope:envelopes!to_envelope_id(name),
      payee:payees(name),
      income_source:income_sources(name)
    `)
    .order('transaction_date', false)
    .limit(20)
    .get();
  
  console.log('Recent transactions:', recentTransactions);

  // Get negative balance envelopes
  const negativeEnvelopes = await client.envelopes
    .eq('budget_id', budgetId)
    .lt('current_balance', 0)
    .eq('is_active', true)
    .select('*,category:categories(name)')
    .order('current_balance')
    .get();
  
  console.log('Negative balance envelopes:', negativeEnvelopes);

  // Search payees
  const groceryPayees = await client.payees
    .eq('budget_id', budgetId)
    .ilike('name', '*grocery*')
    .eq('is_active', true)
    .order('name')
    .get();
  
  console.log('Grocery payees:', groceryPayees);
}

// Example 4: Complex filters and pagination

async function filteringAndPaginationExamples() {
  const budgetId = 'your-budget-id';
  
  // Complex OR filter
  const expensesOrTransfers = await client.transactions
    .eq('budget_id', budgetId)
    .or('transaction_type.eq.expense,transaction_type.eq.transfer')
    .eq('is_deleted', false)
    .order('transaction_date', false)
    .get();
  
  console.log('Expenses or transfers:', expensesOrTransfers);

  // Pagination with range
  const firstPage = await client.transactions
    .eq('budget_id', budgetId)
    .eq('is_deleted', false)
    .order('transaction_date', false)
    .range(0, 19) // First 20 results
    .get();
  
  console.log('First page (20 results):', firstPage);

  // Second page
  const secondPage = await client.transactions
    .eq('budget_id', budgetId)
    .eq('is_deleted', false)
    .order('transaction_date', false)
    .range(20, 39) // Next 20 results
    .get();
  
  console.log('Second page (20 results):', secondPage);

  // Get only specific columns
  const budgetSummary = await client.budgets
    .eq('is_active', true)
    .select('id,name,available_amount,created_at')
    .order('created_at', false)
    .get();
  
  console.log('Budget summary:', budgetSummary);
}

// Example 5: Error handling

async function errorHandlingExample() {
  try {
    // This might fail if the user doesn't have access to this budget
    const restrictedBudget = await client.budgets
      .eq('id', 'some-other-users-budget')
      .single();
    
    console.log('Should not reach here if RLS is working');
  } catch (error) {
    console.error('Access denied (expected):', error);
  }

  try {
    // This might fail due to constraint violations
    const invalidTransaction = await client.transactions.post({
      budget_id: 'invalid-budget-id',
      transaction_type: 'income',
      amount: -100, // Invalid negative amount
      transaction_date: '2025-01-30',
    });
  } catch (error) {
    console.error('Constraint violation (expected):', error);
  }
}

// Example 6: Bulk operations

async function bulkOperationsExample() {
  const budgetId = 'your-budget-id';
  
  // Create multiple categories at once
  const newCategories = await client.categories.post([
    {
      budget_id: budgetId,
      name: 'Housing',
      is_income: false,
      display_order: 1,
    },
    {
      budget_id: budgetId,
      name: 'Transportation',
      is_income: false,
      display_order: 2,
    },
    {
      budget_id: budgetId,
      name: 'Food',
      is_income: false,
      display_order: 3,
    },
  ]);
  
  console.log('Created categories:', newCategories);

  // Bulk update - mark multiple transactions as cleared
  const clearedTransactions = await client.transactions
    .in('id', ['trans-1', 'trans-2', 'trans-3'])
    .patch({ is_cleared: true });
  
  console.log('Cleared transactions:', clearedTransactions);
}

// Run examples (you would uncomment these in a real app)
// basicCrudExamples();
// advancedQueryExamples();
// filteringAndPaginationExamples();
// errorHandlingExample();
// bulkOperationsExample();