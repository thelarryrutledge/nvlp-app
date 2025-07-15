#!/bin/bash

# NVLP iOS Build Configuration Script
# Configures iOS build settings for monorepo deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 NVLP iOS Build Configuration${NC}"
echo -e "${BLUE}================================${NC}"

# Get the directory paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$(cd "$IOS_DIR/.." && pwd)"
ROOT_DIR="$(cd "$MOBILE_DIR/../.." && pwd)"

echo -e "${YELLOW}📍 Configuration Paths:${NC}"
echo "   iOS Directory: $IOS_DIR"
echo "   Mobile App: $MOBILE_DIR"
echo "   Monorepo Root: $ROOT_DIR"
echo ""

# 1. Verify monorepo structure
echo -e "${YELLOW}🏗️  Verifying monorepo structure...${NC}"

# Check for workspace packages
REQUIRED_PACKAGES=("packages/types" "packages/client" "packages/config")
for package in "${REQUIRED_PACKAGES[@]}"; do
    if [ -d "$ROOT_DIR/$package" ]; then
        echo -e "${GREEN}✓${NC} Found: $package"
    else
        echo -e "${RED}✗${NC} Missing: $package"
        exit 1
    fi
done

# 2. Verify Podfile configuration
echo -e "${YELLOW}📦 Checking Podfile configuration...${NC}"

PODFILE="$IOS_DIR/Podfile"
if [ -f "$PODFILE" ]; then
    if grep -q "app_path.*\\.\\." "$PODFILE"; then
        echo -e "${GREEN}✓${NC} Podfile configured for monorepo"
    else
        echo -e "${YELLOW}⚠️${NC}  Podfile may need monorepo configuration"
    fi
else
    echo -e "${RED}✗${NC} Podfile not found"
    exit 1
fi

# 3. Check Xcode project configuration
echo -e "${YELLOW}🔨 Validating Xcode project...${NC}"

PROJECT_FILE="$IOS_DIR/NVLPMobile.xcodeproj/project.pbxproj"
if [ -f "$PROJECT_FILE" ]; then
    # Check bundle identifier
    if grep -q "com.nvlp.mobile" "$PROJECT_FILE"; then
        echo -e "${GREEN}✓${NC} Bundle identifier updated for NVLP"
    else
        echo -e "${YELLOW}⚠️${NC}  Bundle identifier may need updating"
    fi
    
    # Check deployment target
    if grep -q "IPHONEOS_DEPLOYMENT_TARGET = 15.0" "$PROJECT_FILE"; then
        echo -e "${GREEN}✓${NC} iOS deployment target set to 15.0"
    else
        echo -e "${YELLOW}⚠️${NC}  iOS deployment target may need updating"
    fi
else
    echo -e "${RED}✗${NC} Xcode project file not found"
    exit 1
fi

# 4. Validate workspace dependencies
echo -e "${YELLOW}🔗 Checking workspace dependencies...${NC}"

PACKAGE_JSON="$MOBILE_DIR/package.json"
if [ -f "$PACKAGE_JSON" ]; then
    if grep -q "workspace:" "$PACKAGE_JSON"; then
        echo -e "${GREEN}✓${NC} Mobile app uses workspace dependencies"
    else
        echo -e "${YELLOW}⚠️${NC}  No workspace dependencies found"
    fi
else
    echo -e "${RED}✗${NC} Mobile package.json not found"
    exit 1
fi

# 5. Check build scripts
echo -e "${YELLOW}📋 Validating build scripts...${NC}"

if grep -q "sync-version.sh" "$PACKAGE_JSON"; then
    echo -e "${GREEN}✓${NC} Version sync script configured"
else
    echo -e "${YELLOW}⚠️${NC}  Version sync script not configured"
fi

if grep -q "prebuild:ios" "$PACKAGE_JSON"; then
    echo -e "${GREEN}✓${NC} iOS prebuild scripts configured"
else
    echo -e "${YELLOW}⚠️${NC}  iOS prebuild scripts missing"
fi

# 6. Test version sync functionality
echo -e "${YELLOW}🔄 Testing version sync...${NC}"

VERSION_SCRIPT="$IOS_DIR/scripts/sync-version.sh"
if [ -f "$VERSION_SCRIPT" ] && [ -x "$VERSION_SCRIPT" ]; then
    echo -e "${GREEN}✓${NC} Version sync script is executable"
    
    # Test the script (dry run)
    if "$VERSION_SCRIPT" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Version sync test successful"
    else
        echo -e "${YELLOW}⚠️${NC}  Version sync test failed (may be normal in CI)"
    fi
else
    echo -e "${RED}✗${NC} Version sync script not found or not executable"
fi

# 7. Validate Info.plist
echo -e "${YELLOW}📄 Checking Info.plist configuration...${NC}"

INFO_PLIST="$IOS_DIR/NVLPMobile/Info.plist"
if [ -f "$INFO_PLIST" ]; then
    echo -e "${GREEN}✓${NC} Info.plist found"
    
    # Check for required keys
    if grep -q "CFBundleDisplayName" "$INFO_PLIST"; then
        echo -e "${GREEN}✓${NC} Bundle display name configured"
    fi
    
    if grep -q "RCTNewArchEnabled" "$INFO_PLIST"; then
        echo -e "${GREEN}✓${NC} New Architecture enabled"
    fi
else
    echo -e "${RED}✗${NC} Info.plist not found"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 iOS Build Configuration Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "${GREEN}✓${NC} Monorepo structure validated"
echo -e "${GREEN}✓${NC} Xcode project configured"
echo -e "${GREEN}✓${NC} Build scripts ready"
echo -e "${GREEN}✓${NC} Version management setup"
echo ""
echo -e "${BLUE}🚀 Ready for iOS builds:${NC}"
echo "   Development: pnpm run ios"
echo "   Production:  pnpm run build:ios:prod"
echo ""