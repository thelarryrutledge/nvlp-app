#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Testing API Deployment from Monorepo${NC}"
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

echo -e "${BLUE}Test 1: Deployment Scripts Accessibility${NC}"

# Test from root
TOTAL_TESTS=$((TOTAL_TESTS + 1))
pnpm deploy:api:health > /dev/null 2>&1
print_test "Deploy from root directory works" $?

# Test from apps/api
TOTAL_TESTS=$((TOTAL_TESTS + 1))
cd apps/api
pnpm deploy:health > /dev/null 2>&1
print_test "Deploy from apps/api directory works" $?
cd ../..

echo ""
echo -e "${BLUE}Test 2: Supabase Functions Location${NC}"

# Verify functions are in correct location
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -d "supabase/functions" ]; then
    FUNCTION_COUNT=$(ls -1 supabase/functions | grep -v "_shared" | wc -l)
    print_test "Functions directory exists (${FUNCTION_COUNT} functions)" 0
else
    print_test "Functions directory exists" 1
fi

# Check individual functions
echo ""
echo -e "${BLUE}Test 3: Individual Function Verification${NC}"

FUNCTIONS=("auth" "dashboard" "transactions" "reports" "audit" "export" "health" "notifications")
for func in "${FUNCTIONS[@]}"; do
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ -f "supabase/functions/$func/index.ts" ]; then
        print_test "Function '$func' exists" 0
    else
        print_test "Function '$func' exists" 1
    fi
done

echo ""
echo -e "${BLUE}Test 4: Deployment Script Configuration${NC}"

# Check package.json scripts
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const rootPkg = require('./package.json');
const apiPkg = require('./apps/api/package.json');

// Check root scripts
const rootDeployScripts = Object.keys(rootPkg.scripts).filter(s => s.startsWith('deploy:api'));
if (rootDeployScripts.length > 0) {
    console.log('✅ Root package has ' + rootDeployScripts.length + ' API deployment scripts');
    process.exit(0);
} else {
    process.exit(1);
}
" 2>/dev/null
print_test "Root package.json has API deployment scripts" $?

TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const apiPkg = require('./apps/api/package.json');

// Check API scripts
const apiDeployScripts = Object.keys(apiPkg.scripts).filter(s => s.startsWith('deploy'));
if (apiDeployScripts.length > 0) {
    console.log('✅ API package has ' + apiDeployScripts.length + ' deployment scripts');
    process.exit(0);
} else {
    process.exit(1);
}
" 2>/dev/null
print_test "API package.json has deployment scripts" $?

echo ""
echo -e "${BLUE}Test 5: Vercel Proxy Configuration${NC}"

# Check Vercel configuration
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const vercelConfig = require('./vercel.json');

// Check for API proxy rewrites
const hasApiProxy = vercelConfig.rewrites && vercelConfig.rewrites.some(r => 
    r.destination && r.destination.includes('supabase.co/functions/v1')
);

if (hasApiProxy) {
    console.log('✅ Vercel configuration has API proxy setup');
    process.exit(0);
} else {
    process.exit(1);
}
" 2>/dev/null
print_test "Vercel proxy configuration for API" $?

echo ""
echo -e "${BLUE}Test 6: Environment Configuration${NC}"

# Check for required environment files
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "apps/api/.env.example" ]; then
    print_test "API environment example file exists" 0
else
    print_test "API environment example file exists" 1
fi

# Summary
echo ""
echo -e "${BLUE}📊 API Deployment Test Summary${NC}"
echo "Total tests: $TOTAL_TESTS"
echo "Passed: $((TOTAL_TESTS - FAILED_TESTS))"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All API deployment tests passed!${NC}"
    echo -e "${GREEN}✅ API deployment is properly configured for monorepo${NC}"
    exit 0
else
    echo -e "${RED}⚠️ Some API deployment tests failed${NC}"
    exit 1
fi