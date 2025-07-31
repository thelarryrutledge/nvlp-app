# NVLP Client Library

A unified TypeScript client library for the NVLP (Virtual Envelope Budgeting System) that provides both PostgREST database access and Edge Function API calls with automatic authentication.

## Overview

This package provides a single, unified client that handles all NVLP interactions:

- **🎯 Unified Interface**: One client for both PostgREST (database) and Edge Functions (API)
- **🔐 Automatic Authentication**: Built-in JWT token management and refresh
- **🔄 Retry Logic**: Automatic retry with exponential backoff for failed requests
- **📝 Type Safety**: Full TypeScript support with database schema types
- **⚡ Performance**: Optimized for both direct database access and complex API operations

## Recommended Usage: Unified Client

The **NVLPClient** is the recommended way to interact with NVLP. It combines all functionality into a single, easy-to-use interface.

## Installation

```bash
# Install in the workspace
pnpm install @nvlp/client

# Or install in a specific package
pnpm --filter your-app add @nvlp/client
```

## Quick Start

### Unified Client (Recommended)

```typescript
import { createNVLPClient, SessionProvider } from '@nvlp/client';
import { createClient } from '@supabase/supabase-js';

// Create session provider (integrate with your auth system)
class MySessionProvider implements SessionProvider {
  // ... implement session management
}

// Create unified NVLP client
const nvlp = createNVLPClient({
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-anon-key',
  customDomain: 'https://api.yourdomain.com', // Optional
  sessionProvider: new MySessionProvider(),
});

// Use PostgREST for direct database access
const budgets = await nvlp.budgets
  .eq('is_active', true)
  .order('created_at', false)
  .get();

// Use Edge Functions for complex operations
const dashboard = await nvlp.get(`/budgets/${budgetId}/dashboard`);
const newTransaction = await nvlp.post(`/budgets/${budgetId}/transactions`, transactionData);
```

### Simple Setup from Environment

```typescript
import { createNVLPClientFromEnv } from '@nvlp/client';

// Automatically uses SUPABASE_URL and SUPABASE_ANON_KEY environment variables
const nvlp = createNVLPClientFromEnv({
  customDomain: 'https://api.yourdomain.com',
});

// Add authentication later
nvlp.setSessionProvider(sessionProvider);
```

### Authenticated Client

```typescript
import { createAuthenticatedPostgRESTClient, SessionProvider } from '@nvlp/client';

// Implement session provider (integrate with your auth system)
const sessionProvider: SessionProvider = {
  getSession: () => yourAuthSystem.getSession(),
  ensureValidSession: () => yourAuthSystem.ensureValidSession(),
  onSessionChange: (handler) => yourAuthSystem.onSessionChange(handler),
};

// Create authenticated client
const authClient = createAuthenticatedPostgRESTClient(
  { supabaseUrl: '...', supabaseAnonKey: '...' },
  sessionProvider
);

// Use convenience methods (automatic auth handling)
const budgets = await authClient.budgets.list();
const categories = await authClient.categories.listByBudget(budgetId);
```

## API Reference

### PostgRESTClient

The main client class for PostgREST interactions.

```typescript
// Create client
const client = createPostgRESTClient({
  url: 'https://your-project.supabase.co',
  anonKey: 'your-anon-key',
  token: 'optional-jwt-token',
});

// Table access
client.budgets          // budgets table
client.categories       // categories table  
client.envelopes        // envelopes table
client.transactions     // transactions table
client.payees          // payees table
client.incomeSources   // income_sources table
client.userProfiles    // user_profiles table
client.transactionEvents // transaction_events table
```

### Query Builder

Fluent interface for building queries:

```typescript
// Filtering
client.budgets
  .eq('is_active', true)              // WHERE is_active = true
  .neq('user_id', 'some-id')          // WHERE user_id != 'some-id'
  .gt('available_amount', 0)          // WHERE available_amount > 0
  .gte('created_at', '2025-01-01')    // WHERE created_at >= '2025-01-01'
  .lt('updated_at', '2025-12-31')     // WHERE updated_at < '2025-12-31'
  .lte('available_amount', 1000)      // WHERE available_amount <= 1000
  .like('name', '*Budget*')           // WHERE name LIKE '%Budget%'
  .ilike('description', '*test*')     // WHERE description ILIKE '%test%'
  .in('id', ['id1', 'id2', 'id3'])   // WHERE id IN ('id1', 'id2', 'id3')
  .isNull('description')              // WHERE description IS NULL
  .isNotNull('description')           // WHERE description IS NOT NULL

// Complex filters
  .or('name.eq.Budget1,name.eq.Budget2')  // WHERE (name = 'Budget1' OR name = 'Budget2')
  .and('is_active.eq.true,user_id.eq.123') // WHERE (is_active = true AND user_id = '123')

// Ordering
  .order('created_at', false)         // ORDER BY created_at DESC
  .order('name', true)                // ORDER BY name ASC

// Pagination
  .limit(10)                          // LIMIT 10
  .offset(20)                         // OFFSET 20
  .range(0, 9)                        // Range header: 0-9

// Selection
  .select('id,name,created_at')       // SELECT specific columns
  .select('*,envelopes(*)')           // SELECT with relationships

// Execution
  .get()                              // Execute and return array
  .single()                           // Execute and return single record
  .post(data)                         // INSERT
  .patch(data)                        // UPDATE
  .delete()                           // DELETE
```

### Authenticated Client Convenience Methods

The authenticated client provides convenient methods for common operations:

```typescript
// Budgets
await authClient.budgets.list()                    // List user's budgets
await authClient.budgets.get(id)                   // Get budget by ID
await authClient.budgets.create(data)              // Create budget
await authClient.budgets.update(id, data)          // Update budget
await authClient.budgets.delete(id)                // Delete budget

// Categories  
await authClient.categories.listByBudget(budgetId) // List categories for budget
await authClient.categories.getTree(budgetId)      // Get hierarchical categories
await authClient.categories.get(id)                // Get category by ID
await authClient.categories.create(data)           // Create category
await authClient.categories.update(id, data)       // Update category
await authClient.categories.delete(id)             // Delete category

// Envelopes
await authClient.envelopes.listByBudget(budgetId)       // List envelopes for budget
await authClient.envelopes.getNegativeBalance(budgetId) // Get negative balance envelopes
await authClient.envelopes.getByType(budgetId, type)    // Get envelopes by type
await authClient.envelopes.get(id)                      // Get envelope by ID
await authClient.envelopes.create(data)                 // Create envelope
await authClient.envelopes.update(id, data)             // Update envelope
await authClient.envelopes.delete(id)                   // Delete envelope

// Transactions
await authClient.transactions.listByBudget(budgetId, limit) // List transactions for budget
await authClient.transactions.get(id)                       // Get transaction with details
await authClient.transactions.getByEnvelope(envelopeId)     // Get envelope transactions
await authClient.transactions.getByPayee(payeeId)          // Get payee transactions  
await authClient.transactions.getUncleared(budgetId)       // Get uncleared transactions
await authClient.transactions.create(data)                 // Create transaction
await authClient.transactions.update(id, data)             // Update transaction
await authClient.transactions.softDelete(id)               // Soft delete transaction
await authClient.transactions.restore(id)                  // Restore transaction

// Payees
await authClient.payees.listByBudget(budgetId)        // List payees for budget
await authClient.payees.search(budgetId, query)       // Search payees
await authClient.payees.get(id)                       // Get payee by ID
await authClient.payees.create(data)                  // Create payee
await authClient.payees.update(id, data)              // Update payee
await authClient.payees.delete(id)                    // Delete payee

// Income Sources
await authClient.incomeSources.listByBudget(budgetId)     // List income sources for budget
await authClient.incomeSources.getUpcoming(budgetId, date) // Get upcoming income
await authClient.incomeSources.get(id)                    // Get income source by ID
await authClient.incomeSources.create(data)               // Create income source
await authClient.incomeSources.update(id, data)           // Update income source
await authClient.incomeSources.delete(id)                 // Delete income source
```

## Configuration

### Environment Variables

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Custom Configuration

```typescript
import { createClientFromConfig } from '@nvlp/client';

const client = createClientFromConfig({
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-anon-key',
  customDomain: 'https://api.yourdomain.com',  // Optional custom domain
  schema: 'public',                            // Database schema
  headers: {                                   // Additional headers
    'User-Agent': 'MyApp/1.0.0',
  },
});
```

## Examples

See the `/examples` directory for comprehensive usage examples:

- `basic-usage.ts` - Basic PostgREST client usage
- `authenticated-usage.ts` - Authenticated client with session management

## When to Use PostgREST vs Edge Functions

### Use PostgREST for:
- Simple CRUD operations
- Data querying and filtering  
- Bulk operations
- Direct database access with proper RLS

### Use Edge Functions for:
- Complex transaction creation with validation
- Business logic enforcement
- Multi-table operations requiring transactions
- Balance calculations and updates
- Complex aggregations and reporting

## Security

- All requests automatically include Row Level Security (RLS) enforcement
- JWT tokens are required for all operations
- User data is automatically isolated by budget ownership
- Sensitive operations should use Edge Functions for additional validation

## Performance

- Built-in query optimization with proper indexing
- Automatic JWT token refresh handling
- Connection pooling through PostgREST
- Caching support via standard HTTP headers

## Error Handling

```typescript
try {
  const budget = await client.budgets.eq('id', 'invalid-id').single();
} catch (error) {
  if (error.message.includes('401')) {
    // Handle authentication error
  } else if (error.message.includes('403')) {
    // Handle authorization error (RLS)
  } else if (error.message.includes('404')) {
    // Handle not found
  } else {
    // Handle other errors
  }
}
```

## TypeScript Support

This package is built with TypeScript and provides full type safety:

```typescript
import type { Database } from '@nvlp/types';

// All database types are available
type Budget = Database['public']['Tables']['budgets']['Row'];
type NewBudget = Database['public']['Tables']['budgets']['Insert'];
type UpdateBudget = Database['public']['Tables']['budgets']['Update'];
```

## License

Private - Part of the NVLP project.