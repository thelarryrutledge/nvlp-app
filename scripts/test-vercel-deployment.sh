#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Testing Vercel Deployment Readiness${NC}"
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

echo -e "${BLUE}Test 1: Prerequisites${NC}"

# Check if Vercel CLI is available (optional - may not be installed)
command -v vercel &> /dev/null
if [ $? -eq 0 ]; then
    print_info "Vercel CLI is available"
    VERCEL_CLI_AVAILABLE=true
else
    print_info "Vercel CLI not installed (optional for testing)"
    VERCEL_CLI_AVAILABLE=false
fi

# Check pnpm installation
TOTAL_TESTS=$((TOTAL_TESTS + 1))
command -v pnpm &> /dev/null
print_test "pnpm is installed" $?

# Check Node.js version
TOTAL_TESTS=$((TOTAL_TESTS + 1))
NODE_VERSION=$(node --version 2>/dev/null | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -ge 18 ]; then
    print_test "Node.js version is 18+ (v$(node --version))" 0
else
    print_test "Node.js version is 18+ (v$(node --version))" 1
fi

echo ""
echo -e "${BLUE}Test 2: Configuration Validation${NC}"

# Test vercel.json exists and is valid
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "vercel.json" ]; then
    node -e "require('./vercel.json')" 2>/dev/null
    print_test "vercel.json exists and is valid" $?
else
    print_test "vercel.json exists and is valid" 1
fi

# Test required fields in vercel.json
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const config = require('./vercel.json');
const requiredFields = ['buildCommand', 'installCommand', 'outputDirectory'];
const missing = requiredFields.filter(field => !config[field]);
if (missing.length === 0) {
  console.log('✅ All required fields present');
  process.exit(0);
} else {
  console.log('❌ Missing fields:', missing.join(', '));
  process.exit(1);
}
" 2>/dev/null
print_test "Required configuration fields are present" $?

echo ""
echo -e "${BLUE}Test 3: Build System${NC}"

# Test package.json has required scripts
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const pkg = require('./package.json');
const required = ['build:vercel:prod', 'build:packages'];
const missing = required.filter(script => !pkg.scripts[script]);
if (missing.length === 0) {
  console.log('✅ All required build scripts present');
  process.exit(0);
} else {
  console.log('❌ Missing scripts:', missing.join(', '));
  process.exit(1);
}
" 2>/dev/null
print_test "Required build scripts are present" $?

# Test package build
TOTAL_TESTS=$((TOTAL_TESTS + 1))
pnpm build:vercel:prod > /dev/null 2>&1
print_test "Package build succeeds" $?

echo ""
echo -e "${BLUE}Test 4: Static Assets${NC}"

# Test public directory exists
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -d "public" ]; then
    print_test "Public directory exists" 0
else
    print_test "Public directory exists" 1
fi

# Test public/index.html exists
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "public/index.html" ]; then
    print_test "Public index.html exists" 0
else
    print_test "Public index.html exists" 1
fi

# Test for assets
TOTAL_TESTS=$((TOTAL_TESTS + 1))
ASSET_COUNT=$(find public -type f | wc -l)
if [ "$ASSET_COUNT" -gt 0 ]; then
    print_test "Public assets exist ($ASSET_COUNT files)" 0
else
    print_test "Public assets exist" 1
fi

echo ""
echo -e "${BLUE}Test 5: API Routing Configuration${NC}"

# Test API routing setup
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const config = require('./vercel.json');
const hasApiRouting = config.rewrites && config.rewrites.some(r => 
  r.destination && r.destination.includes('supabase.co')
);
if (hasApiRouting) {
  console.log('✅ API routing configured');
  process.exit(0);
} else {
  process.exit(1);
}
" 2>/dev/null
print_test "API routing is configured" $?

# Test security headers
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const config = require('./vercel.json');
const hasSecurityHeaders = config.headers && config.headers.some(h => 
  h.headers && h.headers.some(header => header.key === 'X-Frame-Options')
);
if (hasSecurityHeaders) {
  console.log('✅ Security headers configured');
  process.exit(0);
} else {
  process.exit(1);
}
" 2>/dev/null
print_test "Security headers are configured" $?

echo ""
echo -e "${BLUE}Test 6: Deployment Readiness${NC}"

# Test deployment script
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "scripts/deploy-vercel.sh" ]; then
    ./scripts/deploy-vercel.sh dry-run > /dev/null 2>&1
    print_test "Deployment script dry-run succeeds" $?
else
    print_test "Deployment script dry-run succeeds" 1
fi

# Test ignore command logic
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const config = require('./vercel.json');
if (config.ignoreCommand && config.ignoreCommand.includes('git diff')) {
  console.log('✅ Smart deployment ignoring configured');
  process.exit(0);
} else {
  process.exit(1);
}
" 2>/dev/null
print_test "Smart deployment ignoring is configured" $?

echo ""
echo -e "${BLUE}Test 7: Monorepo Integration${NC}"

# Test workspace packages are built
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -d "packages/types/dist" ] && [ -d "packages/client/dist" ]; then
    print_test "Workspace packages are built" 0
else
    print_test "Workspace packages are built" 1
fi

# Test turbo configuration
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -f "turbo.json" ]; then
    node -e "require('./turbo.json')" 2>/dev/null
    print_test "Turbo configuration is valid" $?
else
    print_test "Turbo configuration is valid" 1
fi

echo ""
echo -e "${BLUE}Test 8: Environment Variables${NC}"

# Test for environment variable placeholders
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const config = require('./vercel.json');
const hasEnvConfig = config.env && (config.env.TURBO_TOKEN || config.env.TURBO_TEAM);
if (hasEnvConfig) {
  console.log('✅ Environment variables configured for optimization');
  process.exit(0);
} else {
  console.log('⚠️ No environment variables configured');
  process.exit(1);
}
" 2>/dev/null
print_test "Environment variables are configured" $?

echo ""
echo -e "${BLUE}Test 9: Performance Optimizations${NC}"

# Test build caching
TOTAL_TESTS=$((TOTAL_TESTS + 1))
BUILD_OUTPUT=$(pnpm build:vercel:prod 2>&1)
if echo "$BUILD_OUTPUT" | grep -q "FULL TURBO\|cached"; then
    print_test "Build caching is working" 0
else
    print_test "Build caching is working" 1
fi

# Test command timeout
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const config = require('./vercel.json');
if (config.commandTimeout && config.commandTimeout > 0) {
  console.log('✅ Command timeout configured (' + config.commandTimeout + 's)');
  process.exit(0);
} else {
  process.exit(1);
}
" 2>/dev/null
print_test "Command timeout is configured" $?

echo ""
if [ "$VERCEL_CLI_AVAILABLE" = true ]; then
    echo -e "${BLUE}Test 10: Vercel CLI Integration (Optional)${NC}"
    
    # Test vercel project linking (may fail if not linked)
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    vercel project ls > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_test "Vercel CLI can access projects" 0
    else
        print_test "Vercel CLI can access projects (requires login)" 1
    fi
else
    print_info "Skipping Vercel CLI tests (CLI not available)"
fi

# Summary
echo ""
echo -e "${BLUE}📊 Vercel Deployment Test Summary${NC}"
echo "Total tests: $TOTAL_TESTS"
echo "Passed: $((TOTAL_TESTS - FAILED_TESTS))"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All Vercel deployment tests passed!${NC}"
    echo -e "${GREEN}✅ Deployment is ready for Vercel${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Run: ./scripts/deploy-vercel.sh preview"
    echo "2. Test the preview deployment"
    echo "3. Run: ./scripts/deploy-vercel.sh production"
    exit 0
else
    echo -e "${RED}⚠️ Some deployment tests failed${NC}"
    echo -e "${YELLOW}Please fix the issues before deploying${NC}"
    exit 1
fi