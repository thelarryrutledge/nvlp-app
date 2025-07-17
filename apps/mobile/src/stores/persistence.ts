import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';

// Custom storage adapter for Zustand with error handling
export const zustandStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(name);
      return value;
    } catch (error) {
      console.error(`Error reading ${name} from AsyncStorage:`, error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch (error) {
      console.error(`Error writing ${name} to AsyncStorage:`, error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      console.error(`Error removing ${name} from AsyncStorage:`, error);
    }
  },
};

// Storage keys for all stores
export const STORAGE_KEYS = {
  AUTH: 'nvlp-auth-storage',
  USER: 'nvlp-user-storage',
  BUDGET: 'nvlp-budget-storage',
  CACHE: 'nvlp-cache-storage',
} as const;

// Type for migration functions
export type Migration = {
  version: number;
  migrate: (persistedState: any) => any;
};

// Version management for persisted state
export const STORAGE_VERSIONS = {
  AUTH: 1,
  USER: 1,
  BUDGET: 1,
  CACHE: 1,
} as const;

// Clear all persisted data (useful for logout or reset)
export const clearAllPersistedData = async (): Promise<void> => {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
    console.log('All persisted data cleared successfully');
  } catch (error) {
    console.error('Error clearing persisted data:', error);
    throw error;
  }
};

// Clear specific store data
export const clearStoreData = async (storeName: keyof typeof STORAGE_KEYS): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS[storeName]);
    console.log(`${storeName} store data cleared successfully`);
  } catch (error) {
    console.error(`Error clearing ${storeName} store data:`, error);
    throw error;
  }
};

// Get all persisted store keys
export const getAllPersistedKeys = async (): Promise<string[]> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    return allKeys.filter(key => Object.values(STORAGE_KEYS).includes(key as any));
  } catch (error) {
    console.error('Error getting persisted keys:', error);
    return [];
  }
};

// Get size of persisted data
export const getPersistedDataSize = async (): Promise<{ [key: string]: number }> => {
  try {
    const sizes: { [key: string]: number } = {};
    
    for (const [name, key] of Object.entries(STORAGE_KEYS)) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        sizes[name] = new Blob([value]).size;
      }
    }
    
    return sizes;
  } catch (error) {
    console.error('Error calculating persisted data size:', error);
    return {};
  }
};

// Export persisted data (for backup)
export const exportPersistedData = async (): Promise<{ [key: string]: any }> => {
  try {
    const exportData: { [key: string]: any } = {};
    
    for (const [name, key] of Object.entries(STORAGE_KEYS)) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        try {
          exportData[name] = JSON.parse(value);
        } catch {
          exportData[name] = value;
        }
      }
    }
    
    return exportData;
  } catch (error) {
    console.error('Error exporting persisted data:', error);
    throw error;
  }
};

// Import persisted data (for restore)
export const importPersistedData = async (data: { [key: string]: any }): Promise<void> => {
  try {
    const importTasks: Promise<void>[] = [];
    
    for (const [name, value] of Object.entries(data)) {
      const storageKey = STORAGE_KEYS[name as keyof typeof STORAGE_KEYS];
      if (storageKey) {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        importTasks.push(AsyncStorage.setItem(storageKey, stringValue));
      }
    }
    
    await Promise.all(importTasks);
    console.log('Persisted data imported successfully');
  } catch (error) {
    console.error('Error importing persisted data:', error);
    throw error;
  }
};

// Persistence middleware configuration factory
export const createPersistConfig = (name: keyof typeof STORAGE_KEYS) => ({
  name: STORAGE_KEYS[name],
  storage: zustandStorage,
  version: STORAGE_VERSIONS[name],
});

// Debug function to inspect persisted state
export const debugPersistedState = async (): Promise<void> => {
  if (__DEV__) {
    try {
      console.log('=== Persisted State Debug ===');
      
      for (const [name, key] of Object.entries(STORAGE_KEYS)) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            console.log(`${name}:`, parsed);
          } catch {
            console.log(`${name}: [Invalid JSON]`);
          }
        } else {
          console.log(`${name}: [No data]`);
        }
      }
      
      const sizes = await getPersistedDataSize();
      console.log('Data sizes (bytes):', sizes);
      console.log('===========================');
    } catch (error) {
      console.error('Error debugging persisted state:', error);
    }
  }
};

// Offline data management utilities
export interface OfflineDataConfig {
  maxPendingActions: number;
  maxCacheAge: number; // in milliseconds
  syncInterval: number; // in milliseconds
}

export const DEFAULT_OFFLINE_CONFIG: OfflineDataConfig = {
  maxPendingActions: 100,
  maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  syncInterval: 5 * 60 * 1000, // 5 minutes
};

// Clean up old pending actions
export const cleanupOldPendingActions = async (maxAge: number = DEFAULT_OFFLINE_CONFIG.maxCacheAge): Promise<void> => {
  try {
    const cacheData = await AsyncStorage.getItem(STORAGE_KEYS.CACHE);
    if (!cacheData) return;

    const parsed = JSON.parse(cacheData);
    const now = Date.now();
    
    if (parsed.state?.pendingActions) {
      parsed.state.pendingActions = parsed.state.pendingActions.filter((action: any) => {
        const actionTime = new Date(action.timestamp).getTime();
        return now - actionTime < maxAge;
      });
      
      await AsyncStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(parsed));
      console.log('Old pending actions cleaned up');
    }
  } catch (error) {
    console.error('Error cleaning up pending actions:', error);
  }
};

// Monitor storage usage
export const monitorStorageUsage = async (): Promise<{
  used: number;
  available: number;
  percentage: number;
}> => {
  try {
    // This is a simplified implementation
    // In a real app, you might want to use a native module for accurate storage info
    const sizes = await getPersistedDataSize();
    const totalUsed = Object.values(sizes).reduce((sum, size) => sum + size, 0);
    
    // Assume 10MB limit for app storage (configurable)
    const storageLimit = 10 * 1024 * 1024; // 10MB in bytes
    
    return {
      used: totalUsed,
      available: storageLimit - totalUsed,
      percentage: (totalUsed / storageLimit) * 100,
    };
  } catch (error) {
    console.error('Error monitoring storage usage:', error);
    return { used: 0, available: 0, percentage: 0 };
  }
};