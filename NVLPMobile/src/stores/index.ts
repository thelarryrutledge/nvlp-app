// Central export for all Zustand stores
export { useAuthStore, authSelectors } from './authStore';
export { useUserStore, userSelectors, userComputedSelectors } from './userStore';

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