#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧹 Cleaning NVLP Monorepo..."
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

# Parse command line arguments
DEEP_CLEAN=false
RESET_CLEAN=false

for arg in "$@"; do
    case $arg in
        --deep)
            DEEP_CLEAN=true
            shift
            ;;
        --reset)
            RESET_CLEAN=true
            DEEP_CLEAN=true  # Reset implies deep
            shift
            ;;
        *)
            ;;
    esac
done

# Clean packages in order
echo "📦 Cleaning packages..."
echo ""

# Clean @nvlp/config
print_step "Cleaning @nvlp/config..."
if pnpm --filter @nvlp/config clean > /dev/null 2>&1; then
    print_success "@nvlp/config cleaned"
else
    print_error "Failed to clean @nvlp/config"
    exit 1
fi

# Clean @nvlp/types
print_step "Cleaning @nvlp/types..."
if pnpm --filter @nvlp/types clean > /dev/null 2>&1; then
    print_success "@nvlp/types cleaned (removed dist)"
else
    print_error "Failed to clean @nvlp/types"
    exit 1
fi

# Clean @nvlp/client
print_step "Cleaning @nvlp/client..."
if pnpm --filter @nvlp/client clean > /dev/null 2>&1; then
    print_success "@nvlp/client cleaned (removed dist, .turbo, caches)"
else
    print_error "Failed to clean @nvlp/client"
    exit 1
fi

echo ""
echo "🚀 Cleaning applications..."
echo ""

# Clean mobile app
print_step "Cleaning @nvlp/mobile..."
mobile_output=$(pnpm --filter @nvlp/mobile clean 2>&1)
if [ $? -eq 0 ]; then
    print_success "@nvlp/mobile cleaned (removed node_modules, iOS Pods, Android builds)"
else
    print_warning "@nvlp/mobile clean had issues: $mobile_output"
fi

# Clean API
print_step "Cleaning @nvlp/api..."
if pnpm --filter @nvlp/api clean > /dev/null 2>&1; then
    print_success "@nvlp/api cleaned (removed .temp)"
else
    print_error "Failed to clean @nvlp/api"
    exit 1
fi

# Clean root
echo ""
print_step "Cleaning root workspace..."
if rm -rf node_modules .turbo coverage .cache > /dev/null 2>&1; then
    print_success "Root workspace cleaned"
else
    print_warning "Some root files couldn't be removed"
fi

# Deep clean if requested
if [ "$DEEP_CLEAN" = true ]; then
    echo ""
    echo "🔥 Performing deep clean..."
    echo ""
    
    print_step "Removing all node_modules directories..."
    if rm -rf apps/*/node_modules packages/*/node_modules > /dev/null 2>&1; then
        print_success "All node_modules removed"
    else
        print_warning "Some node_modules couldn't be removed"
    fi
    
    print_step "Reinstalling dependencies..."
    if pnpm install > /dev/null 2>&1; then
        print_success "Dependencies reinstalled"
    else
        print_error "Failed to reinstall dependencies"
        exit 1
    fi
fi

# Reset build if requested
if [ "$RESET_CLEAN" = true ]; then
    echo ""
    echo "🔄 Performing reset build..."
    echo ""
    
    print_step "Rebuilding all packages..."
    if pnpm build > /dev/null 2>&1; then
        print_success "All packages rebuilt"
    else
        print_error "Failed to rebuild packages"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}✅ Cleanup completed successfully!${NC}"
echo ""

if [ "$RESET_CLEAN" = true ]; then
    echo "Full reset complete - all packages cleaned, dependencies reinstalled, and rebuilt"
elif [ "$DEEP_CLEAN" = true ]; then
    echo "Deep clean complete - all build artifacts and dependencies cleaned and reinstalled"
else
    echo "Standard clean complete - build artifacts and caches removed"
fi

echo ""
echo "Available clean options:"
echo "  • Standard: pnpm clean"
echo "  • With root: pnpm clean:all"
echo "  • Deep clean: pnpm clean:deep or ./scripts/clean-all.sh --deep"
echo "  • Full reset: pnpm clean:reset or ./scripts/clean-all.sh --reset"
echo ""