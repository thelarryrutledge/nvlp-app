#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔨 Building NVLP Monorepo..."
echo ""

# Function to print step
print_step() {
    echo -e "${BLUE}→ $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Build packages in order
echo "📦 Building packages..."
echo ""

# Build @nvlp/types
print_step "Building @nvlp/types..."
if pnpm --filter @nvlp/types build > /dev/null 2>&1; then
    print_success "@nvlp/types built successfully"
else
    print_error "Failed to build @nvlp/types"
    exit 1
fi

# Build @nvlp/client
print_step "Building @nvlp/client..."
if pnpm --filter @nvlp/client build > /dev/null 2>&1; then
    print_success "@nvlp/client built successfully"
else
    print_error "Failed to build @nvlp/client"
    exit 1
fi

echo ""
echo "🚀 Building applications..."
echo ""

# Build API (just shows message since it's Edge Functions)
print_step "Checking @nvlp/api..."
if pnpm --filter @nvlp/api build > /dev/null 2>&1; then
    print_success "@nvlp/api ready (Edge Functions deploy directly)"
else
    print_error "Failed to check @nvlp/api"
    exit 1
fi

# Mobile app note
echo ""
echo -e "${YELLOW}ℹ️  Mobile app builds:${NC}"
echo "  • iOS: pnpm build:mobile:ios"
echo "  • Android: pnpm build:mobile:android"

echo ""
echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo ""
echo "Build artifacts:"
echo "  • packages/types/dist/"
echo "  • packages/client/dist/"
echo ""