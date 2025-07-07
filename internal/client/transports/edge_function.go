package transports

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/thelarryrutledge/nvlp-app/internal/client"
)

// EdgeFunctionTransport implements the Transport interface for Edge Functions
type EdgeFunctionTransport struct {
	baseURL    string
	anonKey    string
	authToken  string
	httpClient *http.Client
}

// NewEdgeFunctionTransport creates a new Edge Function transport
func NewEdgeFunctionTransport(config *client.NVLPClientConfig) *EdgeFunctionTransport {
	baseURL := config.SupabaseURL + "/functions/v1"
	if config.APIBaseURL != "" {
		baseURL = config.APIBaseURL + "/functions/v1"
	}

	timeout := 30 * time.Second
	if config.Timeout > 0 {
		timeout = config.Timeout
	}

	return &EdgeFunctionTransport{
		baseURL: baseURL,
		anonKey: config.SupabaseAnonKey,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

// SetAuth sets the authentication token
func (e *EdgeFunctionTransport) SetAuth(token string) {
	e.authToken = token
}

// Request performs an HTTP request to an Edge Function
func (e *EdgeFunctionTransport) Request(method, endpoint string, data interface{}, options *client.RequestOptions) (*client.APIResponse, error) {
	// Build URL
	fullURL := e.baseURL + "/" + strings.TrimPrefix(endpoint, "/")
	
	var body io.Reader
	if data != nil {
		jsonData, err := json.Marshal(data)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request data: %w", err)
		}
		body = bytes.NewReader(jsonData)
	}

	// Create request
	req, err := http.NewRequest(method, fullURL, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+e.anonKey)
	
	// Set authentication if available
	if e.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+e.authToken)
	}

	// Apply additional headers from options
	if options != nil && options.Headers != nil {
		for key, value := range options.Headers {
			req.Header.Set(key, value)
		}
	}

	// Execute request
	resp, err := e.httpClient.Do(req)
	if err != nil {
		return nil, client.NewNetworkError(fmt.Sprintf("request failed: %v", err))
	}
	defer resp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, client.NewNetworkError(fmt.Sprintf("failed to read response body: %v", err))
	}

	// Parse response
	apiResponse := &client.APIResponse{
		Status: resp.StatusCode,
	}

	// Edge Functions typically return JSON in the format: {success: bool, data: any, error: any}
	if len(respBody) > 0 {
		var edgeResponse struct {
			Success bool        `json:"success"`
			Data    interface{} `json:"data"`
			Error   interface{} `json:"error"`
		}

		if err := json.Unmarshal(respBody, &edgeResponse); err != nil {
			// If not the expected format, try to parse as generic JSON
			var result interface{}
			if jsonErr := json.Unmarshal(respBody, &result); jsonErr != nil {
				// If all else fails, store as string
				apiResponse.Data = string(respBody)
			} else {
				apiResponse.Data = result
			}
		} else {
			// Use the parsed Edge Function response
			if edgeResponse.Success {
				apiResponse.Data = edgeResponse.Data
			} else {
				// Handle error response
				errorMsg := "Unknown error"
				if edgeResponse.Error != nil {
					if errStr, ok := edgeResponse.Error.(string); ok {
						errorMsg = errStr
					} else if errMap, ok := edgeResponse.Error.(map[string]interface{}); ok {
						if msg, exists := errMap["message"]; exists {
							errorMsg = fmt.Sprintf("%v", msg)
						}
					}
				}
				
				return nil, client.MapHTTPStatusToError(resp.StatusCode, errorMsg, edgeResponse.Error)
			}
		}
	}

	// Check HTTP status code
	if resp.StatusCode >= 400 {
		message := http.StatusText(resp.StatusCode)
		if apiResponse.Data != nil {
			message = fmt.Sprintf("%v", apiResponse.Data)
		}
		return nil, client.MapHTTPStatusToError(resp.StatusCode, message, nil)
	}

	return apiResponse, nil
}

// CallFunction calls a specific Edge Function
func (e *EdgeFunctionTransport) CallFunction(functionName string, data interface{}) (*client.APIResponse, error) {
	return e.Request("POST", functionName, data, nil)
}

// Auth calls authentication-related Edge Functions
func (e *EdgeFunctionTransport) Auth(action string, data interface{}) (*client.APIResponse, error) {
	endpoint := fmt.Sprintf("auth/%s", action)
	return e.Request("POST", endpoint, data, nil)
}

// Transaction calls transaction-related Edge Functions
func (e *EdgeFunctionTransport) Transaction(action string, data interface{}) (*client.APIResponse, error) {
	endpoint := fmt.Sprintf("transactions/%s", action)
	if action == "" {
		endpoint = "transactions"
	}
	return e.Request("POST", endpoint, data, nil)
}

// Dashboard calls dashboard-related Edge Functions
func (e *EdgeFunctionTransport) Dashboard(budgetID string, params map[string]interface{}) (*client.APIResponse, error) {
	data := map[string]interface{}{
		"budget_id": budgetID,
	}
	
	// Merge additional parameters
	if params != nil {
		for key, value := range params {
			data[key] = value
		}
	}
	
	return e.Request("POST", "dashboard", data, nil)
}

// Reports calls reporting-related Edge Functions
func (e *EdgeFunctionTransport) Reports(reportType string, params map[string]interface{}) (*client.APIResponse, error) {
	data := map[string]interface{}{
		"report_type": reportType,
	}
	
	// Merge additional parameters
	if params != nil {
		for key, value := range params {
			data[key] = value
		}
	}
	
	return e.Request("POST", "reports", data, nil)
}

// Export calls export-related Edge Functions
func (e *EdgeFunctionTransport) Export(exportType string, params map[string]interface{}) (*client.APIResponse, error) {
	data := map[string]interface{}{
		"export_type": exportType,
	}
	
	// Merge additional parameters
	if params != nil {
		for key, value := range params {
			data[key] = value
		}
	}
	
	return e.Request("POST", "export", data, nil)
}

// GetURL returns the base URL for this transport
func (e *EdgeFunctionTransport) GetURL() string {
	return e.baseURL
}