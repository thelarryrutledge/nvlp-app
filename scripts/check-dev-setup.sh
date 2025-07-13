#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Checking NVLP development environment..."
echo ""

# Check Node.js
echo -n "Node.js: "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} $NODE_VERSION"
else
    echo -e "${RED}✗ Not installed${NC}"
fi

# Check pnpm
echo -n "pnpm: "
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm -v)
    echo -e "${GREEN}✓${NC} v$PNPM_VERSION"
else
    echo -e "${RED}✗ Not installed${NC}"
fi

# Check Supabase CLI
echo -n "Supabase CLI: "
if command -v supabase &> /dev/null; then
    SUPABASE_VERSION=$(supabase -v | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    echo -e "${GREEN}✓${NC} v$SUPABASE_VERSION"
else
    echo -e "${YELLOW}⚠ Not installed (required for API development)${NC}"
fi

# Check iOS development tools
echo -n "Xcode: "
if command -v xcodebuild &> /dev/null; then
    XCODE_VERSION=$(xcodebuild -version | head -1)
    echo -e "${GREEN}✓${NC} $XCODE_VERSION"
else
    echo -e "${YELLOW}⚠ Not installed (required for iOS development)${NC}"
fi

# Check Android development tools
echo -n "Java: "
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -1 | cut -d '"' -f 2)
    echo -e "${GREEN}✓${NC} $JAVA_VERSION"
else
    echo -e "${YELLOW}⚠ Not installed (required for Android development)${NC}"
fi

echo -n "Android SDK: "
if [ -n "$ANDROID_HOME" ] || [ -n "$ANDROID_SDK_ROOT" ]; then
    echo -e "${GREEN}✓${NC} Found at ${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
else
    echo -e "${YELLOW}⚠ Not configured (required for Android development)${NC}"
fi

echo ""
echo "📦 Checking workspace packages..."
echo ""

# Check if packages are installed
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Dependencies installed"
    
    # Check if packages are built
    if [ -d "packages/client/dist" ] && [ -d "packages/types/dist" ]; then
        echo -e "${GREEN}✓${NC} Packages built"
    else
        echo -e "${YELLOW}⚠ Packages not built. Run: pnpm build:packages${NC}"
    fi
else
    echo -e "${RED}✗ Dependencies not installed. Run: pnpm install${NC}"
fi

echo ""
echo "🚀 Available development commands:"
echo "  pnpm dev              - Start API + packages"
echo "  pnpm dev:all          - Start everything"
echo "  pnpm dev:mobile:ios   - Start iOS development"
echo "  pnpm dev:mobile:android - Start Android development"
echo ""