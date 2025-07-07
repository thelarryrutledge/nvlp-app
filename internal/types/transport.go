package types

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