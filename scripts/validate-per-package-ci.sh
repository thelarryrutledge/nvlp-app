#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Validating Per-Package CI/CD Configuration${NC}"
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

# Function to print section
print_section() {
    echo ""
    echo -e "${BLUE}$1${NC}"
}

# Track test results
FAILED_TESTS=0
TOTAL_TESTS=0

print_section "1. Package Test Commands"
for package in "@nvlp/types" "@nvlp/client" "@nvlp/config"; do
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    SCRIPTS=$(pnpm --filter $package run 2>/dev/null | grep -E "(test|build|lint|typecheck)" | wc -l)
    if [ "$SCRIPTS" -gt 2 ]; then
        print_test "$package has required test scripts ($SCRIPTS found)" 0
    else
        print_test "$package has required test scripts" 1
    fi
done

print_section "2. CI Workflow Configuration"

# Check workflow file structure
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f ".github/workflows/test-packages.yml" ]; then
    # Check for key workflow features
    FEATURES=0
    grep -q "matrix:" .github/workflows/test-packages.yml && ((FEATURES++))
    grep -q "cache:" .github/workflows/test-packages.yml && ((FEATURES++))
    grep -q "needs:" .github/workflows/test-packages.yml && ((FEATURES++))
    grep -q "test-summary" .github/workflows/test-packages.yml && ((FEATURES++))
    
    if [ $FEATURES -ge 3 ]; then
        print_test "Per-package workflow has advanced features ($FEATURES/4)" 0
    else
        print_test "Per-package workflow has advanced features" 1
    fi
else
    print_test "Per-package workflow has advanced features" 1
fi

# Check for package-specific jobs
TOTAL_TESTS=$((TOTAL_TESTS + 1))
PACKAGE_JOBS=$(grep -E "test-(types|client|config)" .github/workflows/test-packages.yml | wc -l)
if [ "$PACKAGE_JOBS" -ge 3 ]; then
    print_test "Individual package test jobs exist ($PACKAGE_JOBS found)" 0
else
    print_test "Individual package test jobs exist" 1
fi

print_section "3. Test Framework Configuration"

# Check test frameworks
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "packages/client/vitest.config.ts" ]; then
    print_test "@nvlp/client uses Vitest" 0
else
    print_test "@nvlp/client has test framework configured" 1
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "apps/mobile/jest.config.js" ]; then
    print_test "Mobile app uses Jest" 0
else
    print_test "Mobile app has test framework configured" 1
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "deno test" apps/api/package.json; then
    print_test "API uses Deno test" 0
else
    print_test "API has test framework configured" 1
fi

print_section "4. Dependency Management"

# Check workspace protocol usage
TOTAL_TESTS=$((TOTAL_TESTS + 1))
WORKSPACE_DEPS=$(find packages apps -name "package.json" -exec grep -l "workspace:\*" {} \; | wc -l)
if [ "$WORKSPACE_DEPS" -ge 3 ]; then
    print_test "Workspace protocol is used ($WORKSPACE_DEPS packages)" 0
else
    print_test "Workspace protocol is used" 1
fi

# Check build order dependencies
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "needs: test-types" .github/workflows/test-packages.yml; then
    print_test "Build order dependencies are configured" 0
else
    print_test "Build order dependencies are configured" 1
fi

print_section "5. Test Artifacts & Reporting"

# Check for coverage configuration
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "coverage" packages/client/vitest.config.ts 2>/dev/null; then
    print_test "Coverage reporting is configured" 0
else
    print_test "Coverage reporting is configured" 1
fi

# Check for artifact uploads
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "upload-artifact" .github/workflows/test-packages.yml; then
    print_test "Test artifacts are uploaded" 0
else
    print_test "Test artifacts are uploaded" 1
fi

print_section "6. Integration Testing"

# Check for integration test job
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "integration-test" .github/workflows/test-packages.yml; then
    print_test "Integration testing job exists" 0
else
    print_test "Integration testing job exists" 1
fi

# Check for cross-package import testing
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "cross-package imports" .github/workflows/test-packages.yml; then
    print_test "Cross-package import testing exists" 0
else
    print_test "Cross-package import testing exists" 1
fi

print_section "7. CI Optimization"

# Check for caching strategies
TOTAL_TESTS=$((TOTAL_TESTS + 1))
CACHE_STRATEGIES=$(grep -c "actions/cache" .github/workflows/test-packages.yml)
if [ "$CACHE_STRATEGIES" -ge 3 ]; then
    print_test "Multiple caching strategies used ($CACHE_STRATEGIES found)" 0
else
    print_test "Multiple caching strategies used" 1
fi

# Check for parallel execution
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "strategy:" .github/workflows/test-packages.yml && grep -q "matrix:" .github/workflows/test-packages.yml; then
    print_test "Parallel test execution is configured" 0
else
    print_test "Parallel test execution is configured" 1
fi

print_section "8. Error Handling"

# Check for continue-on-error
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "continue-on-error" .github/workflows/test-packages.yml; then
    print_test "Graceful error handling is configured" 0
else
    print_test "Graceful error handling is configured" 1
fi

# Check for test summary job
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "if: always()" .github/workflows/test-packages.yml; then
    print_test "Test summary runs regardless of failures" 0
else
    print_test "Test summary runs regardless of failures" 1
fi

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Per-Package CI/CD Validation Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Total validations: $TOTAL_TESTS"
echo "Passed: $((TOTAL_TESTS - FAILED_TESTS))"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All per-package CI/CD validations passed!${NC}"
    echo -e "${GREEN}✅ Per-package testing is fully configured and optimized${NC}"
    echo ""
    echo -e "${BLUE}Key Features Implemented:${NC}"
    echo "• Individual package test execution with proper isolation"
    echo "• Type checking, linting, and testing for each package"
    echo "• Matrix builds for cross-platform testing"
    echo "• Dependency-aware build ordering"
    echo "• Test coverage reporting and artifact uploads"
    echo "• Integration testing between packages"
    echo "• Comprehensive caching strategies"
    echo "• Graceful error handling and test summaries"
    echo ""
    echo -e "${BLUE}Supported Packages:${NC}"
    echo "• @nvlp/types - TypeScript type definitions"
    echo "• @nvlp/client - API client library (Vitest)"
    echo "• @nvlp/config - Shared configurations"
    echo "• @nvlp/mobile - React Native app (Jest)"
    echo "• @nvlp/api - Edge Functions (Deno)"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️ Some per-package CI/CD validations failed${NC}"
    echo -e "${YELLOW}Please review the failed tests above${NC}"
    exit 1
fi