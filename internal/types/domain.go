package types

import (
	"time"
)

// Domain types matching database schema
type UserProfile struct {
	ID              string     `json:"id"`
	DisplayName     string     `json:"display_name"`
	Timezone        string     `json:"timezone"`
	CurrencyCode    string     `json:"currency_code"`
	DateFormat      string     `json:"date_format"`
	DefaultBudgetID *string    `json:"default_budget_id"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type Budget struct {
	ID          string     `json:"id"`
	UserID      string     `json:"user_id"`
	Name        string     `json:"name"`
	Description *string    `json:"description"`
	IsDefault   bool       `json:"is_default"`
	IsActive    bool       `json:"is_active"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type IncomeSource struct {
	ID                     string     `json:"id"`
	BudgetID               string     `json:"budget_id"`
	Name                   string     `json:"name"`
	Description            *string    `json:"description"`
	ExpectedMonthlyAmount  float64    `json:"expected_monthly_amount"`
	Frequency              string     `json:"frequency"`
	NextDueDate            *time.Time `json:"next_due_date"`
	IsActive               bool       `json:"is_active"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

type Category struct {
	ID          string     `json:"id"`
	BudgetID    string     `json:"budget_id"`
	Name        string     `json:"name"`
	Description *string    `json:"description"`
	Color       *string    `json:"color"`
	Icon        *string    `json:"icon"`
	IsActive    bool       `json:"is_active"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type Envelope struct {
	ID                string     `json:"id"`
	BudgetID          string     `json:"budget_id"`
	CategoryID        string     `json:"category_id"`
	Name              string     `json:"name"`
	Description       *string    `json:"description"`
	TargetAmount      float64    `json:"target_amount"`
	CurrentBalance    float64    `json:"current_balance"`
	FillFrequency     string     `json:"fill_frequency"`
	FillAmount        float64    `json:"fill_amount"`
	AutoFillEnabled   bool       `json:"auto_fill_enabled"`
	OverspendAllowed  bool       `json:"overspend_allowed"`
	NotificationLimit *float64   `json:"notification_limit"`
	IsActive          bool       `json:"is_active"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type Payee struct {
	ID              string     `json:"id"`
	BudgetID        string     `json:"budget_id"`
	Name            string     `json:"name"`
	Description     *string    `json:"description"`
	DefaultCategory *string    `json:"default_category"`
	IsActive        bool       `json:"is_active"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// Transaction represents a transaction for Edge Function operations
type Transaction struct {
	ID              string    `json:"id"`
	BudgetID        string    `json:"budget_id"`
	Type            string    `json:"type"`
	Amount          float64   `json:"amount"`
	Description     string    `json:"description"`
	Date            time.Time `json:"date"`
	FromEnvelopeID  *string   `json:"from_envelope_id"`
	ToEnvelopeID    *string   `json:"to_envelope_id"`
	PayeeID         *string   `json:"payee_id"`
	IncomeSourceID  *string   `json:"income_source_id"`
	CategoryID      *string   `json:"category_id"`
	IsRecurring     bool      `json:"is_recurring"`
	RecurrenceRule  *string   `json:"recurrence_rule"`
	Tags            []string  `json:"tags"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Dashboard types
type DashboardData struct {
	BudgetOverview    *BudgetOverview    `json:"budget_overview"`
	EnvelopeSummary   []EnvelopeSummary  `json:"envelope_summary"`
	RecentTransactions []Transaction     `json:"recent_transactions"`
	SpendingAnalysis  *SpendingAnalysis  `json:"spending_analysis"`
	IncomeVsExpenses  *IncomeVsExpenses  `json:"income_vs_expenses"`
}

type BudgetOverview struct {
	BudgetID        string  `json:"budget_id"`
	BudgetName      string  `json:"budget_name"`
	TotalIncome     float64 `json:"total_income"`
	TotalExpenses   float64 `json:"total_expenses"`
	AvailableAmount float64 `json:"available_amount"`
	LastUpdated     time.Time `json:"last_updated"`
}

type EnvelopeSummary struct {
	EnvelopeID      string  `json:"envelope_id"`
	Name            string  `json:"name"`
	CurrentBalance  float64 `json:"current_balance"`
	TargetAmount    float64 `json:"target_amount"`
	PercentFull     float64 `json:"percent_full"`
	CategoryName    string  `json:"category_name"`
}

type SpendingAnalysis struct {
	TopCategories    []CategorySpending `json:"top_categories"`
	MonthlyTrend     []MonthlySpending  `json:"monthly_trend"`
	BudgetUtilization float64           `json:"budget_utilization"`
}

type CategorySpending struct {
	CategoryID   string  `json:"category_id"`
	CategoryName string  `json:"category_name"`
	Amount       float64 `json:"amount"`
	Percentage   float64 `json:"percentage"`
}

type MonthlySpending struct {
	Month  string  `json:"month"`
	Amount float64 `json:"amount"`
}

type IncomeVsExpenses struct {
	TotalIncome   float64            `json:"total_income"`
	TotalExpenses float64            `json:"total_expenses"`
	NetAmount     float64            `json:"net_amount"`
	IncomeBySource []IncomeBySource  `json:"income_by_source"`
	ExpensesByCategory []CategorySpending `json:"expenses_by_category"`
}

type IncomeBySource struct {
	SourceID   string  `json:"source_id"`
	SourceName string  `json:"source_name"`
	Amount     float64 `json:"amount"`
}

// Report types
type ReportData struct {
	ReportType   string                 `json:"report_type"`
	GeneratedAt  time.Time              `json:"generated_at"`
	Parameters   map[string]interface{} `json:"parameters"`
	Data         interface{}            `json:"data"`
}

// Export types
type ExportData struct {
	ExportType  string    `json:"export_type"`
	Format      string    `json:"format"`
	GeneratedAt time.Time `json:"generated_at"`
	Filename    string    `json:"filename"`
	Data        interface{} `json:"data"`
	DownloadURL *string   `json:"download_url,omitempty"`
}

// Audit types
type AuditEvent struct {
	ID           string                 `json:"id"`
	BudgetID     string                 `json:"budget_id"`
	UserID       string                 `json:"user_id"`
	EventType    string                 `json:"event_type"`
	ResourceType string                 `json:"resource_type"`
	ResourceID   string                 `json:"resource_id"`
	Action       string                 `json:"action"`
	Changes      map[string]interface{} `json:"changes"`
	Metadata     map[string]interface{} `json:"metadata"`
	CreatedAt    time.Time              `json:"created_at"`
}

// Notification types
type Notification struct {
	ID            string                 `json:"id"`
	BudgetID      string                 `json:"budget_id"`
	UserID        string                 `json:"user_id"`
	Type          string                 `json:"type"`
	Title         string                 `json:"title"`
	Message       string                 `json:"message"`
	Severity      string                 `json:"severity"`
	ResourceType  *string                `json:"resource_type"`
	ResourceID    *string                `json:"resource_id"`
	Data          map[string]interface{} `json:"data"`
	IsRead        bool                   `json:"is_read"`
	IsAcknowledged bool                  `json:"is_acknowledged"`
	CreatedAt     time.Time              `json:"created_at"`
	ExpiresAt     *time.Time             `json:"expires_at"`
}

// Health check response
type HealthCheckResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
}