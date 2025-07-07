#!/bin/bash

# Test script for Audit Edge Function
# Tests all audit endpoints with comprehensive validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="https://qnpatlosomopoimtsmsr.supabase.co"
AUDIT_URL="https://qnpatlosomopoimtsmsr.supabase.co/functions/v1/audit"
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
        # Make request and save to temp file to handle response properly
        temp_file=$(mktemp)
        http_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -o "$temp_file" \
            "$url" 2>/dev/null)
        
        response_body=$(cat "$temp_file")
        rm -f "$temp_file"
        
        status_code=$(echo "$http_response" | grep "HTTPSTATUS:" | cut -d: -f2)
        
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
                # Show event count if available
                if echo "$response_body" | jq -e '.data.events' >/dev/null 2>&1; then
                    event_count=$(echo "$response_body" | jq '.data.events | length')
                    echo -e "  ${BLUE}Events found: $event_count${NC}"
                elif echo "$response_body" | jq -e '.data.total_events' >/dev/null 2>&1; then
                    total_events=$(echo "$response_body" | jq '.data.total_events')
                    echo -e "  ${BLUE}Total events: $total_events${NC}"
                fi
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
    echo -e "${BLUE}=== Audit Edge Function Test Suite ===${NC}"
    echo "Testing against: $AUDIT_URL"
    echo
    
    # Get budget ID and transaction ID from previous data
    echo -e "${BLUE}Getting budget and transaction IDs...${NC}"
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
    
    # Get a transaction ID
    transaction_response=$(curl -s \
        -H "Authorization: Bearer $TOKEN" \
        -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8" \
        "$SUPABASE_URL/rest/v1/transactions?select=id&budget_id=eq.$BUDGET_ID&limit=1")
    
    TRANSACTION_ID=$(echo "$transaction_response" | jq -r 'if type == "array" then .[0].id else .id end // empty')
    
    echo -e "${GREEN}Using budget ID: $BUDGET_ID${NC}"
    if [ -n "$TRANSACTION_ID" ]; then
        echo -e "${GREEN}Using transaction ID: $TRANSACTION_ID${NC}"
    else
        echo -e "${YELLOW}No transaction ID found (some tests may fail)${NC}"
    fi
    echo
    
    # Test counters
    local passed=0
    local failed=0
    
    echo -e "${BLUE}=== Testing Audit Endpoints ===${NC}"
    
    # Test 1: Get audit events
    if make_request "$AUDIT_URL/events?budget_id=$BUDGET_ID" "GET" "Get audit events" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 2: Get audit events with filters
    if make_request "$AUDIT_URL/events?budget_id=$BUDGET_ID&event_type=created&limit=10" "GET" "Get filtered audit events" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 3: Get audit summary
    if make_request "$AUDIT_URL/summary?budget_id=$BUDGET_ID" "GET" "Get audit summary" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 4: Get audit summary with date range
    if make_request "$AUDIT_URL/summary?budget_id=$BUDGET_ID&start_date=2025-01-01&end_date=2025-12-31" "GET" "Get audit summary with date range" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 5: Get user activity
    if make_request "$AUDIT_URL/users?budget_id=$BUDGET_ID" "GET" "Get user activity" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 6: Get user activity with custom limit
    if make_request "$AUDIT_URL/users?budget_id=$BUDGET_ID&limit=5" "GET" "Get user activity with limit" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 7: Get transaction history (if we have a transaction ID)
    if [ -n "$TRANSACTION_ID" ]; then
        if make_request "$AUDIT_URL/transaction?budget_id=$BUDGET_ID&transaction_id=$TRANSACTION_ID" "GET" "Get transaction history" "200"; then
            ((passed++))
        else
            ((failed++))
        fi
    else
        echo -e "${YELLOW}Skipping: Get transaction history (no transaction ID)${NC}"
    fi
    
    # Test 8: Get recent events
    if make_request "$AUDIT_URL/recent?budget_id=$BUDGET_ID" "GET" "Get recent events (default 60 minutes)" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 9: Get recent events with custom time window
    if make_request "$AUDIT_URL/recent?budget_id=$BUDGET_ID&minutes=30&limit=5" "GET" "Get recent events (30 minutes)" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 10: Get events with pagination
    if make_request "$AUDIT_URL/events?budget_id=$BUDGET_ID&limit=5&offset=0" "GET" "Get events with pagination" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    echo
    echo -e "${BLUE}=== Testing Error Conditions ===${NC}"
    
    # Test 11: Missing budget_id
    if make_request "$AUDIT_URL/events" "GET" "Missing budget_id parameter" "400"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 12: Missing transaction_id for transaction endpoint
    if make_request "$AUDIT_URL/transaction?budget_id=$BUDGET_ID" "GET" "Missing transaction_id parameter" "400"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 13: Invalid route
    if make_request "$AUDIT_URL/invalid-route?budget_id=$BUDGET_ID" "GET" "Invalid route" "404"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 14: Missing authorization
    echo -n "Testing: Missing authorization header... "
    response=$(curl -s -w "\n%{http_code}" \
        -X "GET" \
        -H "Content-Type: application/json" \
        "$AUDIT_URL/events?budget_id=$BUDGET_ID" 2>/dev/null)
    
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
    echo -e "${BLUE}Audit Edge Function Test Suite${NC}"
    echo "========================================"
    echo
    
    check_jq
    read_token
    
    echo -e "${BLUE}Configuration:${NC}"
    echo "  Supabase URL: $SUPABASE_URL"
    echo "  Audit URL: $AUDIT_URL"
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