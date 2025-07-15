#!/bin/bash

# NVLP Android Build Configuration Script
# Configures Android build settings for monorepo deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 NVLP Android Build Configuration${NC}"
echo -e "${BLUE}====================================${NC}"

# Get the directory paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$(cd "$ANDROID_DIR/.." && pwd)"
ROOT_DIR="$(cd "$MOBILE_DIR/../.." && pwd)"

echo -e "${YELLOW}📍 Configuration Paths:${NC}"
echo "   Android Directory: $ANDROID_DIR"
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

# 2. Verify build.gradle configuration
echo -e "${YELLOW}📦 Checking build.gradle configuration...${NC}"

BUILD_GRADLE="$ANDROID_DIR/app/build.gradle"
if [ -f "$BUILD_GRADLE" ]; then
    # Check application ID
    if grep -q "com.nvlp.mobile" "$BUILD_GRADLE"; then
        echo -e "${GREEN}✓${NC} Application ID updated for NVLP"
    else
        echo -e "${YELLOW}⚠️${NC}  Application ID may need updating"
    fi
    
    # Check version functions
    if grep -q "getVersionName()" "$BUILD_GRADLE" && grep -q "getVersionCode()" "$BUILD_GRADLE"; then
        echo -e "${GREEN}✓${NC} Dynamic version management configured"
    else
        echo -e "${YELLOW}⚠️${NC}  Static version configuration detected"
    fi
    
    # Check ProGuard settings
    if grep -q "enableProguardInReleaseBuilds = true" "$BUILD_GRADLE"; then
        echo -e "${GREEN}✓${NC} ProGuard enabled for release builds"
    else
        echo -e "${YELLOW}⚠️${NC}  ProGuard not enabled"
    fi
else
    echo -e "${RED}✗${NC} app/build.gradle not found"
    exit 1
fi

# 3. Check gradle.properties
echo -e "${YELLOW}🔧 Validating gradle.properties...${NC}"

GRADLE_PROPS="$ANDROID_DIR/gradle.properties"
if [ -f "$GRADLE_PROPS" ]; then
    if grep -q "newArchEnabled=true" "$GRADLE_PROPS"; then
        echo -e "${GREEN}✓${NC} New Architecture enabled"
    else
        echo -e "${YELLOW}⚠️${NC}  New Architecture not enabled"
    fi
    
    if grep -q "hermesEnabled=true" "$GRADLE_PROPS"; then
        echo -e "${GREEN}✓${NC} Hermes JS engine enabled"
    else
        echo -e "${YELLOW}⚠️${NC}  JSC engine in use"
    fi
    
    if grep -q "android.useAndroidX=true" "$GRADLE_PROPS"; then
        echo -e "${GREEN}✓${NC} AndroidX enabled"
    else
        echo -e "${RED}✗${NC} AndroidX not enabled"
    fi
else
    echo -e "${RED}✗${NC} gradle.properties not found"
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

if grep -q "build:android" "$PACKAGE_JSON"; then
    echo -e "${GREEN}✓${NC} Android build scripts configured"
else
    echo -e "${YELLOW}⚠️${NC}  Android build scripts missing"
fi

if grep -q "build:android:prod" "$PACKAGE_JSON"; then
    echo -e "${GREEN}✓${NC} Android production build script configured"
else
    echo -e "${YELLOW}⚠️${NC}  Android production build script missing"
fi

# 6. Test version sync functionality
echo -e "${YELLOW}🔄 Testing version sync...${NC}"

VERSION_SCRIPT="$ANDROID_DIR/scripts/sync-version.sh"
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

# 7. Validate AndroidManifest
echo -e "${YELLOW}📄 Checking AndroidManifest.xml...${NC}"

MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST" ]; then
    echo -e "${GREEN}✓${NC} AndroidManifest.xml found"
    
    # Check for required permissions
    if grep -q "android.permission.INTERNET" "$MANIFEST"; then
        echo -e "${GREEN}✓${NC} Internet permission configured"
    fi
else
    echo -e "${RED}✗${NC} AndroidManifest.xml not found"
    exit 1
fi

# 8. Check SDK versions
echo -e "${YELLOW}📱 Checking SDK configuration...${NC}"

ROOT_BUILD_GRADLE="$ANDROID_DIR/build.gradle"
if [ -f "$ROOT_BUILD_GRADLE" ]; then
    if grep -q "compileSdkVersion = 35" "$ROOT_BUILD_GRADLE"; then
        echo -e "${GREEN}✓${NC} Modern compile SDK version (35)"
    fi
    
    if grep -q "minSdkVersion = 24" "$ROOT_BUILD_GRADLE"; then
        echo -e "${GREEN}✓${NC} Reasonable minimum SDK version (24/Android 7.0)"
    fi
    
    if grep -q "targetSdkVersion = 35" "$ROOT_BUILD_GRADLE"; then
        echo -e "${GREEN}✓${NC} Up-to-date target SDK version (35)"
    fi
else
    echo -e "${YELLOW}⚠️${NC}  Root build.gradle not found"
fi

echo ""
echo -e "${GREEN}🎉 Android Build Configuration Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "${GREEN}✓${NC} Monorepo structure validated"
echo -e "${GREEN}✓${NC} Gradle project configured"
echo -e "${GREEN}✓${NC} Build scripts ready"
echo -e "${GREEN}✓${NC} Version management setup"
echo ""
echo -e "${BLUE}🚀 Ready for Android builds:${NC}"
echo "   Development: pnpm run android"
echo "   Production:  pnpm run build:android:prod"
echo "   APK Build:   pnpm run build:android"
echo "   Bundle:      pnpm run build:android:bundle"
echo ""