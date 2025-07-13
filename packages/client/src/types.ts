/**
 * Type definitions for the NVLP client library
 * Client-specific configuration types that are not shared
 */

// Re-export all shared types
export * from '@nvlp/types';

// Import specific types needed for client-specific interfaces
import type { ApiResponse, RequestOptions } from '@nvlp/types';

// Base configuration for client initialization
export interface NVLPClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  transport?: 'postgrest' | 'edge-function' | 'hybrid';
  timeout?: number;
  retries?: number;
  // Token persistence options
  persistTokens?: boolean; // Default: true
  tokenStorageKey?: string; // Default: 'nvlp_auth_tokens'
  autoRefresh?: boolean; // Default: true
  // Custom API endpoints
  apiBaseUrl?: string; // Default: derived from supabaseUrl, for Edge Functions (edge-api.nvlp.app)
  dbApiUrl?: string; // Custom URL for PostgREST operations (db-api.nvlp.app)
}

// Transport interface for abstraction (client-specific)
export interface Transport {
  request<T>(
    method: string,
    endpoint: string, 
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>>;
}

// All domain types are now imported from @nvlp/types via the re-export above

// All input types and query params are now imported from @nvlp/types via the re-export above