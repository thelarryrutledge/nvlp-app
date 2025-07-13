#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 Linting NVLP Monorepo..."
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

# Lint packages in order
echo "📦 Linting packages..."
echo ""

# Lint @nvlp/config
print_step "Linting @nvlp/config..."
if pnpm --filter @nvlp/config lint > /dev/null 2>&1; then
    print_success "@nvlp/config linting passed"
else
    print_error "Failed @nvlp/config linting"
    exit 1
fi

# Lint @nvlp/types
print_step "Linting @nvlp/types..."
if pnpm --filter @nvlp/types lint > /dev/null 2>&1; then
    print_success "@nvlp/types linting passed"
else
    print_error "Failed @nvlp/types linting"
    exit 1
fi

# Lint @nvlp/client
print_step "Linting @nvlp/client..."
client_output=$(pnpm --filter @nvlp/client lint 2>&1)
if [ $? -eq 0 ]; then
    if echo "$client_output" | grep -q "warning"; then
        warning_count=$(echo "$client_output" | grep -c "warning")
        print_warning "@nvlp/client passed with $warning_count warnings"
    else
        print_success "@nvlp/client linting passed"
    fi
else
    print_error "Failed @nvlp/client linting"
    exit 1
fi

echo ""
echo "🚀 Linting applications..."
echo ""

# Lint mobile app
print_step "Linting @nvlp/mobile..."
mobile_output=$(pnpm --filter @nvlp/mobile lint 2>&1)
if [ $? -eq 0 ]; then
    if echo "$mobile_output" | grep -q "warning\|error"; then
        issue_count=$(echo "$mobile_output" | grep -c -E "warning|error")
        print_warning "@nvlp/mobile has $issue_count lint issues (use lint:fix to resolve)"
    else
        print_success "@nvlp/mobile linting passed"
    fi
else
    print_warning "@nvlp/mobile has lint issues (use lint:fix to resolve)"
fi

# Lint API (with Deno check)
print_step "Linting @nvlp/api..."
if command -v deno >/dev/null 2>&1; then
    if pnpm --filter @nvlp/api lint > /dev/null 2>&1; then
        print_success "@nvlp/api linting passed (Deno)"
    else
        print_error "Failed @nvlp/api linting"
        exit 1
    fi
else
    if pnpm --filter @nvlp/api lint:eslint > /dev/null 2>&1; then
        print_success "@nvlp/api linting passed (ESLint fallback)"
    else
        print_error "Failed @nvlp/api linting"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}✅ Lint check completed!${NC}"
echo ""
echo "Fix lint issues with:"
echo "  • All: pnpm lint:fix"
echo "  • Packages: pnpm lint:fix:packages"
echo "  • Apps: pnpm lint:fix:apps"
echo ""