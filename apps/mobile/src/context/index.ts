// Export all context providers and hooks
// This allows for cleaner imports: import { AuthProvider, useAuth } from '@/context'

// Authentication context
export { AuthProvider, useAuth, useAuthState, withAuth } from './AuthContext';
export type { AuthState, AuthContextType } from './AuthContext';

// Budget context
export { BudgetProvider, useBudget, useBudgetState, withBudget } from './BudgetContext';
export type { BudgetState, BudgetContextType } from './BudgetContext';
