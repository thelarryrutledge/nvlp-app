#!/bin/bash

# Metro bundler startup script with proper PATH
# This ensures node is available when React Native CLI spawns Metro

# Add Homebrew to PATH
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"

# Add common node paths
export PATH="/usr/local/bin:$PATH"

# Verify node is available
if ! command -v node &> /dev/null; then
    echo "Error: node not found in PATH"
    echo "Current PATH: $PATH"
    exit 1
fi

# Start Metro bundler
echo "Starting Metro bundler with node at: $(which node)"
exec node "$(dirname "$0")/../node_modules/@react-native-community/cli/build/bin.js" start "$@"