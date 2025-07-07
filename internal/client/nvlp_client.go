package client

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/thelarryrutledge/nvlp-app/internal/auth"
	"github.com/thelarryrutledge/nvlp-app/internal/client/transports"
)

// NVLPClient provides a unified interface for NVLP API access
type NVLPClient struct {
	postgrestTransport   *transports.PostgRESTTransport
	edgeFunctionTransport *transports.EdgeFunctionTransport
	primaryTransport     Transport
	tokenManager         *auth.TokenManager
	authState            *AuthState
}

// NewNVLPClient creates a new NVLP client instance
func NewNVLPClient(config *NVLPClientConfig) *NVLPClient {
	// Set defaults
	if config.TokenStorageKey == "" {
		config.TokenStorageKey = "nvlp_auth_tokens"
	}
	
	// Create transports
	postgrestTransport := transports.NewPostgRESTTransport(config)
	edgeFunctionTransport := transports.NewEdgeFunctionTransport(config)
	
	// Create token manager
	tokenManager := auth.NewTokenManager(
		config.TokenStorageKey,
		config.PersistTokens,
		config.AutoRefresh,
	)
	
	client := &NVLPClient{
		postgrestTransport:    postgrestTransport,
		edgeFunctionTransport: edgeFunctionTransport,
		primaryTransport:      postgrestTransport, // Default to PostgREST
		tokenManager:          tokenManager,
		authState: &AuthState{
			AccessToken:  "",
			RefreshToken: "",
			ExpiresAt:    time.Time{},
			User:         nil,
		},
	}
	
	// Try to restore session on initialization
	client.restoreSession()
	
	return client
}

// restoreSession attempts to restore authentication session from persisted tokens
func (c *NVLPClient) restoreSession() {
	persistedAuth, err := c.tokenManager.LoadTokens()
	if err != nil {
		// Log error but don't fail initialization
		fmt.Printf("Warning: Failed to load persisted tokens: %v\n", err)
		return
	}
	
	if persistedAuth != nil {
		c.setAuthFromPersisted(persistedAuth)
	}
}

// setAuthFromPersisted sets authentication state from persisted data
func (c *NVLPClient) setAuthFromPersisted(persistedAuth *PersistedAuthData) {
	c.authState.AccessToken = persistedAuth.AccessToken
	c.authState.RefreshToken = persistedAuth.RefreshToken
	c.authState.ExpiresAt = persistedAuth.ExpiresAt
	c.authState.User = persistedAuth.User
	
	// Update transport authentication
	c.postgrestTransport.SetAuth(persistedAuth.AccessToken)
	c.edgeFunctionTransport.SetAuth(persistedAuth.AccessToken)
}

// SetAuth sets authentication state and persists tokens
func (c *NVLPClient) SetAuth(accessToken, refreshToken string, user *User, expiresIn int) error {
	// Calculate expiration time
	expiresAt := time.Now().Add(time.Duration(expiresIn) * time.Second)
	
	c.authState.AccessToken = accessToken
	c.authState.RefreshToken = refreshToken
	c.authState.ExpiresAt = expiresAt
	c.authState.User = user
	c.authState.ExpiresIn = expiresIn
	
	// Update transport authentication
	c.postgrestTransport.SetAuth(accessToken)
	c.edgeFunctionTransport.SetAuth(accessToken)
	
	// Persist tokens if user provided
	if user != nil {
		return c.tokenManager.SaveTokens(accessToken, refreshToken, expiresIn, user)
	}
	
	return nil
}

// ClearAuth clears authentication state and removes persisted tokens
func (c *NVLPClient) ClearAuth() error {
	c.authState.AccessToken = ""
	c.authState.RefreshToken = ""
	c.authState.ExpiresAt = time.Time{}
	c.authState.User = nil
	c.authState.ExpiresIn = 0
	
	c.postgrestTransport.SetAuth("")
	c.edgeFunctionTransport.SetAuth("")
	
	return c.tokenManager.ClearTokens()
}

// IsAuthenticated checks if client is authenticated
func (c *NVLPClient) IsAuthenticated() bool {
	return c.authState.AccessToken != "" && 
		   c.authState.ExpiresAt.After(time.Now())
}

// NeedsTokenRefresh checks if token needs refresh
func (c *NVLPClient) NeedsTokenRefresh() bool {
	return c.tokenManager.NeedsRefresh(c.authState.ExpiresAt)
}

// GetAuthState returns current authentication state
func (c *NVLPClient) GetAuthState() *AuthState {
	return &AuthState{
		AccessToken:  c.authState.AccessToken,
		RefreshToken: c.authState.RefreshToken,
		ExpiresAt:    c.authState.ExpiresAt,
		User:         c.authState.User,
		ExpiresIn:    c.authState.ExpiresIn,
	}
}

// requireAuth ensures authentication or returns error
func (c *NVLPClient) requireAuth() error {
	if !c.IsAuthenticated() {
		return NewAuthenticationError("Authentication required")
	}
	
	// Auto-refresh token if needed
	if c.NeedsTokenRefresh() && c.authState.RefreshToken != "" {
		if err := c.RefreshToken(); err != nil {
			// If refresh fails, clear auth and return error
			c.ClearAuth()
			return NewAuthenticationError("Token refresh failed - please login again")
		}
	}
	
	return nil
}

// ===========================================
// Authentication Methods (Edge Functions)
// ===========================================

// Login authenticates with email and password
func (c *NVLPClient) Login(email, password string) (*LoginResponse, error) {
	response, err := c.edgeFunctionTransport.Auth("login", LoginInput{
		Email:    email,
		Password: password,
	})
	
	if err != nil {
		return nil, err
	}
	
	// Parse response
	var loginResponse LoginResponse
	if err := c.parseResponse(response, &loginResponse); err != nil {
		return nil, err
	}
	
	// Set authentication state
	if loginResponse.Session != nil {
		c.SetAuth(
			loginResponse.Session.AccessToken,
			loginResponse.Session.RefreshToken,
			loginResponse.User,
			loginResponse.Session.ExpiresIn,
		)
	}
	
	return &loginResponse, nil
}

// Register creates a new user account
func (c *NVLPClient) Register(email, password string, displayName *string) (*User, error) {
	response, err := c.edgeFunctionTransport.Auth("register", RegisterInput{
		Email:       email,
		Password:    password,
		DisplayName: displayName,
	})
	
	if err != nil {
		return nil, err
	}
	
	var result struct {
		User *User `json:"user"`
	}
	
	if err := c.parseResponse(response, &result); err != nil {
		return nil, err
	}
	
	return result.User, nil
}

// Logout logs out the current user
func (c *NVLPClient) Logout() error {
	// Store current token for server logout call
	currentToken := c.authState.AccessToken
	
	if currentToken != "" {
		// Logout from server first
		if _, err := c.edgeFunctionTransport.Auth("logout", map[string]interface{}{}); err != nil {
			// Continue with local logout even if server call fails
			fmt.Printf("Warning: Server logout failed: %v\n", err)
		}
	}
	
	// Clear local authentication state
	return c.ClearAuth()
}

// RefreshToken refreshes the access token using refresh token
func (c *NVLPClient) RefreshToken() error {
	if c.authState.RefreshToken == "" {
		return NewAuthenticationError("No refresh token available")
	}
	
	response, err := c.edgeFunctionTransport.Auth("refresh", map[string]interface{}{
		"refresh_token": c.authState.RefreshToken,
	})
	
	if err != nil {
		return err
	}
	
	var result struct {
		Session *Session `json:"session"`
	}
	
	if err := c.parseResponse(response, &result); err != nil {
		return err
	}
	
	if result.Session != nil {
		refreshToken := result.Session.RefreshToken
		if refreshToken == "" {
			refreshToken = c.authState.RefreshToken // Keep existing refresh token
		}
		
		c.SetAuth(
			result.Session.AccessToken,
			refreshToken,
			c.authState.User,
			result.Session.ExpiresIn,
		)
	}
	
	return nil
}

// ResetPassword sends password reset email
func (c *NVLPClient) ResetPassword(email string) error {
	_, err := c.edgeFunctionTransport.Auth("reset", map[string]interface{}{
		"email": email,
	})
	return err
}

// UpdatePassword updates the user's password
func (c *NVLPClient) UpdatePassword(newPassword string) error {
	if err := c.requireAuth(); err != nil {
		return err
	}
	
	_, err := c.edgeFunctionTransport.Auth("update-password", map[string]interface{}{
		"password": newPassword,
	})
	return err
}

// ===========================================
// Profile Methods (PostgREST)
// ===========================================

// GetProfile retrieves the user's profile
func (c *NVLPClient) GetProfile() (*UserProfile, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	response, err := c.postgrestTransport.Get("user_profiles", QueryParams{
		"select": "*",
	})
	
	if err != nil {
		return nil, err
	}
	
	var profiles []UserProfile
	if err := c.parseResponse(response, &profiles); err != nil {
		return nil, err
	}
	
	if len(profiles) == 0 {
		return nil, NewNotFoundError("Profile not found")
	}
	
	return &profiles[0], nil
}

// UpdateProfile updates the user's profile
func (c *NVLPClient) UpdateProfile(updates map[string]interface{}) (*UserProfile, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	_, err := c.postgrestTransport.Patch("user_profiles", updates)
	if err != nil {
		return nil, err
	}
	
	// Return updated profile
	return c.GetProfile()
}

// ===========================================
// Utility Methods
// ===========================================

// parseResponse parses API response data into the target struct
func (c *NVLPClient) parseResponse(response *APIResponse, target interface{}) error {
	if response.Data == nil {
		return fmt.Errorf("empty response data")
	}
	
	// Convert to JSON and back to ensure proper type conversion
	jsonData, err := json.Marshal(response.Data)
	if err != nil {
		return fmt.Errorf("failed to marshal response data: %w", err)
	}
	
	if err := json.Unmarshal(jsonData, target); err != nil {
		return fmt.Errorf("failed to unmarshal response data: %w", err)
	}
	
	return nil
}

// GetPostgRESTTransport returns the PostgREST transport for advanced queries
func (c *NVLPClient) GetPostgRESTTransport() *transports.PostgRESTTransport {
	return c.postgrestTransport
}

// GetEdgeFunctionTransport returns the Edge Function transport for complex operations
func (c *NVLPClient) GetEdgeFunctionTransport() *transports.EdgeFunctionTransport {
	return c.edgeFunctionTransport
}

// HealthCheck performs a health check
func (c *NVLPClient) HealthCheck() (*HealthCheckResponse, error) {
	// Try a simple request to verify connectivity
	_, err := c.postgrestTransport.Get("user_profiles", QueryParams{"limit": 1})
	
	response := &HealthCheckResponse{
		Timestamp: time.Now(),
	}
	
	if err != nil {
		response.Status = "unhealthy"
	} else {
		response.Status = "healthy"
	}
	
	return response, nil
}