package transports

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/thelarryrutledge/nvlp-app/internal/types"
)

// PostgRESTTransport implements the Transport interface for PostgREST
type PostgRESTTransport struct {
	baseURL    string
	anonKey    string
	authToken  string
	httpClient *http.Client
}

// NewPostgRESTTransport creates a new PostgREST transport
func NewPostgRESTTransport(config *types.NVLPClientConfig) *PostgRESTTransport {
	baseURL := config.SupabaseURL + "/rest/v1"
	if config.APIBaseURL != "" {
		baseURL = config.APIBaseURL + "/rest/v1"
	}

	timeout := 30 * time.Second
	if config.Timeout > 0 {
		timeout = config.Timeout
	}

	return &PostgRESTTransport{
		baseURL: baseURL,
		anonKey: config.SupabaseAnonKey,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

// SetAuth sets the authentication token
func (p *PostgRESTTransport) SetAuth(token string) {
	p.authToken = token
}

// Request performs an HTTP request to the PostgREST API
func (p *PostgRESTTransport) Request(method, endpoint string, data interface{}, options *types.RequestOptions) (*types.APIResponse, error) {
	// Build URL
	fullURL := p.baseURL + "/" + strings.TrimPrefix(endpoint, "/")
	
	// Handle query parameters for GET requests
	if method == "GET" && data != nil {
		if params, ok := data.(types.QueryParams); ok {
			queryParams := url.Values{}
			for key, value := range params {
				queryParams.Add(key, fmt.Sprintf("%v", value))
			}
			if len(queryParams) > 0 {
				fullURL += "?" + queryParams.Encode()
			}
		}
	}

	var body io.Reader
	if data != nil && method != "GET" {
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
	req.Header.Set("apikey", p.anonKey)
	
	// Set authentication if available
	if p.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+p.authToken)
	}

	// Apply additional headers from options
	if options != nil && options.Headers != nil {
		for key, value := range options.Headers {
			req.Header.Set(key, value)
		}
	}

	// Execute request
	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, types.NewNetworkError(fmt.Sprintf("request failed: %v", err))
	}
	defer resp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, types.NewNetworkError(fmt.Sprintf("failed to read response body: %v", err))
	}

	// Handle different response types
	apiResponse := &types.APIResponse{
		Status: resp.StatusCode,
	}

	// Check for success status codes
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		if len(respBody) > 0 {
			// Try to unmarshal as JSON
			var result interface{}
			if err := json.Unmarshal(respBody, &result); err != nil {
				// If not JSON, store as string
				apiResponse.Data = string(respBody)
			} else {
				apiResponse.Data = result
			}
		}
		return apiResponse, nil
	}

	// Handle error responses
	var errorResponse struct {
		Message string      `json:"message"`
		Details interface{} `json:"details"`
		Hint    string      `json:"hint"`
		Code    string      `json:"code"`
	}

	if len(respBody) > 0 {
		if err := json.Unmarshal(respBody, &errorResponse); err != nil {
			// If not JSON, use raw body as message
			errorResponse.Message = string(respBody)
		}
	}

	// Create appropriate error based on status code
	message := errorResponse.Message
	if message == "" {
		message = http.StatusText(resp.StatusCode)
	}

	return nil, types.MapHTTPStatusToError(resp.StatusCode, message, errorResponse.Details)
}

// Get performs a GET request
func (p *PostgRESTTransport) Get(endpoint string, params types.QueryParams) (*types.APIResponse, error) {
	return p.Request("GET", endpoint, params, nil)
}

// Post performs a POST request
func (p *PostgRESTTransport) Post(endpoint string, data interface{}) (*types.APIResponse, error) {
	options := &types.RequestOptions{
		Headers: map[string]string{
			"Prefer": "return=representation",
		},
	}
	return p.Request("POST", endpoint, data, options)
}

// Patch performs a PATCH request
func (p *PostgRESTTransport) Patch(endpoint string, data interface{}) (*types.APIResponse, error) {
	options := &types.RequestOptions{
		Headers: map[string]string{
			"Prefer": "return=representation",
		},
	}
	return p.Request("PATCH", endpoint, data, options)
}

// Delete performs a DELETE request
func (p *PostgRESTTransport) Delete(endpoint string) (*types.APIResponse, error) {
	return p.Request("DELETE", endpoint, nil, nil)
}

// BuildQuery builds a PostgREST query string from parameters
func (p *PostgRESTTransport) BuildQuery(table string, params types.QueryParams) string {
	query := table
	
	if len(params) > 0 {
		values := url.Values{}
		for key, value := range params {
			values.Add(key, fmt.Sprintf("%v", value))
		}
		query += "?" + values.Encode()
	}
	
	return query
}

// GetURL returns the base URL for this transport
func (p *PostgRESTTransport) GetURL() string {
	return p.baseURL
}