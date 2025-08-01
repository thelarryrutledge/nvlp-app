# Edge Functions Development Guide

This guide provides comprehensive instructions for developing and using NVLP's Edge Functions for complex business logic, validation, and multi-table operations.

## Table of Contents

1. [Overview](#overview)
2. [When to Use Edge Functions](#when-to-use-edge-functions)
3. [Architecture & Patterns](#architecture--patterns)
4. [Development Setup](#development-setup)
5. [Function Structure](#function-structure)
6. [Authentication & Authorization](#authentication--authorization)
7. [Validation & Error Handling](#validation--error-handling)
8. [Database Operations](#database-operations)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Monitoring & Debugging](#monitoring--debugging)
12. [Best Practices](#best-practices)

## Overview

NVLP uses Supabase Edge Functions for complex business logic that requires server-side processing, validation, and multi-table operations. Edge Functions run on Deno and provide a secure environment for operations that go beyond simple CRUD.

**Edge Functions vs PostgREST**: Use Edge Functions for complex operations with business logic, validation, and multi-step processes. Use PostgREST for simple CRUD operations and direct database queries.

## When to Use Edge Functions

### ✅ Perfect for Edge Functions:
- **Complex Transaction Creation**: Transactions with validation, balance checking, and constraint enforcement
- **Business Logic**: Multi-step operations that require server-side processing
- **Data Aggregation**: Complex calculations like dashboard summaries
- **Bulk Operations**: Processing multiple records with validation
- **External Integrations**: API calls to third-party services
- **Authentication Flows**: Magic link handling, user management
- **Notifications**: Email sending, webhook processing

### ❌ Better with PostgREST:
- Simple CRUD operations (Create, Read, Update, Delete)
- Direct data filtering and querying
- Straightforward data retrieval with relationships
- Basic data validation that can be handled by database constraints

## Architecture & Patterns

### Function Structure

All NVLP Edge Functions follow a consistent architectural pattern:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Authenticate user
    const authHeader = req.headers.get('Authorization')
    // ... authentication logic
    
    // 3. Parse URL and route
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    
    // 4. Handle specific routes
    if (req.method === 'POST' && pathParts[0] === 'budgets') {
      // Handle budget creation
    }
    
    // 5. Return 404 for unmatched routes
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    // 6. Global error handling
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

### Shared Utilities

Common functionality is shared across functions:

```typescript
// _shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

## Development Setup

### Prerequisites
- **Supabase CLI**: `npm install -g supabase`
- **Deno**: `curl -fsSL https://deno.land/install.sh | sh`
- **Docker**: Required for local development

### Local Development

```bash
# Start Supabase local development
supabase start

# Serve a specific function
supabase functions serve transactions

# Serve all functions
supabase functions serve

# View logs
supabase functions logs transactions
```

### Environment Variables

Functions access environment variables through `Deno.env.get()`:

```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
```

### Creating a New Function

```bash
# Create function directory and files
supabase functions new my-function

# This creates:
# supabase/functions/my-function/index.ts
```

## Function Structure

### Basic Function Template

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Your function logic here
    return new Response(
      JSON.stringify({ message: 'Hello from Edge Function!' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
```

### URL Routing Pattern

```typescript
const url = new URL(req.url)
const pathParts = url.pathname.split('/').filter(p => p)

// Handle different routes
if (req.method === 'GET' && pathParts.length === 3 && 
    pathParts[0] === 'budgets' && pathParts[2] === 'transactions') {
  const budgetId = pathParts[1]
  // Handle GET /budgets/{budgetId}/transactions
}

if (req.method === 'POST' && pathParts.length === 2 && 
    pathParts[0] === 'transactions') {
  const transactionId = pathParts[1]
  // Handle POST /transactions/{transactionId}
}
```

### Query Parameter Handling

```typescript
const params = url.searchParams

// Get query parameters
const limit = params.get('limit') ? parseInt(params.get('limit')!) : 50
const startDate = params.get('startDate')
const isCleared = params.get('isCleared') === 'true'

// Apply filters conditionally
let query = supabaseClient.from('transactions').select('*')

if (startDate) {
  query = query.gte('transaction_date', startDate)
}
if (params.get('isCleared') !== null) {
  query = query.eq('is_cleared', isCleared)
}
```

## Authentication & Authorization

### Standard Authentication Pattern

```typescript
// Extract and validate authorization header
const authHeader = req.headers.get('Authorization')
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return new Response(
    JSON.stringify({ error: 'Missing or invalid authorization header' }),
    { 
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

const token = authHeader.replace('Bearer ', '')

// Create authenticated Supabase client
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  }
)

// Verify token and get user
const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

if (userError || !user) {
  return new Response(
    JSON.stringify({ error: 'Invalid or expired token' }),
    { 
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}
```

### Budget Access Verification

```typescript
// Verify user has access to the budget
const { error: budgetError } = await supabaseClient
  .from('budgets')
  .select('id')
  .eq('id', budgetId)
  .eq('user_id', user.id)
  .single()

if (budgetError) {
  if (budgetError.code === 'PGRST116') {
    return new Response(
      JSON.stringify({ error: 'Budget not found or access denied' }),
      { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
  throw budgetError
}
```

### Service Role Authentication

For operations that need to bypass RLS (use sparingly):

```typescript
// Create service role client (bypasses RLS)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

**Security Warning**: Service role clients bypass Row Level Security. Only use when absolutely necessary and always validate user permissions manually.

## Validation & Error Handling

### Request Body Validation

```typescript
// Parse and validate request body
const body = await req.json()

// Validate required fields
if (!body.transaction_type || !body.amount || !body.transaction_date) {
  return new Response(
    JSON.stringify({ 
      error: 'transaction_type, amount, and transaction_date are required' 
    }),
    { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

// Validate data types and constraints
if (body.amount <= 0) {
  return new Response(
    JSON.stringify({ error: 'Transaction amount must be positive' }),
    { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

// Validate decimal places
if (!Number.isInteger(body.amount * 100)) {
  return new Response(
    JSON.stringify({ error: 'Amount can have at most 2 decimal places' }),
    { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}
```

### Business Logic Validation

```typescript
// Validate transaction type specific requirements
switch (body.transaction_type) {
  case 'income':
    if (!body.income_source_id || body.from_envelope_id || 
        body.to_envelope_id || body.payee_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Income transactions require income_source_id and no envelope or payee references' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Validate income source exists and is active
    const { data: incomeSource, error: incomeSourceError } = await supabaseClient
      .from('income_sources')
      .select('id, is_active')
      .eq('id', body.income_source_id)
      .eq('budget_id', budgetId)
      .single()
    
    if (incomeSourceError || !incomeSource || !incomeSource.is_active) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive income source' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    break
    
  // Handle other transaction types...
}
```

### Error Response Patterns

```typescript
// Standard error response helper
function errorResponse(message: string, status: number = 400) {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

// Usage
if (!body.required_field) {
  return errorResponse('required_field is required', 400)
}

// Handle database errors
try {
  const { data, error } = await supabaseClient.from('table').insert(data)
  if (error) throw error
} catch (error) {
  if (error.code === 'PGRST116') {
    return errorResponse('Record not found', 404)
  }
  throw error // Let global handler catch it
}
```

## Database Operations

### Complex Queries with Relationships

```typescript
// Get transaction with all related data
const { data: transaction, error } = await supabaseClient
  .from('transactions')
  .select(`
    *,
    from_envelope:envelopes!from_envelope_id(*),
    to_envelope:envelopes!to_envelope_id(*),
    payee:payees!payee_id(*),
    income_source:income_sources!income_source_id(*),
    category:categories!category_id(*)
  `)
  .eq('id', transactionId)
  .single()
```

### Database Functions (RPC)

```typescript
// Call database function for complex calculations
const { data: dashboardData, error: dashboardError } = await supabaseClient
  .rpc('get_dashboard_summary', {
    p_budget_id: budgetId
  })

if (dashboardError) {
  throw dashboardError
}
```

### Transactions and Atomic Operations

```typescript
// Use database transactions for atomic updates
const { data, error } = await supabaseClient.rpc('create_transaction_with_balance_update', {
  p_budget_id: budgetId,
  p_transaction_type: body.transaction_type,
  p_amount: body.amount,
  p_from_envelope_id: body.from_envelope_id,
  p_to_envelope_id: body.to_envelope_id
})

if (error) {
  throw error
}
```

### Bulk Operations

```typescript
// Process multiple records efficiently
const { data: envelopes } = await supabaseClient
  .from('envelopes')
  .select('*')
  .in('id', envelopeIds)
  .eq('budget_id', budgetId)

// Validate all envelopes exist
if (envelopes.length !== envelopeIds.length) {
  return errorResponse('One or more envelopes not found')
}

// Perform bulk update
const updates = envelopes.map(envelope => ({
  id: envelope.id,
  is_active: false,
  updated_at: new Date().toISOString()
}))

const { error: updateError } = await supabaseClient
  .from('envelopes')
  .upsert(updates)
```

## Testing

### Local Testing

```bash
# Test function locally
curl -X POST http://localhost:54321/functions/v1/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_type": "income",
    "amount": 1000.00,
    "transaction_date": "2025-01-31",
    "income_source_id": "uuid-here"
  }'
```

### Unit Testing with Deno

```typescript
// test/transaction-validation.test.ts
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts"

Deno.test("should validate transaction amount", () => {
  const amount = 100.00
  const isValid = Number.isInteger(amount * 100)
  assertEquals(isValid, true)
})

Deno.test("should reject negative amounts", () => {
  const amount = -50.00
  assertEquals(amount > 0, false)
})
```

### Integration Testing

```bash
# Run tests
deno test --allow-net --allow-env test/
```

### Testing with Mock Data

```typescript
// Create test helper
export function createMockRequest(
  method: string, 
  path: string, 
  body?: any,
  headers: Record<string, string> = {}
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer mock-token',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  })
}

// Use in tests
const request = createMockRequest('POST', '/budgets/123/transactions', {
  transaction_type: 'income',
  amount: 1000.00
})
```

## Deployment

### Deploy Single Function

```bash
# Deploy specific function
supabase functions deploy transactions

# Deploy with custom JWT secret
supabase functions deploy transactions --jwt-secret YOUR_JWT_SECRET
```

### Deploy All Functions

```bash
# Deploy all functions
supabase functions deploy
```

### Environment Variables in Production

```bash
# Set environment variables
supabase secrets set CUSTOM_SECRET=your-secret-value
supabase secrets set API_KEY=your-api-key

# List secrets
supabase secrets list
```

### Function URLs

Deployed functions are available at:

```bash
# Production URL pattern
https://YOUR_PROJECT_REF.supabase.co/functions/v1/FUNCTION_NAME

# Example
https://abcdefgh.supabase.co/functions/v1/transactions
```

## Monitoring & Debugging

### Logging

```typescript
// Structured logging
console.log('Transaction created', {
  transactionId: transaction.id,
  budgetId: budgetId,
  amount: body.amount,
  type: body.transaction_type,
  userId: user.id
})

// Error logging
console.error('Transaction validation failed', {
  error: error.message,
  budgetId: budgetId,
  requestBody: body
})
```

### View Logs

```bash
# View function logs
supabase functions logs transactions

# View logs with follow
supabase functions logs transactions --follow

# View logs with level filter
supabase functions logs transactions --level error
```

### Performance Monitoring

```typescript
// Add timing to critical operations
const startTime = Date.now()

// ... operation ...

const duration = Date.now() - startTime
console.log('Operation completed', {
  operation: 'create_transaction',
  duration_ms: duration,
  success: true
})
```

### Error Tracking

```typescript
// Comprehensive error logging
try {
  // ... operation ...
} catch (error) {
  console.error('Function error', {
    error: error.message,
    stack: error.stack,
    function: 'transactions',
    endpoint: req.url,
    method: req.method,
    userId: user?.id,
    timestamp: new Date().toISOString()
  })
  
  throw error
}
```

## Best Practices

### 1. Security
- **Always authenticate**: Verify JWT tokens and user permissions
- **Validate all inputs**: Never trust client data
- **Use RLS**: Rely on Row Level Security policies when possible
- **Minimize service role usage**: Only bypass RLS when absolutely necessary
- **Sanitize outputs**: Don't expose sensitive information in errors

### 2. Performance
- **Minimize database calls**: Batch operations when possible
- **Use database functions**: Push complex logic to SQL for better performance
- **Cache expensive operations**: Consider caching for repeated calculations
- **Optimize queries**: Use indexes and efficient query patterns
- **Handle timeouts**: Set reasonable timeouts for external calls

### 3. Error Handling
- **Consistent error format**: Use standard error response structure
- **Meaningful error messages**: Provide actionable feedback to clients
- **Log errors properly**: Include context for debugging
- **Handle database errors**: Map database error codes to HTTP status codes
- **Fail fast**: Validate inputs early to avoid partial operations

### 4. Code Organization
- **Single responsibility**: Each function should have a clear purpose
- **Reusable utilities**: Share common logic in `_shared` directory
- **Consistent patterns**: Follow established architectural patterns
- **Type safety**: Use TypeScript interfaces for better code quality
- **Documentation**: Comment complex business logic

### 5. Testing
- **Test locally first**: Use local development environment
- **Unit test validation**: Test business logic separately
- **Integration testing**: Test complete workflows
- **Mock external dependencies**: Isolate function logic from external services
- **Test error scenarios**: Ensure proper error handling

**💡 Pro Tip**: Start with PostgREST for simple operations, then migrate to Edge Functions when you need complex business logic. This approach keeps your architecture clean and performant.

This comprehensive guide covers all aspects of developing Edge Functions for NVLP. For detailed API documentation and PostgREST alternatives, see the [full API documentation](./POSTGREST_ENDPOINTS.md) and [PostgREST Integration Guide](./POSTGREST_INTEGRATION_GUIDE.md).