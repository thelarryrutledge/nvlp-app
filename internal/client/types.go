package client

import (
	"time"
	
	"github.com/thelarryrutledge/nvlp-app/internal/types"
)

// Import configuration from shared types
type NVLPClientConfig = types.NVLPClientConfig

// Import shared auth types
type AuthState = types.AuthState
type PersistedAuthData = types.PersistedAuthData  
type User = types.User

// Import transport types from shared types
type Transport = types.Transport
type RequestOptions = types.RequestOptions
type APIResponse = types.APIResponse
type APIError = types.APIError
type QueryParams = types.QueryParams

// Import all domain types and inputs from shared types package
type UserProfile = types.UserProfile
type Budget = types.Budget
type IncomeSource = types.IncomeSource
type Category = types.Category
type Envelope = types.Envelope
type Payee = types.Payee
type Transaction = types.Transaction

// Import input types
type CreateBudgetInput = types.CreateBudgetInput
type UpdateBudgetInput = types.UpdateBudgetInput
type CreateIncomeSourceInput = types.CreateIncomeSourceInput
type UpdateIncomeSourceInput = types.UpdateIncomeSourceInput
type CreateCategoryInput = types.CreateCategoryInput
type UpdateCategoryInput = types.UpdateCategoryInput
type CreateEnvelopeInput = types.CreateEnvelopeInput
type UpdateEnvelopeInput = types.UpdateEnvelopeInput
type CreatePayeeInput = types.CreatePayeeInput
type UpdatePayeeInput = types.UpdatePayeeInput
type CreateTransactionInput = types.CreateTransactionInput
type UpdateTransactionInput = types.UpdateTransactionInput

// Import auth and session types
type LoginInput = types.LoginInput
type RegisterInput = types.RegisterInput
type LoginResponse = types.LoginResponse
type Session = types.Session

// Import complex types
type DashboardData = types.DashboardData
type BudgetOverview = types.BudgetOverview
type EnvelopeSummary = types.EnvelopeSummary
type SpendingAnalysis = types.SpendingAnalysis
type CategorySpending = types.CategorySpending
type MonthlySpending = types.MonthlySpending
type IncomeVsExpenses = types.IncomeVsExpenses
type IncomeBySource = types.IncomeBySource
type ReportData = types.ReportData
type ExportData = types.ExportData
type AuditEvent = types.AuditEvent
type Notification = types.Notification
type HealthCheckResponse = types.HealthCheckResponse

// Import error types
type NVLPError = types.NVLPError
type AuthenticationError = types.AuthenticationError
type AuthorizationError = types.AuthorizationError
type ValidationError = types.ValidationError
type NotFoundError = types.NotFoundError
type NetworkError = types.NetworkError
type ServerError = types.ServerError
type ConflictError = types.ConflictError
type RateLimitError = types.RateLimitError
type TimeoutError = types.TimeoutError

// Import error functions
var NewAuthenticationError = types.NewAuthenticationError
var NewAuthorizationError = types.NewAuthorizationError
var NewValidationError = types.NewValidationError
var NewNotFoundError = types.NewNotFoundError
var NewNetworkError = types.NewNetworkError
var NewServerError = types.NewServerError
var NewConflictError = types.NewConflictError
var NewRateLimitError = types.NewRateLimitError
var NewTimeoutError = types.NewTimeoutError
var MapHTTPStatusToError = types.MapHTTPStatusToError