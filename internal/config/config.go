package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/viper"
)

// Config holds the application configuration
type Config struct {
	SupabaseURL     string `mapstructure:"supabase_url"`
	SupabaseAnonKey string `mapstructure:"supabase_anon_key"`
	APIBaseURL      string `mapstructure:"api_base_url"`
	Debug           bool   `mapstructure:"debug"`
	Verbose         bool   `mapstructure:"verbose"`
}

var AppConfig *Config

// InitConfig initializes the configuration system
func InitConfig(cfgFile string, verbose bool) {
	if cfgFile != "" {
		// Use config file from the flag
		viper.SetConfigFile(cfgFile)
	} else {
		// Find home directory
		home, err := os.UserHomeDir()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting home directory: %v\n", err)
			os.Exit(1)
		}

		// Search config in home directory with name ".nvlp" (without extension)
		configDir := filepath.Join(home, ".nvlp")
		viper.AddConfigPath(configDir)
		viper.SetConfigType("yaml")
		viper.SetConfigName("config")
	}

	// Set environment variable prefix
	viper.SetEnvPrefix("NVLP")
	viper.AutomaticEnv()

	// Set defaults
	viper.SetDefault("debug", false)
	viper.SetDefault("verbose", verbose)

	// Read config file
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// Config file not found; ignore error for now
		} else {
			fmt.Fprintf(os.Stderr, "Error reading config file: %v\n", err)
			os.Exit(1)
		}
	}

	// Unmarshal config
	AppConfig = &Config{}
	if err := viper.Unmarshal(AppConfig); err != nil {
		fmt.Fprintf(os.Stderr, "Error unmarshaling config: %v\n", err)
		os.Exit(1)
	}
}

// GetConfig returns the current configuration
func GetConfig() *Config {
	return AppConfig
}

// SaveConfig saves the current configuration to file
func SaveConfig() error {
	return viper.WriteConfig()
}