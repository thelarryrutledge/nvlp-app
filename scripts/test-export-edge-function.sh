#!/bin/bash

# Test script for Export Edge Function
# Tests all export endpoints with CSV and JSON formats

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="https://qnpatlosomopoimtsmsr.supabase.co"
EXPORT_URL="https://qnpatlosomopoimtsmsr.supabase.co/functions/v1/export"
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
    local check_content_type="$5"
    
    echo -n "Testing: $description... "
    
    for attempt in $(seq 1 $max_retries); do
        # Make request and save to temp file to handle response properly
        temp_file=$(mktemp)
        http_response=$(curl -s -w "HTTPSTATUS:%{http_code}\nCONTENTTYPE:%{content_type}" \
            -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -o "$temp_file" \
            "$url" 2>/dev/null)
        
        response_body=$(cat "$temp_file")
        rm -f "$temp_file"
        
        status_code=$(echo "$http_response" | grep "HTTPSTATUS:" | cut -d: -f2)
        content_type=$(echo "$http_response" | grep "CONTENTTYPE:" | cut -d: -f2)
        
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
        
        # Check content type if specified
        if [ -n "$check_content_type" ]; then
            if echo "$content_type" | grep -q "$check_content_type"; then
                echo -e "  ${BLUE}Content-Type: $content_type${NC}"
            else
                echo -e "  ${YELLOW}Warning: Expected content type $check_content_type, got $content_type${NC}"
            fi
        fi
        
        # Show response length
        response_length=$(echo "$response_body" | wc -c)
        echo -e "  ${BLUE}Response size: $response_length bytes${NC}"
        
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $status_code, expected $expected_status)"
        echo -e "  ${YELLOW}Response: $response_body${NC}"
        return 1
    fi
}

# Main test function
run_tests() {
    echo -e "${BLUE}=== Export Edge Function Test Suite ===${NC}"
    echo "Testing against: $EXPORT_URL"
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
    
    echo -e "${BLUE}=== Testing Export Endpoints (CSV Format) ===${NC}"
    
    # Test 1: Export transactions as CSV
    if make_request "$EXPORT_URL/transactions?budget_id=$BUDGET_ID&format=csv" "GET" "Export transactions as CSV" "200" "text/csv"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 2: Export transactions as JSON
    if make_request "$EXPORT_URL/transactions?budget_id=$BUDGET_ID&format=json" "GET" "Export transactions as JSON" "200" "application/json"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 3: Export complete budget as CSV
    if make_request "$EXPORT_URL/budget?budget_id=$BUDGET_ID&format=csv" "GET" "Export complete budget as CSV" "200" "text/csv"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 4: Export complete budget as JSON
    if make_request "$EXPORT_URL/budget?budget_id=$BUDGET_ID&format=json" "GET" "Export complete budget as JSON" "200" "application/json"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 5: Export envelopes as CSV
    if make_request "$EXPORT_URL/envelopes?budget_id=$BUDGET_ID&format=csv" "GET" "Export envelopes as CSV" "200" "text/csv"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 6: Export envelopes as JSON
    if make_request "$EXPORT_URL/envelopes?budget_id=$BUDGET_ID&format=json" "GET" "Export envelopes as JSON" "200" "application/json"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 7: Export payees as CSV
    if make_request "$EXPORT_URL/payees?budget_id=$BUDGET_ID&format=csv" "GET" "Export payees as CSV" "200" "text/csv"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 8: Export payees as JSON
    if make_request "$EXPORT_URL/payees?budget_id=$BUDGET_ID&format=json" "GET" "Export payees as JSON" "200" "application/json"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 9: Export categories as CSV
    if make_request "$EXPORT_URL/categories?budget_id=$BUDGET_ID&format=csv" "GET" "Export categories as CSV" "200" "text/csv"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 10: Export categories as JSON
    if make_request "$EXPORT_URL/categories?budget_id=$BUDGET_ID&format=json" "GET" "Export categories as JSON" "200" "application/json"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 11: Export income sources as CSV
    if make_request "$EXPORT_URL/income-sources?budget_id=$BUDGET_ID&format=csv" "GET" "Export income sources as CSV" "200" "text/csv"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 12: Export income sources as JSON
    if make_request "$EXPORT_URL/income-sources?budget_id=$BUDGET_ID&format=json" "GET" "Export income sources as JSON" "200" "application/json"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    echo
    echo -e "${BLUE}=== Testing Export with Filters ===${NC}"
    
    # Test 13: Export transactions with date range
    if make_request "$EXPORT_URL/transactions?budget_id=$BUDGET_ID&format=csv&start_date=2025-01-01&end_date=2025-12-31" "GET" "Export transactions with date range" "200" "text/csv"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 14: Export transactions with type filter
    if make_request "$EXPORT_URL/transactions?budget_id=$BUDGET_ID&format=json&transaction_type=expense" "GET" "Export transactions with type filter" "200" "application/json"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    echo
    echo -e "${BLUE}=== Testing Default Format (CSV) ===${NC}"
    
    # Test 15: Default format should be CSV
    if make_request "$EXPORT_URL/transactions?budget_id=$BUDGET_ID" "GET" "Export transactions (default format)" "200" "text/csv"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    echo
    echo -e "${BLUE}=== Testing Error Conditions ===${NC}"
    
    # Test 16: Missing budget_id
    if make_request "$EXPORT_URL/transactions?format=csv" "GET" "Missing budget_id parameter" "400"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 17: Invalid budget_id
    if make_request "$EXPORT_URL/transactions?budget_id=00000000-0000-0000-0000-000000000000&format=csv" "GET" "Invalid budget_id" "404"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 18: Invalid route
    if make_request "$EXPORT_URL/invalid-route?budget_id=$BUDGET_ID&format=csv" "GET" "Invalid route" "404"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 19: Missing authorization
    echo -n "Testing: Missing authorization header... "
    response=$(curl -s -w "\n%{http_code}" \
        -X "GET" \
        -H "Content-Type: application/json" \
        "$EXPORT_URL/transactions?budget_id=$BUDGET_ID&format=csv" 2>/dev/null)
    
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
    echo -e "${BLUE}Export Edge Function Test Suite${NC}"
    echo "========================================"
    echo
    
    check_jq
    read_token
    
    echo -e "${BLUE}Configuration:${NC}"
    echo "  Supabase URL: $SUPABASE_URL"
    echo "  Export URL: $EXPORT_URL"
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