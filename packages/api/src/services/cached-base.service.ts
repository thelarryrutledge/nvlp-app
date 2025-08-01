import { BaseService } from './base.service';
import { CacheManager, CacheOptions, getCacheKey } from '../utils/cache';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@nvlp/types';

export abstract class CachedBaseService extends BaseService {
  protected cache: CacheManager;

  constructor(client: SupabaseClient<Database>) {
    super(client);
    this.cache = CacheManager.getInstance();
  }

  /**
   * Execute a function with caching
   */
  protected async withCache<T>(
    namespace: string,
    key: string,
    options: CacheOptions,
    fn: () => Promise<T>
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.cache.get<T>(namespace, key, options);
    if (cached !== undefined) {
      return cached;
    }

    // Execute the function and cache the result
    const result = await fn();
    this.cache.set(namespace, key, result, options);
    return result;
  }

  /**
   * Build a cache key from parts
   */
  protected buildCacheKey(...parts: (string | number | undefined)[]): string {
    return getCacheKey(...parts);
  }

  /**
   * Invalidate related caches
   */
  protected invalidateRelatedCaches(namespaces: string[]): void {
    this.cache.invalidateRelated(namespaces);
  }
}