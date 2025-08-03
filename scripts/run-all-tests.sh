#!/bin/bash

# NVLP API Test Suite Runner
# Executes all test scripts and provides comprehensive test results

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCS_DIR="$PROJECT_DIR/docs"
LOGS_DIR="$PROJECT_DIR/test-logs"

# Environment check
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-your-anon-key}"
USER_ACCESS_TOKEN="${USER_ACCESS_TOKEN:-}"

# Test results tracking
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0
SKIPPED_SUITES=0

echo -e "${BLUE}🧪 NVLP API Test Suite Runner${NC}"
echo "=============================================="
echo "Running comprehensive test suite for NVLP API"
echo "Timestamp: $(date)"
echo ""

# Create logs directory
mkdir -p "$LOGS_DIR"

# Function to run a test script and capture results
run_test_suite() {
    local test_name=$1
    local test_script=$2
    local required_env=$3
    local log_file="$LOGS_DIR/${test_name}.log"
    
    TOTAL_SUITES=$((TOTAL_SUITES + 1))
    
    echo -e "\n${MAGENTA}═══════════════════════════════════════════════${NC}"
    echo -e "${CYAN}📋 Test Suite: $test_name${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════${NC}"
    
    # Check if script exists
    if [ ! -f "$test_script" ]; then
        echo -e "${RED}❌ Test script not found: $test_script${NC}"
        FAILED_SUITES=$((FAILED_SUITES + 1))
        return 1
    fi
    
    # Check if script is executable
    if [ ! -x "$test_script" ]; then
        echo -e "${YELLOW}⚠️  Making script executable: $test_script${NC}"
        chmod +x "$test_script"
    fi
    
    # Check required environment variables
    if [ -n "$required_env" ]; then
        for var in $required_env; do
            if [ -z "${!var}" ]; then
                echo -e "${YELLOW}⚠️  Required environment variable not set: $var${NC}"
                echo -e "${YELLOW}⏭️  Skipping test suite${NC}"
                SKIPPED_SUITES=$((SKIPPED_SUITES + 1))
                return 0
            fi
        done
    fi
    
    echo "Script: $test_script"
    echo "Log file: $log_file"
    echo "Started: $(date)"
    echo ""
    
    # Run the test script
    local start_time=$(date +%s)
    
    if "$test_script" 2>&1 | tee "$log_file"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo ""
        echo -e "${GREEN}✅ Test suite PASSED${NC}"
        echo -e "${GREEN}Duration: ${duration}s${NC}"
        PASSED_SUITES=$((PASSED_SUITES + 1))
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo ""
        echo -e "${RED}❌ Test suite FAILED${NC}"
        echo -e "${RED}Duration: ${duration}s${NC}"
        echo -e "${RED}Check log file for details: $log_file${NC}"
        FAILED_SUITES=$((FAILED_SUITES + 1))
        return 1
    fi
}

# Function to check script syntax
check_script_syntax() {
    local script=$1
    local script_name=$(basename "$script")
    
    echo -n "Checking syntax for $script_name... "
    
    if bash -n "$script" 2>/dev/null; then
        echo -e "${GREEN}✅ Valid${NC}"
        return 0
    else
        echo -e "${RED}❌ Syntax Error${NC}"
        bash -n "$script"
        return 1
    fi
}

echo -e "${BLUE}🔍 Pre-flight Checks${NC}"
echo "----------------------------------------"

# Check environment
echo "Environment Configuration:"
echo "  SUPABASE_URL: $SUPABASE_URL"
echo "  SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:20}..."
echo "  USER_ACCESS_TOKEN: ${USER_ACCESS_TOKEN:+Set}${USER_ACCESS_TOKEN:-Not set}"
echo ""

# Check dependencies
echo "Dependency Check:"

# Check for curl
if command -v curl >/dev/null 2>&1; then
    echo -e "  curl: ${GREEN}✅ Available$(curl --version | head -1)${NC}"
else
    echo -e "  curl: ${RED}❌ Missing (required for API tests)${NC}"
    exit 1
fi

# Check for jq (optional but helpful)
if command -v jq >/dev/null 2>&1; then
    echo -e "  jq: ${GREEN}✅ Available$(jq --version)${NC}"
else
    echo -e "  jq: ${YELLOW}⚠️  Not available (JSON parsing will be basic)${NC}"
fi

# Check for bc (for calculations)
if command -v bc >/dev/null 2>&1; then
    echo -e "  bc: ${GREEN}✅ Available${NC}"
else
    echo -e "  bc: ${YELLOW}⚠️  Not available (some calculations may fail)${NC}"
fi

echo ""

# Syntax check for all scripts
echo -e "${BLUE}📝 Script Syntax Validation${NC}"
echo "----------------------------------------"

syntax_errors=0

for script in "$SCRIPT_DIR"/*.sh; do
    if [ -f "$script" ] && [ "$script" != "$SCRIPT_DIR/run-all-tests.sh" ]; then
        if ! check_script_syntax "$script"; then
            syntax_errors=$((syntax_errors + 1))
        fi
    fi
done

if [ $syntax_errors -gt 0 ]; then
    echo -e "\n${RED}❌ Found $syntax_errors syntax errors. Please fix before running tests.${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ All scripts have valid syntax${NC}"

echo -e "\n${BLUE}🚀 Running Test Suites${NC}"
echo "=============================================="

# Test Suite 1: Authentication Flow
run_test_suite \
    "Authentication Flow" \
    "$SCRIPT_DIR/test-magic-link-auth.sh" \
    ""

# Test Suite 2: Token Refresh
run_test_suite \
    "Token Refresh Verification" \
    "$SCRIPT_DIR/test-token-refresh.sh" \
    ""

# Test Suite 3: All Endpoints
run_test_suite \
    "All API Endpoints" \
    "$SCRIPT_DIR/test-all-endpoints.sh" \
    ""

# Test Suite 4: Transaction Flow (requires authentication)
run_test_suite \
    "Transaction Flow" \
    "$SCRIPT_DIR/test-transaction-flow.sh" \
    "USER_ACCESS_TOKEN"

# Test Suite 5: Security Headers
run_test_suite \
    "Security Headers Application" \
    "$SCRIPT_DIR/apply-security-headers.sh" \
    ""

# Test Suite 6: Additional scripts (if they exist)
if [ -f "$SCRIPT_DIR/test-bulk-operations.sh" ]; then
    run_test_suite \
        "Bulk Operations" \
        "$SCRIPT_DIR/test-bulk-operations.sh" \
        "USER_ACCESS_TOKEN"
fi

if [ -f "$SCRIPT_DIR/test-dashboard.sh" ]; then
    run_test_suite \
        "Dashboard Endpoints" \
        "$SCRIPT_DIR/test-dashboard.sh" \
        "USER_ACCESS_TOKEN"
fi

echo -e "\n${BLUE}📊 Documentation Verification${NC}"
echo "=============================================="

# Check for required documentation
echo "Checking documentation files..."

docs_to_check=(
    "API_ENDPOINT_VERIFICATION.md"
    "MAGIC_LINK_AUTH_VERIFICATION.md"
    "TOKEN_REFRESH_VERIFICATION.md"
    "API_CURL_TEST_EXAMPLES.md"
    "REQUEST_VALIDATION.md"
    "RATE_LIMITING.md"
    "RLS_SECURITY_AUDIT.md"
)

missing_docs=0

for doc in "${docs_to_check[@]}"; do
    doc_path="$DOCS_DIR/$doc"
    if [ -f "$doc_path" ]; then
        echo -e "  $doc: ${GREEN}✅ Present${NC}"
    else
        echo -e "  $doc: ${RED}❌ Missing${NC}"
        missing_docs=$((missing_docs + 1))
    fi
done

if [ $missing_docs -eq 0 ]; then
    echo -e "\n${GREEN}✅ All documentation files present${NC}"
else
    echo -e "\n${YELLOW}⚠️  $missing_docs documentation files missing${NC}"
fi

echo -e "\n${BLUE}🔧 Test Infrastructure Health${NC}"
echo "=============================================="

# Check script permissions
echo "Script Permissions:"
for script in "$SCRIPT_DIR"/*.sh; do
    if [ -f "$script" ]; then
        script_name=$(basename "$script")
        if [ -x "$script" ]; then
            echo -e "  $script_name: ${GREEN}✅ Executable${NC}"
        else
            echo -e "  $script_name: ${YELLOW}⚠️  Not executable${NC}"
        fi
    fi
done

# Check log directory
echo -e "\nLog Directory:"
if [ -d "$LOGS_DIR" ]; then
    log_count=$(find "$LOGS_DIR" -name "*.log" | wc -l)
    echo -e "  $LOGS_DIR: ${GREEN}✅ Present (${log_count} log files)${NC}"
else
    echo -e "  $LOGS_DIR: ${YELLOW}⚠️  Created for this run${NC}"
fi

echo -e "\n${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}📈 FINAL RESULTS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"

echo ""
echo "Test Suite Summary:"
echo "  Total Suites: $TOTAL_SUITES"
echo -e "  Passed: ${GREEN}$PASSED_SUITES${NC}"
echo -e "  Failed: ${RED}$FAILED_SUITES${NC}"
echo -e "  Skipped: ${YELLOW}$SKIPPED_SUITES${NC}"

# Calculate success rate
if [ $TOTAL_SUITES -gt 0 ]; then
    success_rate=$(( (PASSED_SUITES * 100) / TOTAL_SUITES ))
    echo "  Success Rate: $success_rate%"
fi

echo ""
echo "Log Files Location: $LOGS_DIR"
echo "Timestamp: $(date)"

# Final status
if [ $FAILED_SUITES -eq 0 ]; then
    if [ $SKIPPED_SUITES -eq 0 ]; then
        echo -e "\n${GREEN}🎉 ALL TEST SUITES PASSED!${NC}"
        echo -e "${GREEN}✅ The NVLP API is ready for production${NC}"
        exit 0
    else
        echo -e "\n${YELLOW}⚠️  All available tests passed, but some were skipped${NC}"
        echo -e "${YELLOW}Set required environment variables to run all tests${NC}"
        exit 0
    fi
else
    echo -e "\n${RED}❌ Some test suites failed${NC}"
    echo -e "${RED}Please review the failed tests and fix issues before deployment${NC}"
    exit 1
fi