# NVLP Go Client Library

A comprehensive Go client library for the NVLP Personal Finance Management API.

## Features

- 🔐 **Authentication Management**: Automatic login, token refresh, and persistence
- 🏗️ **Dual Transport Architecture**: PostgREST for CRUD, Edge Functions for business logic
- 🌐 **Custom Domain Support**: Optimized routing with edge-api.nvlp.app and db-api.nvlp.app
- 🛡️ **Type Safety**: Complete type definitions for all API operations
- ⚡ **Performance**: Efficient HTTP client with connection pooling and timeouts
- 🔄 **Auto Retry**: Built-in token refresh and error handling
- 📁 **Token Persistence**: Secure storage in ~/.nvlp/auth.json

## Quick Example

```go
package main

import (
    "fmt"
    "log"
    "time"
    
    "github.com/thelarryrutledge/nvlp-app/internal/client"
)

func main() {
    // Configure client
    config := &client.NVLPClientConfig{
        SupabaseURL:     "https://your-project.supabase.co",
        SupabaseAnonKey: "your-anon-key",
        APIBaseURL:      "https://edge-api.nvlp.app",
        DBApiURL:        "https://db-api.nvlp.app",
        Timeout:         30 * time.Second,
        PersistTokens:   true,
        AutoRefresh:     true,
    }
    
    // Create client
    nvlpClient := client.NewNVLPClient(config)
    
    // Login
    loginResponse, err := nvlpClient.Login("user@example.com", "password")
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Printf("Welcome, %s!\n", loginResponse.User.Email)
    
    // Get budgets
    budgets, err := nvlpClient.GetBudgets(client.QueryParams{})
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Printf("You have %d budget(s)\n", len(budgets))
}
```

## Supported Operations

### Authentication
- `Login(email, password)` - Authenticate user
- `Register(email, password, displayName)` - Create new account
- `Logout()` - Sign out user
- `RefreshToken()` - Refresh access token
- `IsAuthenticated()` - Check auth status

### User Profile
- `GetProfile()` - Get user profile
- `UpdateProfile(updates)` - Update profile

### Budget Management
- `GetBudgets(params)` - List budgets
- `GetBudget(id)` - Get specific budget
- `CreateBudget(input)` - Create new budget
- `UpdateBudget(id, updates)` - Update budget
- `DeleteBudget(id)` - Delete budget

### Categories
- `GetCategories(budgetID, params)` - List categories
- `CreateCategory(input)` - Create category
- `UpdateCategory(id, updates)` - Update category
- `DeleteCategory(id)` - Delete category

### Envelopes
- `GetEnvelopes(budgetID, params)` - List envelopes
- `CreateEnvelope(input)` - Create envelope
- `UpdateEnvelope(id, updates)` - Update envelope
- `DeleteEnvelope(id)` - Delete envelope

### Transactions
- `GetTransactions(budgetID, params)` - List transactions
- `CreateTransaction(input)` - Record transaction
- `UpdateTransaction(id, updates)` - Update transaction
- `DeleteTransaction(id)` - Delete transaction

### Advanced Features
- `GetDashboard(budgetID, params)` - Dashboard data
- `GetTransactionReport(budgetID, params)` - Generate reports
- `ExportTransactions(budgetID, format, params)` - Export data
- `GetAuditEvents(budgetID, params)` - Audit trail
- `GetNotifications(budgetID, params)` - Notifications

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Your App      │    │   NVLP Client    │    │   API Layer     │
│                 │    │                  │    │                 │
│  nvlpClient.    │────▶  Authentication   │    │  Edge Functions │
│  Login()        │    │  Token Manager   │────▶  (Complex Logic)│
│  GetBudgets()   │    │                  │    │                 │
│  CreateTxn()    │    │  PostgREST       │────▶  PostgREST      │
│                 │    │  Transport       │    │  (CRUD Ops)     │
│                 │    │                  │    │                 │
│                 │    │  Edge Function   │    │  Database       │
│                 │    │  Transport       │────▶  (Supabase)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Configuration

### Environment Variables

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Custom Domains (Production)
NVLP_EDGE_API_URL=https://edge-api.nvlp.app
NVLP_DB_API_URL=https://db-api.nvlp.app
```

### Client Config

```go
config := &client.NVLPClientConfig{
    // Required
    SupabaseURL:     "https://your-project.supabase.co",
    SupabaseAnonKey: "your-anon-key",
    
    // Custom domains
    APIBaseURL:      "https://edge-api.nvlp.app",  // Edge Functions
    DBApiURL:        "https://db-api.nvlp.app",    // PostgREST
    
    // Optional
    Timeout:         30 * time.Second,             // Request timeout
    PersistTokens:   true,                         // Save tokens to file
    AutoRefresh:     true,                         // Auto refresh tokens
    TokenStorageKey: "nvlp_auth_tokens",           // Storage key
}
```

## Error Handling

```go
import "errors"

budgets, err := nvlpClient.GetBudgets(client.QueryParams{})
if err != nil {
    var authErr *client.AuthenticationError
    var validationErr *client.ValidationError
    var networkErr *client.NetworkError
    
    switch {
    case errors.As(err, &authErr):
        // Handle authentication error
        fmt.Printf("Auth error: %s\n", authErr.Message)
        
    case errors.As(err, &validationErr):
        // Handle validation error
        fmt.Printf("Validation error: %s\n", validationErr.Message)
        
    case errors.As(err, &networkErr):
        // Handle network error
        fmt.Printf("Network error: %s\n", networkErr.Message)
        
    default:
        // Handle other errors
        fmt.Printf("Error: %s\n", err.Error())
    }
}
```

## Advanced Usage

### Direct Transport Access

```go
// Access PostgREST transport for custom queries
postgrestTransport := nvlpClient.GetPostgRESTTransport()
response, err := postgrestTransport.Get("budgets", client.QueryParams{
    "select": "id,name,created_at",
    "order":  "created_at.desc",
    "limit":  "10",
})

// Access Edge Function transport for custom functions
edgeFunctionTransport := nvlpClient.GetEdgeFunctionTransport()
response, err := edgeFunctionTransport.CallFunction("custom-function", data)
```

### Custom Headers and Options

```go
options := &client.RequestOptions{
    Headers: map[string]string{
        "X-Custom-Header": "value",
    },
}

// Use with transport directly
response, err := transport.Request("GET", "endpoint", nil, options)
```

## Testing

Run the comprehensive test suite:

```bash
go run test_go_client_comprehensive.go
```

This tests:
- Authentication flow
- All CRUD operations
- Error handling
- Token persistence
- Custom domain connectivity

## Documentation

- [Complete API Documentation](../../docs/go-client-library.md)
- [GoDoc Package Documentation](doc.go)
- [Architecture Overview](../../README.md)

## Dependencies

```go
// Core dependencies
github.com/golang-jwt/jwt/v4  // JWT token handling
// Standard library only - no external HTTP dependencies
```

## License

See project LICENSE file.