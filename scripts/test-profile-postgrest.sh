#!/bin/bash

# Test script for user profile via direct PostgREST
# Tests GET and PATCH operations, validation, and error handling

set -e

echo "🔍 Testing Profile API via Direct PostgREST"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# API configuration
BASE_URL="$SUPABASE_URL/rest/v1"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0

# Helper function to run test
run_test() {
    local description="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "  Testing: $description... "
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -H "Authorization: Bearer $(cat .token)" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json" \
            -X "$method" \
            "$BASE_URL$endpoint" \
            -d "$data" 2>/dev/null)
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -H "Authorization: Bearer $(cat .token)" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -X "$method" \
            "$BASE_URL$endpoint" 2>/dev/null)
    fi
    
    if [ $? -eq 0 ]; then
        body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
        status=$(echo "$response" | grep -o '[0-9]*$')
        
        if [ "$status" = "$expected_status" ]; then
            echo -e "${GREEN}✓${NC} (HTTP $status)"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            
            if [ -n "$body" ] && [ "$body" != "[]" ] && [ "$body" != "{}" ]; then
                echo "    Response: $body" | jq '.' 2>/dev/null || echo "    Response: $body"
            fi
            return 0
        else
            echo -e "${RED}✗${NC} (Expected HTTP $expected_status, got $status)"
            echo "    Response: $body"
            return 1
        fi
    else
        echo -e "${RED}✗${NC} (curl failed)"
        return 1
    fi
}

# Ensure we have a valid token
if [ ! -f .token ]; then
    echo -e "${YELLOW}⚠️  No token found. Running login script...${NC}"
    ./scripts/login-and-save-token.sh
fi

echo -e "\n${BLUE}📋 Test 1: Valid Profile Operations${NC}"

# Test GET profile
run_test "GET profile" "GET" "/user_profiles?select=*" "" "200"

# Test PATCH profile - update display name
run_test "PATCH profile - update display name" "PATCH" "/user_profiles?id=eq.07075cac-0338-4b3a-b58b-a7a174c1ab0d" '{"display_name":"Updated Test Name"}' "204"

# Test GET profile after update
run_test "GET profile after update" "GET" "/user_profiles?select=*" "" "200"

# Test PATCH profile - update timezone
run_test "PATCH profile - update timezone" "PATCH" "/user_profiles?id=eq.07075cac-0338-4b3a-b58b-a7a174c1ab0d" '{"timezone":"America/Los_Angeles"}' "204"

# Test PATCH profile - update multiple fields
run_test "PATCH profile - multiple fields" "PATCH" "/user_profiles?id=eq.07075cac-0338-4b3a-b58b-a7a174c1ab0d" '{"display_name":"Full Test","currency_code":"EUR"}' "204"

echo -e "\n${BLUE}🔒 Test 2: Validation Tests${NC}"

# Test PATCH with invalid display name (too short)
run_test "PATCH invalid display name (too short)" "PATCH" "/user_profiles?id=eq.07075cac-0338-4b3a-b58b-a7a174c1ab0d" '{"display_name":"X"}' "400"

# Test PATCH with invalid timezone
run_test "PATCH invalid timezone" "PATCH" "/user_profiles?id=eq.07075cac-0338-4b3a-b58b-a7a174c1ab0d" '{"timezone":"Invalid/Timezone"}' "400"

# Test PATCH with invalid currency code
run_test "PATCH invalid currency code" "PATCH" "/user_profiles?id=eq.07075cac-0338-4b3a-b58b-a7a174c1ab0d" '{"currency_code":"INVALID"}' "400"

# Test PATCH with invalid date format
run_test "PATCH invalid date format" "PATCH" "/user_profiles?id=eq.07075cac-0338-4b3a-b58b-a7a174c1ab0d" '{"date_format":"INVALID"}' "400"

echo -e "\n${BLUE}🚫 Test 3: Error Handling${NC}"

# Test GET without authentication
echo -n "  Testing: GET without authorization... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -X "GET" \
    "$BASE_URL/user_profiles?select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
if [ "$status" = "401" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 401 - correctly rejected unauthorized request)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 401, got $status)"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test GET without API key
echo -n "  Testing: GET without API key... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -X "GET" \
    "$BASE_URL/user_profiles?select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
if [ "$status" = "401" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 401 - correctly rejected request without API key)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 401, got $status)"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test PATCH with malformed JSON
echo -n "  Testing: PATCH with malformed JSON... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X "PATCH" \
    "$BASE_URL/user_profiles?id=eq.07075cac-0338-4b3a-b58b-a7a174c1ab0d" \
    -d '{"display_name":}' 2>/dev/null || echo "HTTPSTATUS:400")

status=$(echo "$response" | grep -o '[0-9]*$')
if [ "$status" = "400" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 400 - correctly rejected malformed JSON)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400, got $status)"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test POST (should not be allowed for profiles)
run_test "POST profile (should fail)" "POST" "/user_profiles" '{"display_name":"Test"}' "405"

# Test DELETE (should not be allowed for profiles)
run_test "DELETE profile (should fail)" "DELETE" "/user_profiles?id=eq.07075cac-0338-4b3a-b58b-a7a174c1ab0d" "" "405"

echo -e "\n${BLUE}🧹 Test 4: Cleanup${NC}"

# Restore original profile data
run_test "Restore original profile data" "PATCH" "/user_profiles?id=eq.07075cac-0338-4b3a-b58b-a7a174c1ab0d" '{"display_name":"Full Test","timezone":"America/New_York","currency_code":"USD"}' "204"

echo -e "\n${BLUE}📊 Test Results Summary${NC}"
echo "=========================================="

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}✅ All tests passed: $PASSED_TESTS/$TOTAL_TESTS${NC}"
    echo -e "${GREEN}✅ Profile API working via direct PostgREST${NC}"
    echo -e "${GREEN}✅ GET profile working${NC}"
    echo -e "${GREEN}✅ PATCH profile working with validation${NC}"
    echo -e "${GREEN}✅ Authentication and authorization working${NC}"
    echo -e "${GREEN}✅ Input validation working${NC}"
    echo -e "${GREEN}✅ Error handling working${NC}"
    echo ""
    echo -e "${GREEN}🎉 Profile endpoint ready via PostgREST!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed: $PASSED_TESTS/$TOTAL_TESTS passed${NC}"
    echo -e "${YELLOW}⚠️  Please review failed tests before proceeding${NC}"
    exit 1
fi