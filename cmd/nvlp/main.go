package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/thelarryrutledge/nvlp-app/internal/config"
)

var (
	cfgFile string
	verbose bool
	version = "0.1.0"
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "nvlp",
	Short: "NVLP CLI - Virtual Envelope Budget Management",
	Long: `NVLP CLI is a command-line interface for managing your virtual envelope budget.
	
This tool allows you to:
- Manage budgets, envelopes, and transactions
- Track income and expenses
- Generate reports and insights
- Export data for analysis

Complete documentation is available at https://docs.nvlp.app`,
	Version: version,
}

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(initConfig)

	// Global flags
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.nvlp/config.yaml)")
	rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "verbose output")
	
	// Add version flag
	rootCmd.Flags().BoolP("version", "V", false, "Print version information and exit")
}

// initConfig reads in config file and ENV variables if set.
func initConfig() {
	config.InitConfig(cfgFile, verbose)
}

func main() {
	Execute()
}