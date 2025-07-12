# @nvlp/client

A comprehensive TypeScript client library for the NVLP (Virtual Envelope Budget) API, providing a unified interface for both PostgREST direct calls and Edge Function complex operations.

## Features

- 🔐 **Complete Authentication Management** - Login, logout, token refresh, and persistence
- ⚡ **Dual Transport Layer** - Fast PostgREST for CRUD operations, Edge Functions for complex logic
- 💾 **Automatic Token Persistence** - Saves tokens securely and restores sessions automatically
- 🔄 **Auto Token Refresh** - Automatically refreshes tokens when needed
- 🛡️ **Type Safety** - Full TypeScript support with comprehensive type definitions
- 🚨 **Robust Error Handling** - Custom error classes with proper HTTP status mapping
- 🌐 **Universal Compatibility** - Works in both Node.js and browser environments
- 📦 **Zero Dependencies** - Uses only web standard APIs, no external runtime dependencies

## Installation

```bash
# From the monorepo root
pnpm install

# Or install in your project
npm install @nvlp/client
```

## Quick Start

### Basic Usage

```typescript
import { NVLPClient } from '@nvlp/client';

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

```typescript
// First time - login required
const client1 = new NVLPClient(config);
await client1.login('user@example.com', 'password');

// Later - automatic session restoration
const client2 = new NVLPClient(config);
// Already authenticated! Tokens loaded from storage
const budgets = await client2.getBudgets(); // Works immediately
```

## Configuration

```typescript
interface NVLPClientConfig {
  supabaseUrl: string;           // Required: Supabase project URL
  supabaseAnonKey: string;       // Required: Supabase anonymous key
  transport?: 'postgrest' | 'edge-function' | 'hybrid'; // Default: 'postgrest'
  timeout?: number;              // Default: 30000ms
  retries?: number;              // Default: 3
  persistTokens?: boolean;       // Default: true
  tokenStorageKey?: string;      // Default: 'nvlp_auth_tokens'
  autoRefresh?: boolean;         // Default: true
  apiBaseUrl?: string;           // Custom Edge Functions URL
  dbApiUrl?: string;             // Custom PostgREST URL
}
```

## API Reference

### Authentication

```typescript
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

```typescript
// Get user profile
const profile = await client.getProfile();

// Update profile
const updated = await client.updateProfile({
  display_name: 'New Name',
  timezone: 'America/New_York'
});
```

### Budgets

```typescript
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

```typescript
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

```typescript
// Disable automatic persistence
const client = new NVLPClient({
  ...config,
  persistTokens: false
});

// Manual token management
import { TokenManager } from '@nvlp/client';
const tokenManager = new TokenManager('custom_key', true, true);

// Save tokens manually
tokenManager.saveTokens(accessToken, refreshToken, expiresIn, user);

// Load tokens manually
const persistedAuth = tokenManager.loadTokens();
```

## Error Handling

The library provides comprehensive error handling:

```typescript
import { 
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  NetworkError 
} from '@nvlp/client';

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

```typescript
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

```typescript
const health = await client.healthCheck();
console.log(health); // { status: 'healthy', timestamp: '...' }
```

## Development

### Building

```bash
# Build the package
pnpm build

# Build in watch mode
pnpm build:watch

# Development mode with hot reload
pnpm dev
```

### Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Code Quality

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check

# Type checking
pnpm typecheck
```

## Architecture

This package is part of the NVLP monorepo and follows these architectural principles:

- **Transport Abstraction**: Unified interface for PostgREST and Edge Function calls
- **Type Safety**: Full TypeScript support with shared types from `@nvlp/types`
- **Zero Dependencies**: Uses only web standard APIs for maximum compatibility
- **Environment Agnostic**: Works seamlessly in both browser and Node.js environments
- **Monorepo Integration**: Designed to work efficiently within the NVLP workspace

## Package Structure

```
packages/client/
├── src/
│   ├── index.ts              # Main exports
│   ├── nvlp-client.ts        # Main client class
│   ├── token-manager.ts      # Token persistence management
│   ├── types.ts              # Client-specific types
│   ├── errors.ts             # Error classes
│   └── transports/
│       ├── postgrest-transport.ts      # PostgREST API transport
│       └── edge-function-transport.ts  # Edge Function transport
├── dist/                     # Built output
├── package.json             # Package configuration
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

## Dependencies

### Runtime Dependencies
- **None** - This package uses only web standard APIs

### Development Dependencies
- TypeScript for type checking and compilation
- tsup for fast building and bundling
- ESLint for code linting
- Prettier for code formatting
- Vitest for testing

### Peer Dependencies
- `@nvlp/types` - Shared type definitions (automatically available in monorepo)

## Browser Compatibility

- Chrome/Edge 88+
- Firefox 87+
- Safari 14+
- Node.js 16+

## Performance

- **PostgREST Transport**: <50ms response times for CRUD operations
- **Edge Function Transport**: 2-10s cold start, then fast for complex operations
- **Token Persistence**: Instant session restoration on client initialization
- **Auto Refresh**: Seamless token renewal without user interruption
- **Bundle Size**: ~15KB minified + gzipped (zero dependencies)

## Best Practices

1. **Always enable token persistence** for production applications
2. **Handle authentication errors gracefully** with proper login redirects
3. **Use try-catch blocks** around API calls for robust error handling
4. **Check authentication status** before making API calls in long-running applications
5. **Leverage auto-refresh** to maintain seamless user experience
6. **Use TypeScript** for better development experience and type safety

## Contributing

This package is part of the NVLP monorepo. See the [main repository](../../README.md) for contribution guidelines.

## License

ISC