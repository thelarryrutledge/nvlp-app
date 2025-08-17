import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local Storage Service
 * 
 * Provides general data persistence for non-sensitive data like user preferences,
 * cache, settings, and temporary data using AsyncStorage.
 * 
 * Note: This is for NON-SENSITIVE data only. For secure data (tokens, PINs),
 * use SecureStorageService with react-native-keychain.
 */

// Storage keys for different types of data
const STORAGE_KEYS = {
  USER_PREFERENCES: '@nvlp:user_preferences',
  APP_SETTINGS: '@nvlp:app_settings',
  CACHE_DATA: '@nvlp:cache_data',
  ONBOARDING: '@nvlp:onboarding',
  BUDGET_CACHE: '@nvlp:budget_cache',
  TRANSACTION_CACHE: '@nvlp:transaction_cache',
  ENVELOPE_CACHE: '@nvlp:envelope_cache',
  LAST_SYNC: '@nvlp:last_sync',
  OFFLINE_QUEUE: '@nvlp:offline_queue',
} as const;

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  language: string;
  notifications: {
    enabled: boolean;
    budgetAlerts: boolean;
    transactionReminders: boolean;
    monthlyReports: boolean;
  };
  privacy: {
    analytics: boolean;
    crashReporting: boolean;
  };
}

export interface AppSettings {
  autoLockEnabled: boolean;
  autoLockTimeout: number; // minutes
  biometricEnabled: boolean;
  pinRequired: boolean;
  offlineMode: boolean;
  syncFrequency: 'real-time' | 'hourly' | 'daily';
  dataRetention: number; // days
}

export interface OnboardingState {
  completed: boolean;
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  firstLaunch: boolean;
}

export interface CacheMetadata {
  timestamp: number;
  version: string;
  ttl?: number; // time to live in milliseconds
}

export interface CachedData<T = any> {
  data: T;
  metadata: CacheMetadata;
}

/**
 * Local Storage Service
 */
export class LocalStorageService {
  /**
   * Store user preferences
   */
  static async setUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      const data = JSON.stringify(preferences);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, data);
    } catch (error) {
      console.error('Failed to store user preferences:', error);
      throw new Error('Failed to save user preferences');
    }
  }

  /**
   * Retrieve user preferences
   */
  static async getUserPreferences(): Promise<UserPreferences | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to retrieve user preferences:', error);
      return null;
    }
  }

  /**
   * Store app settings
   */
  static async setAppSettings(settings: AppSettings): Promise<void> {
    try {
      const data = JSON.stringify(settings);
      await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, data);
    } catch (error) {
      console.error('Failed to store app settings:', error);
      throw new Error('Failed to save app settings');
    }
  }

  /**
   * Retrieve app settings
   */
  static async getAppSettings(): Promise<AppSettings | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to retrieve app settings:', error);
      return null;
    }
  }

  /**
   * Store onboarding state
   */
  static async setOnboardingState(state: OnboardingState): Promise<void> {
    try {
      const data = JSON.stringify(state);
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING, data);
    } catch (error) {
      console.error('Failed to store onboarding state:', error);
      throw new Error('Failed to save onboarding state');
    }
  }

  /**
   * Retrieve onboarding state
   */
  static async getOnboardingState(): Promise<OnboardingState | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to retrieve onboarding state:', error);
      return null;
    }
  }

  /**
   * Store cached data with metadata
   */
  static async setCachedData<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const cachedData: CachedData<T> = {
        data,
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0',
          ttl,
        },
      };
      const serialized = JSON.stringify(cachedData);
      await AsyncStorage.setItem(`${STORAGE_KEYS.CACHE_DATA}:${key}`, serialized);
    } catch (error) {
      console.error(`Failed to store cached data for key ${key}:`, error);
      throw new Error(`Failed to cache data for ${key}`);
    }
  }

  /**
   * Retrieve cached data with expiration check
   */
  static async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(`${STORAGE_KEYS.CACHE_DATA}:${key}`);
      if (!data) return null;

      const cachedData: CachedData<T> = JSON.parse(data);
      
      // Check if data has expired
      if (cachedData.metadata.ttl) {
        const age = Date.now() - cachedData.metadata.timestamp;
        if (age > cachedData.metadata.ttl) {
          await this.removeCachedData(key);
          return null;
        }
      }

      return cachedData.data;
    } catch (error) {
      console.error(`Failed to retrieve cached data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove cached data
   */
  static async removeCachedData(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${STORAGE_KEYS.CACHE_DATA}:${key}`);
    } catch (error) {
      console.error(`Failed to remove cached data for key ${key}:`, error);
    }
  }

  /**
   * Store last sync timestamp
   */
  static async setLastSync(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp.toString());
    } catch (error) {
      console.error('Failed to store last sync timestamp:', error);
    }
  }

  /**
   * Retrieve last sync timestamp
   */
  static async getLastSync(): Promise<number | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return data ? parseInt(data, 10) : null;
    } catch (error) {
      console.error('Failed to retrieve last sync timestamp:', error);
      return null;
    }
  }

  /**
   * Store offline queue for background sync
   */
  static async setOfflineQueue(queue: any[]): Promise<void> {
    try {
      const data = JSON.stringify(queue);
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, data);
    } catch (error) {
      console.error('Failed to store offline queue:', error);
      throw new Error('Failed to save offline queue');
    }
  }

  /**
   * Retrieve offline queue
   */
  static async getOfflineQueue(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to retrieve offline queue:', error);
      return [];
    }
  }

  /**
   * Add item to offline queue
   */
  static async addToOfflineQueue(item: any): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      queue.push({
        ...item,
        timestamp: Date.now(),
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
      await this.setOfflineQueue(queue);
    } catch (error) {
      console.error('Failed to add item to offline queue:', error);
      throw new Error('Failed to queue offline operation');
    }
  }

  /**
   * Remove item from offline queue
   */
  static async removeFromOfflineQueue(itemId: string): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const filteredQueue = queue.filter(item => item.id !== itemId);
      await this.setOfflineQueue(filteredQueue);
    } catch (error) {
      console.error('Failed to remove item from offline queue:', error);
    }
  }

  /**
   * Clear specific cache type
   */
  static async clearCache(cacheType?: 'budget' | 'transaction' | 'envelope' | 'all'): Promise<void> {
    try {
      if (!cacheType || cacheType === 'all') {
        // Clear all cache entries
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.CACHE_DATA));
        await AsyncStorage.multiRemove(cacheKeys);
      } else {
        // Clear specific cache type
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => 
          key.startsWith(`${STORAGE_KEYS.CACHE_DATA}:${cacheType}`)
        );
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(): Promise<{
    totalKeys: number;
    cacheKeys: number;
    settingsKeys: number;
    dataSize: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.CACHE_DATA));
      const settingsKeys = keys.filter(key => 
        key.startsWith(STORAGE_KEYS.USER_PREFERENCES) ||
        key.startsWith(STORAGE_KEYS.APP_SETTINGS)
      );

      // Estimate data size (rough approximation)
      const allData = await AsyncStorage.multiGet(keys);
      const dataSize = allData.reduce((total, [, value]) => {
        return total + (value ? value.length : 0);
      }, 0);

      return {
        totalKeys: keys.length,
        cacheKeys: cacheKeys.length,
        settingsKeys: settingsKeys.length,
        dataSize,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalKeys: 0,
        cacheKeys: 0,
        settingsKeys: 0,
        dataSize: 0,
      };
    }
  }

  /**
   * Clear all stored data (use for logout/reset)
   */
  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Failed to clear all storage:', error);
    }
  }

  /**
   * Reset to default settings but keep user preferences
   */
  static async resetToDefaults(): Promise<void> {
    try {
      const userPrefs = await this.getUserPreferences();
      await AsyncStorage.clear();
      if (userPrefs) {
        await this.setUserPreferences(userPrefs);
      }
    } catch (error) {
      console.error('Failed to reset to defaults:', error);
    }
  }
}

/**
 * Default configurations
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  currency: 'USD',
  language: 'en',
  notifications: {
    enabled: true,
    budgetAlerts: true,
    transactionReminders: true,
    monthlyReports: true,
  },
  privacy: {
    analytics: false,
    crashReporting: true,
  },
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  autoLockEnabled: true,
  autoLockTimeout: 5, // 5 minutes
  biometricEnabled: false,
  pinRequired: true,
  offlineMode: true,
  syncFrequency: 'real-time',
  dataRetention: 90, // 90 days
};

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  completed: false,
  currentStep: 0,
  completedSteps: [],
  skippedSteps: [],
  firstLaunch: true,
};

export default LocalStorageService;