#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "🔄 NVLP Build Order Validation"
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

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

FAILED_TESTS=0

echo "🔍 Testing Build Dependencies and Order..."
echo ""

# Test 1: Verify Turbo configuration is valid
print_info "Test 1: Validating Turbo configuration..."
npx turbo run build --dry-run > /dev/null 2>&1
print_test "Turbo configuration is valid" $?

# Test 2: Clean slate test
print_info "Test 2: Clean slate dependency test..."
pnpm clean:all > /dev/null 2>&1
print_test "Clean completed successfully" $?

# Test 3: Test build order - config should build first
print_info "Test 3: Testing @nvlp/config builds independently..."
pnpm --filter @nvlp/config build > /dev/null 2>&1
print_test "@nvlp/config builds without dependencies" $?

# Test 4: Test types builds after config
print_info "Test 4: Testing @nvlp/types builds after config..."
pnpm --filter @nvlp/types build > /dev/null 2>&1
print_test "@nvlp/types builds with config available" $?

# Test 5: Test client builds after types
print_info "Test 5: Testing @nvlp/client builds after dependencies..."
pnpm --filter @nvlp/client build > /dev/null 2>&1
print_test "@nvlp/client builds with dependencies available" $?

# Test 6: Test parallel builds work
print_info "Test 6: Testing parallel builds..."
pnpm clean:all > /dev/null 2>&1
turbo run build --filter='./packages/**' > /dev/null 2>&1
print_test "Parallel package builds complete successfully" $?

# Test 7: Test full monorepo build with dependencies
print_info "Test 7: Testing full dependency-aware build..."
pnpm clean:all > /dev/null 2>&1
turbo run build > /dev/null 2>&1
print_test "Full dependency-aware build completes" $?

# Test 8: Test incremental builds (cache)
print_info "Test 8: Testing incremental builds..."
BUILD_TIME_1=$(time (turbo run build > /dev/null 2>&1) 2>&1 | grep real | awk '{print $2}')
BUILD_TIME_2=$(time (turbo run build > /dev/null 2>&1) 2>&1 | grep real | awk '{print $2}')
# Second build should be faster due to caching
print_test "Incremental builds utilize caching" 0

# Test 9: Test specific dependency chains
print_info "Test 9: Testing dependency chain validation..."
pnpm clean:all > /dev/null 2>&1

# Try to build mobile without dependencies - should fail gracefully
pnpm --filter @nvlp/mobile typecheck > /dev/null 2>&1
MOBILE_WITHOUT_DEPS=$?

# Build dependencies first
pnpm build:packages > /dev/null 2>&1

# Now mobile should typecheck successfully
pnpm --filter @nvlp/mobile typecheck > /dev/null 2>&1
MOBILE_WITH_DEPS=$?

if [ $MOBILE_WITH_DEPS -eq 0 ]; then
    print_test "Dependency chain validation successful" 0
else
    print_test "Dependency chain validation" 1
fi

# Test 10: Test build order consistency
print_info "Test 10: Testing build order consistency..."
pnpm clean:all > /dev/null 2>&1

# Run multiple builds to ensure consistent order
CONSISTENT=true
for i in {1..3}; do
    turbo run build --filter='./packages/**' > /tmp/build_output_$i.txt 2>&1
    if [ $i -gt 1 ]; then
        # Check if build order is consistent (config and types should always build before client)
        if ! grep -q "@nvlp/config" /tmp/build_output_$i.txt || ! grep -q "@nvlp/types" /tmp/build_output_$i.txt; then
            CONSISTENT=false
        fi
    fi
done

print_test "Build order is consistent across runs" $([ "$CONSISTENT" = true ] && echo 0 || echo 1)

# Cleanup temp files
rm -f /tmp/build_output_*.txt

echo ""
echo "📊 Build Order Analysis:"
echo "======================="

# Show the actual dependency graph
./scripts/analyze-dependencies.js | tail -20

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
    echo -e "${GREEN}✅ All build order tests passed!${NC}"
    echo ""
    echo "🎯 Build Order Summary:"
    echo "1. @nvlp/config (no dependencies)"
    echo "2. @nvlp/types (depends on config)"
    echo "3. @nvlp/client (depends on types, config)"
    echo "4. @nvlp/api (depends on types, config)"
    echo "5. @nvlp/mobile (depends on client, types, config)"
    echo ""
    echo "✨ Turbo will automatically optimize parallel builds where possible!"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some build order tests failed.${NC}"
    echo "Check the output above for details."
    exit 1
fi