package types

import (
	"fmt"
	"net/http"
)

// Custom error types for the NVLP client
type NVLPError struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
	Status  int         `json:"status"`
}

func (e *NVLPError) Error() string {
	if e.Details != nil {
		return fmt.Sprintf("%s: %s (details: %v)", e.Code, e.Message, e.Details)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// AuthenticationError represents authentication-related errors
type AuthenticationError struct {
	*NVLPError
}

func NewAuthenticationError(message string) *AuthenticationError {
	return &AuthenticationError{
		NVLPError: &NVLPError{
			Code:    "AUTHENTICATION_ERROR",
			Message: message,
			Status:  http.StatusUnauthorized,
		},
	}
}

// AuthorizationError represents authorization-related errors
type AuthorizationError struct {
	*NVLPError
}

func NewAuthorizationError(message string) *AuthorizationError {
	return &AuthorizationError{
		NVLPError: &NVLPError{
			Code:    "AUTHORIZATION_ERROR",
			Message: message,
			Status:  http.StatusForbidden,
		},
	}
}

// ValidationError represents validation-related errors
type ValidationError struct {
	*NVLPError
}

func NewValidationError(message string, details interface{}) *ValidationError {
	return &ValidationError{
		NVLPError: &NVLPError{
			Code:    "VALIDATION_ERROR",
			Message: message,
			Details: details,
			Status:  http.StatusBadRequest,
		},
	}
}

// NotFoundError represents resource not found errors
type NotFoundError struct {
	*NVLPError
}

func NewNotFoundError(message string) *NotFoundError {
	return &NotFoundError{
		NVLPError: &NVLPError{
			Code:    "NOT_FOUND",
			Message: message,
			Status:  http.StatusNotFound,
		},
	}
}

// NetworkError represents network-related errors
type NetworkError struct {
	*NVLPError
}

func NewNetworkError(message string) *NetworkError {
	return &NetworkError{
		NVLPError: &NVLPError{
			Code:    "NETWORK_ERROR",
			Message: message,
			Status:  http.StatusServiceUnavailable,
		},
	}
}

// ServerError represents server-side errors
type ServerError struct {
	*NVLPError
}

func NewServerError(message string) *ServerError {
	return &ServerError{
		NVLPError: &NVLPError{
			Code:    "SERVER_ERROR",
			Message: message,
			Status:  http.StatusInternalServerError,
		},
	}
}

// ConflictError represents conflict errors (409)
type ConflictError struct {
	*NVLPError
}

func NewConflictError(message string) *ConflictError {
	return &ConflictError{
		NVLPError: &NVLPError{
			Code:    "CONFLICT_ERROR",
			Message: message,
			Status:  http.StatusConflict,
		},
	}
}

// RateLimitError represents rate limiting errors (429)
type RateLimitError struct {
	*NVLPError
}

func NewRateLimitError(message string) *RateLimitError {
	return &RateLimitError{
		NVLPError: &NVLPError{
			Code:    "RATE_LIMIT_ERROR",
			Message: message,
			Status:  http.StatusTooManyRequests,
		},
	}
}

// TimeoutError represents timeout errors
type TimeoutError struct {
	*NVLPError
}

func NewTimeoutError(message string) *TimeoutError {
	return &TimeoutError{
		NVLPError: &NVLPError{
			Code:    "TIMEOUT_ERROR",
			Message: message,
			Status:  http.StatusRequestTimeout,
		},
	}
}

// MapHTTPStatusToError maps HTTP status codes to appropriate error types
func MapHTTPStatusToError(status int, message string, details interface{}) error {
	switch status {
	case http.StatusUnauthorized:
		return NewAuthenticationError(message)
	case http.StatusForbidden:
		return NewAuthorizationError(message)
	case http.StatusBadRequest:
		return NewValidationError(message, details)
	case http.StatusNotFound:
		return NewNotFoundError(message)
	case http.StatusConflict:
		return NewConflictError(message)
	case http.StatusTooManyRequests:
		return NewRateLimitError(message)
	case http.StatusRequestTimeout:
		return NewTimeoutError(message)
	case http.StatusInternalServerError, http.StatusBadGateway, http.StatusServiceUnavailable, http.StatusGatewayTimeout:
		return NewServerError(message)
	default:
		if status >= 500 {
			return NewServerError(message)
		}
		if status >= 400 {
			return NewValidationError(message, details)
		}
		return NewNetworkError(message)
	}
}

// IsRetryableError determines if an error should trigger a retry
func IsRetryableError(err error) bool {
	switch err.(type) {
	case *NetworkError, *TimeoutError, *ServerError:
		return true
	case *RateLimitError:
		return true // With backoff
	default:
		return false
	}
}

// GetErrorCode extracts the error code from an NVLP error
func GetErrorCode(err error) string {
	if nvlpErr, ok := err.(*NVLPError); ok {
		return nvlpErr.Code
	}
	if authErr, ok := err.(*AuthenticationError); ok {
		return authErr.Code
	}
	if authzErr, ok := err.(*AuthorizationError); ok {
		return authzErr.Code
	}
	if valErr, ok := err.(*ValidationError); ok {
		return valErr.Code
	}
	if notFoundErr, ok := err.(*NotFoundError); ok {
		return notFoundErr.Code
	}
	if netErr, ok := err.(*NetworkError); ok {
		return netErr.Code
	}
	if srvErr, ok := err.(*ServerError); ok {
		return srvErr.Code
	}
	if conflictErr, ok := err.(*ConflictError); ok {
		return conflictErr.Code
	}
	if rateLimitErr, ok := err.(*RateLimitError); ok {
		return rateLimitErr.Code
	}
	if timeoutErr, ok := err.(*TimeoutError); ok {
		return timeoutErr.Code
	}
	return "UNKNOWN_ERROR"
}

// GetErrorStatus extracts the HTTP status code from an NVLP error
func GetErrorStatus(err error) int {
	if nvlpErr, ok := err.(*NVLPError); ok {
		return nvlpErr.Status
	}
	if authErr, ok := err.(*AuthenticationError); ok {
		return authErr.Status
	}
	if authzErr, ok := err.(*AuthorizationError); ok {
		return authzErr.Status
	}
	if valErr, ok := err.(*ValidationError); ok {
		return valErr.Status
	}
	if notFoundErr, ok := err.(*NotFoundError); ok {
		return notFoundErr.Status
	}
	if netErr, ok := err.(*NetworkError); ok {
		return netErr.Status
	}
	if srvErr, ok := err.(*ServerError); ok {
		return srvErr.Status
	}
	if conflictErr, ok := err.(*ConflictError); ok {
		return conflictErr.Status
	}
	if rateLimitErr, ok := err.(*RateLimitError); ok {
		return rateLimitErr.Status
	}
	if timeoutErr, ok := err.(*TimeoutError); ok {
		return timeoutErr.Status
	}
	return 500 // Default to server error
}