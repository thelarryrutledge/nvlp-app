#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Testing GitHub Actions Workflows${NC}"
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

echo -e "${BLUE}Test 1: Workflow File Validation${NC}"

# Test ci.yml exists and has basic structure
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f ".github/workflows/ci.yml" ] && grep -q "name:" ".github/workflows/ci.yml" && grep -q "jobs:" ".github/workflows/ci.yml"; then
    print_test "ci.yml exists and has valid structure" 0
else
    print_test "ci.yml exists and has valid structure" 1
fi

# Test monorepo-ci.yml exists and has basic structure
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f ".github/workflows/monorepo-ci.yml" ] && grep -q "name:" ".github/workflows/monorepo-ci.yml" && grep -q "jobs:" ".github/workflows/monorepo-ci.yml"; then
    print_test "monorepo-ci.yml exists and has valid structure" 0
else
    print_test "monorepo-ci.yml exists and has valid structure" 1
fi

echo ""
echo -e "${BLUE}Test 2: Workflow Configuration${NC}"

# Test for Node.js version consistency
TOTAL_TESTS=$((TOTAL_TESTS + 1))
NODE_VERSION_COUNT=$(grep -r "node-version.*18" .github/workflows/ | wc -l)
if [ "$NODE_VERSION_COUNT" -gt 0 ]; then
    print_test "Node.js version 18 configured in workflows" 0
else
    print_test "Node.js version 18 configured in workflows" 1
fi

# Test for pnpm usage
TOTAL_TESTS=$((TOTAL_TESTS + 1))
PNPM_COUNT=$(grep -r "pnpm" .github/workflows/ | wc -l)
if [ "$PNPM_COUNT" -gt 5 ]; then
    print_test "pnpm is used throughout workflows" 0
else
    print_test "pnpm is used throughout workflows" 1
fi

# Test for caching configuration
TOTAL_TESTS=$((TOTAL_TESTS + 1))
CACHE_COUNT=$(grep -r "actions/cache" .github/workflows/ | wc -l)
if [ "$CACHE_COUNT" -gt 3 ]; then
    print_test "Caching is configured in workflows" 0
else
    print_test "Caching is configured in workflows" 1
fi

echo ""
echo -e "${BLUE}Test 3: Monorepo-Specific Features${NC}"

# Test for change detection
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "dorny/paths-filter" .github/workflows/monorepo-ci.yml; then
    print_test "Change detection is configured" 0
else
    print_test "Change detection is configured" 1
fi

# Test for workspace package filtering
TOTAL_TESTS=$((TOTAL_TESTS + 1))
WORKSPACE_FILTER_COUNT=$(grep -r "packages/\*\*" .github/workflows/ | wc -l)
if [ "$WORKSPACE_FILTER_COUNT" -gt 0 ]; then
    print_test "Workspace package filtering is configured" 0
else
    print_test "Workspace package filtering is configured" 1
fi

# Test for Turbo cache integration
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "turbo" .github/workflows/ci.yml; then
    print_test "Turbo cache integration is configured" 0
else
    print_test "Turbo cache integration is configured" 1
fi

echo ""
echo -e "${BLUE}Test 4: Build Commands${NC}"

# Test for updated build commands
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "build:packages" .github/workflows/ci.yml; then
    print_test "build:packages command is used" 0
else
    print_test "build:packages command is used" 1
fi

# Test for Vercel build commands
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "build:vercel" .github/workflows/ci.yml; then
    print_test "Vercel build commands are integrated" 0
else
    print_test "Vercel build commands are integrated" 1
fi

echo ""
echo -e "${BLUE}Test 5: Job Dependencies${NC}"

# Test for proper job dependencies
TOTAL_TESTS=$((TOTAL_TESTS + 1))
NEEDS_COUNT=$(grep -r "needs:" .github/workflows/ | wc -l)
if [ "$NEEDS_COUNT" -gt 5 ]; then
    print_test "Job dependencies are properly configured" 0
else
    print_test "Job dependencies are properly configured" 1
fi

# Test for parallel job execution
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "strategy:" .github/workflows/ci.yml; then
    print_test "Matrix/parallel job execution is configured" 0
else
    print_test "Matrix/parallel job execution is configured" 1
fi

echo ""
echo -e "${BLUE}Test 6: Security and Best Practices${NC}"

# Test for frozen lockfile usage
TOTAL_TESTS=$((TOTAL_TESTS + 1))
FROZEN_LOCKFILE_COUNT=$(grep -r "frozen-lockfile" .github/workflows/ | wc -l)
if [ "$FROZEN_LOCKFILE_COUNT" -gt 3 ]; then
    print_test "Frozen lockfile is used for deterministic builds" 0
else
    print_test "Frozen lockfile is used for deterministic builds" 1
fi

# Test for checkout depth configuration
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "fetch-depth: 0" .github/workflows/ci.yml; then
    print_test "Full git history is available for Turbo" 0
else
    print_test "Full git history is available for Turbo" 1
fi

echo ""
echo -e "${BLUE}Test 7: Platform Support${NC}"

# Test for mobile platform matrix
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -A 5 -B 5 "matrix:" .github/workflows/ci.yml | grep -q "platform"; then
    print_test "Mobile platform matrix is configured" 0
else
    print_test "Mobile platform matrix is configured" 1
fi

# Test for API deployment simulation
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "deploy:api" .github/workflows/ci.yml; then
    print_test "API deployment is integrated" 0
else
    print_test "API deployment is integrated" 1
fi

echo ""
echo -e "${BLUE}Test 8: Workflow Commands Validation${NC}"

# Test if all referenced scripts exist
TOTAL_TESTS=$((TOTAL_TESTS + 1))
MISSING_SCRIPTS=0
for script in "test-vercel-deployment.sh" "simulate-vercel-deployment.sh"; do
    if [ ! -f "scripts/$script" ]; then
        MISSING_SCRIPTS=$((MISSING_SCRIPTS + 1))
    fi
done
if [ $MISSING_SCRIPTS -eq 0 ]; then
    print_test "All referenced scripts exist" 0
else
    print_test "All referenced scripts exist" 1
fi

# Test if all referenced npm scripts exist
TOTAL_TESTS=$((TOTAL_TESTS + 1))
MISSING_NPM_SCRIPTS=0
for script in "build:packages" "build:vercel:prod" "deploy:api" "test:packages"; do
    if ! grep -q "\"$script\"" package.json; then
        MISSING_NPM_SCRIPTS=$((MISSING_NPM_SCRIPTS + 1))
    fi
done
if [ $MISSING_NPM_SCRIPTS -eq 0 ]; then
    print_test "All referenced npm scripts exist" 0
else
    print_test "All referenced npm scripts exist" 1
fi

echo ""
echo -e "${BLUE}Test 9: Environment Variables${NC}"

# Test for environment variable configuration
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if grep -q "env:" .github/workflows/ci.yml; then
    print_test "Environment variables are configured" 0
else
    print_test "Environment variables are configured" 1
fi

# Test for Node/pnpm version consistency
TOTAL_TESTS=$((TOTAL_TESTS + 1))
NODE_VAR_COUNT=$(grep -r "NODE_VERSION" .github/workflows/ | wc -l)
PNPM_VAR_COUNT=$(grep -r "PNPM_VERSION" .github/workflows/ | wc -l)
if [ "$NODE_VAR_COUNT" -gt 0 ] && [ "$PNPM_VAR_COUNT" -gt 0 ]; then
    print_test "Version variables are used consistently" 0
else
    print_test "Version variables are used consistently" 1
fi

# Summary
echo ""
echo -e "${BLUE}📊 GitHub Actions Test Summary${NC}"
echo "Total tests: $TOTAL_TESTS"
echo "Passed: $((TOTAL_TESTS - FAILED_TESTS))"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All GitHub Actions tests passed!${NC}"
    echo -e "${GREEN}✅ Workflows are optimized for monorepo${NC}"
    echo ""
    echo -e "${BLUE}Key Features Verified:${NC}"
    echo "• Enhanced caching (pnpm store, Turbo, package builds)"
    echo "• Change detection for selective CI runs"
    echo "• Matrix builds for mobile platforms"
    echo "• Vercel deployment integration"
    echo "• Workspace package filtering"
    echo "• Security best practices (frozen lockfile)"
    echo "• Job parallelization and dependencies"
    exit 0
else
    echo -e "${RED}⚠️ Some GitHub Actions tests failed${NC}"
    exit 1
fi