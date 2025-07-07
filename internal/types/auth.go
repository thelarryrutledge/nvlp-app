package types

import (
	"time"
)

// User represents a user in the system
type User struct {
	ID             string `json:"id"`
	Email          string `json:"email"`
	EmailConfirmed bool   `json:"email_confirmed"`
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