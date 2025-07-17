#!/bin/bash

# NVLP iOS Version Sync Script
# Syncs version and build number from package.json to iOS Info.plist

set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$(cd "$PROJECT_DIR/.." && pwd)"

# Read version from package.json
if [ -f "$MOBILE_DIR/package.json" ]; then
    VERSION=$(node -p "require('$MOBILE_DIR/package.json').version")
    echo "📱 Syncing iOS version to: $VERSION"
else
    echo "❌ Error: package.json not found at $MOBILE_DIR/package.json"
    exit 1
fi

# Get build number from git commits or use 1 as default
if command -v git > /dev/null 2>&1 && git rev-parse --git-dir > /dev/null 2>&1; then
    BUILD_NUMBER=$(git rev-list --count HEAD 2>/dev/null || echo "1")
else
    BUILD_NUMBER="1"
fi

# Update Info.plist with new version
INFO_PLIST="$PROJECT_DIR/NVLPMobile/Info.plist"

if [ -f "$INFO_PLIST" ]; then
    # Use PlistBuddy to update the plist
    /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" "$INFO_PLIST"
    /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$INFO_PLIST"
    
    echo "✅ Updated $INFO_PLIST:"
    echo "   CFBundleShortVersionString = $VERSION"
    echo "   CFBundleVersion = $BUILD_NUMBER"
else
    echo "❌ Error: Info.plist not found at $INFO_PLIST"
    exit 1
fi

echo "🎉 iOS version sync complete!"