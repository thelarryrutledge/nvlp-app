package auth

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/thelarryrutledge/nvlp-app/internal/client"
)

// TokenManager handles token persistence and refresh logic
type TokenManager struct {
	storageKey     string
	persistTokens  bool
	autoRefresh    bool
	tokenDirectory string
}

// NewTokenManager creates a new token manager
func NewTokenManager(storageKey string, persistTokens, autoRefresh bool) *TokenManager {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}
	
	return &TokenManager{
		storageKey:     storageKey,
		persistTokens:  persistTokens,
		autoRefresh:    autoRefresh,
		tokenDirectory: filepath.Join(homeDir, ".nvlp"),
	}
}

// SaveTokens saves tokens to persistent storage
func (tm *TokenManager) SaveTokens(accessToken, refreshToken string, expiresIn int, user *client.User) error {
	if !tm.persistTokens {
		return nil
	}

	authData := &client.PersistedAuthData{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(time.Duration(expiresIn) * time.Second),
		User:         user,
		CreatedAt:    time.Now(),
	}

	// Create directory if it doesn't exist
	if err := os.MkdirAll(tm.tokenDirectory, 0700); err != nil {
		return fmt.Errorf("failed to create token directory: %w", err)
	}

	// Write to file
	tokenFile := filepath.Join(tm.tokenDirectory, "auth.json")
	data, err := json.MarshalIndent(authData, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal auth data: %w", err)
	}

	if err := os.WriteFile(tokenFile, data, 0600); err != nil {
		return fmt.Errorf("failed to write auth file: %w", err)
	}

	return nil
}

// LoadTokens loads tokens from persistent storage
func (tm *TokenManager) LoadTokens() (*client.PersistedAuthData, error) {
	if !tm.persistTokens {
		return nil, nil
	}

	tokenFile := filepath.Join(tm.tokenDirectory, "auth.json")
	
	// Check if file exists
	if _, err := os.Stat(tokenFile); os.IsNotExist(err) {
		return nil, nil
	}

	// Read file
	data, err := os.ReadFile(tokenFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read auth file: %w", err)
	}

	// Parse JSON
	var authData client.PersistedAuthData
	if err := json.Unmarshal(data, &authData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal auth data: %w", err)
	}

	// Check if token is expired
	if authData.ExpiresAt.Before(time.Now()) {
		tm.ClearTokens()
		return nil, nil
	}

	return &authData, nil
}

// ClearTokens removes all persisted tokens
func (tm *TokenManager) ClearTokens() error {
	if !tm.persistTokens {
		return nil
	}

	tokenFile := filepath.Join(tm.tokenDirectory, "auth.json")
	
	// Remove the file if it exists
	if _, err := os.Stat(tokenFile); err == nil {
		return os.Remove(tokenFile)
	}

	return nil
}

// NeedsRefresh checks if token needs to be refreshed
func (tm *TokenManager) NeedsRefresh(expiresAt time.Time) bool {
	if !tm.autoRefresh {
		return false
	}
	
	// Refresh if token expires within 5 minutes
	refreshThreshold := time.Now().Add(5 * time.Minute)
	return expiresAt.Before(refreshThreshold)
}

// ParseJWTExpiration extracts expiration time from JWT token
func (tm *TokenManager) ParseJWTExpiration(tokenString string) (*time.Time, error) {
	token, _, err := new(jwt.Parser).ParseUnverified(tokenString, jwt.MapClaims{})
	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		if exp, exists := claims["exp"]; exists {
			if expFloat, ok := exp.(float64); ok {
				expTime := time.Unix(int64(expFloat), 0)
				return &expTime, nil
			}
		}
	}

	return nil, fmt.Errorf("unable to parse expiration from token")
}

// IsTokenValid checks if a token is still valid
func (tm *TokenManager) IsTokenValid(tokenString string) bool {
	expTime, err := tm.ParseJWTExpiration(tokenString)
	if err != nil {
		return false
	}
	
	return expTime.After(time.Now())
}

// GetTokenDirectory returns the directory where tokens are stored
func (tm *TokenManager) GetTokenDirectory() string {
	return tm.tokenDirectory
}

// GetTokenFile returns the full path to the token file
func (tm *TokenManager) GetTokenFile() string {
	return filepath.Join(tm.tokenDirectory, "auth.json")
}

// TokenExists checks if a token file exists
func (tm *TokenManager) TokenExists() bool {
	tokenFile := tm.GetTokenFile()
	_, err := os.Stat(tokenFile)
	return err == nil
}