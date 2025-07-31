/**
 * Test fixtures for NVLP API entities
 * Provides sample data for testing purposes
 */

import { 
  Budget, 
  Category, 
  Envelope, 
  IncomeSource, 
  Payee, 
  Transaction, 
  TransactionType,
  CategoryType 
} from '@nvlp/types';

/**
 * Sample user data
 */
export const sampleUsers = {
  testUser: {
    id: 'user-123',
    email: 'test@example.com',
    display_name: 'Test User',
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  
  alternateUser: {
    id: 'user-456',
    email: 'alternate@example.com',
    display_name: 'Alternate User',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
};

/**
 * Sample budget data
 */
export const sampleBudgets: Budget[] = [
  {
    id: 'budget-123',
    user_id: 'user-123',
    name: 'Monthly Budget',
    description: 'My monthly budget for 2024',
    currency: 'USD',
    available_amount: 1500.00,
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'budget-456',
    user_id: 'user-123',
    name: 'Vacation Fund',
    description: 'Saving for summer vacation',
    currency: 'USD',
    available_amount: 2500.00,
    is_default: false,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
];

/**
 * Sample category data
 */
export const sampleCategories: Category[] = [
  {
    id: 'category-income',
    budget_id: 'budget-123',
    name: 'Income',
    type: CategoryType.INCOME,
    parent_category_id: null,
    sort_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'category-salary',
    budget_id: 'budget-123',
    name: 'Salary',
    type: CategoryType.INCOME,
    parent_category_id: 'category-income',
    sort_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'category-expenses',
    budget_id: 'budget-123',
    name: 'Living Expenses',
    type: CategoryType.EXPENSE,
    parent_category_id: null,
    sort_order: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'category-groceries',
    budget_id: 'budget-123',
    name: 'Groceries',
    type: CategoryType.EXPENSE,
    parent_category_id: 'category-expenses',
    sort_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'category-utilities',
    budget_id: 'budget-123',
    name: 'Utilities',
    type: CategoryType.EXPENSE,
    parent_category_id: 'category-expenses',
    sort_order: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

/**
 * Sample income source data
 */
export const sampleIncomeSources: IncomeSource[] = [
  {
    id: 'income-salary',
    budget_id: 'budget-123',
    category_id: 'category-salary',
    name: 'Monthly Salary',
    expected_amount: 5000.00,
    frequency: 'monthly',
    next_expected_date: '2024-02-01',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'income-freelance',
    budget_id: 'budget-123',
    category_id: 'category-salary',
    name: 'Freelance Work',
    expected_amount: 1000.00,
    frequency: 'monthly',
    next_expected_date: '2024-02-15',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

/**
 * Sample payee data
 */
export const samplePayees: Payee[] = [
  {
    id: 'payee-grocery-store',
    budget_id: 'budget-123',
    name: 'Grocery Store',
    default_category_id: 'category-groceries',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'payee-electric-company',
    budget_id: 'budget-123',
    name: 'Electric Company',
    default_category_id: 'category-utilities',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'payee-gas-station',
    budget_id: 'budget-123',
    name: 'Gas Station',
    default_category_id: 'category-expenses',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

/**
 * Sample envelope data
 */
export const sampleEnvelopes: Envelope[] = [
  {
    id: 'envelope-groceries',
    budget_id: 'budget-123',
    category_id: 'category-groceries',
    name: 'Groceries',
    target_amount: 600.00,
    current_balance: 450.00,
    last_filled_date: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
  },
  {
    id: 'envelope-utilities',
    budget_id: 'budget-123',
    category_id: 'category-utilities',
    name: 'Utilities',
    target_amount: 200.00,
    current_balance: 200.00,
    last_filled_date: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'envelope-emergency',
    budget_id: 'budget-123',
    category_id: 'category-expenses',
    name: 'Emergency Fund',
    target_amount: 1000.00,
    current_balance: 100.00,
    last_filled_date: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
];

/**
 * Sample transaction data
 */
export const sampleTransactions: Transaction[] = [
  {
    id: 'tx-income-salary',
    budget_id: 'budget-123',
    type: TransactionType.INCOME,
    amount: 5000.00,
    description: 'January Salary',
    date: '2024-01-01',
    income_source_id: 'income-salary',
    category_id: 'category-salary',
    from_envelope_id: null,
    to_envelope_id: null,
    payee_id: null,
    is_cleared: true,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 'tx-allocation-groceries',
    budget_id: 'budget-123',
    type: TransactionType.ALLOCATION,
    amount: 600.00,
    description: 'Allocate to groceries',
    date: '2024-01-01',
    income_source_id: null,
    category_id: 'category-groceries',
    from_envelope_id: null,
    to_envelope_id: 'envelope-groceries',
    payee_id: null,
    is_cleared: true,
    created_at: '2024-01-01T11:00:00Z',
    updated_at: '2024-01-01T11:00:00Z',
  },
  {
    id: 'tx-expense-groceries',
    budget_id: 'budget-123',
    type: TransactionType.EXPENSE,
    amount: 150.00,
    description: 'Weekly grocery shopping',
    date: '2024-01-08',
    income_source_id: null,
    category_id: 'category-groceries',
    from_envelope_id: 'envelope-groceries',
    to_envelope_id: null,
    payee_id: 'payee-grocery-store',
    is_cleared: true,
    created_at: '2024-01-08T14:30:00Z',
    updated_at: '2024-01-08T14:30:00Z',
  },
  {
    id: 'tx-transfer',
    budget_id: 'budget-123',
    type: TransactionType.TRANSFER,
    amount: 50.00,
    description: 'Transfer to emergency fund',
    date: '2024-01-15',
    income_source_id: null,
    category_id: null,
    from_envelope_id: 'envelope-groceries',
    to_envelope_id: 'envelope-emergency',
    payee_id: null,
    is_cleared: false,
    created_at: '2024-01-15T16:45:00Z',
    updated_at: '2024-01-15T16:45:00Z',
  },
];

/**
 * Helper function to create a complete test dataset
 */
export function createTestDataset() {
  return {
    users: sampleUsers,
    budgets: sampleBudgets,
    categories: sampleCategories,
    incomeSources: sampleIncomeSources,
    payees: samplePayees,
    envelopes: sampleEnvelopes,
    transactions: sampleTransactions,
  };
}

/**
 * Helper function to get related data
 */
export function getRelatedData(budgetId: string) {
  return {
    budget: sampleBudgets.find(b => b.id === budgetId),
    categories: sampleCategories.filter(c => c.budget_id === budgetId),
    incomeSources: sampleIncomeSources.filter(i => i.budget_id === budgetId),
    payees: samplePayees.filter(p => p.budget_id === budgetId),
    envelopes: sampleEnvelopes.filter(e => e.budget_id === budgetId),
    transactions: sampleTransactions.filter(t => t.budget_id === budgetId),
  };
}

/**
 * Helper function to create minimal fixtures for testing
 */
export function createMinimalFixtures() {
  return {
    user: sampleUsers.testUser,
    budget: sampleBudgets[0],
    category: sampleCategories[0],
    incomeSource: sampleIncomeSources[0],
    payee: samplePayees[0],
    envelope: sampleEnvelopes[0],
    transaction: sampleTransactions[0],
  };
}