import { LRUCache } from 'lru-cache';

export interface CacheOptions {
  ttl: number; // Time to live in milliseconds
  max?: number; // Maximum number of items in cache
}

export class CacheManager {
  private static instance: CacheManager;
  private caches: Map<string, LRUCache<string, any>>;

  private constructor() {
    this.caches = new Map();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Get or create a cache for a specific namespace
   */
  private getCache(namespace: string, options: CacheOptions): LRUCache<string, any> {
    if (!this.caches.has(namespace)) {
      this.caches.set(namespace, new LRUCache({
        max: options.max || 100,
        ttl: options.ttl,
        updateAgeOnGet: true,
        updateAgeOnHas: true,
      }));
    }
    return this.caches.get(namespace)!;
  }

  /**
   * Get a value from cache
   */
  get<T>(namespace: string, key: string, options: CacheOptions): T | undefined {
    const cache = this.getCache(namespace, options);
    return cache.get(key) as T | undefined;
  }

  /**
   * Set a value in cache
   */
  set<T>(namespace: string, key: string, value: T, options: CacheOptions): void {
    const cache = this.getCache(namespace, options);
    cache.set(key, value);
  }

  /**
   * Check if a key exists in cache
   */
  has(namespace: string, key: string, options: CacheOptions): boolean {
    const cache = this.getCache(namespace, options);
    return cache.has(key);
  }

  /**
   * Delete a specific key from cache
   */
  delete(namespace: string, key: string): void {
    const cache = this.caches.get(namespace);
    if (cache) {
      cache.delete(key);
    }
  }

  /**
   * Clear all entries in a specific namespace
   */
  clear(namespace: string): void {
    const cache = this.caches.get(namespace);
    if (cache) {
      cache.clear();
    }
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.caches.forEach(cache => cache.clear());
    this.caches.clear();
  }

  /**
   * Invalidate related caches when data changes
   */
  invalidateRelated(namespaces: string[]): void {
    namespaces.forEach(namespace => this.clear(namespace));
  }
}

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  DASHBOARD: 30 * 1000,        // 30 seconds
  CATEGORIES: 5 * 60 * 1000,   // 5 minutes
  ENVELOPES: 2 * 60 * 1000,    // 2 minutes
  BUDGETS: 5 * 60 * 1000,      // 5 minutes
  USER_PROFILE: 10 * 60 * 1000, // 10 minutes
  STATS: 60 * 1000,            // 1 minute
  PAYEES: 3 * 60 * 1000,       // 3 minutes
  INCOME_SOURCES: 3 * 60 * 1000, // 3 minutes
} as const;

// Cache namespaces
export const CACHE_NAMESPACE = {
  DASHBOARD: 'dashboard',
  CATEGORIES: 'categories',
  ENVELOPES: 'envelopes',
  BUDGETS: 'budgets',
  USER_PROFILE: 'user_profile',
  SPENDING_STATS: 'spending_stats',
  INCOME_STATS: 'income_stats',
  SPENDING_TRENDS: 'spending_trends',
  PAYEES: 'payees',
  INCOME_SOURCES: 'income_sources',
} as const;

// Helper function to generate cache keys
export function getCacheKey(...parts: (string | number | undefined)[]): string {
  return parts.filter(part => part !== undefined).join(':');
}

// Cache invalidation groups
export const CACHE_INVALIDATION_GROUPS = {
  TRANSACTION_CHANGE: [
    CACHE_NAMESPACE.DASHBOARD,
    CACHE_NAMESPACE.ENVELOPES,
    CACHE_NAMESPACE.SPENDING_STATS,
    CACHE_NAMESPACE.INCOME_STATS,
    CACHE_NAMESPACE.SPENDING_TRENDS,
  ],
  ENVELOPE_CHANGE: [
    CACHE_NAMESPACE.DASHBOARD,
    CACHE_NAMESPACE.ENVELOPES,
  ],
  CATEGORY_CHANGE: [
    CACHE_NAMESPACE.CATEGORIES,
    CACHE_NAMESPACE.SPENDING_STATS,
  ],
  BUDGET_CHANGE: [
    CACHE_NAMESPACE.BUDGETS,
    CACHE_NAMESPACE.DASHBOARD,
  ],
  PAYEE_CHANGE: [
    CACHE_NAMESPACE.PAYEES,
  ],
  INCOME_SOURCE_CHANGE: [
    CACHE_NAMESPACE.INCOME_SOURCES,
    CACHE_NAMESPACE.INCOME_STATS,
  ],
} as const;