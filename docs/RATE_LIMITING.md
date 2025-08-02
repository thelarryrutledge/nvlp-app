# Rate Limiting Implementation

## Overview

The NVLP API implements comprehensive rate limiting to protect against abuse, DDoS attacks, and ensure fair usage across all users. Rate limiting is applied at the Edge Function level using a sliding window algorithm.

## Rate Limit Types

### 1. Authentication Endpoints (`auth`)
- **Window**: 15 minutes
- **Limit**: 5 failed attempts per window
- **Scope**: Per IP address and per email
- **Behavior**: Only failed authentication attempts count toward the limit
- **Applied to**: `/auth/magic-link`, `/auth/logout`

### 2. Regular API Endpoints (`api`)
- **Window**: 1 minute
- **Limit**: 100 requests per window
- **Scope**: Per IP address
- **Applied to**: General CRUD operations

### 3. User-Specific Limits (`user`)
- **Window**: 1 minute  
- **Limit**: 200 requests per window
- **Scope**: Per authenticated user
- **Applied to**: All authenticated requests (in addition to IP limits)

### 4. Critical Operations (`critical`)
- **Window**: 1 minute
- **Limit**: 50 requests per window
- **Scope**: Per IP address + per user
- **Applied to**: `/transactions`, `/bulk-operations`

### 5. Dashboard/Reporting (`dashboard`)
- **Window**: 1 minute
- **Limit**: 30 requests per window
- **Scope**: Per IP address + per user
- **Applied to**: `/dashboard`, reporting endpoints

## Implementation Details

### Rate Limiting Algorithm
- **Type**: Sliding window with in-memory store
- **Granularity**: Per-request tracking with timestamp arrays
- **Reset**: Automatic cleanup of expired entries
- **Blocking**: Temporary blocks until window expires

### Headers Returned
All API responses include rate limit headers:

```http
X-RateLimit-Remaining: 95    # Requests remaining in current window
X-RateLimit-Reset: 1643723400 # Unix timestamp when window resets
Retry-After: 60              # Seconds to wait (only when rate limited)
```

### Rate Limited Response
When rate limited, clients receive:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1643723400
Retry-After: 60

{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Try again in 60 seconds.",
  "retryAfter": 60
}
```

## Usage in Edge Functions

### Basic Usage
```typescript
import { withRateLimit } from '../_shared/rate-limiter.ts'

const handler = async (req: Request) => {
  // Your endpoint logic here
}

// Apply rate limiting
serve(withRateLimit('api', handler))
```

### Authentication Endpoints
```typescript
import { 
  withRateLimit, 
  recordFailedRequest, 
  getClientIP 
} from '../_shared/rate-limiter.ts'

const handler = async (req: Request) => {
  const clientIP = getClientIP(req);
  
  try {
    // Attempt authentication
    const result = await authenticate(email, password);
    
    if (!result.success) {
      // Record failed attempt for rate limiting
      recordFailedRequest({
        type: 'auth',
        identifier: clientIP
      });
      
      // Also track per-email to prevent targeted attacks
      recordFailedRequest({
        type: 'auth',
        identifier: `email:${email}`
      });
    }
    
    return response;
  } catch (error) {
    // Handle error
  }
}

serve(withRateLimit('auth', handler))
```

### Adding Rate Limit Headers to Responses
```typescript
import { 
  checkRateLimit, 
  createRateLimitHeaders 
} from '../_shared/rate-limiter.ts'

// Get current rate limit status
const rateLimitResult = checkRateLimit({
  type: 'api',
  identifier: clientIP,
});

// Add headers to successful response
return new Response(JSON.stringify(data), {
  status: 200,
  headers: {
    ...corsHeaders,
    ...createRateLimitHeaders(rateLimitResult),
    'Content-Type': 'application/json'
  }
});
```

## Client-Side Handling

### Detecting Rate Limits
```javascript
const response = await fetch('/api/endpoint');

if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  console.log(`Rate limited. Retry after ${retryAfter} seconds`);
  
  // Implement exponential backoff or show user message
  setTimeout(() => {
    // Retry request
  }, retryAfter * 1000);
}
```

### Monitoring Rate Limits
```javascript
const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');

if (remaining < 10) {
  console.warn(`Approaching rate limit: ${remaining} requests remaining`);
}
```

## Security Features

### IP Address Detection
The rate limiter attempts to get the real client IP from various headers:
1. `X-Forwarded-For` (first IP in chain)
2. `X-Real-IP`
3. `CF-Connecting-IP` (Cloudflare)

### Protection Against Abuse
- **Authentication Attacks**: Strict limits on failed login attempts
- **User Enumeration**: Per-email rate limiting prevents email enumeration
- **API Abuse**: Different limits for different endpoint types
- **Distributed Attacks**: Both IP and user-based limiting

### Bypass Prevention
- **Header Spoofing**: Multiple IP detection methods
- **User Switching**: Per-user limits prevent account switching abuse
- **Token Reuse**: JWT parsing for user identification

## Monitoring and Observability

### Logging
Rate limit events are logged for monitoring:
- Rate limit violations
- IP addresses being rate limited  
- Authentication attack patterns

### Metrics (Future Enhancement)
Consider implementing:
- Rate limit hit rates by endpoint
- Top rate-limited IPs
- Authentication attack frequency

## Configuration

Rate limits are configured in `/supabase/functions/_shared/rate-limiter.ts`:

```typescript
const RATE_LIMITS: Record<string, RateLimitRule> = {
  'auth': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,            // 5 attempts
    skipSuccessfulRequests: true,
  },
  // ... other configurations
};
```

### Adjusting Limits
To modify rate limits:
1. Update the `RATE_LIMITS` configuration
2. Redeploy affected Edge Functions
3. Monitor for impact on legitimate users

## Best Practices

### For API Consumers
1. **Monitor Headers**: Always check rate limit headers
2. **Implement Backoff**: Use exponential backoff for retries
3. **Cache Responses**: Reduce unnecessary API calls
4. **Batch Operations**: Use bulk endpoints when available

### For Developers
1. **Choose Appropriate Types**: Select rate limit type based on endpoint sensitivity
2. **Test Limits**: Verify rate limits work as expected
3. **Log Violations**: Monitor rate limit violations in production
4. **Update Documentation**: Keep rate limit documentation current

## Troubleshooting

### Common Issues

#### "Rate limit exceeded" on legitimate requests
- **Cause**: Shared IP addresses (corporate networks, mobile carriers)
- **Solution**: Consider user-based limits or IP whitelist for known corporate IPs

#### Authentication always rate limited
- **Cause**: Failed authentication attempts counting as hits
- **Solution**: Verify `recordFailedRequest()` is only called on actual failures

#### Rate limits not working
- **Cause**: Missing `withRateLimit()` wrapper
- **Solution**: Ensure all endpoints use the rate limiting middleware

### Testing Rate Limits
```bash
# Test authentication rate limiting
for i in {1..10}; do
  curl -X POST https://your-api.com/auth/magic-link \
    -d '{"email":"test@example.com"}' \
    -H "Content-Type: application/json"
done

# Test API rate limiting  
for i in {1..150}; do
  curl -H "Authorization: Bearer $TOKEN" \
    https://your-api.com/api/budgets
done
```

## Future Enhancements

1. **Distributed Rate Limiting**: Redis-based store for multi-instance deployments
2. **Dynamic Limits**: Adjust limits based on user tier or subscription
3. **Geolocation**: Different limits for different regions
4. **Machine Learning**: Detect anomalous request patterns
5. **Rate Limit Policies**: Database-driven rate limit configuration