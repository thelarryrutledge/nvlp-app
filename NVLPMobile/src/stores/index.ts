// Central export for all Zustand stores
export { useAuthStore, authSelectors } from './authStore';
export { useUserStore, userSelectors, userComputedSelectors } from './userStore';
export { useBudgetStore, budgetSelectors, budgetComputedSelectors } from './budgetStore';
export { 
  useCacheStore, 
  cacheSelectors, 
  cacheComputedSelectors,
  initializeNetworkMonitoring 
} from './cacheStore';

// Persistence utilities
export {
  initializePersistence,
  cleanupPersistence,
  rehydrateStores,
  handleAppStateChange,
  getPersistenceStatus,
} from './initializePersistence';

export {
  clearAllPersistedData,
  clearStoreData,
  exportPersistedData,
  importPersistedData,
  debugPersistedState,
  monitorStorageUsage,
} from './persistence';

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