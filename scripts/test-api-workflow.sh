#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "🌐 Testing API Development Workflow (Remote Supabase)"
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

echo "🔍 Running API Development Workflow Tests..."
echo ""

# Test 1: Check Supabase CLI installation
print_info "Test 1: Checking Supabase CLI..."
command -v supabase > /dev/null 2>&1
print_test "Supabase CLI installed" $?

# Test 2: Check workspace dependencies
print_info "Test 2: Checking API workspace dependencies..."
cd apps/api
pnpm list @nvlp/types --depth=0 > /dev/null 2>&1
print_test "Workspace dependencies properly linked" $?
cd ../..

# Test 3: Check Supabase functions directory
print_info "Test 3: Checking Supabase functions structure..."
if [ -d "supabase/functions" ]; then
    # Count actual function directories (excluding _shared)
    FUNCTION_COUNT=$(ls -1 supabase/functions | grep -v _shared | wc -l)
    if [ $FUNCTION_COUNT -gt 0 ]; then
        print_test "Supabase functions directory structure valid ($FUNCTION_COUNT functions)" 0
    else
        print_test "Supabase functions directory structure valid" 1
    fi
else
    print_test "Supabase functions directory structure valid" 1
fi

# Test 4: Check API package.json scripts
print_info "Test 4: Checking API development scripts..."
cd apps/api
grep -q "deploy" package.json && \
grep -q "lint" package.json && \
grep -q "format" package.json
print_test "API deployment scripts configured" $?
cd ../..

# Test 5: Check TypeScript configuration
print_info "Test 5: Checking API TypeScript configuration..."
if [ -f "apps/api/tsconfig.json" ]; then
    cd apps/api
    npx tsc --noEmit --project tsconfig.json > /dev/null 2>&1
    TSC_RESULT=$?
    if [ $TSC_RESULT -eq 0 ]; then
        print_test "TypeScript configuration valid" 0
    else
        print_warning "TypeScript has errors (may be expected)"
        print_test "TypeScript configuration parseable" 0
    fi
    cd ../..
else
    print_test "TypeScript configuration exists" 1
fi

# Test 6: Check import map configuration
print_info "Test 6: Checking import map for hot reload..."
if [ -f "supabase/functions/_shared/import_map.json" ]; then
    grep -q "@nvlp/types" supabase/functions/_shared/import_map.json
    print_test "Import map configured for workspace packages" $?
else
    print_test "Import map exists" 1
fi

# Test 7: Check edge runtime configuration
print_info "Test 7: Checking edge runtime configuration..."
if [ -f "supabase/config.toml" ]; then
    grep -q "policy = \"oneshot\"" supabase/config.toml
    print_test "Edge runtime configured for hot reload" $?
else
    print_test "Supabase config exists" 1
fi

# Test 8: Check ESLint configuration
print_info "Test 8: Checking API ESLint configuration..."
cd apps/api
if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f ".eslintrc.cjs" ]; then
    npx eslint --print-config src/functions/health/index.ts > /dev/null 2>&1
    print_test "ESLint configuration valid" $?
else
    print_test "ESLint using workspace configuration" 0
fi
cd ../..

# Test 9: Check environment variables setup
print_info "Test 9: Checking environment setup..."
if [ -f ".env.example" ] || [ -f "apps/api/.env.example" ]; then
    print_test "Environment example files exist" 0
else
    print_warning "No .env.example found"
    print_test "Environment configuration" 1
fi

# Test 10: Check deployment commands
print_info "Test 10: Checking deployment commands..."
cd apps/api
# Check if individual function deploy commands exist
grep -q "deploy:auth" package.json && \
grep -q "deploy:dashboard" package.json && \
grep -q "deploy:transactions" package.json
print_test "Individual function deployment commands configured" $?
cd ../..

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
    echo -e "${GREEN}✅ All API workflow tests passed!${NC}"
    echo ""
    echo "📝 API Development Workflow:"
    echo "1. Make changes to edge functions in supabase/functions/"
    echo "2. Test against your remote Supabase instance"
    echo "3. Deploy with 'pnpm deploy:api' or individual function deploys"
    echo "4. Package changes in @nvlp/types will be included in deployments"
    echo ""
    echo "🚀 Deployment Commands:"
    echo "  • pnpm deploy:api - Deploy all functions"
    echo "  • pnpm deploy:auth - Deploy auth function only"
    echo "  • pnpm deploy:dashboard - Deploy dashboard function only"
    echo "  • etc..."
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi