package types

import (
	"time"
)

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
	BudgetID              string   `json:"budget_id"`
	Name                  string   `json:"name"`
	Description           *string  `json:"description,omitempty"`
	ExpectedMonthlyAmount *float64 `json:"expected_monthly_amount,omitempty"`
	IsActive              *bool    `json:"is_active,omitempty"`
	ShouldNotify          *bool    `json:"should_notify,omitempty"`
	Frequency             string   `json:"frequency"`
	CustomDay             *int     `json:"custom_day,omitempty"`
	WeeklyDay             *int     `json:"weekly_day,omitempty"`
	MonthlyDay            *int     `json:"monthly_day,omitempty"`
}

type UpdateIncomeSourceInput struct {
	Name                  *string  `json:"name,omitempty"`
	Description           *string  `json:"description,omitempty"`
	ExpectedMonthlyAmount *float64 `json:"expected_monthly_amount,omitempty"`
	IsActive              *bool    `json:"is_active,omitempty"`
	ShouldNotify          *bool    `json:"should_notify,omitempty"`
	Frequency             *string  `json:"frequency,omitempty"`
	CustomDay             *int     `json:"custom_day,omitempty"`
	WeeklyDay             *int     `json:"weekly_day,omitempty"`
	MonthlyDay            *int     `json:"monthly_day,omitempty"`
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
	BudgetID          string     `json:"budget_id"`
	CategoryID        *string    `json:"category_id,omitempty"`
	Name              string     `json:"name"`
	Description       *string    `json:"description,omitempty"`
	Color             *string    `json:"color,omitempty"`
	Icon              *string    `json:"icon,omitempty"`
	IsActive          *bool      `json:"is_active,omitempty"`
	SortOrder         *int       `json:"sort_order,omitempty"`
	ShouldNotify      *bool      `json:"should_notify,omitempty"`
	NotifyDate        *time.Time `json:"notify_date,omitempty"`
	NotifyBelowAmount *float64   `json:"notify_below_amount,omitempty"`
	NotifyAboveAmount *float64   `json:"notify_above_amount,omitempty"`
}

type UpdateEnvelopeInput struct {
	Name              *string    `json:"name,omitempty"`
	Description       *string    `json:"description,omitempty"`
	CategoryID        *string    `json:"category_id,omitempty"`
	Color             *string    `json:"color,omitempty"`
	Icon              *string    `json:"icon,omitempty"`
	IsActive          *bool      `json:"is_active,omitempty"`
	SortOrder         *int       `json:"sort_order,omitempty"`
	ShouldNotify      *bool      `json:"should_notify,omitempty"`
	NotifyDate        *time.Time `json:"notify_date,omitempty"`
	NotifyBelowAmount *float64   `json:"notify_below_amount,omitempty"`
	NotifyAboveAmount *float64   `json:"notify_above_amount,omitempty"`
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

type CreateTransactionInput struct {
	BudgetID        string    `json:"budget_id"`
	Type            string    `json:"type"`
	Amount          float64   `json:"amount"`
	Description     string    `json:"description"`
	Date            time.Time `json:"date"`
	FromEnvelopeID  *string   `json:"from_envelope_id,omitempty"`
	ToEnvelopeID    *string   `json:"to_envelope_id,omitempty"`
	PayeeID         *string   `json:"payee_id,omitempty"`
	IncomeSourceID  *string   `json:"income_source_id,omitempty"`
	CategoryID      *string   `json:"category_id,omitempty"`
	IsRecurring     *bool     `json:"is_recurring,omitempty"`
	RecurrenceRule  *string   `json:"recurrence_rule,omitempty"`
	Tags            []string  `json:"tags,omitempty"`
}

type UpdateTransactionInput struct {
	Type            *string    `json:"type,omitempty"`
	Amount          *float64   `json:"amount,omitempty"`
	Description     *string    `json:"description,omitempty"`
	Date            *time.Time `json:"date,omitempty"`
	FromEnvelopeID  *string    `json:"from_envelope_id,omitempty"`
	ToEnvelopeID    *string    `json:"to_envelope_id,omitempty"`
	PayeeID         *string    `json:"payee_id,omitempty"`
	IncomeSourceID  *string    `json:"income_source_id,omitempty"`
	CategoryID      *string    `json:"category_id,omitempty"`
	IsRecurring     *bool      `json:"is_recurring,omitempty"`
	RecurrenceRule  *string    `json:"recurrence_rule,omitempty"`
	Tags            []string   `json:"tags,omitempty"`
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