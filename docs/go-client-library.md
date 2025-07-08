# NVLP Go Client Library Documentation

The NVLP Go client library provides a comprehensive interface for interacting with the NVLP (Personal Finance Management) APIs. It supports both PostgREST for CRUD operations and Edge Functions for complex business logic.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [API Operations](#api-operations)
- [Error Handling](#error-handling)
- [Advanced Usage](#advanced-usage)
- [Examples](#examples)

## Installation

Add the client library to your Go module:

```bash
go mod tidy
```

Import the client library in your Go code:

```go
import "github.com/thelarryrutledge/nvlp-app/internal/client"
```

## Quick Start

```go
package main

import (
    "fmt"
    "log"
    "time"
    
    "github.com/thelarryrutledge/nvlp-app/internal/client"
)

func main() {
    // Create client configuration
    config := &client.NVLPClientConfig{
        SupabaseURL:     "https://your-project.supabase.co",
        SupabaseAnonKey: "your-anon-key",
        APIBaseURL:      "https://edge-api.nvlp.app",  // Edge Functions
        DBApiURL:        "https://db-api.nvlp.app",    // PostgREST
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
    
    fmt.Printf("Logged in as: %s\n", loginResponse.User.Email)
    
    // Get user budgets
    budgets, err := nvlpClient.GetBudgets(client.QueryParams{})
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Printf("Found %d budgets\n", len(budgets))
}
```

## Configuration

### NVLPClientConfig

```go
type NVLPClientConfig struct {
    // Required fields
    SupabaseURL     string        // Supabase project URL
    SupabaseAnonKey string        // Supabase anonymous key
    
    // API URLs (use custom domains for production)
    APIBaseURL      string        // Edge Functions URL (edge-api.nvlp.app)
    DBApiURL        string        // PostgREST URL (db-api.nvlp.app)
    
    // Optional configuration
    Timeout         time.Duration // HTTP request timeout (default: 30s)
    PersistTokens   bool          // Enable token persistence (default: true)
    AutoRefresh     bool          // Auto-refresh tokens (default: true)
    TokenStorageKey string        // Storage key name (default: "nvlp_auth_tokens")
}
```

### Environment Variables

You can also configure the client using environment variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Custom API Domains (Production)
NVLP_EDGE_API_URL=https://edge-api.nvlp.app
NVLP_DB_API_URL=https://db-api.nvlp.app
```

## Authentication

### Login

```go
loginResponse, err := nvlpClient.Login("user@example.com", "password")
if err != nil {
    log.Fatal(err)
}

fmt.Printf("User: %s\n", loginResponse.User.Email)
fmt.Printf("Token expires in: %d seconds\n", loginResponse.Session.ExpiresIn)
```

### Register

```go
displayName := "John Doe"
user, err := nvlpClient.Register("user@example.com", "password", &displayName)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Registered user: %s\n", user.Email)
```

### Logout

```go
err := nvlpClient.Logout()
if err != nil {
    log.Fatal(err)
}
```

### Authentication State

```go
// Check if authenticated
if nvlpClient.IsAuthenticated() {
    fmt.Println("User is authenticated")
}

// Check if token needs refresh
if nvlpClient.NeedsTokenRefresh() {
    fmt.Println("Token needs refresh")
}

// Get auth state
authState := nvlpClient.GetAuthState()
fmt.Printf("User: %s\n", authState.User.Email)
fmt.Printf("Expires: %s\n", authState.ExpiresAt)
```

### Token Persistence

Tokens are automatically saved to `~/.nvlp/auth.json` when `PersistTokens` is enabled:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "abc123",
  "expires_at": "2025-07-08T10:00:00Z",
  "user": {
    "id": "user-id",
    "email": "user@example.com"
  },
  "created_at": "2025-07-08T09:00:00Z"
}
```

## API Operations

### User Profile

```go
// Get user profile
profile, err := nvlpClient.GetProfile()
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Profile: %s (%s)\n", profile.DisplayName, profile.ID)

// Update profile
updates := map[string]interface{}{
    "display_name": "New Name",
    "timezone": "America/New_York",
}

updatedProfile, err := nvlpClient.UpdateProfile(updates)
if err != nil {
    log.Fatal(err)
}
```

### Budgets

```go
// List all budgets
budgets, err := nvlpClient.GetBudgets(client.QueryParams{})
if err != nil {
    log.Fatal(err)
}

// Get specific budget
budget, err := nvlpClient.GetBudget("budget-id")
if err != nil {
    log.Fatal(err)
}

// Create new budget
newBudget := &client.CreateBudgetInput{
    Name:        "My Budget",
    Description: StringPtr("Budget description"),
    IsDefault:   BoolPtr(false),
}

createdBudget, err := nvlpClient.CreateBudget(newBudget)
if err != nil {
    log.Fatal(err)
}

// Update budget
updates := &client.UpdateBudgetInput{
    Name:        StringPtr("Updated Budget Name"),
    Description: StringPtr("Updated description"),
}

updatedBudget, err := nvlpClient.UpdateBudget("budget-id", updates)
if err != nil {
    log.Fatal(err)
}

// Delete budget
err = nvlpClient.DeleteBudget("budget-id")
if err != nil {
    log.Fatal(err)
}
```

### Categories

```go
// List categories for a budget
categories, err := nvlpClient.GetCategories("budget-id", client.QueryParams{})
if err != nil {
    log.Fatal(err)
}

// Create new category
newCategory := &client.CreateCategoryInput{
    BudgetID:    "budget-id",
    Name:        "Groceries",
    Description: StringPtr("Food and household items"),
    Color:       StringPtr("#4CAF50"),
    Icon:        StringPtr("🛒"),
}

category, err := nvlpClient.CreateCategory(newCategory)
if err != nil {
    log.Fatal(err)
}
```

### Envelopes

```go
// List envelopes for a budget
envelopes, err := nvlpClient.GetEnvelopes("budget-id", client.QueryParams{})
if err != nil {
    log.Fatal(err)
}

// Create new envelope
newEnvelope := &client.CreateEnvelopeInput{
    BudgetID:          "budget-id",
    CategoryID:        "category-id",
    Name:              "Grocery Envelope",
    Description:       StringPtr("Monthly grocery budget"),
    TargetAmount:      500.00,
    FillFrequency:     "monthly",
    FillAmount:        500.00,
    AutoFillEnabled:   BoolPtr(true),
    OverspendAllowed:  BoolPtr(false),
    NotificationLimit: Float64Ptr(50.00),
}

envelope, err := nvlpClient.CreateEnvelope(newEnvelope)
if err != nil {
    log.Fatal(err)
}
```

### Transactions

```go
// List transactions for a budget (via Edge Function)
transactions, err := nvlpClient.GetTransactions("budget-id", map[string]interface{}{
    "limit": 50,
    "order": "created_at.desc",
    "type":  "expense",
})
if err != nil {
    log.Fatal(err)
}

// Create new transaction
newTransaction := &client.CreateTransactionInput{
    BudgetID:       "budget-id",
    Type:           "expense",
    Amount:         25.50,
    Description:    "Grocery shopping",
    Date:           time.Now(),
    FromEnvelopeID: StringPtr("envelope-id"),
    PayeeID:        StringPtr("payee-id"),
    CategoryID:     StringPtr("category-id"),
}

transaction, err := nvlpClient.CreateTransaction(newTransaction)
if err != nil {
    log.Fatal(err)
}
```

### Dashboard

```go
// Get dashboard data for a budget
dashboard, err := nvlpClient.GetDashboard("budget-id", map[string]interface{}{
    "days": 30,
})
if err != nil {
    log.Fatal(err)
}

if dashboard.BudgetOverview != nil {
    fmt.Printf("Budget: %s\n", dashboard.BudgetOverview.BudgetName)
    fmt.Printf("Total Income: $%.2f\n", dashboard.BudgetOverview.TotalIncome)
    fmt.Printf("Total Expenses: $%.2f\n", dashboard.BudgetOverview.TotalExpenses)
    fmt.Printf("Available: $%.2f\n", dashboard.BudgetOverview.AvailableAmount)
}
```

### Reports

```go
// Generate transaction report
report, err := nvlpClient.GetTransactionReport("budget-id", map[string]interface{}{
    "start_date": "2025-01-01",
    "end_date":   "2025-01-31",
    "categories": []string{"category-1", "category-2"},
})
if err != nil {
    log.Fatal(err)
}

// Generate category trends report
trendsReport, err := nvlpClient.GetCategoryTrendsReport("budget-id", map[string]interface{}{
    "months": 6,
})
if err != nil {
    log.Fatal(err)
}

// Generate income vs expense report
incomeExpenseReport, err := nvlpClient.GetIncomeExpenseReport("budget-id", map[string]interface{}{
    "period": "monthly",
    "months": 12,
})
if err != nil {
    log.Fatal(err)
}
```

### Export

```go
// Export transactions to CSV
exportData, err := nvlpClient.ExportTransactions("budget-id", "csv", map[string]interface{}{
    "start_date": "2025-01-01",
    "end_date":   "2025-01-31",
})
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Export file: %s\n", exportData.Filename)
if exportData.DownloadURL != nil {
    fmt.Printf("Download URL: %s\n", *exportData.DownloadURL)
}

// Export complete budget data
budgetExport, err := nvlpClient.ExportBudget("budget-id", "json", map[string]interface{}{
    "include_transactions": true,
    "include_envelopes":    true,
})
if err != nil {
    log.Fatal(err)
}
```

## Error Handling

The client library provides structured error types for different scenarios:

```go
import "errors"

// Handle specific error types
loginResponse, err := nvlpClient.Login("user@example.com", "wrong-password")
if err != nil {
    var authErr *client.AuthenticationError
    var validationErr *client.ValidationError
    var networkErr *client.NetworkError
    
    switch {
    case errors.As(err, &authErr):
        fmt.Printf("Authentication failed: %s\n", authErr.Message)
    case errors.As(err, &validationErr):
        fmt.Printf("Validation error: %s\n", validationErr.Message)
    case errors.As(err, &networkErr):
        fmt.Printf("Network error: %s\n", networkErr.Message)
    default:
        fmt.Printf("Unknown error: %s\n", err.Error())
    }
}
```

### Error Types

- `AuthenticationError`: Invalid credentials or expired tokens
- `AuthorizationError`: Insufficient permissions
- `ValidationError`: Invalid input data
- `NotFoundError`: Resource not found
- `ConflictError`: Resource conflicts (e.g., duplicate names)
- `NetworkError`: Network connectivity issues
- `ServerError`: Server-side errors
- `RateLimitError`: Too many requests
- `TimeoutError`: Request timeout

## Advanced Usage

### Custom Transport Access

For advanced use cases, you can access the underlying transports directly:

```go
// Get PostgREST transport for advanced queries
postgrestTransport := nvlpClient.GetPostgRESTTransport()

// Custom PostgREST query
response, err := postgrestTransport.Get("budgets", client.QueryParams{
    "select": "id,name,created_at",
    "order":  "created_at.desc",
    "limit":  "10",
})

// Get Edge Function transport for custom functions
edgeFunctionTransport := nvlpClient.GetEdgeFunctionTransport()

// Call custom Edge Function
response, err := edgeFunctionTransport.CallFunction("custom-function", map[string]interface{}{
    "param1": "value1",
    "param2": "value2",
})
```

### Query Parameters

Use `QueryParams` for filtering and pagination:

```go
params := client.QueryParams{
    "select": "id,name,description,created_at",
    "order":  "created_at.desc",
    "limit":  "20",
    "offset": "0",
    
    // PostgREST filters
    "is_active":     "eq.true",
    "created_at":    "gte.2025-01-01",
    "name":          "ilike.*budget*",
}

budgets, err := nvlpClient.GetBudgets(params)
```

### Health Check

```go
health, err := nvlpClient.HealthCheck()
if err != nil {
    log.Fatal(err)
}

fmt.Printf("System Status: %s\n", health.Status)
fmt.Printf("Version: %s\n", health.Version)
```

## Examples

### Complete User Workflow

```go
package main

import (
    "fmt"
    "log"
    "time"
    
    "github.com/thelarryrutledge/nvlp-app/internal/client"
)

func main() {
    // Initialize client
    config := &client.NVLPClientConfig{
        SupabaseURL:     "https://your-project.supabase.co",
        SupabaseAnonKey: "your-anon-key",
        APIBaseURL:      "https://edge-api.nvlp.app",
        DBApiURL:        "https://db-api.nvlp.app",
        Timeout:         30 * time.Second,
        PersistTokens:   true,
        AutoRefresh:     true,
    }
    
    nvlpClient := client.NewNVLPClient(config)
    
    // 1. Login
    loginResponse, err := nvlpClient.Login("user@example.com", "password")
    if err != nil {
        log.Fatal("Login failed:", err)
    }
    fmt.Printf("✅ Logged in as: %s\n", loginResponse.User.Email)
    
    // 2. Get or create a budget
    budgets, err := nvlpClient.GetBudgets(client.QueryParams{})
    if err != nil {
        log.Fatal("Failed to get budgets:", err)
    }
    
    var budgetID string
    if len(budgets) == 0 {
        // Create first budget
        newBudget := &client.CreateBudgetInput{
            Name:        "My First Budget",
            Description: StringPtr("Getting started with NVLP"),
            IsDefault:   BoolPtr(true),
        }
        
        budget, err := nvlpClient.CreateBudget(newBudget)
        if err != nil {
            log.Fatal("Failed to create budget:", err)
        }
        budgetID = budget.ID
        fmt.Printf("✅ Created budget: %s\n", budget.Name)
    } else {
        budgetID = budgets[0].ID
        fmt.Printf("✅ Using existing budget: %s\n", budgets[0].Name)
    }
    
    // 3. Create a category
    newCategory := &client.CreateCategoryInput{
        BudgetID:    budgetID,
        Name:        "Groceries",
        Description: StringPtr("Food and household items"),
        Color:       StringPtr("#4CAF50"),
        Icon:        StringPtr("🛒"),
    }
    
    category, err := nvlpClient.CreateCategory(newCategory)
    if err != nil {
        log.Fatal("Failed to create category:", err)
    }
    fmt.Printf("✅ Created category: %s\n", category.Name)
    
    // 4. Create an envelope
    newEnvelope := &client.CreateEnvelopeInput{
        BudgetID:          budgetID,
        CategoryID:        category.ID,
        Name:              "Monthly Groceries",
        Description:       StringPtr("$500 monthly grocery budget"),
        TargetAmount:      500.00,
        FillFrequency:     "monthly",
        FillAmount:        500.00,
        AutoFillEnabled:   BoolPtr(true),
        OverspendAllowed:  BoolPtr(false),
        NotificationLimit: Float64Ptr(50.00),
    }
    
    envelope, err := nvlpClient.CreateEnvelope(newEnvelope)
    if err != nil {
        log.Fatal("Failed to create envelope:", err)
    }
    fmt.Printf("✅ Created envelope: %s ($%.2f)\n", envelope.Name, envelope.TargetAmount)
    
    // 5. Create a payee
    newPayee := &client.CreatePayeeInput{
        BudgetID:        budgetID,
        Name:            "Local Grocery Store",
        Description:     StringPtr("My usual grocery store"),
        DefaultCategory: &category.ID,
    }
    
    payee, err := nvlpClient.CreatePayee(newPayee)
    if err != nil {
        log.Fatal("Failed to create payee:", err)
    }
    fmt.Printf("✅ Created payee: %s\n", payee.Name)
    
    // 6. Record a transaction
    newTransaction := &client.CreateTransactionInput{
        BudgetID:       budgetID,
        Type:           "expense",
        Amount:         45.67,
        Description:    "Weekly grocery shopping",
        Date:           time.Now(),
        FromEnvelopeID: &envelope.ID,
        PayeeID:        &payee.ID,
        CategoryID:     &category.ID,
    }
    
    transaction, err := nvlpClient.CreateTransaction(newTransaction)
    if err != nil {
        log.Fatal("Failed to create transaction:", err)
    }
    fmt.Printf("✅ Created transaction: $%.2f - %s\n", transaction.Amount, transaction.Description)
    
    // 7. Get dashboard summary
    dashboard, err := nvlpClient.GetDashboard(budgetID, map[string]interface{}{})
    if err != nil {
        log.Printf("⚠️ Failed to get dashboard: %v\n", err)
    } else if dashboard.BudgetOverview != nil {
        fmt.Printf("📊 Budget Overview:\n")
        fmt.Printf("   Total Income: $%.2f\n", dashboard.BudgetOverview.TotalIncome)
        fmt.Printf("   Total Expenses: $%.2f\n", dashboard.BudgetOverview.TotalExpenses)
        fmt.Printf("   Available: $%.2f\n", dashboard.BudgetOverview.AvailableAmount)
    }
    
    fmt.Println("\n🎉 Workflow completed successfully!")
}

// Helper functions for pointer types
func StringPtr(s string) *string {
    return &s
}

func BoolPtr(b bool) *bool {
    return &b
}

func Float64Ptr(f float64) *float64 {
    return &f
}
```

### Batch Operations

```go
// Process multiple transactions efficiently
func processTransactions(nvlpClient *client.NVLPClient, budgetID string, transactions []TransactionData) error {
    for _, txnData := range transactions {
        newTransaction := &client.CreateTransactionInput{
            BudgetID:       budgetID,
            Type:           txnData.Type,
            Amount:         txnData.Amount,
            Description:    txnData.Description,
            Date:           txnData.Date,
            FromEnvelopeID: txnData.FromEnvelopeID,
            PayeeID:        txnData.PayeeID,
            CategoryID:     txnData.CategoryID,
        }
        
        _, err := nvlpClient.CreateTransaction(newTransaction)
        if err != nil {
            return fmt.Errorf("failed to create transaction '%s': %w", txnData.Description, err)
        }
    }
    
    return nil
}
```

## Best Practices

1. **Error Handling**: Always check for errors and handle them appropriately
2. **Token Management**: Enable `PersistTokens` and `AutoRefresh` for better UX
3. **Timeouts**: Set appropriate timeouts for your use case
4. **Resource Cleanup**: Use proper resource management and defer cleanup
5. **Pagination**: Use query parameters for large datasets
6. **Validation**: Validate input data before making API calls
7. **Logging**: Implement proper logging for debugging and monitoring

## Support

For issues, questions, or contributions, please refer to the project repository and documentation.