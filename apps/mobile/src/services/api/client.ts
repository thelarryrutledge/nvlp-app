/**
 * NVLP API Client Service
 * 
 * Integrates the @nvlp/client library into the React Native app
 * Provides configured client instance and React Native-specific storage
 */

import Config from 'react-native-config';
import { NVLPClient, NVLPClientConfig } from '@nvlp/client';

// Configuration for the NVLP client
const clientConfig: NVLPClientConfig = {
  supabaseUrl: Config.SUPABASE_URL || 'https://qnpatlosomopoimtsmsr.supabase.co',
  supabaseAnonKey: Config.SUPABASE_ANON_KEY || '',
  
  // Disable built-in token persistence (we handle it in React Native)
  persistTokens: false,
  autoRefresh: false, // We handle refresh in our token manager
};

// Create singleton client instance
export const apiClient = new NVLPClient(clientConfig);

// Export client for type-safe usage
export type { NVLPClient } from '@nvlp/client';
export { apiClient as default };