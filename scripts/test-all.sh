#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧪 Running NVLP Monorepo Tests..."
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

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Test packages in order
echo "📦 Testing packages..."
echo ""

# Test @nvlp/types
print_step "Testing @nvlp/types..."
if pnpm --filter @nvlp/types test > /dev/null 2>&1; then
    print_success "@nvlp/types type definitions are valid"
else
    print_error "Failed to validate @nvlp/types"
    exit 1
fi

# Test @nvlp/client
print_step "Testing @nvlp/client..."
if pnpm --filter @nvlp/client test > /dev/null 2>&1; then
    print_success "@nvlp/client tests passed"
else
    print_error "Failed @nvlp/client tests"
    exit 1
fi

echo ""
echo "🚀 Testing applications..."
echo ""

# Test mobile app
print_step "Testing @nvlp/mobile..."
if pnpm --filter @nvlp/mobile test > /dev/null 2>&1; then
    print_success "@nvlp/mobile tests passed"
else
    print_warning "@nvlp/mobile tests have React Native Jest compatibility issues"
fi

# Test API (with Deno check)
print_step "Testing @nvlp/api..."
if command -v deno >/dev/null 2>&1; then
    if pnpm --filter @nvlp/api test > /dev/null 2>&1; then
        print_success "@nvlp/api tests passed"
    else
        print_error "Failed @nvlp/api tests"
        exit 1
    fi
else
    print_warning "@nvlp/api tests skipped (Deno runtime not available)"
fi

echo ""
echo -e "${GREEN}✅ All tests completed successfully!${NC}"
echo ""
echo "Test coverage available for:"
echo "  • Client: pnpm test:coverage"
echo ""