#!/bin/bash

# NVLP Android Version Sync Script
# Syncs version and build number from package.json to Android build

set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$(cd "$ANDROID_DIR/.." && pwd)"

# Read version from package.json
if [ -f "$MOBILE_DIR/package.json" ]; then
    VERSION=$(node -p "require('$MOBILE_DIR/package.json').version")
    echo "📱 Syncing Android version to: $VERSION"
else
    echo "❌ Error: package.json not found at $MOBILE_DIR/package.json"
    exit 1
fi

# Get build number from git commits or use 1 as default
if command -v git > /dev/null 2>&1 && git rev-parse --git-dir > /dev/null 2>&1; then
    VERSION_CODE=$(git rev-list --count HEAD 2>/dev/null || echo "1")
else
    VERSION_CODE="1"
fi

echo "✅ Android version sync ready:"
echo "   versionName = $VERSION"
echo "   versionCode = $VERSION_CODE"

# The actual version injection happens via gradle functions in build.gradle
# This script is mainly for validation and can be extended for additional tasks

echo "🎉 Android version sync complete!"
echo "💡 Version will be automatically applied during build via gradle functions"