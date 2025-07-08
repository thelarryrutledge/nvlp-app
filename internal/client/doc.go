// Package client provides a comprehensive Go client library for the NVLP (Personal Finance Management) API.
//
// The client library supports both PostgREST for CRUD operations and Edge Functions for complex business logic,
// with automatic authentication, token management, and error handling.
//
// # Quick Start
//
// Create a client and authenticate:
//
//	config := &client.NVLPClientConfig{
//		SupabaseURL:     "https://your-project.supabase.co",
//		SupabaseAnonKey: "your-anon-key",
//		APIBaseURL:      "https://edge-api.nvlp.app",  // Edge Functions
//		DBApiURL:        "https://db-api.nvlp.app",    // PostgREST
//		Timeout:         30 * time.Second,
//		PersistTokens:   true,
//		AutoRefresh:     true,
//	}
//
//	nvlpClient := client.NewNVLPClient(config)
//
//	loginResponse, err := nvlpClient.Login("user@example.com", "password")
//	if err != nil {
//		log.Fatal(err)
//	}
//
// # Architecture
//
// The client uses two transport layers:
//
//   - PostgREST Transport: For direct CRUD operations on database tables (budgets, categories, envelopes, etc.)
//   - Edge Function Transport: For complex business logic (authentication, transactions, dashboard, reports)
//
// # Authentication
//
// The client automatically handles:
//
//   - JWT token storage and retrieval
//   - Token refresh when expired
//   - Token persistence to ~/.nvlp/auth.json
//   - Authentication state management
//
// # Error Handling
//
// The client provides structured error types:
//
//   - AuthenticationError: Invalid credentials or expired tokens
//   - AuthorizationError: Insufficient permissions
//   - ValidationError: Invalid input data
//   - NotFoundError: Resource not found
//   - ConflictError: Resource conflicts
//   - NetworkError: Network connectivity issues
//   - ServerError: Server-side errors
//   - RateLimitError: Too many requests
//   - TimeoutError: Request timeout
//
// # Custom Domains
//
// The client is designed to work with custom domain routing:
//
//   - edge-api.nvlp.app: Edge Functions for complex operations
//   - db-api.nvlp.app: PostgREST for CRUD operations
//
// This allows for optimized routing and better performance.
//
// # Examples
//
// Get user budgets:
//
//	budgets, err := nvlpClient.GetBudgets(client.QueryParams{})
//	if err != nil {
//		log.Fatal(err)
//	}
//
// Create a new budget:
//
//	newBudget := &client.CreateBudgetInput{
//		Name:        "My Budget",
//		Description: StringPtr("Budget description"),
//		IsDefault:   BoolPtr(false),
//	}
//
//	budget, err := nvlpClient.CreateBudget(newBudget)
//	if err != nil {
//		log.Fatal(err)
//	}
//
// Record a transaction:
//
//	newTransaction := &client.CreateTransactionInput{
//		BudgetID:       "budget-id",
//		Type:           "expense",
//		Amount:         25.50,
//		Description:    "Grocery shopping",
//		Date:           time.Now(),
//		FromEnvelopeID: StringPtr("envelope-id"),
//		PayeeID:        StringPtr("payee-id"),
//		CategoryID:     StringPtr("category-id"),
//	}
//
//	transaction, err := nvlpClient.CreateTransaction(newTransaction)
//	if err != nil {
//		log.Fatal(err)
//	}
//
// For complete documentation and examples, see docs/go-client-library.md
package client