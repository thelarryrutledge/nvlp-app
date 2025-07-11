import { initializeNetworkMonitoring } from './cacheStore';
import { 
  cleanupOldPendingActions, 
  debugPersistedState,
  monitorStorageUsage,
  DEFAULT_OFFLINE_CONFIG 
} from './persistence';

let isInitialized = false;
let networkUnsubscribe: (() => void) | null = null;
let syncInterval: NodeJS.Timeout | null = null;

// Initialize all persistence-related features
export const initializePersistence = async (): Promise<void> => {
  if (isInitialized) {
    console.warn('Persistence already initialized');
    return;
  }

  try {
    console.log('Initializing persistence layer...');

    // 1. Initialize network monitoring
    networkUnsubscribe = initializeNetworkMonitoring();

    // 2. Clean up old pending actions on startup
    await cleanupOldPendingActions();

    // 3. Monitor storage usage
    const storageInfo = await monitorStorageUsage();
    console.log('Storage usage:', {
      used: `${(storageInfo.used / 1024).toFixed(2)} KB`,
      available: `${(storageInfo.available / 1024).toFixed(2)} KB`,
      percentage: `${storageInfo.percentage.toFixed(2)}%`,
    });

    // 4. Set up periodic sync for pending actions
    const { useCacheStore } = await import('./cacheStore');
    syncInterval = setInterval(() => {
      const state = useCacheStore.getState();
      if (state.isOnline && state.pendingActions.length > 0 && !state.syncInProgress) {
        console.log('Periodic sync triggered');
        state.syncPendingActions();
      }
    }, DEFAULT_OFFLINE_CONFIG.syncInterval);

    // 5. Set up periodic cleanup
    setInterval(() => {
      cleanupOldPendingActions();
    }, 24 * 60 * 60 * 1000); // Daily cleanup

    // 6. Debug persisted state in development
    if (__DEV__) {
      await debugPersistedState();
    }

    isInitialized = true;
    console.log('Persistence layer initialized successfully');
  } catch (error) {
    console.error('Error initializing persistence:', error);
    throw error;
  }
};

// Cleanup function for app termination
export const cleanupPersistence = (): void => {
  if (networkUnsubscribe) {
    networkUnsubscribe();
    networkUnsubscribe = null;
  }

  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }

  isInitialized = false;
  console.log('Persistence layer cleaned up');
};

// Re-hydrate all stores
export const rehydrateStores = async (): Promise<void> => {
  try {
    console.log('Re-hydrating stores...');

    // Import stores to trigger re-hydration
    const stores = await Promise.all([
      import('./authStore'),
      import('./userStore'),
      import('./budgetStore'),
      import('./cacheStore'),
    ]);

    // Wait a bit for stores to re-hydrate from AsyncStorage
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('Stores re-hydrated successfully');
  } catch (error) {
    console.error('Error re-hydrating stores:', error);
    throw error;
  }
};

// Handle app state changes (background/foreground)
export const handleAppStateChange = async (nextAppState: string): Promise<void> => {
  if (nextAppState === 'active') {
    console.log('App became active, checking for sync...');
    
    const { useCacheStore } = await import('./cacheStore');
    const state = useCacheStore.getState();
    
    // Update network status
    const { default: NetInfo } = await import('@react-native-community/netinfo');
    const networkState = await NetInfo.fetch();
    state.setOnlineStatus(networkState.isConnected ?? false);
    
    // Sync if needed
    if (state.isOnline && state.pendingActions.length > 0 && !state.syncInProgress) {
      console.log('Syncing pending actions after app became active');
      state.syncPendingActions();
    }
  }
};

// Export persistence status
export const getPersistenceStatus = () => ({
  isInitialized,
  hasNetworkMonitoring: networkUnsubscribe !== null,
  hasSyncInterval: syncInterval !== null,
});