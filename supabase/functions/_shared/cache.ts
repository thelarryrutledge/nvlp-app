/**
 * Cache control utilities for Supabase Edge Functions
 */

export interface CacheOptions {
  maxAge?: number; // seconds
  sMaxAge?: number; // seconds for shared caches (CDN)
  staleWhileRevalidate?: number; // seconds
  private?: boolean;
  public?: boolean;
}

/**
 * Add cache headers to response
 */
export function withCache(response: Response, options: CacheOptions): Response {
  const directives: string[] = [];
  
  if (options.public) {
    directives.push('public');
  } else if (options.private !== false) {
    directives.push('private');
  }
  
  if (options.maxAge !== undefined) {
    directives.push(`max-age=${options.maxAge}`);
  }
  
  if (options.sMaxAge !== undefined) {
    directives.push(`s-maxage=${options.sMaxAge}`);
  }
  
  if (options.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }
  
  const cacheControl = directives.join(', ');
  response.headers.set('Cache-Control', cacheControl);
  
  // Ensure proper caching with auth
  const vary = response.headers.get('Vary') || '';
  if (!vary.includes('Authorization')) {
    response.headers.set('Vary', vary ? `${vary}, Authorization` : 'Authorization');
  }
  
  return response;
}

// Predefined cache strategies
export const CACHE_STRATEGIES = {
  // Dashboard data - cache for 1 minute
  DASHBOARD: {
    private: true,
    maxAge: 60,
    staleWhileRevalidate: 30,
  },
  
  // Categories - cache for 5 minutes
  CATEGORIES: {
    private: true,
    maxAge: 300,
    staleWhileRevalidate: 60,
  },
  
  // User profile - cache for 10 minutes
  USER_PROFILE: {
    private: true,
    maxAge: 600,
    staleWhileRevalidate: 300,
  },
  
  // Stats/Reports - cache for 1 minute
  STATS: {
    private: true,
    maxAge: 60,
    staleWhileRevalidate: 30,
  },
  
  // No cache for mutations
  NO_CACHE: {
    private: true,
    maxAge: 0,
  },
};