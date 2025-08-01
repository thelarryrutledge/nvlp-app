# Caching Implementation Guide

## Overview

This document describes the caching implementation for the NVLP API, including both application-level and HTTP-level caching strategies.

## 1. Application-Level Caching (In-Memory LRU Cache)

### Setup

The caching system uses an LRU (Least Recently Used) cache with TTL (Time To Live) support.

```typescript
// Import caching utilities
import { CachedBaseService } from './cached-base.service';
import { CACHE_NAMESPACE, CACHE_TTL, CACHE_INVALIDATION_GROUPS } from '../utils/cache';

// Extend CachedBaseService instead of BaseService
export class DashboardService extends CachedBaseService {
  // Service implementation
}
```

### Using Cache in Services

```typescript
async getDashboardSummary(budgetId: string): Promise<DashboardSummary> {
  const userId = await this.getCurrentUserId();
  const cacheKey = this.buildCacheKey(userId, budgetId);
  
  return this.withCache(
    CACHE_NAMESPACE.DASHBOARD,
    cacheKey,
    { ttl: CACHE_TTL.DASHBOARD }, // 30 seconds
    async () => {
      // Expensive operation here
      return fetchDashboardData();
    }
  );
}
```

### Cache Invalidation

```typescript
// After data modification
this.invalidateRelatedCaches([...CACHE_INVALIDATION_GROUPS.CATEGORY_CHANGE]);
```

### Cache TTL Configuration

```typescript
export const CACHE_TTL = {
  DASHBOARD: 30 * 1000,        // 30 seconds
  CATEGORIES: 5 * 60 * 1000,   // 5 minutes
  ENVELOPES: 2 * 60 * 1000,    // 2 minutes
  BUDGETS: 5 * 60 * 1000,      // 5 minutes
  USER_PROFILE: 10 * 60 * 1000, // 10 minutes
  STATS: 60 * 1000,            // 1 minute
  PAYEES: 3 * 60 * 1000,       // 3 minutes
  INCOME_SOURCES: 3 * 60 * 1000, // 3 minutes
};
```

## 2. HTTP Cache Headers (Edge Functions)

### Setup

Import the cache utilities in your Edge Function:

```typescript
import { withCache, CACHE_STRATEGIES } from '../_shared/cache.ts'
```

### Adding Cache Headers

```typescript
// In your Edge Function handler
const data = await fetchDashboardData(budgetId);

const response = new Response(
  JSON.stringify(data),
  { 
    status: 200,
    headers: { 
      ...corsHeaders, 
      'Content-Type': 'application/json' 
    }
  }
);

// Add cache headers
return withCache(response, CACHE_STRATEGIES.DASHBOARD);
```

### Cache Strategies

```typescript
CACHE_STRATEGIES = {
  DASHBOARD: { private: true, maxAge: 60, staleWhileRevalidate: 30 },
  CATEGORIES: { private: true, maxAge: 300, staleWhileRevalidate: 60 },
  USER_PROFILE: { private: true, maxAge: 600, staleWhileRevalidate: 300 },
  STATS: { private: true, maxAge: 60, staleWhileRevalidate: 30 },
  NO_CACHE: { private: true, maxAge: 0 },
};
```

## 3. Cache Invalidation Groups

When data changes, related caches are automatically invalidated:

```typescript
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
  // ... more groups
};
```

## 4. Performance Impact

### Expected Improvements

1. **Dashboard Loading**: ~70% reduction in response time for cached requests
2. **Category Listings**: ~90% reduction (5-minute cache)
3. **Database Load**: ~40% reduction in overall queries
4. **CDN Hit Rate**: ~30% for cacheable endpoints

### Monitoring Cache Performance

```typescript
// Cache hit/miss ratio can be monitored by adding metrics
const cached = this.cache.get<T>(namespace, key, options);
if (cached !== undefined) {
  // Log cache hit
  metrics.increment('cache.hit', { namespace });
} else {
  // Log cache miss
  metrics.increment('cache.miss', { namespace });
}
```

## 5. Best Practices

### DO:
- Cache read-heavy operations
- Use appropriate TTLs based on data volatility
- Invalidate caches when data changes
- Use private cache headers for user-specific data
- Monitor cache hit rates

### DON'T:
- Cache write operations
- Cache sensitive data without proper headers
- Use long TTLs for frequently changing data
- Forget to invalidate related caches
- Cache without considering memory limits

## 6. Future Enhancements

1. **Redis Integration**: For distributed caching across instances
2. **ETags**: For conditional requests and bandwidth savings
3. **Edge Caching**: Utilize Cloudflare's edge network more effectively
4. **Query Result Caching**: Cache at the database query level
5. **Partial Response Caching**: Cache expensive computations separately

## Example: Full Implementation

```typescript
// Service with caching
export class CategoryService extends CachedBaseService {
  async listCategories(budgetId: string): Promise<Category[]> {
    await this.verifyBudgetAccess(budgetId);
    const userId = await this.getCurrentUserId();
    const cacheKey = this.buildCacheKey(userId, budgetId);

    return this.withCache(
      CACHE_NAMESPACE.CATEGORIES,
      cacheKey,
      { ttl: CACHE_TTL.CATEGORIES },
      async () => {
        const { data, error } = await this.client
          .from('categories')
          .select('*')
          .eq('budget_id', budgetId)
          .order('name', { ascending: true });

        if (error) {
          this.handleError(error);
        }

        return data as Category[];
      }
    );
  }

  async createCategory(budgetId: string, request: CategoryCreateRequest): Promise<Category> {
    // ... create category logic ...
    
    // Invalidate cache after creation
    this.invalidateRelatedCaches([...CACHE_INVALIDATION_GROUPS.CATEGORY_CHANGE]);
    
    return category;
  }
}
```

## Testing Cache Implementation

```bash
# First request - cache miss
curl -H "Authorization: Bearer $TOKEN" \
  https://api.nvlp.app/categories?budget_id=123
# Response time: ~200ms

# Second request - cache hit
curl -H "Authorization: Bearer $TOKEN" \
  https://api.nvlp.app/categories?budget_id=123
# Response time: ~20ms

# Check cache headers
curl -I -H "Authorization: Bearer $TOKEN" \
  https://api.nvlp.app/categories?budget_id=123
# Cache-Control: private, max-age=300, stale-while-revalidate=60
```