# NVLP Client Library

A comprehensive TypeScript client library for the NVLP (Virtual Envelope Budget) API, providing a unified interface for both PostgREST direct calls and Edge Function complex operations.

## Features

- 🔐 **Complete Authentication Management** - Login, logout, token refresh, and persistence
- ⚡ **Dual Transport Layer** - Fast PostgREST for CRUD operations, Edge Functions for complex logic
- 💾 **Automatic Token Persistence** - Saves tokens securely and restores sessions automatically
- 🔄 **Auto Token Refresh** - Automatically refreshes tokens when needed
- 🛡️ **Type Safety** - Full TypeScript support with comprehensive type definitions
- 🚨 **Robust Error Handling** - Custom error classes with proper HTTP status mapping
- 🧪 **Well Tested** - Comprehensive test suite validating all functionality

## Quick Start

### Installation

```bash
npm install @nvlp/client-library
```

### Basic Usage

```javascript
import { NVLPClient } from '@nvlp/client-library';

const client = new NVLPClient({
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-anon-key',
  persistTokens: true,  // Save tokens automatically
  autoRefresh: true     // Refresh tokens when needed
});

// Login (tokens are automatically saved)
const { user, session } = await client.login('user@example.com', 'password');

// Make authenticated API calls
const budgets = await client.getBudgets();
const profile = await client.getProfile();

// Create resources
const newBudget = await client.createBudget({
  name: 'My Budget',
  description: 'Monthly household budget'
});

// Logout (clears all tokens)
await client.logout();
```

### Session Persistence

The client automatically handles session persistence:

```javascript
// First time - login required
const client1 = new NVLPClient(config);
await client1.login('user@example.com', 'password');

// Later - automatic session restoration
const client2 = new NVLPClient(config);
// Already authenticated! Tokens loaded from storage
const budgets = await client2.getBudgets(); // Works immediately
```

## Configuration

```javascript
const config = {
  supabaseUrl: string;           // Required: Supabase project URL
  supabaseAnonKey: string;       // Required: Supabase anonymous key
  transport?: 'postgrest' | 'edge-function' | 'hybrid'; // Default: 'postgrest'
  timeout?: number;              // Default: 30000ms
  retries?: number;              // Default: 3
  persistTokens?: boolean;       // Default: true
  tokenStorageKey?: string;      // Default: 'nvlp_auth_tokens'
  autoRefresh?: boolean;         // Default: true
};
```

## API Reference

### Authentication

```javascript
// Login with email/password
const result = await client.login(email, password);

// Register new user
const user = await client.register(email, password, displayName);

// Logout and clear tokens
await client.logout();

// Reset password
await client.resetPassword(email);

// Update password (requires authentication)
await client.updatePassword(newPassword);

// Check authentication status
const isAuth = client.isAuthenticated();
const authState = client.getAuthState();
```

### User Profile

```javascript
// Get user profile
const profile = await client.getProfile();

// Update profile
const updated = await client.updateProfile({
  display_name: 'New Name',
  timezone: 'America/New_York'
});
```

### Budgets

```javascript
// Get all budgets
const budgets = await client.getBudgets();

// Get specific budget
const budget = await client.getBudget(budgetId);

// Create budget
const newBudget = await client.createBudget({
  name: 'Monthly Budget',
  description: 'Household expenses'
});

// Update budget
const updated = await client.updateBudget(budgetId, {
  name: 'Updated Budget Name'
});

// Delete budget
await client.deleteBudget(budgetId);
```

### Income Sources

```javascript
// Get income sources (all or by budget)
const incomeSources = await client.getIncomeSources(budgetId);

// Create income source
const income = await client.createIncomeSource({
  budget_id: budgetId,
  name: 'Salary',
  expected_monthly_amount: 5000,
  frequency: 'monthly'
});

// Update/delete
await client.updateIncomeSource(id, updates);
await client.deleteIncomeSource(id);
```

### Categories, Envelopes, and Payees

Similar CRUD operations are available for:
- `getCategories()`, `createCategory()`, etc.
- `getEnvelopes()`, `createEnvelope()`, etc.
- `getPayees()`, `createPayee()`, etc.

## Token Storage

### Browser Environment
Tokens are stored in `localStorage` under the configured key (default: `nvlp_auth_tokens`).

### Node.js Environment
Tokens are stored in `~/.nvlp/auth.json` for security and persistence across sessions.

### Manual Token Management

```javascript
// Disable automatic persistence
const client = new NVLPClient({
  ...config,
  persistTokens: false
});

// Manual token management
const { TokenManager } = require('@nvlp/client-library');
const tokenManager = new TokenManager('custom_key', true, true);

// Save tokens manually
tokenManager.saveTokens(accessToken, refreshToken, expiresIn, user);

// Load tokens manually
const persistedAuth = tokenManager.loadTokens();
```

## Error Handling

The library provides comprehensive error handling:

```javascript
import { 
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  NetworkError 
} from '@nvlp/client-library';

try {
  await client.getBudgets();
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Redirect to login
    await client.login(email, password);
  } else if (error instanceof ValidationError) {
    // Handle validation errors
    console.error('Validation failed:', error.details);
  } else if (error instanceof NetworkError) {
    // Handle network issues
    console.error('Network error:', error.message);
  }
}
```

## Advanced Usage

### Direct Transport Access

```javascript
// Access PostgREST transport for advanced queries
const postgrest = client.getPostgRESTTransport();
const response = await postgrest.get('budgets', {
  select: 'id,name',
  limit: 10,
  order: 'created_at.desc'
});

// Access Edge Function transport for complex operations
const edgeFunction = client.getEdgeFunctionTransport();
const result = await edgeFunction.callFunction('complex-report', {
  budget_id: 'uuid',
  date_range: { start: '2024-01-01', end: '2024-12-31' }
});
```

### Health Monitoring

```javascript
const health = await client.healthCheck();
console.log(health); // { status: 'healthy', timestamp: '...' }
```

## Best Practices

1. **Always enable token persistence** for production applications
2. **Handle authentication errors gracefully** with proper login redirects
3. **Use try-catch blocks** around API calls for robust error handling
4. **Check authentication status** before making API calls in long-running applications
5. **Leverage auto-refresh** to maintain seamless user experience

## TypeScript Support

The library is built with TypeScript and provides comprehensive type definitions:

```typescript
import { 
  NVLPClient, 
  Budget, 
  CreateBudgetInput,
  AuthState 
} from '@nvlp/client-library';

const client: NVLPClient = new NVLPClient(config);
const budgets: Budget[] = await client.getBudgets();
const authState: AuthState = client.getAuthState();
```

## Examples

See the example files in the repository:
- `example-client-usage.js` - Basic usage patterns
- `test-client-auth.js` - Authentication flow testing
- `test-client-library.js` - Comprehensive API testing

## Performance

- **PostgREST Transport**: <50ms response times for CRUD operations
- **Edge Function Transport**: 2-10s cold start, then fast for complex operations
- **Token Persistence**: Instant session restoration on client initialization
- **Auto Refresh**: Seamless token renewal without user interruption

## Support

For issues, questions, or contributions, please visit the [NVLP GitHub repository](https://github.com/thelarryrutledge/nvlp-app).