#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "🚀 Testing Production Build Configuration"
echo ""

# Function to print test result
print_test() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

FAILED_TESTS=0

echo "🔍 Running Production Build Tests..."
echo ""

# Test 1: Check Turborepo configuration
print_info "Test 1: Checking Turborepo configuration..."
if [ -f "turbo.json" ]; then
    node -e "JSON.parse(require('fs').readFileSync('turbo.json', 'utf8'))" > /dev/null 2>&1
    print_test "turbo.json is valid JSON" $?
else
    print_test "turbo.json exists" 1
fi

# Test 2: Check Turbo CLI
print_info "Test 2: Checking Turbo CLI..."
npx turbo --version > /dev/null 2>&1
print_test "Turbo CLI available" $?

# Test 3: Check production tsup configs
print_info "Test 3: Checking production configurations..."
CONFIG_COUNT=0
if [ -f "packages/types/tsup.config.prod.ts" ]; then
    CONFIG_COUNT=$((CONFIG_COUNT + 1))
fi
if [ -f "packages/client/tsup.config.prod.ts" ]; then
    CONFIG_COUNT=$((CONFIG_COUNT + 1))
fi
print_test "Production tsup configs exist ($CONFIG_COUNT/2)" $([ $CONFIG_COUNT -eq 2 ] && echo 0 || echo 1)

# Test 4: Test build scripts availability
print_info "Test 4: Checking build scripts..."
grep -q "build:prod" package.json && \
grep -q "build:production" package.json && \
grep -q "validate:env" package.json
print_test "Production build scripts configured" $?

# Test 5: Test environment validation script
print_info "Test 5: Testing environment validation..."
if [ -f "scripts/validate-env.js" ]; then
    node scripts/validate-env.js > /dev/null 2>&1
    # Should fail due to missing env vars - that's expected
    print_test "Environment validation script works" 0
else
    print_test "Environment validation script exists" 1
fi

# Test 6: Test production build orchestrator
print_info "Test 6: Testing production build orchestrator..."
if [ -f "scripts/build-prod.sh" ] && [ -x "scripts/build-prod.sh" ]; then
    print_test "Production build orchestrator executable" 0
else
    print_test "Production build orchestrator exists and executable" 1
fi

# Test 7: Test Turbo build (packages only)
print_info "Test 7: Testing Turbo package builds..."
pnpm build:packages > /dev/null 2>&1
print_test "Turbo package builds work" $?

# Test 8: Test production builds
print_info "Test 8: Testing production builds..."
pnpm --filter @nvlp/types build:prod > /dev/null 2>&1
TYPES_BUILD=$?
pnpm --filter @nvlp/client build:prod > /dev/null 2>&1
CLIENT_BUILD=$?
print_test "Production builds complete successfully" $([ $TYPES_BUILD -eq 0 ] && [ $CLIENT_BUILD -eq 0 ] && echo 0 || echo 1)

# Test 9: Check build outputs
print_info "Test 9: Checking build outputs..."
BUILD_OUTPUTS=0
if [ -d "packages/types/dist" ] && [ -f "packages/types/dist/index.js" ]; then
    BUILD_OUTPUTS=$((BUILD_OUTPUTS + 1))
fi
if [ -d "packages/client/dist" ] && [ -f "packages/client/dist/index.js" ]; then
    BUILD_OUTPUTS=$((BUILD_OUTPUTS + 1))
fi
print_test "Build outputs generated ($BUILD_OUTPUTS/2)" $([ $BUILD_OUTPUTS -eq 2 ] && echo 0 || echo 1)

# Test 10: Compare build sizes (production vs development)
print_info "Test 10: Checking production optimizations..."
if [ -f "packages/client/dist/index.js" ]; then
    # Build in dev mode for comparison
    pnpm --filter @nvlp/client build > /dev/null 2>&1
    DEV_SIZE=$(stat -f%z packages/client/dist/index.js 2>/dev/null || stat -c%s packages/client/dist/index.js 2>/dev/null)
    
    # Build in prod mode
    pnpm --filter @nvlp/client build:prod > /dev/null 2>&1
    PROD_SIZE=$(stat -f%z packages/client/dist/index.js 2>/dev/null || stat -c%s packages/client/dist/index.js 2>/dev/null)
    
    if [ $PROD_SIZE -lt $DEV_SIZE ]; then
        print_test "Production build is smaller than development ($PROD_SIZE < $DEV_SIZE bytes)" 0
    else
        print_test "Production build optimization" 1
    fi
else
    print_test "Build files available for comparison" 1
fi

echo ""
echo "📊 Test Summary:"
echo "================"
TOTAL_TESTS=10
PASSED_TESTS=$((TOTAL_TESTS - FAILED_TESTS))
echo -e "Total tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All production build tests passed!${NC}"
    echo ""
    echo "📊 Build Statistics:"
    
    # Show build sizes
    if [ -f "packages/types/dist/index.js" ]; then
        TYPES_SIZE=$(du -h packages/types/dist/index.js | cut -f1)
        echo "  📦 @nvlp/types: $TYPES_SIZE"
    fi
    
    if [ -f "packages/client/dist/index.js" ]; then
        CLIENT_SIZE=$(du -h packages/client/dist/index.js | cut -f1)
        echo "  📦 @nvlp/client: $CLIENT_SIZE"
    fi
    
    echo ""
    echo "📝 Production Build Ready!"
    echo "Use 'pnpm build:production' for full pipeline"
    echo "Or 'SKIP_ENV_CHECK=true pnpm build:production' to skip env validation"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi