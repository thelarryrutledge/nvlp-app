# PostgREST Authentication Headers Guide

This guide explains how to properly configure authentication headers for PostgREST requests in the NVLP API.

## Overview

PostgREST requires specific headers for authentication and authorization:
- **apikey**: The Supabase anonymous key (always required)
- **Authorization**: Bearer token with JWT (required for authenticated requests)
- **Content-Profile/Accept-Profile**: Schema selection headers
- **Prefer**: Request preferences for responses

## Required Headers

### 1. API Key Header
All PostgREST requests must include the Supabase anonymous key:

```typescript
headers['apikey'] = SUPABASE_ANON_KEY;
```

### 2. Authorization Header
For authenticated requests, include the JWT token:

```typescript
headers['Authorization'] = `Bearer ${session.access_token}`;
```

### 3. Schema Headers
To specify the database schema (default is 'public'):

```typescript
headers['Content-Profile'] = 'public';  // For request body
headers['Accept-Profile'] = 'public';   // For response body
```

## Using the PostgREST Header Utilities

### Basic Header Creation

```typescript
import { createPostgRESTHeaders } from '@nvlp/api';

// For authenticated requests
const headers = createPostgRESTHeaders(
  SUPABASE_ANON_KEY,
  session,  // User session with access_token
  {
    prefer: 'return=representation',
    contentProfile: 'public',
    acceptProfile: 'public',
  }
);

// For anonymous requests (no session)
const anonHeaders = createPostgRESTHeaders(SUPABASE_ANON_KEY);
```

### Common Header Configurations

#### 1. Bulk Operations
```typescript
import { createBulkOperationHeaders } from '@nvlp/api';

const headers = createBulkOperationHeaders(SUPABASE_ANON_KEY, session);
// Includes: Prefer: return=representation
```

#### 2. Count Queries
```typescript
import { createCountHeaders } from '@nvlp/api';

const headers = createCountHeaders(
  SUPABASE_ANON_KEY,
  session,
  'exact'  // or 'planned' or 'estimated'
);
```

#### 3. CSV Export
```typescript
import { createCSVExportHeaders } from '@nvlp/api';

const headers = createCSVExportHeaders(SUPABASE_ANON_KEY, session);
// Includes: Content-Type: text/csv, Accept: text/csv
```

#### 4. Update Operations
```typescript
import { createPatchHeaders } from '@nvlp/api';

// With data return
const headers = createPatchHeaders(SUPABASE_ANON_KEY, session, true);
// Includes: Prefer: return=representation

// Without data return (performance)
const minimalHeaders = createPatchHeaders(SUPABASE_ANON_KEY, session, false);
// Includes: Prefer: return=minimal
```

#### 5. Delete Operations
```typescript
import { createDeleteHeaders } from '@nvlp/api';

const headers = createDeleteHeaders(SUPABASE_ANON_KEY, session);
// Includes: Prefer: return=minimal
```

## Using the Enhanced PostgREST Client

The enhanced PostgREST client automatically handles auth headers:

```typescript
import { createEnhancedPostgRESTClient } from '@nvlp/api';
import { supabaseClient } from './config';

// Create client with Supabase integration
const postgrestClient = createEnhancedPostgRESTClient({
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  supabaseClient,  // For automatic session handling
  schema: 'public',
});

// All requests automatically include proper auth headers
const { data, error, count } = await postgrestClient.select('budgets', {
  filters: { 'is_active': 'eq.true' },
  order: [{ column: 'created_at', ascending: false }],
  limit: 10,
  count: 'exact',
});
```

## Header Validation

Always validate headers before making requests:

```typescript
import { validatePostgRESTHeaders } from '@nvlp/api';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${token}`,
  // ... other headers
};

if (!validatePostgRESTHeaders(headers)) {
  throw new Error('Invalid PostgREST headers');
}
```

## Prefer Header Options

The Prefer header controls response behavior:

```typescript
import { PostgRESTPrefer } from '@nvlp/api';

// Return options
PostgRESTPrefer.RETURN_MINIMAL         // No response body
PostgRESTPrefer.RETURN_HEADERS_ONLY    // Only headers
PostgRESTPrefer.RETURN_REPRESENTATION  // Full response body

// Count options
PostgRESTPrefer.COUNT_NONE      // No count
PostgRESTPrefer.COUNT_EXACT     // Exact count (slower)
PostgRESTPrefer.COUNT_PLANNED   // Query planner estimate
PostgRESTPrefer.COUNT_ESTIMATED // Quick estimate

// Combine multiple options
const prefer = PostgRESTPrefer.combine(
  PostgRESTPrefer.RETURN_REPRESENTATION,
  PostgRESTPrefer.COUNT_EXACT
);
```

## Pagination Headers

For paginated requests, use Range headers:

```typescript
const headers = createPostgRESTHeaders(SUPABASE_ANON_KEY, session, {
  range: { from: 0, to: 9 },  // First 10 items
});

// Response will include Content-Range header
// Parse it with extractPaginationInfo utility
import { extractPaginationInfo } from '@nvlp/api';

const response = await fetch(url, { headers });
const { totalCount, range } = extractPaginationInfo(response.headers);
```

## Security Best Practices

1. **Never expose service role key**: Only use the anonymous key in client-side code
2. **Always validate sessions**: Ensure JWT tokens are valid and not expired
3. **Use RLS policies**: Rely on Row Level Security for data access control
4. **Refresh tokens**: Handle token expiration gracefully with refresh logic
5. **Validate headers**: Always validate headers before making requests

## Common Use Cases

### 1. Direct PostgREST Query
```typescript
const headers = createPostgRESTHeaders(SUPABASE_ANON_KEY, session);

const response = await fetch(`${SUPABASE_URL}/rest/v1/budgets?is_active=eq.true`, {
  headers,
});
```

### 2. Authenticated Insert
```typescript
const headers = createPostgRESTHeaders(SUPABASE_ANON_KEY, session, {
  prefer: 'return=representation',
});

const response = await fetch(`${SUPABASE_URL}/rest/v1/budgets`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    name: 'New Budget',
    description: 'Created via PostgREST',
  }),
});
```

### 3. Batch Update with Count
```typescript
const headers = createPostgRESTHeaders(SUPABASE_ANON_KEY, session, {
  prefer: PostgRESTPrefer.combine(
    PostgRESTPrefer.RETURN_REPRESENTATION,
    PostgRESTPrefer.COUNT_EXACT
  ),
});

const response = await fetch(`${SUPABASE_URL}/rest/v1/transactions?is_cleared=eq.false`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({ is_cleared: true }),
});
```

### 4. Export to CSV
```typescript
const headers = createCSVExportHeaders(SUPABASE_ANON_KEY, session);

const response = await fetch(`${SUPABASE_URL}/rest/v1/transactions?budget_id=eq.${budgetId}`, {
  headers,
});

const csvData = await response.text();
```

## Error Handling

Handle auth-specific errors appropriately:

```typescript
try {
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    switch (response.status) {
      case 401:
        // Token expired or invalid
        await refreshSession();
        break;
      case 403:
        // RLS policy violation
        throw new Error('Access denied');
      default:
        throw new Error(`Request failed: ${response.statusText}`);
    }
  }
} catch (error) {
  console.error('PostgREST request failed:', error);
}
```

## Integration with NVLP Services

All NVLP service classes automatically handle auth headers:

```typescript
// BaseService handles auth headers internally
class BudgetService extends BaseService {
  async getBudgets() {
    // Headers are automatically added by Supabase client
    return this.client
      .from('budgets')
      .select('*')
      .eq('is_active', true);
  }
}
```

For direct PostgREST access outside of service classes, use the utilities provided in this guide.