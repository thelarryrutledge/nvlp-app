package client

import (
	"fmt"
	"net/http"
)

// Custom error types for the NVLP client
type NVLPError struct {
	Code    string
	Message string
	Details interface{}
	Status  int
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
	case http.StatusInternalServerError, http.StatusBadGateway, http.StatusServiceUnavailable:
		return NewServerError(message)
	default:
		if status >= 500 {
			return NewServerError(message)
		}
		return NewNetworkError(message)
	}
}