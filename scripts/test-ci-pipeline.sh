#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Testing CI/CD Pipeline Compatibility${NC}"
echo ""

# Track test results
FAILED_TESTS=0
TOTAL_TESTS=0

# Function to print test result
print_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Test 1: pnpm install works
echo -e "${BLUE}Test 1: Package Manager Setup${NC}"
pnpm install --frozen-lockfile > /dev/null 2>&1
print_test "pnpm install with frozen lockfile" $?

# Test 2: Package building
echo -e "${BLUE}Test 2: Package Building${NC}"
pnpm build:packages > /dev/null 2>&1
print_test "All packages build successfully" $?

# Test 3: Type checking (individual packages)
echo -e "${BLUE}Test 3: Type Checking${NC}"
pnpm --filter @nvlp/types typecheck > /dev/null 2>&1
print_test "Types package type checking" $?

pnpm --filter @nvlp/client typecheck > /dev/null 2>&1
print_test "Client package type checking" $?

pnpm --filter @nvlp/api typecheck > /dev/null 2>&1
print_test "API package type checking" $?

# Test 4: Linting
echo -e "${BLUE}Test 4: Code Quality${NC}"
pnpm lint > /dev/null 2>&1
print_test "Linting passes across all packages" $?

# Test 5: Mobile bundle creation
echo -e "${BLUE}Test 5: Mobile App Build${NC}"
cd apps/mobile
npx react-native bundle \
  --entry-file index.js \
  --platform android \
  --dev false \
  --bundle-output /tmp/ci-bundle-test.js \
  --assets-dest /tmp/ci-assets-test > /dev/null 2>&1

BUNDLE_RESULT=$?
if [ $BUNDLE_RESULT -eq 0 ]; then
    BUNDLE_SIZE=$(du -h /tmp/ci-bundle-test.js 2>/dev/null | cut -f1)
    rm -f /tmp/ci-bundle-test.js
    rm -rf /tmp/ci-assets-test
fi
cd ../..
print_test "Mobile app bundle creation (${BUNDLE_SIZE:-unknown size})" $BUNDLE_RESULT

# Test 6: Edge Functions syntax (if Deno available)
echo -e "${BLUE}Test 6: Edge Functions${NC}"
if command -v deno > /dev/null 2>&1; then
    deno lint supabase/functions/ > /dev/null 2>&1
    print_test "Edge Functions linting with Deno" $?
else
    echo -e "${YELLOW}⚠️ Deno not available, skipping Edge Functions test${NC}"
fi

# Test 7: Workspace integration
echo -e "${BLUE}Test 7: Workspace Integration${NC}"
node -e "
try {
  const clientPkg = require('./packages/client/package.json');
  const typesPkg = require('./packages/types/package.json');
  const mobilePkg = require('./apps/mobile/package.json');
  
  const hasClientDep = mobilePkg.dependencies['@nvlp/client'];
  const hasTypesDep = mobilePkg.dependencies['@nvlp/types'];
  
  if (hasClientDep && hasTypesDep && hasClientDep.startsWith('workspace:') && hasTypesDep.startsWith('workspace:')) {
    process.exit(0);
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}
" 2>/dev/null
print_test "Workspace dependencies properly configured" $?

# Test 8: GitHub Actions files
echo -e "${BLUE}Test 8: CI/CD Configuration${NC}"
[ -f ".github/workflows/ci.yml" ]
print_test "Basic CI workflow exists" $?

[ -f ".github/workflows/monorepo-ci.yml" ]
print_test "Monorepo-specific CI workflow exists" $?

# Summary
echo ""
echo -e "${BLUE}📊 CI/CD Pipeline Test Summary${NC}"
echo "Total tests: $TOTAL_TESTS"
echo "Passed: $((TOTAL_TESTS - FAILED_TESTS))"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All CI/CD pipeline tests passed!${NC}"
    echo -e "${GREEN}✅ Monorepo is ready for continuous integration${NC}"
    exit 0
else
    echo -e "${RED}⚠️ Some CI/CD pipeline tests failed${NC}"
    echo -e "${YELLOW}Review the failed tests before deploying to CI${NC}"
    exit 1
fi