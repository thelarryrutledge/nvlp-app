#!/bin/bash

# Test script for Reports Edge Function
# Tests all 5 report endpoints with comprehensive validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="https://qnpatlosomopoimtsmsr.supabase.co"
REPORTS_URL="https://qnpatlosomopoimtsmsr.supabase.co/functions/v1/reports"
TOKEN_FILE=".token"

# Test configuration
max_retries=3
retry_delay=2

# Helper function to check if jq is available
check_jq() {
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq is required but not installed${NC}"
        echo "Please install jq: brew install jq (macOS) or apt-get install jq (Ubuntu)"
        exit 1
    fi
}

# Helper function to read token
read_token() {
    if [ ! -f "$TOKEN_FILE" ]; then
        echo -e "${RED}Error: Token file not found. Run login-and-save-token.sh first${NC}"
        exit 1
    fi
    
    TOKEN=$(cat "$TOKEN_FILE" | tr -d '\n\r')
    if [ -z "$TOKEN" ]; then
        echo -e "${RED}Error: Token is empty${NC}"
        exit 1
    fi
}

# Helper function to make API request with retry logic
make_request() {
    local url="$1"
    local method="$2"
    local description="$3"
    local expected_status="$4"
    
    echo -n "Testing: $description... "
    
    for attempt in $(seq 1 $max_retries); do
        response=$(curl -s -w "\n%{http_code}" \
            -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            "$url" 2>/dev/null)
        
        response_body=$(echo "$response" | head -n -1)
        status_code=$(echo "$response" | tail -n 1)
        
        # Check for Edge Function cold start issues
        if [ "$status_code" = "504" ] || [ "$status_code" = "408" ] || echo "$response_body" | grep -q "timeout\|cold start\|function not ready"; then
            if [ $attempt -lt $max_retries ]; then
                echo -n "⏳ (cold start, retrying $attempt/$max_retries)... "
                sleep $retry_delay
                continue
            fi
        fi
        
        break
    done
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
        if [ "$expected_status" = "200" ]; then
            # Validate JSON response structure
            if echo "$response_body" | jq -e '.success' >/dev/null 2>&1; then
                echo -e "  ${BLUE}Response: Valid JSON with success field${NC}"
            else
                echo -e "  ${YELLOW}Warning: Response missing success field${NC}"
            fi
        fi
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $status_code, expected $expected_status)"
        echo -e "  ${YELLOW}Response: $response_body${NC}"
        return 1
    fi
}

# Main test function
run_tests() {
    echo -e "${BLUE}=== Reports Edge Function Test Suite ===${NC}"
    echo "Testing against: $REPORTS_URL"
    echo
    
    # Get budget ID from a simple query
    echo -e "${BLUE}Getting budget ID...${NC}"
    budget_response=$(curl -s \
        -H "Authorization: Bearer $TOKEN" \
        -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8" \
        "$SUPABASE_URL/rest/v1/budgets?select=id&limit=1")
    
    BUDGET_ID=$(echo "$budget_response" | jq -r 'if type == "array" then .[0].id else .id end // empty')
    
    if [ -z "$BUDGET_ID" ]; then
        echo -e "${RED}Error: Could not get budget ID${NC}"
        echo "Response: $budget_response"
        exit 1
    fi
    
    echo -e "${GREEN}Using budget ID: $BUDGET_ID${NC}"
    echo
    
    # Test counters
    local passed=0
    local failed=0
    
    echo -e "${BLUE}=== Testing Report Endpoints ===${NC}"
    
    # Test 1: Transaction History Report
    if make_request "$REPORTS_URL/transactions?budget_id=$BUDGET_ID&limit=5" "GET" "Transaction history report" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 2: Transaction History with filters
    if make_request "$REPORTS_URL/transactions?budget_id=$BUDGET_ID&transaction_type=expense&limit=3" "GET" "Transaction history with filters" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 3: Category Spending Trends
    if make_request "$REPORTS_URL/category-trends?budget_id=$BUDGET_ID&group_by=month" "GET" "Category spending trends" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 4: Category Trends with date range
    if make_request "$REPORTS_URL/category-trends?budget_id=$BUDGET_ID&start_date=2025-01-01&end_date=2025-12-31&group_by=week" "GET" "Category trends with date range" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 5: Income vs Expense Report
    if make_request "$REPORTS_URL/income-expense?budget_id=$BUDGET_ID&group_by=month" "GET" "Income vs expense report" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 6: Income vs Expense with custom period
    if make_request "$REPORTS_URL/income-expense?budget_id=$BUDGET_ID&group_by=day&start_date=2025-01-01" "GET" "Income vs expense with custom period" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 7: Envelope Balance History
    if make_request "$REPORTS_URL/envelope-history?budget_id=$BUDGET_ID" "GET" "Envelope balance history" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 8: Envelope History with date range
    if make_request "$REPORTS_URL/envelope-history?budget_id=$BUDGET_ID&start_date=2025-01-01&end_date=2025-12-31" "GET" "Envelope history with date range" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 9: Budget Performance Report
    if make_request "$REPORTS_URL/budget-performance?budget_id=$BUDGET_ID" "GET" "Budget performance report" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 10: Budget Performance with date range
    if make_request "$REPORTS_URL/budget-performance?budget_id=$BUDGET_ID&start_date=2025-01-01&end_date=2025-12-31" "GET" "Budget performance with date range" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    echo
    echo -e "${BLUE}=== Testing Error Conditions ===${NC}"
    
    # Test 11: Missing budget_id
    if make_request "$REPORTS_URL/transactions" "GET" "Missing budget_id parameter" "400"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 12: Invalid route
    if make_request "$REPORTS_URL/invalid-route?budget_id=$BUDGET_ID" "GET" "Invalid route" "404"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 13: Missing authorization
    echo -n "Testing: Missing authorization header... "
    response=$(curl -s -w "\n%{http_code}" \
        -X "GET" \
        -H "Content-Type: application/json" \
        "$REPORTS_URL/transactions?budget_id=$BUDGET_ID" 2>/dev/null)
    
    status_code=$(echo "$response" | tail -n 1)
    if [ "$status_code" = "401" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
        ((passed++))
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $status_code, expected 401)"
        ((failed++))
    fi
    
    echo
    echo -e "${BLUE}=== Test Summary ===${NC}"
    echo -e "Total tests: $((passed + failed))"
    echo -e "${GREEN}Passed: $passed${NC}"
    echo -e "${RED}Failed: $failed${NC}"
    
    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}Reports Edge Function Test Suite${NC}"
    echo "========================================"
    echo
    
    check_jq
    read_token
    
    echo -e "${BLUE}Configuration:${NC}"
    echo "  Supabase URL: $SUPABASE_URL"
    echo "  Reports URL: $REPORTS_URL"
    echo "  Token file: $TOKEN_FILE"
    echo "  Max retries: $max_retries"
    echo
    
    run_tests
    
    exit_code=$?
    echo
    echo -e "${BLUE}Test completed with exit code: $exit_code${NC}"
    exit $exit_code
}

# Run main function
main "$@"