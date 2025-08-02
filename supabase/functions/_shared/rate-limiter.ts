/**
 * Rate Limiter for Supabase Edge Functions
 * 
 * Implements sliding window rate limiting with different limits for:
 * - Authentication endpoints (stricter limits)
 * - Regular API endpoints
 * - Per-user limits for authenticated requests
 */

interface RateLimitRule {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Maximum requests in window
  skipSuccessfulRequests?: boolean; // Only count failed requests
}

interface RateLimitStore {
  [key: string]: {
    requests: number[];
    blocked: boolean;
    blockedUntil?: number;
  };
}

// In-memory store (resets when Edge Function restarts)
const store: RateLimitStore = {};

// Rate limit configurations
const RATE_LIMITS: Record<string, RateLimitRule> = {
  // Authentication endpoints (stricter limits)
  'auth': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,            // 5 attempts per 15 minutes
    skipSuccessfulRequests: true, // Only count failed login attempts
  },
  
  // Regular API endpoints
  'api': {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 100,         // 100 requests per minute
  },
  
  // User-specific limits (authenticated requests)
  'user': {
    windowMs: 60 * 1000,      // 1 minute  
    maxRequests: 200,         // 200 requests per minute per user
  },
  
  // Critical operations (transactions, bulk operations)
  'critical': {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 50,          // 50 requests per minute
  },
  
  // Dashboard/reporting (read-heavy operations)
  'dashboard': {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 30,          // 30 requests per minute
  }
};

export interface RateLimitOptions {
  type: keyof typeof RATE_LIMITS;
  identifier: string;  // IP address, user ID, or custom identifier
  skipOnSuccess?: boolean; // Whether this request was successful (for auth)
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number; // Seconds to wait before retry
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const { type, identifier, skipOnSuccess = false } = options;
  const rule = RATE_LIMITS[type];
  
  if (!rule) {
    throw new Error(`Unknown rate limit type: ${type}`);
  }
  
  const key = `${type}:${identifier}`;
  const now = Date.now();
  const windowStart = now - rule.windowMs;
  
  // Initialize store entry if not exists
  if (!store[key]) {
    store[key] = {
      requests: [],
      blocked: false,
    };
  }
  
  const entry = store[key];
  
  // Clean old requests outside the window
  entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);
  
  // Check if currently blocked
  if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  } else if (entry.blocked && entry.blockedUntil && now >= entry.blockedUntil) {
    // Reset block if time has passed
    entry.blocked = false;
    entry.blockedUntil = undefined;
    entry.requests = [];
  }
  
  // Check if we're at the limit
  if (entry.requests.length >= rule.maxRequests) {
    // Block for the remainder of the window
    const oldestRequest = Math.min(...entry.requests);
    const resetTime = oldestRequest + rule.windowMs;
    
    entry.blocked = true;
    entry.blockedUntil = resetTime;
    
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter: Math.ceil((resetTime - now) / 1000),
    };
  }
  
  // If this is a successful auth request and we should skip it, don't count it
  if (!skipOnSuccess || !rule.skipSuccessfulRequests) {
    entry.requests.push(now);
  }
  
  const remaining = rule.maxRequests - entry.requests.length;
  const oldestRequest = entry.requests.length > 0 ? Math.min(...entry.requests) : now;
  const resetTime = oldestRequest + rule.windowMs;
  
  return {
    allowed: true,
    remaining: Math.max(0, remaining),
    resetTime,
  };
}

/**
 * Record a failed request (for auth endpoints with skipSuccessfulRequests)
 */
export function recordFailedRequest(options: Omit<RateLimitOptions, 'skipOnSuccess'>): void {
  const { type, identifier } = options;
  const rule = RATE_LIMITS[type];
  
  if (!rule || !rule.skipSuccessfulRequests) {
    return; // Only relevant for auth endpoints
  }
  
  const key = `${type}:${identifier}`;
  const now = Date.now();
  
  if (!store[key]) {
    store[key] = {
      requests: [],
      blocked: false,
    };
  }
  
  store[key].requests.push(now);
}

/**
 * Get client IP address from request
 */
export function getClientIP(req: Request): string {
  // Try various headers that might contain the real IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the list (original client)
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback - this might not be the real client IP behind proxies
  return 'unknown';
}

/**
 * Create rate limit headers for HTTP response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };
  
  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  
  return headers;
}

/**
 * Create rate limit error response
 */
export function createRateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>): Response {
  const headers = {
    ...corsHeaders,
    ...createRateLimitHeaders(result),
    'Content-Type': 'application/json',
  };
  
  const body = JSON.stringify({
    error: 'Rate limit exceeded',
    message: `Too many requests. Try again in ${result.retryAfter} seconds.`,
    retryAfter: result.retryAfter,
  });
  
  return new Response(body, {
    status: 429,
    headers,
  });
}

/**
 * Rate limiting middleware for Edge Functions
 */
export function withRateLimit(
  type: keyof typeof RATE_LIMITS,
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    // Skip rate limiting for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return handler(req);
    }
    
    const clientIP = getClientIP(req);
    
    // Check IP-based rate limit first
    const ipResult = checkRateLimit({
      type,
      identifier: clientIP,
    });
    
    if (!ipResult.allowed) {
      const corsHeaders = { 'Access-Control-Allow-Origin': '*' };
      return createRateLimitResponse(ipResult, corsHeaders);
    }
    
    // For authenticated endpoints, also check user-based limits
    const authHeader = req.headers.get('authorization');
    if (authHeader && type !== 'auth') {
      // Extract user ID from JWT token (simplified - in production you'd verify the token)
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.sub;
        
        if (userId) {
          const userResult = checkRateLimit({
            type: 'user',
            identifier: userId,
          });
          
          if (!userResult.allowed) {
            const corsHeaders = { 'Access-Control-Allow-Origin': '*' };
            return createRateLimitResponse(userResult, corsHeaders);
          }
        }
      } catch (error) {
        // Token parsing failed - continue with IP-based limiting only
        console.warn('Failed to parse JWT token for user rate limiting:', error);
      }
    }
    
    // Request is allowed - call the handler
    return handler(req);
  };
}