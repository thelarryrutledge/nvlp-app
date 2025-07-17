#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Per-Package Testing Configuration${NC}"
echo ""

# Function to print test result
print_test() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Track test results
FAILED_TESTS=0
TOTAL_TESTS=0

echo -e "${BLUE}Test 1: Individual Package Tests${NC}"

# Test @nvlp/types
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "Testing @nvlp/types... "
pnpm --filter @nvlp/types test > /dev/null 2>&1
print_test "@nvlp/types test command works" $?

# Test @nvlp/client
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "Testing @nvlp/client... "
pnpm --filter @nvlp/client test > /dev/null 2>&1
print_test "@nvlp/client test command works" $?

# Test @nvlp/config (no test command expected)
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "Testing @nvlp/config... "
pnpm --filter @nvlp/config build > /dev/null 2>&1
print_test "@nvlp/config build command works" $?

echo ""
echo -e "${BLUE}Test 2: Type Checking${NC}"

# Type check each package
for package in "@nvlp/types" "@nvlp/client" "@nvlp/api"; do
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Type checking $package... "
    pnpm --filter $package typecheck > /dev/null 2>&1
    print_test "$package type checking" $?
done

echo ""
echo -e "${BLUE}Test 3: Linting${NC}"

# Lint each package
for package in "@nvlp/types" "@nvlp/client" "@nvlp/config"; do
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Linting $package... "
    pnpm --filter $package lint > /dev/null 2>&1
    print_test "$package linting" $?
done

echo ""
echo -e "${BLUE}Test 4: Build Dependencies${NC}"

# Test that dependencies build in correct order
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "Building @nvlp/types first... "
pnpm --filter @nvlp/types build > /dev/null 2>&1
print_test "@nvlp/types builds independently" $?

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "Building @nvlp/client with types dependency... "
pnpm --filter @nvlp/client build > /dev/null 2>&1
print_test "@nvlp/client builds with dependencies" $?

echo ""
echo -e "${BLUE}Test 5: Test Coverage (Client Package)${NC}"

# Test coverage command for client
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "Checking coverage configuration... "
if pnpm --filter @nvlp/client run | grep -q "test:coverage"; then
    print_test "@nvlp/client has coverage command configured" 0
else
    print_test "@nvlp/client has coverage command configured" 1
fi

echo ""
echo -e "${BLUE}Test 6: Mobile App Testing${NC}"

# Test mobile app
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "Testing mobile app configuration... "
cd apps/mobile
if [ -f "jest.config.js" ]; then
    print_test "Mobile app has Jest configuration" 0
else
    print_test "Mobile app has Jest configuration" 1
fi
cd ../..

echo ""
echo -e "${BLUE}Test 7: API Testing${NC}"

# Test API package
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "Testing API test configuration... "
if grep -q "test.*deno test" apps/api/package.json; then
    print_test "API uses Deno for testing" 0
else
    print_test "API has test configuration" 1
fi

echo ""
echo -e "${BLUE}Test 8: Workflow Integration${NC}"

# Check if per-package testing workflow exists
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f ".github/workflows/test-packages.yml" ]; then
    print_test "Per-package testing workflow exists" 0
else
    print_test "Per-package testing workflow exists" 1
fi

# Check if main CI workflow references per-package tests
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "test-packages" .github/workflows/ci.yml; then
    print_test "Main CI workflow uses per-package tests" 0
else
    print_test "Main CI workflow uses per-package tests" 1
fi

echo ""
echo -e "${BLUE}Test 9: Cross-Package Dependencies${NC}"

# Test workspace protocol resolution
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const clientPkg = require('./packages/client/package.json');
const hasTypesDep = clientPkg.dependencies['@nvlp/types'] === 'workspace:*';
const hasConfigDep = clientPkg.devDependencies['@nvlp/config'] === 'workspace:*';
if (hasTypesDep && hasConfigDep) {
    console.log('✅ Workspace dependencies correctly configured');
    process.exit(0);
} else {
    console.log('❌ Workspace dependencies issue');
    process.exit(1);
}
" > /dev/null 2>&1
print_test "Workspace dependencies are correct" $?

echo ""
echo -e "${BLUE}Test 10: Test Artifacts${NC}"

# Check if coverage directory would be created
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "packages/client/vitest.config.ts" ]; then
    if grep -q "coverage" packages/client/vitest.config.ts; then
        print_test "Coverage configuration exists" 0
    else
        print_test "Coverage configuration exists" 1
    fi
else
    print_test "Coverage configuration exists" 1
fi

# Summary
echo ""
echo -e "${BLUE}📊 Per-Package Testing Summary${NC}"
echo "Total tests: $TOTAL_TESTS"
echo "Passed: $((TOTAL_TESTS - FAILED_TESTS))"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All per-package testing configurations passed!${NC}"
    echo -e "${GREEN}✅ Per-package testing is properly configured${NC}"
    echo ""
    echo -e "${BLUE}Testing Capabilities:${NC}"
    echo "• Individual package test execution"
    echo "• Type checking for each package"
    echo "• Linting for each package"
    echo "• Test coverage for applicable packages"
    echo "• Dependency build order validation"
    echo "• CI/CD workflow integration"
    exit 0
else
    echo -e "${RED}⚠️ Some per-package tests failed${NC}"
    exit 1
fi