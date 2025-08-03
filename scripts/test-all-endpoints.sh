#!/bin/bash

# Comprehensive API Endpoint Test Script
# Tests all NVLP API endpoints with cURL

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-your-anon-key}"
USER_ACCESS_TOKEN="${USER_ACCESS_TOKEN:-}"
TEST_EMAIL="${TEST_EMAIL:-test@example.com}"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}🧪 NVLP API Comprehensive Test Suite${NC}"
echo "============================================"
echo "API URL: $SUPABASE_URL"
echo "Using Anon Key: ${SUPABASE_ANON_KEY:0:20}..."
echo ""

# Test function with detailed output
test_endpoint() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local headers=$5
    local expected_status=$6
    local check_response=$7  # Optional: string to check in response
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "\n${YELLOW}Test #$TOTAL_TESTS: $test_name${NC}"
    echo "Method: $method"
    echo "Endpoint: $endpoint"
    
    if [ -n "$data" ] && [ "$data" != "null" ]; then
        echo "Data: $data"
    fi
    
    # Build curl command
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method \"$endpoint\""
    
    # Add headers
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    # Add data if provided
    if [ -n "$data" ] && [ "$data" != "null" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    # Execute request
    local response=$(eval "$curl_cmd" 2>&1)
    local body=$(echo "$response" | head -n -1)
    local status=$(echo "$response" | tail -n 1)
    
    echo "Status: $status"
    echo "Response: $body"
    
    # Check status code
    if [ "$status" = "$expected_status" ]; then
        # Check response content if specified
        if [ -n "$check_response" ] && ! echo "$body" | grep -q "$check_response"; then
            echo -e "${RED}✗ FAIL - Response missing expected content: $check_response${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        else
            echo -e "${GREEN}✅ PASS${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        fi
    else
        echo -e "${RED}✗ FAIL - Expected status $expected_status, got $status${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# ===== AUTHENTICATION TESTS =====
echo -e "\n${BLUE}=== Authentication Endpoints ===${NC}"

test_endpoint \
    "Send Magic Link - Valid Email" \
    "POST" \
    "$SUPABASE_URL/functions/v1/auth-magic-link" \
    "{\"email\":\"$TEST_EMAIL\"}" \
    "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $SUPABASE_ANON_KEY\"" \
    "200" \
    "success"

test_endpoint \
    "Send Magic Link - Invalid Email" \
    "POST" \
    "$SUPABASE_URL/functions/v1/auth-magic-link" \
    "{\"email\":\"invalid-email\"}" \
    "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $SUPABASE_ANON_KEY\"" \
    "400" \
    "Validation failed"

test_endpoint \
    "Get User - No Token" \
    "GET" \
    "$SUPABASE_URL/functions/v1/auth-user" \
    null \
    "" \
    "401" \
    "Missing or invalid authorization"

if [ -n "$USER_ACCESS_TOKEN" ]; then
    test_endpoint \
        "Get User - With Valid Token" \
        "GET" \
        "$SUPABASE_URL/functions/v1/auth-user" \
        null \
        "-H \"Authorization: Bearer $USER_ACCESS_TOKEN\"" \
        "200" \
        "user"
        
    test_endpoint \
        "Logout" \
        "POST" \
        "$SUPABASE_URL/functions/v1/auth-logout" \
        null \
        "-H \"Authorization: Bearer $USER_ACCESS_TOKEN\"" \
        "200" \
        "success"
else
    echo -e "${YELLOW}⚠️  Skipping authenticated tests - no USER_ACCESS_TOKEN provided${NC}"
fi

# ===== CORS TESTS =====
echo -e "\n${BLUE}=== CORS Handling ===${NC}"

test_endpoint \
    "CORS Preflight - Auth Endpoint" \
    "OPTIONS" \
    "$SUPABASE_URL/functions/v1/auth-magic-link" \
    null \
    "" \
    "200"

test_endpoint \
    "CORS Preflight - Transactions" \
    "OPTIONS" \
    "$SUPABASE_URL/functions/v1/transactions" \
    null \
    "" \
    "200"

# ===== VALIDATION TESTS =====
echo -e "\n${BLUE}=== Input Validation ===${NC}"

test_endpoint \
    "SQL Injection Attempt - Email" \
    "POST" \
    "$SUPABASE_URL/functions/v1/auth-magic-link" \
    "{\"email\":\"test@example.com'; DROP TABLE users; --\"}" \
    "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $SUPABASE_ANON_KEY\"" \
    "400" \
    "Invalid email format"

test_endpoint \
    "XSS Attempt - Email" \
    "POST" \
    "$SUPABASE_URL/functions/v1/auth-magic-link" \
    "{\"email\":\"<script>alert('xss')</script>@example.com\"}" \
    "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $SUPABASE_ANON_KEY\"" \
    "400" \
    "Invalid email format"

# ===== RATE LIMITING TEST =====
echo -e "\n${BLUE}=== Rate Limiting ===${NC}"

echo "Testing rate limiting (sending 6 requests rapidly)..."
rate_limit_hit=false

for i in {1..6}; do
    echo -n "Request $i: "
    status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        "$SUPABASE_URL/functions/v1/auth-magic-link" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -d "{\"email\":\"ratelimit$i@example.com\"}")
    
    echo "Status $status"
    
    if [ "$status" = "429" ]; then
        echo -e "${GREEN}✅ Rate limiting is working (429 received)${NC}"
        rate_limit_hit=true
        PASSED_TESTS=$((PASSED_TESTS + 1))
        break
    fi
    
    # Small delay to ensure requests are processed
    sleep 0.1
done

if [ "$rate_limit_hit" = false ]; then
    echo -e "${YELLOW}⚠️  Rate limiting may not be triggered (no 429 received)${NC}"
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))

# ===== SECURITY HEADERS TEST =====
echo -e "\n${BLUE}=== Security Headers ===${NC}"

echo "Checking security headers..."
headers=$(curl -s -I "$SUPABASE_URL/functions/v1/auth-magic-link" -X OPTIONS)

check_header() {
    local header_name=$1
    local header_pattern=$2
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Checking $header_name: "
    
    if echo "$headers" | grep -qi "$header_pattern"; then
        echo -e "${GREEN}✅ Present${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ Missing${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

check_header "X-Frame-Options" "x-frame-options"
check_header "X-Content-Type-Options" "x-content-type-options"
check_header "Access-Control-Allow-Origin" "access-control-allow-origin"

# ===== DATABASE ENDPOINTS (PostgREST) =====
if [ -n "$USER_ACCESS_TOKEN" ]; then
    echo -e "\n${BLUE}=== Database Endpoints (Authenticated) ===${NC}"
    
    test_endpoint \
        "List Budgets" \
        "GET" \
        "$SUPABASE_URL/rest/v1/budgets" \
        null \
        "-H \"Authorization: Bearer $USER_ACCESS_TOKEN\" -H \"apikey: $SUPABASE_ANON_KEY\"" \
        "200"
    
    # Test creating a budget
    BUDGET_NAME="Test Budget $(date +%s)"
    test_endpoint \
        "Create Budget" \
        "POST" \
        "$SUPABASE_URL/rest/v1/budgets" \
        "{\"name\":\"$BUDGET_NAME\",\"description\":\"Test budget\"}" \
        "-H \"Authorization: Bearer $USER_ACCESS_TOKEN\" -H \"apikey: $SUPABASE_ANON_KEY\" -H \"Content-Type: application/json\" -H \"Prefer: return=representation\"" \
        "201" \
        "$BUDGET_NAME"
fi

# ===== ERROR SCENARIOS =====
echo -e "\n${BLUE}=== Error Handling ===${NC}"

test_endpoint \
    "Invalid JSON" \
    "POST" \
    "$SUPABASE_URL/functions/v1/auth-magic-link" \
    "{invalid-json" \
    "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $SUPABASE_ANON_KEY\"" \
    "400"

test_endpoint \
    "Missing Required Field" \
    "POST" \
    "$SUPABASE_URL/functions/v1/auth-magic-link" \
    "{\"notEmail\":\"value\"}" \
    "-H \"Content-Type: application/json\" -H \"Authorization: Bearer $SUPABASE_ANON_KEY\"" \
    "400"

# ===== PERFORMANCE CHECK =====
echo -e "\n${BLUE}=== Performance Check ===${NC}"

echo "Testing response time..."
start_time=$(date +%s%N)
curl -s -o /dev/null "$SUPABASE_URL/functions/v1/auth-magic-link" -X OPTIONS
end_time=$(date +%s%N)
elapsed_ms=$(( (end_time - start_time) / 1000000 ))

echo "OPTIONS request response time: ${elapsed_ms}ms"
if [ $elapsed_ms -lt 1000 ]; then
    echo -e "${GREEN}✅ Response time is good (<1s)${NC}"
else
    echo -e "${YELLOW}⚠️  Response time is slow (>1s)${NC}"
fi

# ===== TEST SUMMARY =====
echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}📊 Test Summary${NC}"
echo "============================================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed${NC}"
    exit 1
fi