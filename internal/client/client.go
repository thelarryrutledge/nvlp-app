package client

import (
	"time"
	
	"github.com/thelarryrutledge/nvlp-app/internal/types"
)

// Client package provides the main entry point for the NVLP Go client library
// This file serves as the package's main export interface

// DefaultConfig returns a default configuration for the NVLP client
func DefaultConfig() *types.NVLPClientConfig {
	return &types.NVLPClientConfig{
		Transport:        "postgrest",
		Timeout:          30 * time.Second,
		Retries:          3,
		PersistTokens:    true,
		TokenStorageKey:  "nvlp_auth_tokens",
		AutoRefresh:      true,
	}
}

// NewClient creates a new NVLP client with the provided configuration
func NewClient(config *NVLPClientConfig) *NVLPClient {
	return NewNVLPClient(config)
}

// NewClientWithDefaults creates a new NVLP client with default configuration
// You only need to provide the Supabase URL and anonymous key
func NewClientWithDefaults(supabaseURL, anonKey string) *NVLPClient {
	config := DefaultConfig()
	config.SupabaseURL = supabaseURL
	config.SupabaseAnonKey = anonKey
	return NewNVLPClient(config)
}