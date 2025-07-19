/**
 * NVLP API Client Service
 * 
 * Integrates the @nvlp/client library into the React Native app
 * Provides configured client instance and React Native-specific storage
 */

import { NVLPClient, NVLPClientConfig } from '@nvlp/client';

// Configuration for the NVLP client
const clientConfig: NVLPClientConfig = {
  supabaseUrl: 'https://qnpatlosomopoimtsmsr.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8',
  
  // API Base URL for auth and other Edge Functions
  apiBaseUrl: 'https://edge-api.nvlp.app',
  
  // Disable built-in token persistence (we handle it in React Native)
  persistTokens: false,
  autoRefresh: false, // We handle refresh in our token manager
};

// Create singleton client instance
export const apiClient = new NVLPClient(clientConfig);

// Export client for type-safe usage
export type { NVLPClient } from '@nvlp/client';
export { apiClient as default };