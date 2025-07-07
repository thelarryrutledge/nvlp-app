#!/bin/bash

# Performance Testing Script for NVLP APIs with Large Datasets
# Tests API performance under realistic load conditions
# Usage: ./scripts/test-performance-with-large-datasets.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="https://api.nvlp.app"
EDGE_FUNCTION_URL="https://qnpatlosomopoimtsmsr.supabase.co/functions/v1"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8"
TEST_EMAIL="larryjrutledge@gmail.com"
TEST_PASSWORD="Test1234!"
PERFORMANCE_LOG="performance_test_$(date +%Y%m%d_%H%M%S).log"

# Performance thresholds (in milliseconds)
FAST_THRESHOLD=100
ACCEPTABLE_THRESHOLD=500
SLOW_THRESHOLD=2000

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAST_TESTS=0
ACCEPTABLE_TESTS=0
SLOW_TESTS=0
FAILED_TESTS=0

# Helper functions
log_performance() {
    local operation="$1"
    local duration="$2"
    local status="$3"
    echo "$(date '+%Y-%m-%d %H:%M:%S') | $operation | ${duration}ms | $status" >> "$PERFORMANCE_LOG"
}

measure_time() {
    local start_time=$(python3 -c "import time; print(int(time.time() * 1000))")
    "$@"
    local end_time=$(python3 -c "import time; print(int(time.time() * 1000))")
    echo $((end_time - start_time))
}

test_api_call() {
    local description="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_status="${5:-200}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -ne "${CYAN}Testing: $description${NC} ... "
    
    local start_time=$(python3 -c "import time; print(int(time.time() * 1000))")
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $ACCESS_TOKEN" \
                       -H "apikey: $ANON_KEY" "$url" 2>/dev/null || echo "000")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "%{http_code}" -X POST -H "Authorization: Bearer $ACCESS_TOKEN" \
                       -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
                       -d "$data" "$url" 2>/dev/null || echo "000")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "%{http_code}" -X DELETE -H "Authorization: Bearer $ACCESS_TOKEN" \
                       -H "apikey: $ANON_KEY" "$url" 2>/dev/null || echo "000")
    fi
    
    local end_time=$(python3 -c "import time; print(int(time.time() * 1000))")
    local duration=$((end_time - start_time))
    
    # Extract status code (last 3 characters)
    local status_code="${response: -3}"
    local response_body="${response%???}"
    
    # Determine performance category
    local perf_category=""
    local perf_color=""
    if [ "$duration" -lt "$FAST_THRESHOLD" ]; then
        FAST_TESTS=$((FAST_TESTS + 1))
        perf_category="FAST"
        perf_color="$GREEN"
    elif [ "$duration" -lt "$ACCEPTABLE_THRESHOLD" ]; then
        ACCEPTABLE_TESTS=$((ACCEPTABLE_TESTS + 1))
        perf_category="OK"
        perf_color="$YELLOW"
    elif [ "$duration" -lt "$SLOW_THRESHOLD" ]; then
        SLOW_TESTS=$((SLOW_TESTS + 1))
        perf_category="SLOW"
        perf_color="$RED"
    else
        SLOW_TESTS=$((SLOW_TESTS + 1))
        perf_category="VERY SLOW"
        perf_color="$RED"
    fi
    
    if [ "$status_code" = "$expected_status" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✅ PASS${NC} ${perf_color}(${duration}ms - $perf_category)${NC}"
        log_performance "$description" "$duration" "PASS"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}❌ FAIL${NC} ${perf_color}(${duration}ms - $perf_category)${NC} - Expected $expected_status, got $status_code"
        log_performance "$description" "$duration" "FAIL - Status: $status_code"
        
        # Show response for debugging
        if [ ${#response_body} -gt 0 ] && [ ${#response_body} -lt 500 ]; then
            echo -e "${RED}Response: $response_body${NC}"
        fi
    fi
}

create_large_dataset() {
    echo -e "\n${BOLD}🏗️  Creating Large Test Dataset${NC}"
    
    # Get the default budget ID
    BUDGET_RESPONSE=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
                           -H "apikey: $ANON_KEY" \
                           "$API_BASE_URL/budgets?select=id&is_default=eq.true&limit=1")
    
    BUDGET_ID=$(echo "$BUDGET_RESPONSE" | jq -r '.[0].id // empty')
    
    if [ -z "$BUDGET_ID" ]; then
        echo -e "${RED}❌ Could not get default budget ID${NC}"
        exit 1
    fi
    
    echo "Using budget ID: $BUDGET_ID"
    
    # Create 50 categories (performance test target)
    echo -e "${CYAN}Creating 50 categories...${NC}"
    for i in {1..50}; do
        test_api_call "Create category $i" "POST" "$API_BASE_URL/categories" \
            "{\"budget_id\":\"$BUDGET_ID\",\"user_id\":\"$USER_ID\",\"name\":\"Test Category $i\",\"description\":\"Performance test category $i\",\"category_type\":\"expense\"}" \
            "201"
    done
    
    # Create 100 envelopes (performance test target)
    echo -e "${CYAN}Creating 100 envelopes...${NC}"
    for i in {1..100}; do
        test_api_call "Create envelope $i" "POST" "$API_BASE_URL/envelopes" \
            "{\"budget_id\":\"$BUDGET_ID\",\"user_id\":\"$USER_ID\",\"name\":\"Test Envelope $i\",\"description\":\"Performance test envelope $i\",\"target_amount\":$(($i * 100))}" \
            "201"
    done
    
    # Create 200 payees (performance test target)
    echo -e "${CYAN}Creating 200 payees...${NC}"
    for i in {1..200}; do
        test_api_call "Create payee $i" "POST" "$API_BASE_URL/payees" \
            "{\"budget_id\":\"$BUDGET_ID\",\"user_id\":\"$USER_ID\",\"name\":\"Test Payee $i\",\"description\":\"Performance test payee $i\",\"payee_type\":\"business\"}" \
            "201"
    done
    
    # Create 20 income sources (performance test target)
    echo -e "${CYAN}Creating 20 income sources...${NC}"
    for i in {1..20}; do
        test_api_call "Create income source $i" "POST" "$API_BASE_URL/income_sources" \
            "{\"budget_id\":\"$BUDGET_ID\",\"user_id\":\"$USER_ID\",\"name\":\"Test Income $i\",\"description\":\"Performance test income $i\",\"expected_monthly_amount\":$(($i * 1000))}" \
            "201"
    done
    
    echo -e "${GREEN}✅ Large dataset created successfully${NC}"
}

test_bulk_operations() {
    echo -e "\n${BOLD}🔄 Testing Bulk Operations Performance${NC}"
    
    # Test large GET operations with pagination
    test_api_call "Get all categories (large dataset)" "GET" "$API_BASE_URL/categories?budget_id=eq.$BUDGET_ID&limit=100"
    test_api_call "Get all envelopes (large dataset)" "GET" "$API_BASE_URL/envelopes?budget_id=eq.$BUDGET_ID&limit=200"
    test_api_call "Get all payees (large dataset)" "GET" "$API_BASE_URL/payees?budget_id=eq.$BUDGET_ID&limit=300"
    test_api_call "Get all income sources (large dataset)" "GET" "$API_BASE_URL/income_sources?budget_id=eq.$BUDGET_ID&limit=50"
    
    # Test with different ordering and filtering
    test_api_call "Get categories with ordering" "GET" "$API_BASE_URL/categories?budget_id=eq.$BUDGET_ID&order=name.asc&limit=50"
    test_api_call "Get envelopes with filtering" "GET" "$API_BASE_URL/envelopes?budget_id=eq.$BUDGET_ID&target_amount=gte.1000&limit=50"
    test_api_call "Get payees with type filter" "GET" "$API_BASE_URL/payees?budget_id=eq.$BUDGET_ID&payee_type=eq.business&limit=100"
    
    # Test complex joins
    test_api_call "Get envelopes with categories" "GET" "$API_BASE_URL/envelopes?budget_id=eq.$BUDGET_ID&select=*,categories(name)&limit=50"
}

test_edge_function_performance() {
    echo -e "\n${BOLD}⚡ Testing Edge Function Performance${NC}"
    
    # Test dashboard (complex aggregation)
    test_api_call "Dashboard API (complex query)" "GET" "$EDGE_FUNCTION_URL/dashboard?budget_id=$BUDGET_ID"
    
    # Test transactions API
    test_api_call "Transactions API (large dataset)" "GET" "$EDGE_FUNCTION_URL/transactions?budget_id=$BUDGET_ID&limit=100"
    
    # Test reports
    test_api_call "Transaction report" "GET" "$EDGE_FUNCTION_URL/reports/transactions?budget_id=$BUDGET_ID&limit=50"
    test_api_call "Category trends report" "GET" "$EDGE_FUNCTION_URL/reports/category-trends?budget_id=$BUDGET_ID"
    test_api_call "Income vs expense report" "GET" "$EDGE_FUNCTION_URL/reports/income-expense?budget_id=$BUDGET_ID"
    
    # Test exports
    test_api_call "Export transactions (CSV)" "GET" "$EDGE_FUNCTION_URL/export/transactions?budget_id=$BUDGET_ID&format=csv"
    test_api_call "Export complete budget (JSON)" "GET" "$EDGE_FUNCTION_URL/export/budget?budget_id=$BUDGET_ID&format=json"
    
    # Test notifications
    test_api_call "Notifications API" "GET" "$EDGE_FUNCTION_URL/notifications?budget_id=$BUDGET_ID"
    
    # Test audit
    test_api_call "Audit events" "GET" "$EDGE_FUNCTION_URL/audit/events?budget_id=$BUDGET_ID&limit=50"
}

cleanup_test_data() {
    echo -e "\n${BOLD}🧹 Cleaning up test data${NC}"
    
    # Note: In a real scenario, we might want to keep the data or have a separate cleanup script
    # For now, we'll just note the cleanup step
    echo -e "${YELLOW}⚠️  Cleanup not implemented - test data remains for manual inspection${NC}"
    echo -e "${YELLOW}   You may want to manually clean up test categories, envelopes, and payees${NC}"
}

print_performance_summary() {
    echo -e "\n${BOLD}📊 Performance Test Summary${NC}"
    echo "=================================="
    echo -e "Total Tests: ${BOLD}$TOTAL_TESTS${NC}"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    echo ""
    echo -e "Performance Breakdown:"
    echo -e "  Fast (<${FAST_THRESHOLD}ms): ${GREEN}$FAST_TESTS${NC}"
    echo -e "  Acceptable (<${ACCEPTABLE_THRESHOLD}ms): ${YELLOW}$ACCEPTABLE_TESTS${NC}"
    echo -e "  Slow (≥${ACCEPTABLE_THRESHOLD}ms): ${RED}$SLOW_TESTS${NC}"
    echo ""
    echo -e "Detailed log: ${CYAN}$PERFORMANCE_LOG${NC}"
    
    # Performance recommendations
    if [ "$SLOW_TESTS" -gt 0 ]; then
        echo -e "\n${YELLOW}⚠️  Performance Recommendations:${NC}"
        echo "  - Consider adding indexes for slow queries"
        echo "  - Review RLS policies for optimization"
        echo "  - Consider pagination for large datasets"
        echo "  - Monitor database query performance"
    fi
    
    if [ "$FAST_TESTS" -gt $((TOTAL_TESTS / 2)) ]; then
        echo -e "\n${GREEN}🚀 Great performance! Most operations are fast.${NC}"
    fi
}

# Main execution
echo -e "${BOLD}🔬 NVLP API Performance Testing with Large Datasets${NC}"
echo "=================================================="
echo "Started: $(date)"
echo "Log file: $PERFORMANCE_LOG"

# Initialize performance log
echo "# NVLP API Performance Test Results" > "$PERFORMANCE_LOG"
echo "# Started: $(date)" >> "$PERFORMANCE_LOG"
echo "# Format: Timestamp | Operation | Duration(ms) | Status" >> "$PERFORMANCE_LOG"
echo "" >> "$PERFORMANCE_LOG"

# Step 1: Login and get access token
echo -e "\n${BOLD}🔑 Step 1: Authentication${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$EDGE_FUNCTION_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.session.access_token // .access_token // empty')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id // empty')

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Authentication failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Authentication successful${NC}"

# Step 2: Create large dataset
create_large_dataset

# Step 3: Test bulk operations
test_bulk_operations

# Step 4: Test Edge Function performance
test_edge_function_performance

# Step 5: Cleanup (optional)
cleanup_test_data

# Step 6: Print summary
print_performance_summary

echo -e "\n${BOLD}✅ Performance testing completed!${NC}"
echo "Check $PERFORMANCE_LOG for detailed results."