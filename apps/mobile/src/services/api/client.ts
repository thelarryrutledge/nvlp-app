/**
 * NVLP API Client Service
 * 
 * Integrates the @nvlp/client library into the React Native app
 * Provides configured client instance and React Native-specific storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import { NVLPClient, NVLPClientConfig } from '@nvlp/client';

// Configuration for the NVLP client
const clientConfig: NVLPClientConfig = {
  supabaseUrl: Config.SUPABASE_URL || 'https://qnpatlosomopoimtsmsr.supabase.co',
  supabaseAnonKey: Config.SUPABASE_ANON_KEY || '',
  
  // Token storage configuration for React Native
  tokenStorageKey: '@nvlp:auth_tokens',
  persistTokens: true,
  autoRefresh: true,
  
  // Storage adapter for React Native AsyncStorage
  storage: {
    getItem: async (key: string) => {
      try {
        return await AsyncStorage.getItem(key);
      } catch (error) {
        console.error('AsyncStorage getItem error:', error);
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (error) {
        console.error('AsyncStorage setItem error:', error);
      }
    },
    removeItem: async (key: string) => {
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        console.error('AsyncStorage removeItem error:', error);
      }
    },
  },
};

// Create singleton client instance
export const apiClient = new NVLPClient(clientConfig);

// Export client for type-safe usage
export type { NVLPClient } from '@nvlp/client';
export { apiClient as default };