# PostgREST Integration Guide

This guide provides comprehensive instructions for integrating with NVLP's PostgREST API, including setup, authentication, client usage, and best practices.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Authentication Setup](#authentication-setup)
4. [Client Integration Options](#client-integration-options)
5. [Query Builder Usage](#query-builder-usage)
6. [Common Patterns](#common-patterns)
7. [Performance Optimization](#performance-optimization)
8. [Error Handling](#error-handling)
9. [Testing](#testing)
10. [Production Considerations](#production-considerations)

## Overview

NVLP provides two API interfaces:

- **PostgREST**: Direct database access with automatic RESTful endpoints for simple CRUD operations
- **Edge Functions**: Complex business logic, validation, and multi-table operations

PostgREST is ideal for:
- ✅ Simple CRUD operations (Create, Read, Update, Delete)
- ✅ Filtering and querying data
- ✅ Bulk operations
- ✅ High-performance read operations
- ✅ Complex queries with relationships

Use Edge Functions for:
- ❌ Complex transaction creation with validation
- ❌ Business logic enforcement
- ❌ Multi-table operations with constraints
- ❌ Balance calculations and updates

## Quick Start

### 1. Environment Setup

```bash
# Environment variables required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### 2. Basic Configuration

```javascript
// Direct fetch approach
const POSTGREST_URL = `${process.env.SUPABASE_URL}/rest/v1`;
const headers = {
  'apikey': process.env.SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};
```

### 3. Simple Query Example

```javascript
// Get all active budgets
const response = await fetch(`${POSTGREST_URL}/budgets?is_active=eq.true&order=created_at.desc`, {
  headers
});
const budgets = await response.json();
```

## Authentication Setup

### Token-Based Authentication

PostgREST requires a valid JWT token for all authenticated requests:

```javascript
// Get token from Supabase auth
const { data: { session } } = await supabaseClient.auth.getSession();
const token = session?.access_token;

// Include in all requests
const headers = {
  'apikey': process.env.SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${token}`,
  'Content-Profile': 'public',
  'Accept-Profile': 'public'
};
```

### Automatic Token Refresh

```javascript
async function getValidToken() {
  let session = await supabaseClient.auth.getSession();
  
  // Check if token is about to expire
  if (isTokenExpiring(session.data.session?.access_token)) {
    const { data } = await supabaseClient.auth.refreshSession();
    session = data;
  }
  
  return session.session?.access_token;
}

function isTokenExpiring(token) {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiryTime = payload.exp * 1000;
    const bufferMs = 5 * 60 * 1000; // 5 minute buffer
    return Date.now() > (expiryTime - bufferMs);
  } catch {
    return true;
  }
}
```

## Client Integration Options

### Option 1: NVLP Unified Client (Recommended)

The unified client provides a fluent query builder interface with automatic authentication:

```javascript
import { createNVLPClient, SupabaseSessionProvider } from '@nvlp/client';
import { createClient } from '@supabase/supabase-js';

// Setup
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
const sessionProvider = new SupabaseSessionProvider(supabaseClient);

const nvlp = createNVLPClient({
  supabaseUrl,
  supabaseAnonKey,
  sessionProvider,
});

// Usage examples
const budgets = await nvlp.budgets
  .select('*')
  .eq('is_active', true)
  .order('created_at', false)
  .get();

const envelope = await nvlp.envelopes
  .select('*, category:categories(*)')
  .eq('id', envelopeId)
  .single();
```

### Option 2: Direct Fetch with Helper Functions

```javascript
class PostgRESTClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  getHeaders(additional = {}) {
    return {
      'apikey': this.apiKey,
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...additional
    };
  }

  async query(table, params = {}) {
    const url = new URL(`${this.baseUrl}/${table}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`PostgREST query failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async create(table, data) {
    const response = await fetch(`${this.baseUrl}/${table}`, {
      method: 'POST',
      headers: this.getHeaders({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`PostgREST create failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
```

### Option 3: PostgREST-JS Library

```javascript
import { PostgrestClient } from '@supabase/postgrest-js';

const postgrest = new PostgrestClient(`${supabaseUrl}/rest/v1`, {
  headers: {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${userToken}`
  }
});

// Usage
const { data, error } = await postgrest
  .from('budgets')
  .select('*')
  .eq('is_active', true)
  .order('created_at', { ascending: false });
```

## Query Builder Usage

### Basic Filtering

```javascript
// Equality
await nvlp.budgets.eq('is_active', true).get();

// Comparison operators
await nvlp.envelopes.gt('current_balance', 0).get();
await nvlp.transactions.gte('transaction_date', '2025-01-01').get();
await nvlp.envelopes.lt('current_balance', 0).get();
await nvlp.transactions.lte('amount', 1000).get();

// Pattern matching
await nvlp.payees.like('name', '*grocery*').get();
await nvlp.categories.ilike('name', '*FOOD*').get(); // Case-insensitive

// List membership
await nvlp.envelopes.in('envelope_type', ['regular', 'savings']).get();

// Null checks
await nvlp.categories.isNull('parent_id').get(); // Top-level categories
await nvlp.envelopes.isNotNull('target_amount').get();
```

### Complex Filtering

```javascript
// OR conditions
await nvlp.transactions
  .or('transaction_type.eq.income,transaction_type.eq.allocation')
  .get();

// AND conditions (multiple filters are automatically ANDed)
await nvlp.envelopes
  .eq('budget_id', budgetId)
  .eq('is_active', true)
  .gt('current_balance', 0)
  .get();

// Complex OR with AND
await nvlp.transactions
  .eq('budget_id', budgetId)
  .or('(from_envelope_id.eq.' + envelopeId + ',to_envelope_id.eq.' + envelopeId + ')')
  .get();
```

### Ordering and Pagination

```javascript
// Ordering
await nvlp.budgets
  .order('created_at', false) // Descending
  .order('name', true)        // Then ascending by name
  .get();

// Pagination with limit/offset
await nvlp.transactions
  .eq('budget_id', budgetId)
  .order('transaction_date', false)
  .limit(50)
  .offset(100)
  .get();

// Range-based pagination
await nvlp.transactions
  .eq('budget_id', budgetId)
  .range(0, 49) // First 50 records
  .get();
```

### Selecting Columns and Relationships

```javascript
// Select specific columns
await nvlp.budgets
  .select('id,name,description')
  .get();

// Select with relationships
await nvlp.envelopes
  .select('*, category:categories(name), budget:budgets(name)')
  .eq('budget_id', budgetId)
  .get();

// Nested relationships
await nvlp.budgets
  .select(`
    *,
    categories(*),
    envelopes(*, category:categories(name)),
    transactions(*, from_envelope:envelopes(name))
  `)
  .eq('id', budgetId)
  .single();
```

### Data Modification

```javascript
// Create
const newBudget = await nvlp.budgets.post({
  name: 'My New Budget',
  description: 'Created via PostgREST',
  user_id: userId
});

// Update (with filters)
const updatedEnvelope = await nvlp.envelopes
  .eq('id', envelopeId)
  .patch({
    target_amount: 1000.00,
    description: 'Updated target'
  });

// Delete (soft delete recommended)
await nvlp.transactions
  .eq('id', transactionId)
  .patch({ is_deleted: true });

// Hard delete (use with caution)
await nvlp.categories
  .eq('id', categoryId)
  .delete();
```

## Common Patterns

### 1. Budget Data Loading

```javascript
async function loadBudgetData(budgetId) {
  // Load all budget-related data in parallel
  const [budget, categories, envelopes, payees, incomeSources] = await Promise.all([
    nvlp.budgets.eq('id', budgetId).single(),
    nvlp.categories.eq('budget_id', budgetId).order('display_order').get(),
    nvlp.envelopes.eq('budget_id', budgetId).eq('is_active', true).order('display_order').get(),
    nvlp.payees.eq('budget_id', budgetId).eq('is_active', true).order('name').get(),
    nvlp.incomeSources.eq('budget_id', budgetId).eq('is_active', true).order('name').get()
  ]);

  return { budget, categories, envelopes, payees, incomeSources };
}
```

### 2. Transaction History with Details

```javascript
async function getTransactionHistory(budgetId, limit = 50, offset = 0) {
  return await nvlp.transactions
    .select(`
      *,
      from_envelope:envelopes!from_envelope_id(name),
      to_envelope:envelopes!to_envelope_id(name),
      payee:payees(name),
      income_source:income_sources(name),
      category:categories(name)
    `)
    .eq('budget_id', budgetId)
    .eq('is_deleted', false)
    .order('transaction_date', false)
    .order('created_at', false)
    .limit(limit)
    .offset(offset)
    .get();
}
```

### 3. Envelope Balance Monitoring

```javascript
async function getNegativeBalanceEnvelopes(budgetId) {
  return await nvlp.envelopes
    .select('*, category:categories(name)')
    .eq('budget_id', budgetId)
    .eq('is_active', true)
    .lt('current_balance', 0)
    .order('current_balance') // Worst first
    .get();
}

async function getLowBalanceEnvelopes(budgetId, threshold = 50) {
  return await nvlp.envelopes
    .select('*, category:categories(name)')
    .eq('budget_id', budgetId)
    .eq('is_active', true)
    .gt('current_balance', 0)
    .lt('current_balance', threshold)
    .order('current_balance')
    .get();
}
```

### 4. Category Hierarchy Loading

```javascript
async function getCategoryTree(budgetId) {
  // Get all categories for the budget
  const categories = await nvlp.categories
    .eq('budget_id', budgetId)
    .order('display_order')
    .get();

  // Build tree structure
  const categoryMap = new Map(categories.map(cat => [cat.id, { ...cat, children: [] }]));
  const rootCategories = [];

  categories.forEach(category => {
    const categoryNode = categoryMap.get(category.id);
    
    if (category.parent_id) {
      const parent = categoryMap.get(category.parent_id);
      if (parent) {
        parent.children.push(categoryNode);
      }
    } else {
      rootCategories.push(categoryNode);
    }
  });

  return rootCategories;
}
```

### 5. Search and Filtering

```javascript
async function searchPayees(budgetId, query) {
  return await nvlp.payees
    .eq('budget_id', budgetId)
    .eq('is_active', true)
    .ilike('name', `*${query}*`)
    .order('name')
    .limit(20)
    .get();
}

async function getRecentTransactions(budgetId, days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return await nvlp.transactions
    .eq('budget_id', budgetId)
    .eq('is_deleted', false)
    .gte('transaction_date', cutoffDate.toISOString().split('T')[0])
    .order('transaction_date', false)
    .limit(100)
    .get();
}
```

## Performance Optimization

### 1. Use Indexes Effectively

Always include these filters when possible:

```javascript
// Budget-scoped queries (uses budget_id indexes)
await nvlp.envelopes.eq('budget_id', budgetId).get();

// Active record filters (uses partial indexes)
await nvlp.envelopes.eq('is_active', true).get();
await nvlp.transactions.eq('is_deleted', false).get();

// Date range queries (uses btree indexes)
await nvlp.transactions
  .gte('transaction_date', '2025-01-01')
  .lte('transaction_date', '2025-01-31')
  .get();
```

### 2. Optimize Column Selection

```javascript
// ❌ Don't select all columns if you don't need them
await nvlp.transactions.select('*').get();

// ✅ Select only needed columns
await nvlp.transactions
  .select('id,amount,description,transaction_date,transaction_type')
  .get();

// ✅ Use relationships efficiently
await nvlp.transactions
  .select('*, payee:payees(name)') // Only get payee name
  .eq('budget_id', budgetId)
  .get();
```

### 3. Batch Operations

```javascript
// ❌ Multiple individual requests
for (const envelope of envelopes) {
  await nvlp.envelopes.eq('id', envelope.id).patch({ is_active: false });
}

// ✅ Single bulk update
await nvlp.envelopes
  .in('id', envelopes.map(e => e.id))
  .patch({ is_active: false });
```

### 4. Pagination Best Practices

```javascript
// ✅ Use limit to prevent large result sets
const BATCH_SIZE = 50;

async function getAllTransactions(budgetId) {
  let offset = 0;
  let allTransactions = [];
  let batch;
  
  do {
    batch = await nvlp.transactions
      .eq('budget_id', budgetId)
      .eq('is_deleted', false)
      .order('created_at', false)
      .limit(BATCH_SIZE)
      .offset(offset)
      .get();
    
    allTransactions.push(...batch);
    offset += BATCH_SIZE;
  } while (batch.length === BATCH_SIZE);
  
  return allTransactions;
}
```

## Error Handling

### 1. HTTP Status Codes

```javascript
async function handlePostgRESTRequest(operation) {
  try {
    const result = await operation();
    return { data: result, error: null };
  } catch (error) {
    // Parse PostgREST error response
    let errorDetails = null;
    
    try {
      errorDetails = await error.response?.json();
    } catch {
      // Response wasn't JSON
    }

    switch (error.status || error.response?.status) {
      case 400:
        throw new Error(`Bad Request: ${errorDetails?.message || 'Invalid query parameters'}`);
      case 401:
        throw new Error('Unauthorized: Please log in again');
      case 403:
        throw new Error('Forbidden: You don\'t have access to this resource');
      case 404:
        throw new Error('Not Found: Resource doesn\'t exist');
      case 409:
        throw new Error(`Conflict: ${errorDetails?.message || 'Constraint violation'}`);
      case 416:
        throw new Error('Range Not Satisfiable: Invalid pagination range');
      default:
        throw new Error(`PostgREST Error: ${error.message}`);
    }
  }
}
```

### 2. RLS Policy Violations

```javascript
async function handleRLSError(error) {
  if (error.message.includes('RLS') || error.status === 403) {
    // Check session validity
    const session = await supabaseClient.auth.getSession();
    
    if (!session.data.session) {
      throw new Error('Authentication required: Please log in');
    }
    
    if (isTokenExpiring(session.data.session.access_token)) {
      // Try to refresh session
      const { error: refreshError } = await supabaseClient.auth.refreshSession();
      if (refreshError) {
        throw new Error('Session expired: Please log in again');
      }
      // Retry the original operation
      return true; // Indicate retry should happen
    }
    
    throw new Error('Access denied: You don\'t have permission for this resource');
  }
  
  return false; // No retry needed
}
```

### 3. Retry Logic with Exponential Backoff

```javascript
async function withRetry(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Handle auth errors with refresh
      if (error.status === 401 && attempt < maxRetries) {
        const shouldRetry = await handleRLSError(error);
        if (shouldRetry) {
          continue;
        }
      }
      
      // Handle temporary errors
      if ([408, 429, 500, 502, 503, 504].includes(error.status) && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
}
```

## Testing

### 1. Unit Testing PostgREST Operations

```javascript
// Mock PostgREST client for testing
class MockPostgRESTClient {
  constructor(mockData = {}) {
    this.mockData = mockData;
    this.operations = [];
  }

  from(table) {
    return new MockQueryBuilder(table, this.mockData[table] || [], this.operations);
  }
}

class MockQueryBuilder {
  constructor(table, data, operations) {
    this.table = table;
    this.data = data;
    this.operations = operations;
    this.filters = [];
  }

  eq(column, value) {
    this.filters.push({ column, op: 'eq', value });
    return this;
  }

  async get() {
    this.operations.push({ table: this.table, method: 'GET', filters: this.filters });
    
    // Apply filters to mock data
    let filtered = this.data;
    for (const filter of this.filters) {
      filtered = filtered.filter(item => item[filter.column] === filter.value);
    }
    
    return filtered;
  }
}

// Test example
describe('Budget Operations', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = new MockPostgRESTClient({
      budgets: [
        { id: '1', name: 'Test Budget', is_active: true },
        { id: '2', name: 'Inactive Budget', is_active: false }
      ]
    });
  });

  test('should get active budgets only', async () => {
    const budgets = await mockClient.from('budgets')
      .eq('is_active', true)
      .get();

    expect(budgets).toHaveLength(1);
    expect(budgets[0].name).toBe('Test Budget');
  });
});
```

### 2. Integration Testing

```javascript
// Integration test with real PostgREST
describe('PostgREST Integration', () => {
  let nvlpClient;
  let testBudgetId;

  beforeAll(async () => {
    // Set up test client
    nvlpClient = createNVLPClient({
      supabaseUrl: process.env.TEST_SUPABASE_URL,
      supabaseAnonKey: process.env.TEST_SUPABASE_ANON_KEY,
      sessionProvider: testSessionProvider
    });

    // Create test budget
    const budget = await nvlpClient.budgets.post({
      name: 'Test Budget',
      description: 'For integration testing'
    });
    testBudgetId = budget[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await nvlpClient.budgets.eq('id', testBudgetId).delete();
  });

  test('should create and retrieve categories', async () => {
    // Create category
    const category = await nvlpClient.categories.post({
      budget_id: testBudgetId,
      name: 'Test Category',
      is_income: false
    });

    // Retrieve category
    const retrieved = await nvlpClient.categories
      .eq('id', category[0].id)
      .single();

    expect(retrieved.name).toBe('Test Category');
    expect(retrieved.budget_id).toBe(testBudgetId);
  });
});
```

## Production Considerations

### 1. Connection Management

```javascript
// Use connection pooling for high-traffic applications
const postgrestClient = new PostgrestClient(postgrestUrl, {
  headers: defaultHeaders,
  fetch: customFetch, // Use a fetch implementation with connection pooling
});

// Custom fetch with pooling (using undici or similar)
import { Agent } from 'undici';

const agent = new Agent({
  connections: 100,
  keepAliveTimeout: 10000,
  keepAliveMaxTimeout: 10000
});

const customFetch = (url, options) => {
  return fetch(url, {
    ...options,
    dispatcher: agent
  });
};
```

### 2. Rate Limiting

```javascript
class RateLimitedPostgRESTClient {
  constructor(baseClient, requestsPerSecond = 10) {
    this.baseClient = baseClient;
    this.requestQueue = [];
    this.isProcessing = false;
    this.requestsPerSecond = requestsPerSecond;
    this.interval = 1000 / requestsPerSecond;
  }

  async executeRequest(operation) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ operation, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const { operation, resolve, reject } = this.requestQueue.shift();
      
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Wait before next request
      if (this.requestQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.interval));
      }
    }

    this.isProcessing = false;
  }
}
```

### 3. Monitoring and Logging

```javascript
class LoggingPostgRESTClient {
  constructor(baseClient, logger) {
    this.baseClient = baseClient;
    this.logger = logger;
  }

  async executeWithLogging(operation, context) {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);
    
    this.logger.info('PostgREST request started', {
      requestId,
      context,
      timestamp: new Date().toISOString()
    });

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.logger.info('PostgREST request completed', {
        requestId,
        duration,
        resultCount: Array.isArray(result) ? result.length : 1,
        context
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('PostgREST request failed', {
        requestId,
        duration,
        error: error.message,
        status: error.status,
        context
      });

      throw error;
    }
  }
}
```

### 4. Security Best Practices

```javascript
// Input validation and sanitization
function sanitizePostgRESTInput(input) {
  if (typeof input === 'string') {
    // Prevent injection attacks in PostgREST filters
    return input.replace(/[;'"\\]/g, '');
  }
  return input;
}

// Secure header management
function getSecureHeaders(token) {
  const headers = {
    'apikey': process.env.SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Info': 'nvlp-client/1.0.0'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// Request timeout to prevent hanging requests
const REQUEST_TIMEOUT = 30000; // 30 seconds

function withTimeout(promise, timeoutMs = REQUEST_TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
}
```

This integration guide provides comprehensive coverage of PostgREST integration patterns, from basic setup to production-ready implementations. Use it as a reference for building robust applications with NVLP's PostgREST API.

For detailed endpoint documentation, see [POSTGREST_ENDPOINTS.md](./POSTGREST_ENDPOINTS.md).