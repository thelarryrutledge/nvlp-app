#!/bin/bash

# Test script for Notifications Edge Function
# Tests notification generation, acknowledgment, and clearing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="https://qnpatlosomopoimtsmsr.supabase.co"
NOTIFICATIONS_URL="https://qnpatlosomopoimtsmsr.supabase.co/functions/v1/notifications"
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
    local data="$5"
    
    echo -n "Testing: $description... "
    
    for attempt in $(seq 1 $max_retries); do
        # Make request and save to temp file to handle response properly
        temp_file=$(mktemp)
        
        if [ -n "$data" ]; then
            http_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                -X "$method" \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                -d "$data" \
                -o "$temp_file" \
                "$url" 2>/dev/null)
        else
            http_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                -X "$method" \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                -o "$temp_file" \
                "$url" 2>/dev/null)
        fi
        
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
            # Validate JSON response structure and show notification count
            if echo "$response_body" | jq -e '.success' >/dev/null 2>&1; then
                if echo "$response_body" | jq -e '.data.notifications' >/dev/null 2>&1; then
                    notification_count=$(echo "$response_body" | jq '.data.notifications | length')
                    echo -e "  ${BLUE}Notifications found: $notification_count${NC}"
                elif echo "$response_body" | jq -e '.data.acknowledged_count' >/dev/null 2>&1; then
                    ack_count=$(echo "$response_body" | jq '.data.acknowledged_count')
                    echo -e "  ${BLUE}Acknowledged: $ack_count${NC}"
                elif echo "$response_body" | jq -e '.data.cleared_count' >/dev/null 2>&1; then
                    clear_count=$(echo "$response_body" | jq '.data.cleared_count')
                    echo -e "  ${BLUE}Cleared: $clear_count${NC}"
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
    echo -e "${BLUE}=== Notifications Edge Function Test Suite ===${NC}"
    echo "Testing against: $NOTIFICATIONS_URL"
    echo
    
    # Get budget ID
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
    
    echo -e "${BLUE}=== Testing Notification Endpoints ===${NC}"
    
    # Test 1: Get all notifications
    if make_request "$NOTIFICATIONS_URL" "GET" "Get all notifications" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 2: Get notifications for specific budget
    if make_request "$NOTIFICATIONS_URL?budget_id=$BUDGET_ID" "GET" "Get notifications for specific budget" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 3: Get notifications with timezone
    if make_request "$NOTIFICATIONS_URL?timezone=America/New_York" "GET" "Get notifications with timezone" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 4: Get notifications for specific budget with timezone
    if make_request "$NOTIFICATIONS_URL?budget_id=$BUDGET_ID&timezone=UTC" "GET" "Get notifications with budget and timezone" "200"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 5: Acknowledge notifications (empty array - should work)
    acknowledge_data='{"notification_ids": []}'
    if make_request "$NOTIFICATIONS_URL/acknowledge" "POST" "Acknowledge notifications (empty)" "200" "$acknowledge_data"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 6: Acknowledge notifications with fake IDs (should work but ack count 0)
    acknowledge_data='{"notification_ids": ["fake_notification_1", "fake_notification_2"]}'
    if make_request "$NOTIFICATIONS_URL/acknowledge" "POST" "Acknowledge fake notifications" "200" "$acknowledge_data"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 7: Clear acknowledgments (all)
    clear_data='{}'
    if make_request "$NOTIFICATIONS_URL/clear" "DELETE" "Clear all acknowledgments" "200" "$clear_data"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 8: Clear acknowledgments for specific budget
    clear_data="{\"budget_ids\": [\"$BUDGET_ID\"]}"
    if make_request "$NOTIFICATIONS_URL/clear" "DELETE" "Clear acknowledgments for specific budget" "200" "$clear_data"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 9: Clear acknowledgments for specific notification types
    clear_data='{"notification_types": ["income_source_due", "envelope_date_due"]}'
    if make_request "$NOTIFICATIONS_URL/clear" "DELETE" "Clear specific notification types" "200" "$clear_data"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    echo
    echo -e "${BLUE}=== Testing Error Conditions ===${NC}"
    
    # Test 10: Invalid budget ID
    if make_request "$NOTIFICATIONS_URL?budget_id=00000000-0000-0000-0000-000000000000" "GET" "Invalid budget ID" "404"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 11: Acknowledge without notification_ids
    acknowledge_data='{}'
    if make_request "$NOTIFICATIONS_URL/acknowledge" "POST" "Acknowledge without notification_ids" "400" "$acknowledge_data"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 12: Acknowledge with invalid notification_ids format
    acknowledge_data='{"notification_ids": "not_an_array"}'
    if make_request "$NOTIFICATIONS_URL/acknowledge" "POST" "Acknowledge with invalid format" "400" "$acknowledge_data"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 13: Invalid route
    if make_request "$NOTIFICATIONS_URL/invalid-route" "GET" "Invalid route" "404"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 14: Missing authorization
    echo -n "Testing: Missing authorization header... "
    response=$(curl -s -w "\n%{http_code}" \
        -X "GET" \
        -H "Content-Type: application/json" \
        "$NOTIFICATIONS_URL" 2>/dev/null)
    
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
    echo -e "${BLUE}Notifications Edge Function Test Suite${NC}"
    echo "========================================"
    echo
    
    check_jq
    read_token
    
    echo -e "${BLUE}Configuration:${NC}"
    echo "  Supabase URL: $SUPABASE_URL"
    echo "  Notifications URL: $NOTIFICATIONS_URL"
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