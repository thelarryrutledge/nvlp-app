// Complete workflow example for NVLP Go Client Library
// This example demonstrates a full budget setup and transaction recording
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
	fmt.Println("🔐 Logging in...")
	loginResponse, err := nvlpClient.Login("user@example.com", "password")
	if err != nil {
		log.Fatal("Login failed:", err)
	}
	fmt.Printf("✅ Logged in as: %s\n", loginResponse.User.Email)

	// 2. Get or create a budget
	fmt.Println("\n💰 Setting up budget...")
	budgets, err := nvlpClient.GetBudgets(client.QueryParams{})
	if err != nil {
		log.Fatal("Failed to get budgets:", err)
	}

	var budgetID string
	if len(budgets) == 0 {
		// Create first budget
		newBudget := &client.CreateBudgetInput{
			Name:        "Demo Budget",
			Description: StringPtr("Example budget for API demonstration"),
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

	// 3. Create categories
	fmt.Println("\n📂 Creating categories...")
	
	categories := []struct {
		name, icon, color string
	}{
		{"Groceries", "🛒", "#4CAF50"},
		{"Transportation", "🚗", "#2196F3"},
		{"Entertainment", "🎬", "#FF9800"},
		{"Utilities", "💡", "#795548"},
	}

	var createdCategories []client.Category
	for _, cat := range categories {
		newCategory := &client.CreateCategoryInput{
			BudgetID:    budgetID,
			Name:        cat.name,
			Description: StringPtr(fmt.Sprintf("%s expenses", cat.name)),
			Color:       StringPtr(cat.color),
			Icon:        StringPtr(cat.icon),
		}

		category, err := nvlpClient.CreateCategory(newCategory)
		if err != nil {
			log.Printf("⚠️ Failed to create category %s: %v\n", cat.name, err)
			continue
		}
		createdCategories = append(createdCategories, *category)
		fmt.Printf("   ✅ Created category: %s %s\n", cat.icon, category.Name)
	}

	// 4. Create envelopes
	fmt.Println("\n💌 Creating envelopes...")
	
	envelopes := []struct {
		name         string
		targetAmount float64
		fillAmount   float64
		categoryIdx  int
	}{
		{"Monthly Groceries", 500.00, 500.00, 0},
		{"Gas & Transportation", 200.00, 200.00, 1},
		{"Entertainment Fund", 100.00, 100.00, 2},
		{"Utility Bills", 150.00, 150.00, 3},
	}

	var createdEnvelopes []client.Envelope
	for i, env := range envelopes {
		if i >= len(createdCategories) {
			break
		}

		newEnvelope := &client.CreateEnvelopeInput{
			BudgetID:          budgetID,
			CategoryID:        createdCategories[env.categoryIdx].ID,
			Name:              env.name,
			Description:       StringPtr(fmt.Sprintf("Monthly budget for %s", env.name)),
			TargetAmount:      env.targetAmount,
			FillFrequency:     "monthly",
			FillAmount:        env.fillAmount,
			AutoFillEnabled:   BoolPtr(true),
			OverspendAllowed:  BoolPtr(false),
			NotificationLimit: Float64Ptr(env.targetAmount * 0.1), // 10% warning
		}

		envelope, err := nvlpClient.CreateEnvelope(newEnvelope)
		if err != nil {
			log.Printf("⚠️ Failed to create envelope %s: %v\n", env.name, err)
			continue
		}
		createdEnvelopes = append(createdEnvelopes, *envelope)
		fmt.Printf("   ✅ Created envelope: %s ($%.2f)\n", envelope.Name, envelope.TargetAmount)
	}

	// 5. Create payees
	fmt.Println("\n🏪 Creating payees...")
	
	payees := []struct {
		name, description string
		defaultCategoryIdx int
	}{
		{"Walmart", "Local grocery store", 0},
		{"Shell Gas Station", "Gas station", 1},
		{"Netflix", "Streaming service", 2},
		{"Electric Company", "Utility provider", 3},
	}

	var createdPayees []client.Payee
	for _, payee := range payees {
		if payee.defaultCategoryIdx >= len(createdCategories) {
			continue
		}

		newPayee := &client.CreatePayeeInput{
			BudgetID:        budgetID,
			Name:            payee.name,
			Description:     StringPtr(payee.description),
			DefaultCategory: &createdCategories[payee.defaultCategoryIdx].ID,
		}

		createdPayee, err := nvlpClient.CreatePayee(newPayee)
		if err != nil {
			log.Printf("⚠️ Failed to create payee %s: %v\n", payee.name, err)
			continue
		}
		createdPayees = append(createdPayees, *createdPayee)
		fmt.Printf("   ✅ Created payee: %s\n", createdPayee.Name)
	}

	// 6. Record sample transactions
	fmt.Println("\n💳 Recording sample transactions...")
	
	sampleTransactions := []struct {
		amount      float64
		description string
		payeeIdx    int
		envelopeIdx int
		categoryIdx int
	}{
		{45.67, "Weekly grocery shopping", 0, 0, 0},
		{35.00, "Gas fill-up", 1, 1, 1},
		{15.99, "Netflix subscription", 2, 2, 2},
		{89.45, "Electric bill", 3, 3, 3},
		{23.45, "Lunch groceries", 0, 0, 0},
	}

	for _, txn := range sampleTransactions {
		if txn.payeeIdx >= len(createdPayees) || 
		   txn.envelopeIdx >= len(createdEnvelopes) || 
		   txn.categoryIdx >= len(createdCategories) {
			continue
		}

		newTransaction := &client.CreateTransactionInput{
			BudgetID:       budgetID,
			Type:           "expense",
			Amount:         txn.amount,
			Description:    txn.description,
			Date:           time.Now().Add(-time.Duration(len(sampleTransactions)-txn.payeeIdx) * 24 * time.Hour),
			FromEnvelopeID: &createdEnvelopes[txn.envelopeIdx].ID,
			PayeeID:        &createdPayees[txn.payeeIdx].ID,
			CategoryID:     &createdCategories[txn.categoryIdx].ID,
		}

		transaction, err := nvlpClient.CreateTransaction(newTransaction)
		if err != nil {
			log.Printf("⚠️ Failed to create transaction: %v\n", err)
			continue
		}
		fmt.Printf("   ✅ Recorded: $%.2f - %s\n", transaction.Amount, transaction.Description)
	}

	// 7. Get dashboard summary
	fmt.Println("\n📊 Getting dashboard summary...")
	dashboard, err := nvlpClient.GetDashboard(budgetID, map[string]interface{}{
		"days": 30,
	})
	if err != nil {
		log.Printf("⚠️ Failed to get dashboard: %v\n", err)
	} else if dashboard.BudgetOverview != nil {
		fmt.Printf("📈 Budget Overview:\n")
		fmt.Printf("   Budget: %s\n", dashboard.BudgetOverview.BudgetName)
		fmt.Printf("   Total Income: $%.2f\n", dashboard.BudgetOverview.TotalIncome)
		fmt.Printf("   Total Expenses: $%.2f\n", dashboard.BudgetOverview.TotalExpenses)
		fmt.Printf("   Available: $%.2f\n", dashboard.BudgetOverview.AvailableAmount)
		fmt.Printf("   Last Updated: %s\n", dashboard.BudgetOverview.LastUpdated.Format("2006-01-02 15:04:05"))
	}

	// 8. Generate a simple report
	fmt.Println("\n📋 Generating transaction report...")
	report, err := nvlpClient.GetTransactionReport(budgetID, map[string]interface{}{
		"start_date": time.Now().Add(-30 * 24 * time.Hour).Format("2006-01-02"),
		"end_date":   time.Now().Format("2006-01-02"),
	})
	if err != nil {
		log.Printf("⚠️ Failed to generate report: %v\n", err)
	} else {
		fmt.Printf("📊 Report generated: %s\n", report.ReportType)
		fmt.Printf("   Generated at: %s\n", report.GeneratedAt.Format("2006-01-02 15:04:05"))
	}

	fmt.Println("\n🎉 Complete workflow example finished!")
	fmt.Println("✅ Budget created with categories, envelopes, payees, and transactions")
	fmt.Println("✅ Dashboard and reporting functionality demonstrated")
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