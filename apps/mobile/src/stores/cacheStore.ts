import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheStore } from '@/types/store';
import NetInfo from '@react-native-community/netinfo';

// Generate unique ID for pending actions
const generateActionId = () => `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Initial state
const initialState = {
  lastSync: null,
  pendingActions: [],
  isOnline: true,
  syncInProgress: false,
};

// Create the cache store with persistence
export const useCacheStore = create<CacheStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Pending actions management
      addPendingAction: (action: string, data: any) => {
        const newAction = {
          id: generateActionId(),
          action,
          data,
          timestamp: new Date().toISOString(),
        };

        set(state => ({
          pendingActions: [...state.pendingActions, newAction],
        }));

        // Try to sync immediately if online
        const { isOnline, syncInProgress } = get();
        if (isOnline && !syncInProgress) {
          get().syncPendingActions();
        }
      },

      removePendingAction: (id: string) => {
        set(state => ({
          pendingActions: state.pendingActions.filter(action => action.id !== id),
        }));
      },

      clearPendingActions: () => {
        set({ pendingActions: [] });
      },

      // Online status management
      setOnlineStatus: (isOnline: boolean) => {
        const wasOffline = !get().isOnline;
        set({ isOnline });

        // If we just came back online and have pending actions, try to sync
        if (isOnline && wasOffline && get().pendingActions.length > 0) {
          get().syncPendingActions();
        }
      },

      setSyncStatus: (syncing: boolean) => {
        set({ syncInProgress: syncing });
      },

      updateLastSync: () => {
        set({ lastSync: new Date().toISOString() });
      },

      // Sync pending actions when online
      syncPendingActions: async () => {
        const { pendingActions, isOnline, syncInProgress } = get();
        
        if (!isOnline || syncInProgress || pendingActions.length === 0) {
          return;
        }

        set({ syncInProgress: true });

        try {
          // Process actions in chronological order
          const sortedActions = [...pendingActions].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          for (const action of sortedActions) {
            try {
              await processOfflineAction(action);
              get().removePendingAction(action.id);
            } catch (error) {
              console.error(`Failed to sync action ${action.id}:`, error);
              // Keep the action in queue for next sync attempt
              break; // Stop processing if one fails to maintain order
            }
          }

          get().updateLastSync();
        } catch (error) {
          console.error('Sync process failed:', error);
        } finally {
          set({ syncInProgress: false });
        }
      },
    }),
    {
      name: 'nvlp-cache-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist all cache data
      partialize: (state) => ({
        lastSync: state.lastSync,
        pendingActions: state.pendingActions,
      }),
    }
  )
);

// Process individual offline actions
async function processOfflineAction(action: any) {
  const { action: actionType, data } = action;

  // Import auth store to get token (dynamic import to avoid circular dependency)
  const { useAuthStore } = await import('./authStore');
  const token = useAuthStore.getState().token;

  if (!token) {
    throw new Error('No authentication token available for sync');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'apikey': process.env.SUPABASE_ANON_KEY || '',
    'Content-Type': 'application/json',
  };

  switch (actionType) {
    case 'CREATE_TRANSACTION':
      await fetch('https://db-api.nvlp.app/transactions', {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(data),
      });
      break;

    case 'UPDATE_TRANSACTION':
      await fetch(`https://db-api.nvlp.app/transactions?id=eq.${data.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(data.updates),
      });
      break;

    case 'DELETE_TRANSACTION':
      await fetch(`https://db-api.nvlp.app/transactions?id=eq.${data.id}`, {
        method: 'DELETE',
        headers,
      });
      break;

    case 'CREATE_ENVELOPE':
      await fetch('https://db-api.nvlp.app/envelopes', {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(data),
      });
      break;

    case 'UPDATE_ENVELOPE':
      await fetch(`https://db-api.nvlp.app/envelopes?id=eq.${data.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(data.updates),
      });
      break;

    case 'UPDATE_PROFILE':
      await fetch('https://edge-api.nvlp.app/profile', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      });
      break;

    default:
      console.warn(`Unknown offline action type: ${actionType}`);
  }
}

// Initialize network status monitoring
let isNetworkInitialized = false;

export const initializeNetworkMonitoring = () => {
  if (isNetworkInitialized) return;
  
  isNetworkInitialized = true;
  
  // Subscribe to network state changes
  const unsubscribe = NetInfo.addEventListener(state => {
    useCacheStore.getState().setOnlineStatus(state.isConnected ?? false);
  });

  // Get initial network state
  NetInfo.fetch().then(state => {
    useCacheStore.getState().setOnlineStatus(state.isConnected ?? false);
  });

  return unsubscribe;
};

// Selectors for common use cases
export const cacheSelectors = {
  isOnline: () => useCacheStore((state) => state.isOnline),
  isOffline: () => useCacheStore((state) => !state.isOnline),
  pendingActions: () => useCacheStore((state) => state.pendingActions),
  pendingActionsCount: () => useCacheStore((state) => state.pendingActions.length),
  hasPendingActions: () => useCacheStore((state) => state.pendingActions.length > 0),
  lastSync: () => useCacheStore((state) => state.lastSync),
  syncInProgress: () => useCacheStore((state) => state.syncInProgress),
};

// Computed selectors
export const cacheComputedSelectors = {
  needsSync: () => useCacheStore((state) => 
    state.isOnline && state.pendingActions.length > 0 && !state.syncInProgress
  ),
  
  lastSyncFormatted: () => useCacheStore((state) => {
    if (!state.lastSync) return 'Never';
    
    const lastSyncDate = new Date(state.lastSync);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSyncDate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return `${Math.floor(diffMinutes / 1440)} days ago`;
  }),

  pendingActionsByType: () => useCacheStore((state) => {
    const actionCounts: Record<string, number> = {};
    state.pendingActions.forEach(action => {
      actionCounts[action.action] = (actionCounts[action.action] || 0) + 1;
    });
    return actionCounts;
  }),
};