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
// Budget Methods (PostgREST)
// ===========================================

// GetBudgets retrieves all budgets for the authenticated user
func (c *NVLPClient) GetBudgets(params QueryParams) ([]Budget, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	queryParams := QueryParams{"select": "*"}
	for k, v := range params {
		queryParams[k] = v
	}
	
	response, err := c.postgrestTransport.Get("budgets", queryParams)
	if err != nil {
		return nil, err
	}
	
	var budgets []Budget
	if err := c.parseResponse(response, &budgets); err != nil {
		return nil, err
	}
	
	return budgets, nil
}

// GetBudget retrieves a specific budget by ID
func (c *NVLPClient) GetBudget(id string) (*Budget, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	response, err := c.postgrestTransport.Get("budgets", QueryParams{
		"id":     "eq." + id,
		"select": "*",
	})
	
	if err != nil {
		return nil, err
	}
	
	var budgets []Budget
	if err := c.parseResponse(response, &budgets); err != nil {
		return nil, err
	}
	
	if len(budgets) == 0 {
		return nil, NewNotFoundError("Budget not found")
	}
	
	return &budgets[0], nil
}

// CreateBudget creates a new budget
func (c *NVLPClient) CreateBudget(input *CreateBudgetInput) (*Budget, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	response, err := c.postgrestTransport.Post("budgets", input)
	if err != nil {
		return nil, err
	}
	
	var budgets []Budget
	if err := c.parseResponse(response, &budgets); err != nil {
		return nil, err
	}
	
	if len(budgets) == 0 {
		return nil, fmt.Errorf("failed to create budget")
	}
	
	return &budgets[0], nil
}

// UpdateBudget updates an existing budget
func (c *NVLPClient) UpdateBudget(id string, updates *UpdateBudgetInput) (*Budget, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	_, err := c.postgrestTransport.Patch("budgets?id=eq."+id, updates)
	if err != nil {
		return nil, err
	}
	
	return c.GetBudget(id)
}

// DeleteBudget deletes a budget
func (c *NVLPClient) DeleteBudget(id string) error {
	if err := c.requireAuth(); err != nil {
		return err
	}
	
	_, err := c.postgrestTransport.Delete("budgets?id=eq." + id)
	return err
}

// ===========================================
// Income Source Methods (PostgREST)
// ===========================================

// GetIncomeSources retrieves income sources, optionally filtered by budget
func (c *NVLPClient) GetIncomeSources(budgetID string, params QueryParams) ([]IncomeSource, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	queryParams := QueryParams{"select": "*"}
	if budgetID != "" {
		queryParams["budget_id"] = "eq." + budgetID
	}
	
	for k, v := range params {
		queryParams[k] = v
	}
	
	response, err := c.postgrestTransport.Get("income_sources", queryParams)
	if err != nil {
		return nil, err
	}
	
	var incomeSources []IncomeSource
	if err := c.parseResponse(response, &incomeSources); err != nil {
		return nil, err
	}
	
	return incomeSources, nil
}

// GetIncomeSource retrieves a specific income source by ID
func (c *NVLPClient) GetIncomeSource(id string) (*IncomeSource, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	response, err := c.postgrestTransport.Get("income_sources", QueryParams{
		"id":     "eq." + id,
		"select": "*",
	})
	
	if err != nil {
		return nil, err
	}
	
	var incomeSources []IncomeSource
	if err := c.parseResponse(response, &incomeSources); err != nil {
		return nil, err
	}
	
	if len(incomeSources) == 0 {
		return nil, NewNotFoundError("Income source not found")
	}
	
	return &incomeSources[0], nil
}

// CreateIncomeSource creates a new income source
func (c *NVLPClient) CreateIncomeSource(input *CreateIncomeSourceInput) (*IncomeSource, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	response, err := c.postgrestTransport.Post("income_sources", input)
	if err != nil {
		return nil, err
	}
	
	var incomeSources []IncomeSource
	if err := c.parseResponse(response, &incomeSources); err != nil {
		return nil, err
	}
	
	if len(incomeSources) == 0 {
		return nil, fmt.Errorf("failed to create income source")
	}
	
	return &incomeSources[0], nil
}

// UpdateIncomeSource updates an existing income source
func (c *NVLPClient) UpdateIncomeSource(id string, updates *UpdateIncomeSourceInput) (*IncomeSource, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	_, err := c.postgrestTransport.Patch("income_sources?id=eq."+id, updates)
	if err != nil {
		return nil, err
	}
	
	return c.GetIncomeSource(id)
}

// DeleteIncomeSource deletes an income source
func (c *NVLPClient) DeleteIncomeSource(id string) error {
	if err := c.requireAuth(); err != nil {
		return err
	}
	
	_, err := c.postgrestTransport.Delete("income_sources?id=eq." + id)
	return err
}

// ===========================================
// Category Methods (PostgREST)
// ===========================================

// GetCategories retrieves categories, optionally filtered by budget
func (c *NVLPClient) GetCategories(budgetID string, params QueryParams) ([]Category, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	queryParams := QueryParams{"select": "*"}
	if budgetID != "" {
		queryParams["budget_id"] = "eq." + budgetID
	}
	
	for k, v := range params {
		queryParams[k] = v
	}
	
	response, err := c.postgrestTransport.Get("categories", queryParams)
	if err != nil {
		return nil, err
	}
	
	var categories []Category
	if err := c.parseResponse(response, &categories); err != nil {
		return nil, err
	}
	
	return categories, nil
}

// GetCategory retrieves a specific category by ID
func (c *NVLPClient) GetCategory(id string) (*Category, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	response, err := c.postgrestTransport.Get("categories", QueryParams{
		"id":     "eq." + id,
		"select": "*",
	})
	
	if err != nil {
		return nil, err
	}
	
	var categories []Category
	if err := c.parseResponse(response, &categories); err != nil {
		return nil, err
	}
	
	if len(categories) == 0 {
		return nil, NewNotFoundError("Category not found")
	}
	
	return &categories[0], nil
}

// CreateCategory creates a new category
func (c *NVLPClient) CreateCategory(input *CreateCategoryInput) (*Category, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	response, err := c.postgrestTransport.Post("categories", input)
	if err != nil {
		return nil, err
	}
	
	var categories []Category
	if err := c.parseResponse(response, &categories); err != nil {
		return nil, err
	}
	
	if len(categories) == 0 {
		return nil, fmt.Errorf("failed to create category")
	}
	
	return &categories[0], nil
}

// UpdateCategory updates an existing category
func (c *NVLPClient) UpdateCategory(id string, updates *UpdateCategoryInput) (*Category, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	_, err := c.postgrestTransport.Patch("categories?id=eq."+id, updates)
	if err != nil {
		return nil, err
	}
	
	return c.GetCategory(id)
}

// DeleteCategory deletes a category
func (c *NVLPClient) DeleteCategory(id string) error {
	if err := c.requireAuth(); err != nil {
		return err
	}
	
	_, err := c.postgrestTransport.Delete("categories?id=eq." + id)
	return err
}

// ===========================================
// Envelope Methods (PostgREST)
// ===========================================

// GetEnvelopes retrieves envelopes, optionally filtered by budget
func (c *NVLPClient) GetEnvelopes(budgetID string, params QueryParams) ([]Envelope, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	queryParams := QueryParams{"select": "*"}
	if budgetID != "" {
		queryParams["budget_id"] = "eq." + budgetID
	}
	
	for k, v := range params {
		queryParams[k] = v
	}
	
	response, err := c.postgrestTransport.Get("envelopes", queryParams)
	if err != nil {
		return nil, err
	}
	
	var envelopes []Envelope
	if err := c.parseResponse(response, &envelopes); err != nil {
		return nil, err
	}
	
	return envelopes, nil
}

// GetEnvelope retrieves a specific envelope by ID
func (c *NVLPClient) GetEnvelope(id string) (*Envelope, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	response, err := c.postgrestTransport.Get("envelopes", QueryParams{
		"id":     "eq." + id,
		"select": "*",
	})
	
	if err != nil {
		return nil, err
	}
	
	var envelopes []Envelope
	if err := c.parseResponse(response, &envelopes); err != nil {
		return nil, err
	}
	
	if len(envelopes) == 0 {
		return nil, NewNotFoundError("Envelope not found")
	}
	
	return &envelopes[0], nil
}

// CreateEnvelope creates a new envelope
func (c *NVLPClient) CreateEnvelope(input *CreateEnvelopeInput) (*Envelope, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	response, err := c.postgrestTransport.Post("envelopes", input)
	if err != nil {
		return nil, err
	}
	
	var envelopes []Envelope
	if err := c.parseResponse(response, &envelopes); err != nil {
		return nil, err
	}
	
	if len(envelopes) == 0 {
		return nil, fmt.Errorf("failed to create envelope")
	}
	
	return &envelopes[0], nil
}

// UpdateEnvelope updates an existing envelope
func (c *NVLPClient) UpdateEnvelope(id string, updates *UpdateEnvelopeInput) (*Envelope, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	_, err := c.postgrestTransport.Patch("envelopes?id=eq."+id, updates)
	if err != nil {
		return nil, err
	}
	
	return c.GetEnvelope(id)
}

// DeleteEnvelope deletes an envelope
func (c *NVLPClient) DeleteEnvelope(id string) error {
	if err := c.requireAuth(); err != nil {
		return err
	}
	
	_, err := c.postgrestTransport.Delete("envelopes?id=eq." + id)
	return err
}

// ===========================================
// Payee Methods (PostgREST)
// ===========================================

// GetPayees retrieves payees, optionally filtered by budget
func (c *NVLPClient) GetPayees(budgetID string, params QueryParams) ([]Payee, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	queryParams := QueryParams{"select": "*"}
	if budgetID != "" {
		queryParams["budget_id"] = "eq." + budgetID
	}
	
	for k, v := range params {
		queryParams[k] = v
	}
	
	response, err := c.postgrestTransport.Get("payees", queryParams)
	if err != nil {
		return nil, err
	}
	
	var payees []Payee
	if err := c.parseResponse(response, &payees); err != nil {
		return nil, err
	}
	
	return payees, nil
}

// GetPayee retrieves a specific payee by ID
func (c *NVLPClient) GetPayee(id string) (*Payee, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	response, err := c.postgrestTransport.Get("payees", QueryParams{
		"id":     "eq." + id,
		"select": "*",
	})
	
	if err != nil {
		return nil, err
	}
	
	var payees []Payee
	if err := c.parseResponse(response, &payees); err != nil {
		return nil, err
	}
	
	if len(payees) == 0 {
		return nil, NewNotFoundError("Payee not found")
	}
	
	return &payees[0], nil
}

// CreatePayee creates a new payee
func (c *NVLPClient) CreatePayee(input *CreatePayeeInput) (*Payee, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	response, err := c.postgrestTransport.Post("payees", input)
	if err != nil {
		return nil, err
	}
	
	var payees []Payee
	if err := c.parseResponse(response, &payees); err != nil {
		return nil, err
	}
	
	if len(payees) == 0 {
		return nil, fmt.Errorf("failed to create payee")
	}
	
	return &payees[0], nil
}

// UpdatePayee updates an existing payee
func (c *NVLPClient) UpdatePayee(id string, updates *UpdatePayeeInput) (*Payee, error) {
	if err := c.requireAuth(); err != nil {
		return nil, err
	}
	
	_, err := c.postgrestTransport.Patch("payees?id=eq."+id, updates)
	if err != nil {
		return nil, err
	}
	
	return c.GetPayee(id)
}

// DeletePayee deletes a payee
func (c *NVLPClient) DeletePayee(id string) error {
	if err := c.requireAuth(); err != nil {
		return err
	}
	
	_, err := c.postgrestTransport.Delete("payees?id=eq." + id)
	return err
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