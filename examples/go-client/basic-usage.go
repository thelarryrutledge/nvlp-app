// Basic usage example for NVLP Go Client Library
// This example demonstrates authentication and basic operations
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

	// 1. Authentication
	fmt.Println("🔐 Authenticating...")
	loginResponse, err := nvlpClient.Login("user@example.com", "password")
	if err != nil {
		log.Fatal("Authentication failed:", err)
	}
	fmt.Printf("✅ Logged in as: %s\n", loginResponse.User.Email)

	// 2. Get user profile
	fmt.Println("\n👤 Getting user profile...")
	profile, err := nvlpClient.GetProfile()
	if err != nil {
		log.Fatal("Failed to get profile:", err)
	}
	fmt.Printf("✅ Profile: %s (%s)\n", profile.DisplayName, profile.ID)

	// 3. List budgets
	fmt.Println("\n💰 Getting budgets...")
	budgets, err := nvlpClient.GetBudgets(client.QueryParams{})
	if err != nil {
		log.Fatal("Failed to get budgets:", err)
	}
	fmt.Printf("✅ Found %d budget(s)\n", len(budgets))

	if len(budgets) > 0 {
		budget := budgets[0]
		fmt.Printf("   First budget: %s\n", budget.Name)

		// 4. Get categories for the first budget
		fmt.Println("\n📂 Getting categories...")
		categories, err := nvlpClient.GetCategories(budget.ID, client.QueryParams{})
		if err != nil {
			log.Printf("⚠️ Failed to get categories: %v\n", err)
		} else {
			fmt.Printf("✅ Found %d category(ies)\n", len(categories))
		}

		// 5. Get envelopes for the first budget
		fmt.Println("\n💌 Getting envelopes...")
		envelopes, err := nvlpClient.GetEnvelopes(budget.ID, client.QueryParams{})
		if err != nil {
			log.Printf("⚠️ Failed to get envelopes: %v\n", err)
		} else {
			fmt.Printf("✅ Found %d envelope(s)\n", len(envelopes))
		}
	}

	// 6. Test authentication state
	fmt.Println("\n🔍 Checking authentication state...")
	if nvlpClient.IsAuthenticated() {
		fmt.Println("✅ User is authenticated")
		authState := nvlpClient.GetAuthState()
		fmt.Printf("   Token expires: %s\n", authState.ExpiresAt.Format(time.RFC3339))
	}

	// 7. Logout
	fmt.Println("\n🚪 Logging out...")
	err = nvlpClient.Logout()
	if err != nil {
		log.Printf("⚠️ Logout failed: %v\n", err)
	} else {
		fmt.Println("✅ Logged out successfully")
	}

	fmt.Println("\n🎉 Basic usage example completed!")
}