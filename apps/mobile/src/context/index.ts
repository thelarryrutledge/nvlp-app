// Export all context providers and hooks
// This allows for cleaner imports: import { AuthProvider, useAuth } from '@/context'

// Authentication context
export { AuthProvider, useAuth, useAuthState, withAuth } from './AuthContext';
export type { AuthState, AuthContextType } from './AuthContext';

// Context providers will be added here as they're created
// Examples:
// export { ThemeProvider, useTheme } from './ThemeContext';
// export { BudgetProvider, useBudget } from './BudgetContext';
