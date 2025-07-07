package client

import (
	"time"
)

// NVLPClientConfig represents the configuration for the NVLP client
type NVLPClientConfig struct {
	SupabaseURL     string
	SupabaseAnonKey string
	Transport       string // "postgrest", "edge-function", or "hybrid"
	Timeout         time.Duration
	Retries         int
	// Token persistence options
	PersistTokens    bool
	TokenStorageKey  string
	AutoRefresh      bool
	// Custom API endpoints
	APIBaseURL string
}

// AuthState represents the current authentication state
type AuthState struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	User         *User     `json:"user"`
	ExpiresIn    int       `json:"expires_in"` // seconds until expiration
}

// PersistedAuthData represents the auth data stored persistently
type PersistedAuthData struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	User         *User     `json:"user"`
	CreatedAt    time.Time `json:"created_at"`
}

// User represents a user in the system
type User struct {
	ID             string `json:"id"`
	Email          string `json:"email"`
	EmailConfirmed bool   `json:"email_confirmed"`
}

// Transport interface for abstraction
type Transport interface {
	Request(method, endpoint string, data interface{}, options *RequestOptions) (*APIResponse, error)
	SetAuth(token string)
}

// RequestOptions represents options for API requests
type RequestOptions struct {
	Headers map[string]string
	Timeout time.Duration
	Retry   bool
}

// APIResponse represents the standard API response format
type APIResponse struct {
	Data   interface{} `json:"data"`
	Error  *APIError   `json:"error"`
	Status int         `json:"status"`
}

// APIError represents an API error response
type APIError struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// QueryParams represents query parameters for API requests
type QueryParams map[string]interface{}

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

// Input types for create operations
type CreateBudgetInput struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
	IsDefault   *bool   `json:"is_default,omitempty"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

type UpdateBudgetInput struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	IsDefault   *bool   `json:"is_default,omitempty"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

type CreateIncomeSourceInput struct {
	BudgetID              string     `json:"budget_id"`
	Name                  string     `json:"name"`
	Description           *string    `json:"description,omitempty"`
	ExpectedMonthlyAmount float64    `json:"expected_monthly_amount"`
	Frequency             string     `json:"frequency"`
	NextDueDate           *time.Time `json:"next_due_date,omitempty"`
	IsActive              *bool      `json:"is_active,omitempty"`
}

type UpdateIncomeSourceInput struct {
	Name                  *string    `json:"name,omitempty"`
	Description           *string    `json:"description,omitempty"`
	ExpectedMonthlyAmount *float64   `json:"expected_monthly_amount,omitempty"`
	Frequency             *string    `json:"frequency,omitempty"`
	NextDueDate           *time.Time `json:"next_due_date,omitempty"`
	IsActive              *bool      `json:"is_active,omitempty"`
}

type CreateCategoryInput struct {
	BudgetID    string  `json:"budget_id"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	Color       *string `json:"color,omitempty"`
	Icon        *string `json:"icon,omitempty"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

type UpdateCategoryInput struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Color       *string `json:"color,omitempty"`
	Icon        *string `json:"icon,omitempty"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

type CreateEnvelopeInput struct {
	BudgetID          string   `json:"budget_id"`
	CategoryID        string   `json:"category_id"`
	Name              string   `json:"name"`
	Description       *string  `json:"description,omitempty"`
	TargetAmount      float64  `json:"target_amount"`
	FillFrequency     string   `json:"fill_frequency"`
	FillAmount        float64  `json:"fill_amount"`
	AutoFillEnabled   *bool    `json:"auto_fill_enabled,omitempty"`
	OverspendAllowed  *bool    `json:"overspend_allowed,omitempty"`
	NotificationLimit *float64 `json:"notification_limit,omitempty"`
	IsActive          *bool    `json:"is_active,omitempty"`
}

type UpdateEnvelopeInput struct {
	Name              *string  `json:"name,omitempty"`
	Description       *string  `json:"description,omitempty"`
	TargetAmount      *float64 `json:"target_amount,omitempty"`
	FillFrequency     *string  `json:"fill_frequency,omitempty"`
	FillAmount        *float64 `json:"fill_amount,omitempty"`
	AutoFillEnabled   *bool    `json:"auto_fill_enabled,omitempty"`
	OverspendAllowed  *bool    `json:"overspend_allowed,omitempty"`
	NotificationLimit *float64 `json:"notification_limit,omitempty"`
	IsActive          *bool    `json:"is_active,omitempty"`
}

type CreatePayeeInput struct {
	BudgetID        string  `json:"budget_id"`
	Name            string  `json:"name"`
	Description     *string `json:"description,omitempty"`
	DefaultCategory *string `json:"default_category,omitempty"`
	IsActive        *bool   `json:"is_active,omitempty"`
}

type UpdatePayeeInput struct {
	Name            *string `json:"name,omitempty"`
	Description     *string `json:"description,omitempty"`
	DefaultCategory *string `json:"default_category,omitempty"`
	IsActive        *bool   `json:"is_active,omitempty"`
}

// Login/Register inputs
type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterInput struct {
	Email       string  `json:"email"`
	Password    string  `json:"password"`
	DisplayName *string `json:"display_name,omitempty"`
}

type LoginResponse struct {
	User    *User    `json:"user"`
	Session *Session `json:"session"`
}

type Session struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

// Health check response
type HealthCheckResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
}