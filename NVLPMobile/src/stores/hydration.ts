import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { 
  initializePersistence, 
  cleanupPersistence, 
  handleAppStateChange,
  rehydrateStores,
  debugPersistedState,
} from './initializePersistence';
import { useAuthStore } from './authStore';
import { useUserStore } from './userStore';
import { useBudgetStore } from './budgetStore';
import { useCacheStore } from './cacheStore';

// Hydration state tracking
interface HydrationState {
  isHydrated: boolean;
  isHydrating: boolean;
  error: Error | null;
  startTime: number | null;
  endTime: number | null;
}

let hydrationState: HydrationState = {
  isHydrated: false,
  isHydrating: false,
  error: null,
  startTime: null,
  endTime: null,
};

// Get hydration status
export const getHydrationStatus = () => ({ ...hydrationState });

// Main hydration function
export const hydrateApp = async (): Promise<void> => {
  if (hydrationState.isHydrated) {
    console.warn('App is already hydrated');
    return;
  }

  if (hydrationState.isHydrating) {
    console.warn('Hydration already in progress');
    return;
  }

  hydrationState.isHydrating = true;
  hydrationState.startTime = Date.now();
  hydrationState.error = null;

  try {
    console.log('Starting app hydration...');

    // 1. Initialize persistence layer
    await initializePersistence();

    // 2. Re-hydrate all stores
    await rehydrateStores();

    // 3. Set up app state change listener
    AppState.addEventListener('change', handleAppStateChange);

    // 4. Check authentication status and refresh if needed
    await checkAuthenticationStatus();

    // 5. Load initial data if authenticated
    await loadInitialData();

    // 6. Set up network state recovery
    setupNetworkRecovery();

    hydrationState.isHydrated = true;
    hydrationState.isHydrating = false;
    hydrationState.endTime = Date.now();

    const duration = hydrationState.endTime - hydrationState.startTime;
    console.log(`App hydration completed in ${duration}ms`);

    // Debug hydration results in development
    if (__DEV__) {
      await debugHydrationResults();
    }
  } catch (error) {
    hydrationState.error = error as Error;
    hydrationState.isHydrating = false;
    console.error('App hydration failed:', error);
    throw error;
  }
};

// Check and refresh authentication if needed
async function checkAuthenticationStatus(): Promise<void> {
  const authStore = useAuthStore.getState();
  
  if (authStore.isAuthenticated && authStore.refreshToken) {
    console.log('Checking authentication status...');
    
    try {
      // Try to refresh the token to ensure it's still valid
      await authStore.refreshAuth();
      console.log('Authentication refreshed successfully');
    } catch (error) {
      console.error('Authentication refresh failed:', error);
      // If refresh fails, the refreshAuth method will handle logout
    }
  }
}

// Load initial data for authenticated users
async function loadInitialData(): Promise<void> {
  const authStore = useAuthStore.getState();
  
  if (!authStore.isAuthenticated) {
    console.log('User not authenticated, skipping initial data load');
    return;
  }

  console.log('Loading initial data...');

  try {
    // Load data in parallel for better performance
    await Promise.all([
      loadUserProfile(),
      loadBudgets(),
      syncPendingActions(),
    ]);

    console.log('Initial data loaded successfully');
  } catch (error) {
    console.error('Error loading initial data:', error);
    // Don't throw - app should still work with cached data
  }
}

// Load user profile
async function loadUserProfile(): Promise<void> {
  const userStore = useUserStore.getState();
  
  if (!userStore.profile) {
    try {
      await userStore.loadProfile();
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }
}

// Load budgets
async function loadBudgets(): Promise<void> {
  const budgetStore = useBudgetStore.getState();
  
  if (budgetStore.budgets.length === 0) {
    try {
      await budgetStore.loadBudgets();
    } catch (error) {
      console.error('Failed to load budgets:', error);
    }
  }
}

// Sync any pending offline actions
async function syncPendingActions(): Promise<void> {
  const cacheStore = useCacheStore.getState();
  
  if (cacheStore.isOnline && cacheStore.pendingActions.length > 0) {
    console.log(`Syncing ${cacheStore.pendingActions.length} pending actions...`);
    try {
      await cacheStore.syncPendingActions();
    } catch (error) {
      console.error('Failed to sync pending actions:', error);
    }
  }
}

// Set up network recovery handling
function setupNetworkRecovery(): void {
  NetInfo.addEventListener(state => {
    const cacheStore = useCacheStore.getState();
    const wasOffline = !cacheStore.isOnline;
    const isNowOnline = state.isConnected ?? false;

    if (wasOffline && isNowOnline) {
      console.log('Network connection restored, attempting recovery...');
      
      // Attempt to recover from offline state
      setTimeout(async () => {
        try {
          // Re-check authentication
          await checkAuthenticationStatus();
          
          // Reload fresh data
          await loadInitialData();
          
          console.log('Network recovery completed');
        } catch (error) {
          console.error('Network recovery failed:', error);
        }
      }, 2000); // Wait 2 seconds for connection to stabilize
    }
  });
}

// Debug hydration results
async function debugHydrationResults(): Promise<void> {
  console.log('=== Hydration Debug Info ===');
  
  const authStore = useAuthStore.getState();
  const userStore = useUserStore.getState();
  const budgetStore = useBudgetStore.getState();
  const cacheStore = useCacheStore.getState();

  console.log('Auth State:', {
    isAuthenticated: authStore.isAuthenticated,
    hasToken: !!authStore.token,
    hasRefreshToken: !!authStore.refreshToken,
    user: authStore.user?.email,
  });

  console.log('User State:', {
    hasProfile: !!userStore.profile,
    preferences: userStore.preferences,
  });

  console.log('Budget State:', {
    budgetCount: budgetStore.budgets.length,
    activeBudget: budgetStore.activeBudget?.name,
  });

  console.log('Cache State:', {
    isOnline: cacheStore.isOnline,
    pendingActions: cacheStore.pendingActions.length,
    lastSync: cacheStore.lastSync,
  });

  console.log('Hydration Time:', {
    duration: hydrationState.endTime! - hydrationState.startTime!,
    startTime: new Date(hydrationState.startTime!).toISOString(),
    endTime: new Date(hydrationState.endTime!).toISOString(),
  });

  await debugPersistedState();
  console.log('===========================');
}

// Clean up hydration (for app termination)
export const cleanupHydration = (): void => {
  console.log('Cleaning up hydration...');
  
  // Clean up persistence
  cleanupPersistence();
  
  // Reset hydration state
  hydrationState = {
    isHydrated: false,
    isHydrating: false,
    error: null,
    startTime: null,
    endTime: null,
  };
  
  console.log('Hydration cleanup completed');
};

// Force re-hydration (useful for debugging or error recovery)
export const forceRehydrate = async (): Promise<void> => {
  console.log('Forcing re-hydration...');
  
  // Clean up first
  cleanupHydration();
  
  // Re-hydrate
  await hydrateApp();
};

// Selective store hydration (for testing)
export const hydrateStore = async (storeName: 'auth' | 'user' | 'budget' | 'cache'): Promise<void> => {
  console.log(`Hydrating ${storeName} store...`);
  
  switch (storeName) {
    case 'auth':
      await import('./authStore');
      break;
    case 'user':
      await import('./userStore');
      break;
    case 'budget':
      await import('./budgetStore');
      break;
    case 'cache':
      await import('./cacheStore');
      break;
  }
  
  // Wait for hydration
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`${storeName} store hydrated`);
};