/**
 * Cache-related types for API and Edge Functions
 */

export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in seconds
}

export interface CacheStats {
  size: number;
  entries: string[];
}