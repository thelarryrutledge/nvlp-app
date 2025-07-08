// Error handling example for NVLP Go Client Library
// This example demonstrates proper error handling patterns
package main

import (
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/thelarryrutledge/nvlp-app/internal/client"
)

func main() {
	fmt.Println("🛡️ Error Handling Examples")
	fmt.Println("=========================")

	// Create client configuration
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

	// Example 1: Authentication Error
	fmt.Println("\n1. Authentication Error Example")
	fmt.Println("------------------------------")
	
	_, err := nvlpClient.Login("invalid@example.com", "wrongpassword")
	if err != nil {
		handleError("Login", err)
	}

	// Example 2: Successful login for subsequent tests
	fmt.Println("\n2. Successful Authentication")
	fmt.Println("---------------------------")
	
	loginResponse, err := nvlpClient.Login("user@example.com", "password")
	if err != nil {
		log.Fatal("Could not authenticate for examples:", err)
	}
	fmt.Printf("✅ Authenticated as: %s\n", loginResponse.User.Email)

	// Example 3: Validation Error
	fmt.Println("\n3. Validation Error Example")
	fmt.Println("---------------------------")
	
	invalidBudget := &client.CreateBudgetInput{
		Name:        "", // Empty name should cause validation error
		Description: StringPtr("Invalid budget"),
	}
	
	_, err = nvlpClient.CreateBudget(invalidBudget)
	if err != nil {
		handleError("Create Budget", err)
	}

	// Example 4: Not Found Error
	fmt.Println("\n4. Not Found Error Example")
	fmt.Println("--------------------------")
	
	_, err = nvlpClient.GetBudget("non-existent-budget-id")
	if err != nil {
		handleError("Get Budget", err)
	}

	// Example 5: Query Parameter Error
	fmt.Println("\n5. Query Parameter Error Example")
	fmt.Println("--------------------------------")
	
	_, err = nvlpClient.GetBudgets(client.QueryParams{
		"invalid_filter": "this.will.fail",
	})
	if err != nil {
		handleError("Get Budgets with Invalid Filter", err)
	}

	// Example 6: Network/Timeout Simulation
	fmt.Println("\n6. Network Error Simulation")
	fmt.Println("---------------------------")
	
	// Create a client with very short timeout to simulate network issues
	shortTimeoutConfig := &client.NVLPClientConfig{
		SupabaseURL:     config.SupabaseURL,
		SupabaseAnonKey: config.SupabaseAnonKey,
		APIBaseURL:      config.APIBaseURL,
		DBApiURL:        config.DBApiURL,
		Timeout:         1 * time.Millisecond, // Very short timeout
		PersistTokens:   false,
	}
	
	shortTimeoutClient := client.NewNVLPClient(shortTimeoutConfig)
	
	_, err = shortTimeoutClient.Login("user@example.com", "password")
	if err != nil {
		handleError("Login with Short Timeout", err)
	}

	// Example 7: Error Recovery Pattern
	fmt.Println("\n7. Error Recovery Pattern")
	fmt.Println("------------------------")
	
	// Demonstrate retry pattern
	maxRetries := 3
	for attempt := 1; attempt <= maxRetries; attempt++ {
		fmt.Printf("Attempt %d/%d: ", attempt, maxRetries)
		
		_, err := nvlpClient.GetBudgets(client.QueryParams{
			"invalid_filter": "still.will.fail",
		})
		
		if err != nil {
			if attempt == maxRetries {
				fmt.Printf("❌ Final attempt failed: %v\n", err)
			} else {
				fmt.Printf("⚠️ Failed, retrying...\n")
				time.Sleep(time.Duration(attempt) * time.Second)
			}
		} else {
			fmt.Println("✅ Success!")
			break
		}
	}

	// Example 8: Graceful Degradation
	fmt.Println("\n8. Graceful Degradation Example")
	fmt.Println("-------------------------------")
	
	budgets, err := nvlpClient.GetBudgets(client.QueryParams{})
	if err != nil {
		handleError("Get Budgets", err)
		fmt.Println("💡 Falling back to cached data or default values...")
		// In real application, you might load from cache or use defaults
	} else {
		fmt.Printf("✅ Successfully retrieved %d budgets\n", len(budgets))
	}

	fmt.Println("\n✅ Error handling examples completed!")
}

// handleError demonstrates comprehensive error handling
func handleError(operation string, err error) {
	fmt.Printf("❌ %s failed: ", operation)

	// Check for specific error types
	var authErr *client.AuthenticationError
	var authzErr *client.AuthorizationError
	var validationErr *client.ValidationError
	var notFoundErr *client.NotFoundError
	var conflictErr *client.ConflictError
	var networkErr *client.NetworkError
	var serverErr *client.ServerError
	var rateLimitErr *client.RateLimitError
	var timeoutErr *client.TimeoutError

	switch {
	case errors.As(err, &authErr):
		fmt.Printf("🔐 Authentication Error: %s\n", authErr.Message)
		if authErr.Details != nil {
			fmt.Printf("   Details: %v\n", authErr.Details)
		}
		fmt.Println("   💡 Solution: Check credentials or login again")

	case errors.As(err, &authzErr):
		fmt.Printf("🚫 Authorization Error: %s\n", authzErr.Message)
		fmt.Println("   💡 Solution: Check user permissions")

	case errors.As(err, &validationErr):
		fmt.Printf("⚠️ Validation Error: %s\n", validationErr.Message)
		if validationErr.Details != nil {
			fmt.Printf("   Details: %v\n", validationErr.Details)
		}
		fmt.Println("   💡 Solution: Check input data format and requirements")

	case errors.As(err, &notFoundErr):
		fmt.Printf("🔍 Not Found Error: %s\n", notFoundErr.Message)
		fmt.Println("   💡 Solution: Verify the resource ID exists")

	case errors.As(err, &conflictErr):
		fmt.Printf("⚡ Conflict Error: %s\n", conflictErr.Message)
		if conflictErr.Details != nil {
			fmt.Printf("   Details: %v\n", conflictErr.Details)
		}
		fmt.Println("   💡 Solution: Resource already exists or has conflicts")

	case errors.As(err, &networkErr):
		fmt.Printf("🌐 Network Error: %s\n", networkErr.Message)
		fmt.Println("   💡 Solution: Check internet connection and retry")

	case errors.As(err, &serverErr):
		fmt.Printf("🔥 Server Error: %s\n", serverErr.Message)
		if serverErr.Details != nil {
			fmt.Printf("   Details: %v\n", serverErr.Details)
		}
		fmt.Println("   💡 Solution: Server issue - try again later or contact support")

	case errors.As(err, &rateLimitErr):
		fmt.Printf("🚦 Rate Limit Error: %s\n", rateLimitErr.Message)
		fmt.Printf("   Retry after: %s\n", rateLimitErr.RetryAfter)
		fmt.Println("   💡 Solution: Wait before making more requests")

	case errors.As(err, &timeoutErr):
		fmt.Printf("⏰ Timeout Error: %s\n", timeoutErr.Message)
		fmt.Println("   💡 Solution: Increase timeout or check network speed")

	default:
		fmt.Printf("❓ Unknown Error: %s\n", err.Error())
		fmt.Println("   💡 Solution: Check logs or contact support")
	}
}

// Helper function for pointer types
func StringPtr(s string) *string {
	return &s
}