// Central export for all Zustand stores
export { useAuthStore, authSelectors } from './authStore';

// Re-export store types for convenience
export type {
  AuthStore,
  UserStore,
  BudgetStore,
  CacheStore,
  User,
  Budget,
  AuthState,
  UserState,
  BudgetState,
  CacheState,
} from '@/types/store';