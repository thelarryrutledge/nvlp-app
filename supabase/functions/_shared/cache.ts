/**
 * Simple in-memory cache for Edge Functions
 * Provides caching with TTL (Time To Live) support
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in seconds
}

class SimpleCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly defaultTTL: number = 300; // 5 minutes default

  /**
   * Get cached data if it exists and hasn't expired
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const age = (now - entry.timestamp) / 1000; // Convert to seconds

    if (age > entry.ttl) {
      // Entry has expired, remove it
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data with optional TTL
   */
  set(key: string, data: any, ttl?: number): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries (garbage collection)
   */
  clearExpired(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = (now - entry.timestamp) / 1000;
      if (age > entry.ttl) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Create a cache key from multiple parts
   */
  createKey(...parts: string[]): string {
    return parts.join(':');
  }
}

// Create a global cache instance for the Edge Function
const edgeCache = new SimpleCache();

export default edgeCache;

/**
 * Cache-aware wrapper for async functions
 * Automatically handles caching based on key and TTL
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache first
  const cached = edgeCache.get(key);
  if (cached !== null) {
    console.log(`[CACHE HIT] ${key}`);
    return cached;
  }

  // Cache miss, fetch the data
  console.log(`[CACHE MISS] ${key}`);
  const data = await fetchFn();
  
  // Store in cache
  edgeCache.set(key, data, ttl);
  
  return data;
}

/**
 * Cache invalidation helper for budget-related data
 */
export function invalidateBudgetCache(budgetId: string): void {
  const patterns = [
    `dashboard:${budgetId}`,
    `transactions:${budgetId}`,
    `reports:${budgetId}`,
    `envelopes:${budgetId}`,
    `categories:${budgetId}`
  ];

  patterns.forEach(pattern => {
    edgeCache.delete(pattern);
  });

  console.log(`[CACHE INVALIDATED] Budget ${budgetId} related cache cleared`);
}

/**
 * Periodic cleanup function to remove expired entries
 * Should be called periodically to prevent memory bloat
 */
export function cleanupCache(): void {
  const cleared = edgeCache.clearExpired();
  if (cleared > 0) {
    console.log(`[CACHE CLEANUP] Removed ${cleared} expired entries`);
  }
}