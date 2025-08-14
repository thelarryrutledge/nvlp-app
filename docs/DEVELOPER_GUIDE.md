# NVLP - Developer Integration Guide

## Overview

This guide provides comprehensive instructions for integrating with the NVLP API, covering both PostgREST endpoints and Edge Functions, authentication, testing, and best practices.

---

## Table of Contents

1. [API Architecture](#api-architecture)
2. [Quick Start](#quick-start)
3. [Authentication](#authentication)
4. [PostgREST Integration](#postgrest-integration)
5. [Edge Functions](#edge-functions)
6. [Testing with cURL](#testing-with-curl)
7. [Client Integration](#client-integration)
8. [Best Practices](#best-practices)

---

## API Architecture

NVLP provides two complementary API interfaces:

### PostgREST (Recommended for CRUD)
- **Direct database access** with automatic RESTful endpoints
- **High performance** with no cold start delays
- **Simple CRUD operations** (Create, Read, Update, Delete)
- **Complex queries** with filtering, sorting, and relationships
- **Bulk operations** for multiple records

### Edge Functions (For Complex Logic)
- **Custom business logic** and validation
- **Multi-table operations** with constraints
- **Authentication flows** (magic link, device management)
- **Balance calculations** and transaction processing

**Performance Comparison:**
- PostgREST: ~20-50ms response time
- Edge Functions: 50ms-10s (depending on cold start)

---

## Quick Start

### Environment Setup

```bash
# Required environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export USER_ACCESS_TOKEN="your-jwt-token"  # Obtained after authentication
export BUDGET_ID="your-budget-uuid"       # Your test budget ID
```

### Base URLs

```bash
# PostgREST endpoints
POST_REST_URL="$SUPABASE_URL/rest/v1"

# Edge Functions endpoints  
FUNCTIONS_URL="$SUPABASE_URL/functions/v1"
```

---

## Authentication

### Magic Link Authentication

```bash
# 1. Request magic link
curl -X POST "$FUNCTIONS_URL/auth-magic-link" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "email": "user@example.com",
    "redirectTo": "https://yourapp.com/auth/callback"
  }'

# Response (200 OK):
{
  "success": true,
  "message": "Magic link sent to your email"
}
```

### JWT Token Usage

All API requests require authentication headers:

```bash
# Required headers for PostgREST
-H "Authorization: Bearer $USER_ACCESS_TOKEN"
-H "apikey: $SUPABASE_ANON_KEY"
-H "Content-Type: application/json"

# Required headers for Edge Functions
-H "Authorization: Bearer $USER_ACCESS_TOKEN"
-H "Content-Type: application/json"
```

### Device Management (Enhanced Security)

```bash
# Register device (automatic on auth)
curl -X POST "$FUNCTIONS_URL/device-management/register" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "X-Device-ID: your-device-id" \
  -d '{
    "device_fingerprint": "device-unique-hash",
    "device_name": "iPhone 15 Pro",
    "device_type": "ios"
  }'

# List active devices
curl -X GET "$FUNCTIONS_URL/device-management/list" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN"

# Sign out specific device
curl -X DELETE "$FUNCTIONS_URL/device-management/{deviceId}" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN"

# Sign out all other devices
curl -X POST "$FUNCTIONS_URL/device-management/signout-all" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN"
```

---

## PostgREST Integration

### Base URL Structure

```
{SUPABASE_URL}/rest/v1/{table_name}
```

### Common Query Parameters

#### Filtering
```bash
# Equals
?column=eq.value

# Greater than, less than
?amount=gt.100&amount=lt.1000

# Pattern matching
?name=like.*budget*
?name=ilike.*BUDGET*  # case-insensitive

# In list
?id=in.(uuid1,uuid2,uuid3)

# Is null/not null
?deleted_at=is.null
?deleted_at=not.is.null
```

#### Sorting and Pagination
```bash
# Sorting
?order=created_at.desc
?order=name.asc,created_at.desc

# Pagination
?limit=20&offset=0
?limit=20&offset=20  # Next page

# Range (alternative to limit/offset)
-H "Range: 0-19"     # First 20 records
-H "Range: 20-39"    # Next 20 records
```

#### Relationships (Embedding)
```bash
# Include related data
?select=*,category(name,color)
?select=*,envelopes(name,current_balance)

# Nested relationships
?select=*,transactions(amount,payee(name))
```

### Core Entity Operations

#### Budgets
```bash
# List user's budgets
curl -X GET "$POST_REST_URL/budgets" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Get specific budget with envelopes
curl -X GET "$POST_REST_URL/budgets?id=eq.$BUDGET_ID&select=*,envelopes(*)" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Create new budget
curl -X POST "$POST_REST_URL/budgets" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monthly Budget",
    "description": "Main household budget",
    "currency": "USD"
  }'

# Update budget
curl -X PATCH "$POST_REST_URL/budgets?id=eq.$BUDGET_ID" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Budget Name"
  }'
```

#### Envelopes
```bash
# List budget envelopes with categories
curl -X GET "$POST_REST_URL/envelopes?budget_id=eq.$BUDGET_ID&select=*,category(name,color)&order=name.asc" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Create envelope
curl -X POST "$POST_REST_URL/envelopes" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "name": "Groceries",
    "description": "Food and household items",
    "target_amount": 500.00
  }'

# Update envelope target
curl -X PATCH "$POST_REST_URL/envelopes?id=eq.ENVELOPE_ID" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "target_amount": 600.00
  }'

# Bulk update envelopes (reordering)
curl -X PATCH "$POST_REST_URL/envelopes" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '[
    {"id": "uuid1", "sort_order": 0},
    {"id": "uuid2", "sort_order": 1}
  ]'
```

#### Transactions
```bash
# List transactions with full details
curl -X GET "$POST_REST_URL/transactions?budget_id=eq.$BUDGET_ID&select=*,from_envelope(name),to_envelope(name),payee(name),income_source(name)&order=transaction_date.desc&limit=50" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Filter transactions by type
curl -X GET "$POST_REST_URL/transactions?budget_id=eq.$BUDGET_ID&transaction_type=eq.EXPENSE&select=*,from_envelope(name),payee(name)" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Filter by date range
curl -X GET "$POST_REST_URL/transactions?budget_id=eq.$BUDGET_ID&transaction_date=gte.2024-01-01&transaction_date=lte.2024-01-31" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Get transaction count by type
curl -X GET "$POST_REST_URL/transactions?budget_id=eq.$BUDGET_ID&select=transaction_type" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Prefer: count=exact"
```

#### Categories, Payees, Income Sources
```bash
# List categories
curl -X GET "$POST_REST_URL/categories?budget_id=eq.$BUDGET_ID&order=name.asc" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"

# List payees with payment totals
curl -X GET "$POST_REST_URL/payees?budget_id=eq.$BUDGET_ID&order=name.asc" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"

# List income sources
curl -X GET "$POST_REST_URL/income_sources?budget_id=eq.$BUDGET_ID&order=name.asc" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Create category
curl -X POST "$POST_REST_URL/categories" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "name": "Food",
    "category_type": "EXPENSE",
    "color": "#FF6B6B"
  }'
```

---

## Edge Functions

### Transaction Creation (Complex Business Logic)

```bash
# Create income transaction
curl -X POST "$FUNCTIONS_URL/transactions" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "INCOME",
    "amount": 3000.00,
    "description": "Salary",
    "transaction_date": "2024-01-15",
    "income_source_id": "income-source-uuid"
  }'

# Create allocation transaction
curl -X POST "$FUNCTIONS_URL/transactions" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "ALLOCATION",
    "amount": 500.00,
    "description": "Allocate to groceries",
    "transaction_date": "2024-01-15",
    "to_envelope_id": "envelope-uuid"
  }'

# Create expense transaction
curl -X POST "$FUNCTIONS_URL/transactions" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "EXPENSE",
    "amount": 75.50,
    "description": "Grocery shopping",
    "transaction_date": "2024-01-16",
    "from_envelope_id": "envelope-uuid",
    "payee_id": "payee-uuid"
  }'

# Create transfer transaction
curl -X POST "$FUNCTIONS_URL/transactions" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "TRANSFER",
    "amount": 100.00,
    "description": "Move to savings",
    "transaction_date": "2024-01-16",
    "from_envelope_id": "source-envelope-uuid",
    "to_envelope_id": "target-envelope-uuid"
  }'
```

### Budget Setup Functions

```bash
# Setup default categories and envelopes
curl -X POST "$FUNCTIONS_URL/budgets/$BUDGET_ID/setup/defaults" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json"

# Setup demo data (for testing)
curl -X POST "$FUNCTIONS_URL/budgets/$BUDGET_ID/setup/demo" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Client Integration

### JavaScript/TypeScript Integration

```typescript
// Using Supabase client directly
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// PostgREST operations
const { data: budgets, error } = await supabase
  .from('budgets')
  .select('*')
  .order('created_at', { ascending: false })

// Edge Function calls
const { data, error } = await supabase.functions.invoke('transactions', {
  body: {
    budget_id: budgetId,
    transaction_type: 'INCOME',
    amount: 1000.00,
    description: 'Salary',
    income_source_id: sourceId
  }
})
```

### React Integration Example

```typescript
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
)

function BudgetsList() {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBudgets() {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          envelopes(count),
          transactions(count)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching budgets:', error)
      } else {
        setBudgets(data || [])
      }
      setLoading(false)
    }

    fetchBudgets()
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div>
      {budgets.map(budget => (
        <div key={budget.id}>
          <h3>{budget.name}</h3>
          <p>Available: ${budget.available_amount}</p>
          <p>Envelopes: {budget.envelopes?.[0]?.count || 0}</p>
          <p>Transactions: {budget.transactions?.[0]?.count || 0}</p>
        </div>
      ))}
    </div>
  )
}
```

### Using @nvlp/client Package

```typescript
import { NVLPClient } from '@nvlp/client'

const client = new NVLPClient({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  accessToken: userToken
})

// High-level API with built-in error handling
const budgets = await client.budgets.list()
const envelopes = await client.envelopes.listByBudget(budgetId)

// Transaction creation with validation
const transaction = await client.transactions.create({
  budgetId,
  type: 'EXPENSE',
  amount: 25.99,
  description: 'Coffee',
  fromEnvelopeId: groceriesEnvelopeId,
  payeeId: starbucksPayeeId
})
```

---

## Best Practices

### Performance Optimization

1. **Use PostgREST for CRUD Operations**
   ```bash
   # ✅ Fast: Direct PostgREST
   curl "$POST_REST_URL/budgets"
   
   # ❌ Slower: Through Edge Function
   curl "$FUNCTIONS_URL/budgets"
   ```

2. **Leverage Query Embedding**
   ```bash
   # ✅ Single request with relationships
   curl "$POST_REST_URL/budgets?select=*,envelopes(*),categories(*)"
   
   # ❌ Multiple requests
   curl "$POST_REST_URL/budgets"
   curl "$POST_REST_URL/envelopes?budget_id=eq.$BUDGET_ID"
   ```

3. **Use Bulk Operations**
   ```bash
   # ✅ Bulk insert
   curl -X POST "$POST_REST_URL/categories" \
     -d '[{"name":"Food"},{"name":"Transport"}]'
   
   # ❌ Individual inserts
   curl -X POST "$POST_REST_URL/categories" -d '{"name":"Food"}'
   curl -X POST "$POST_REST_URL/categories" -d '{"name":"Transport"}'
   ```

### Error Handling

```bash
# Check for specific error types
case "$http_status" in
  200|201) echo "Success" ;;
  400) echo "Validation error - check request data" ;;
  401) echo "Authentication required - token may be expired" ;;
  403) echo "Access denied - check permissions" ;;
  404) echo "Resource not found" ;;
  409) echo "Conflict - resource may already exist" ;;
  429) echo "Rate limited - wait and retry" ;;
  500) echo "Server error - try again later" ;;
esac
```

### Security Best Practices

1. **Always include Device ID for enhanced security**
   ```bash
   -H "X-Device-ID: your-unique-device-id"
   ```

2. **Handle session invalidation**
   ```bash
   # Look for SESSION_INVALIDATED in error responses
   # Re-authenticate user when this occurs
   ```

3. **Use HTTPS only**
   ```bash
   # ✅ Always use HTTPS
   https://your-project.supabase.co/rest/v1/
   
   # ❌ Never use HTTP
   http://your-project.supabase.co/rest/v1/
   ```

### Data Validation

1. **Validate data before sending**
   ```bash
   # Check required fields are present
   # Validate email formats, UUIDs, amounts
   # Ensure enums match expected values
   ```

2. **Handle validation errors gracefully**
   ```bash
   # Parse validation error details from 400 responses
   # Display user-friendly error messages
   # Guide users to fix specific issues
   ```

### Testing Strategies

1. **Use environment variables for configuration**
2. **Test with both valid and invalid data**
3. **Verify Row Level Security with multiple users**
4. **Test rate limiting behavior**
5. **Verify proper error response formats**

---

This developer guide provides comprehensive coverage of the NVLP API, from basic CRUD operations to complex business logic, enabling developers to build robust integrations with the NVLP system.