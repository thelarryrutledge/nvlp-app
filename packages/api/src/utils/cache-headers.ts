/**
 * Cache control utilities for setting HTTP cache headers
 */

export interface CacheHeaderOptions {
  maxAge?: number; // seconds
  sMaxAge?: number; // seconds for shared caches (CDN)
  staleWhileRevalidate?: number; // seconds
  staleIfError?: number; // seconds
  public?: boolean;
  private?: boolean;
  noCache?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
  immutable?: boolean;
}

export function buildCacheControlHeader(options: CacheHeaderOptions): string {
  const directives: string[] = [];

  if (options.public) directives.push('public');
  if (options.private) directives.push('private');
  if (options.noCache) directives.push('no-cache');
  if (options.noStore) directives.push('no-store');
  if (options.mustRevalidate) directives.push('must-revalidate');
  if (options.immutable) directives.push('immutable');
  
  if (options.maxAge !== undefined) {
    directives.push(`max-age=${options.maxAge}`);
  }
  
  if (options.sMaxAge !== undefined) {
    directives.push(`s-maxage=${options.sMaxAge}`);
  }
  
  if (options.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }
  
  if (options.staleIfError !== undefined) {
    directives.push(`stale-if-error=${options.staleIfError}`);
  }

  return directives.join(', ');
}

// Predefined cache strategies
export const CACHE_STRATEGIES = {
  // No caching
  NO_CACHE: {
    noCache: true,
    noStore: true,
    mustRevalidate: true,
  },
  
  // Cache for 5 minutes, allow stale content for 1 minute while revalidating
  CATEGORIES: {
    public: true,
    maxAge: 300, // 5 minutes
    sMaxAge: 300,
    staleWhileRevalidate: 60,
  },
  
  // Cache for 1 minute for dynamic dashboard data
  DASHBOARD: {
    private: true,
    maxAge: 60,
    staleWhileRevalidate: 30,
  },
  
  // Cache for 10 minutes for user profile
  USER_PROFILE: {
    private: true,
    maxAge: 600,
    staleWhileRevalidate: 300,
  },
  
  // Cache for 3 minutes for semi-static reference data
  REFERENCE_DATA: {
    public: true,
    maxAge: 180,
    sMaxAge: 180,
    staleWhileRevalidate: 60,
  },
  
  // Cache for 1 minute for stats/reports
  STATS: {
    private: true,
    maxAge: 60,
    sMaxAge: 60,
    staleWhileRevalidate: 30,
  },
} as const;

/**
 * Set cache headers on a Response object
 */
export function setCacheHeaders(response: Response, options: CacheHeaderOptions): Response {
  const cacheControl = buildCacheControlHeader(options);
  response.headers.set('Cache-Control', cacheControl);
  
  // Set Vary header to ensure proper caching with authentication
  const currentVary = response.headers.get('Vary') || '';
  const varyHeaders = new Set(currentVary.split(',').map(h => h.trim()).filter(Boolean));
  varyHeaders.add('Authorization');
  response.headers.set('Vary', Array.from(varyHeaders).join(', '));
  
  return response;
}

/**
 * Generate ETag from content
 */
export function generateETag(content: string | object): string {
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  // Simple hash function for demo - in production use a proper hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `"${Math.abs(hash).toString(36)}"`;
}

/**
 * Check if request has matching ETag
 */
export function checkETag(request: Request, currentETag: string): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  return ifNoneMatch === currentETag;
}