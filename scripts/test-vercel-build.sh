#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Testing Vercel Build Commands${NC}"
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

echo -e "${BLUE}Test 1: Vercel Configuration Validation${NC}"

# Test vercel.json syntax
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
try {
  const config = require('./vercel.json');
  console.log('✅ Vercel configuration is valid JSON');
  process.exit(0);
} catch (error) {
  console.error('❌ Invalid vercel.json:', error.message);
  process.exit(1);
}
" 2>/dev/null
print_test "Vercel configuration is valid JSON" $?

# Test build command is present
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const config = require('./vercel.json');
if (config.buildCommand && config.buildCommand.includes('build:vercel:prod')) {
  console.log('✅ Build command uses optimized Vercel build');
  process.exit(0);
} else {
  process.exit(1);
}
" 2>/dev/null
print_test "Build command uses optimized Vercel build" $?

# Test install command
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const config = require('./vercel.json');
if (config.installCommand && config.installCommand.includes('--frozen-lockfile')) {
  console.log('✅ Install command uses frozen lockfile');
  process.exit(0);
} else {
  process.exit(1);
}
" 2>/dev/null
print_test "Install command uses frozen lockfile" $?

echo ""
echo -e "${BLUE}Test 2: Build Command Functionality${NC}"

# Test build:vercel command
TOTAL_TESTS=$((TOTAL_TESTS + 1))
pnpm build:vercel > /dev/null 2>&1
print_test "pnpm build:vercel command works" $?

# Test build:vercel:prod command
TOTAL_TESTS=$((TOTAL_TESTS + 1))
pnpm build:vercel:prod > /dev/null 2>&1
print_test "pnpm build:vercel:prod command works" $?

echo ""
echo -e "${BLUE}Test 3: Package.json Scripts${NC}"

# Check if new scripts exist
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const pkg = require('./package.json');
const vercelScripts = Object.keys(pkg.scripts).filter(s => s.includes('vercel'));
if (vercelScripts.length >= 2) {
  console.log('✅ Found ' + vercelScripts.length + ' Vercel build scripts');
  process.exit(0);
} else {
  process.exit(1);
}
" 2>/dev/null
print_test "Vercel build scripts exist in package.json" $?

echo ""
echo -e "${BLUE}Test 4: Deployment Script Integration${NC}"

# Test deployment script dry run
TOTAL_TESTS=$((TOTAL_TESTS + 1))
./scripts/deploy-vercel.sh dry-run > /dev/null 2>&1
print_test "Deployment script dry-run works" $?

echo ""
echo -e "${BLUE}Test 5: Turbo Cache Integration${NC}"

# Test if turbo cache is working
TOTAL_TESTS=$((TOTAL_TESTS + 1))
BUILD_OUTPUT=$(pnpm build:vercel:prod 2>&1)
if echo "$BUILD_OUTPUT" | grep -q "FULL TURBO\|cached"; then
    print_test "Turbo cache is working" 0
else
    print_test "Turbo cache is working" 1
fi

echo ""
echo -e "${BLUE}Test 6: Configuration Optimizations${NC}"

# Test ignore command
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const config = require('./vercel.json');
if (config.ignoreCommand && config.ignoreCommand.includes('packages/')) {
  console.log('✅ Ignore command targets relevant directories');
  process.exit(0);
} else {
  process.exit(1);
}
" 2>/dev/null
print_test "Ignore command targets relevant directories" $?

# Test output directory
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const config = require('./vercel.json');
if (config.outputDirectory === 'public') {
  console.log('✅ Output directory is configured');
  process.exit(0);
} else {
  process.exit(1);
}
" 2>/dev/null
print_test "Output directory is configured" $?

# Test command timeout
TOTAL_TESTS=$((TOTAL_TESTS + 1))
node -e "
const config = require('./vercel.json');
if (config.commandTimeout && config.commandTimeout > 0) {
  console.log('✅ Command timeout is configured (' + config.commandTimeout + 's)');
  process.exit(0);
} else {
  process.exit(1);
}
" 2>/dev/null
print_test "Command timeout is configured" $?

# Summary
echo ""
echo -e "${BLUE}📊 Vercel Build Commands Test Summary${NC}"
echo "Total tests: $TOTAL_TESTS"
echo "Passed: $((TOTAL_TESTS - FAILED_TESTS))"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All Vercel build command tests passed!${NC}"
    echo -e "${GREEN}✅ Vercel build commands are optimized for monorepo${NC}"
    exit 0
else
    echo -e "${RED}⚠️ Some Vercel build command tests failed${NC}"
    exit 1
fi