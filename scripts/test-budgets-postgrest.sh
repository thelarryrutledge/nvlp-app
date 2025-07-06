#!/bin/bash

# Test script for budgets via direct PostgREST
# Tests GET, POST, PATCH, DELETE operations, validation, and error handling

set -e

echo "🔍 Testing Budgets API via Direct PostgREST"
echo "==========================================="

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

# Global variables for test data
CREATED_BUDGET_ID=""
DEFAULT_BUDGET_ID=""

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
            
            # Store created budget ID for later tests
            if [ "$method" = "POST" ] && [ "$status" = "201" ]; then
                CREATED_BUDGET_ID=$(echo "$body" | jq -r '.[0].id // .id' 2>/dev/null)
                if [ -n "$CREATED_BUDGET_ID" ] && [ "$CREATED_BUDGET_ID" != "null" ]; then
                    echo "    Created budget ID: $CREATED_BUDGET_ID"
                fi
            fi
            
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

# Get default budget ID for tests
echo -e "\n${BLUE}🔧 Setup: Getting default budget ID${NC}"
echo -n "  Getting budgets... "

response=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/budgets?select=*" 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$response" ]; then
    DEFAULT_BUDGET_ID=$(echo "$response" | jq -r '.[0].id' 2>/dev/null)
    if [ -n "$DEFAULT_BUDGET_ID" ] && [ "$DEFAULT_BUDGET_ID" != "null" ]; then
        echo -e "${GREEN}✓${NC}"
        echo "Default budget ID: $DEFAULT_BUDGET_ID"
    else
        echo -e "${RED}✗${NC} (failed to get budget ID)"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} (failed to get budgets)"
    exit 1
fi

echo -e "\n${BLUE}📋 Test 1: Valid Operations${NC}"

# Test GET all budgets
run_test "GET all budgets" "GET" "/budgets?select=*&order=created_at.desc" "" "200"

# Test GET specific budget
run_test "GET specific budget" "GET" "/budgets?id=eq.$DEFAULT_BUDGET_ID&select=*" "" "200"

# Get current user ID for budget creation
USER_ID=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/user_profiles?select=id" | jq -r '.[0].id')

# Test POST create new budget (PostgREST returns 201 for successful creation)
# Don't set is_default explicitly - let it default to false
run_test "Create new budget" "POST" "/budgets" "{\"user_id\":\"$USER_ID\",\"name\":\"PostgREST Test Budget\",\"description\":\"Budget for PostgREST testing\",\"is_default\":false}" "201"

# Test GET all budgets again (should now have 2)
run_test "GET all budgets (after creation)" "GET" "/budgets?select=*&order=created_at.desc" "" "200"

# Test PATCH update budget name
if [ -n "$CREATED_BUDGET_ID" ]; then
    run_test "Update budget name" "PATCH" "/budgets?id=eq.$CREATED_BUDGET_ID" '{"name":"Updated PostgREST Test"}' "204"
    
    # Test PATCH update description
    run_test "Update budget description" "PATCH" "/budgets?id=eq.$CREATED_BUDGET_ID" '{"description":"Updated description"}' "204"
    
    # Test PATCH update multiple fields
    run_test "Update multiple fields" "PATCH" "/budgets?id=eq.$CREATED_BUDGET_ID" '{"name":"Final PostgREST Test","is_active":false}' "204"
fi

echo -e "\n${BLUE}🔒 Test 2: Validation Tests${NC}"

# Test POST with missing name
run_test "Missing name in POST" "POST" "/budgets" "{\"user_id\":\"$USER_ID\",\"description\":\"No name\"}" "400"

# Test POST with empty name
run_test "Empty name in POST" "POST" "/budgets" "{\"user_id\":\"$USER_ID\",\"name\":\"\"}" "400"

# Test POST with only whitespace name
run_test "Whitespace-only name in POST" "POST" "/budgets" "{\"user_id\":\"$USER_ID\",\"name\":\"   \"}" "400"

# Test POST with too long name
long_name=$(printf 'A%.0s' {1..101})
run_test "Too long name in POST" "POST" "/budgets" "{\"user_id\":\"$USER_ID\",\"name\":\"$long_name\"}" "400"

# Test POST with too long description
long_desc=$(printf 'A%.0s' {1..501})
run_test "Too long description in POST" "POST" "/budgets" "{\"user_id\":\"$USER_ID\",\"name\":\"Test\",\"description\":\"$long_desc\"}" "400"

if [ -n "$CREATED_BUDGET_ID" ]; then
    # Test PATCH with empty name
    run_test "Empty name in PATCH" "PATCH" "/budgets?id=eq.$CREATED_BUDGET_ID" '{"name":""}' "400"
    
    # Test PATCH with invalid is_active
    run_test "Invalid is_active in PATCH" "PATCH" "/budgets?id=eq.$CREATED_BUDGET_ID" '{"is_active":"not_boolean"}' "400"
fi

echo -e "\n${BLUE}🚫 Test 3: Error Handling${NC}"

# Test GET non-existent budget
run_test "GET non-existent budget" "GET" "/budgets?id=eq.00000000-0000-0000-0000-000000000000&select=*" "" "200"

# Test PATCH non-existent budget
run_test "PATCH non-existent budget" "PATCH" "/budgets?id=eq.00000000-0000-0000-0000-000000000000" '{"name":"Test"}' "204"

# Test DELETE non-existent budget
run_test "DELETE non-existent budget" "DELETE" "/budgets?id=eq.00000000-0000-0000-0000-000000000000" "" "204"

# Test without authentication
echo -n "  Testing: GET without authorization... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -X "GET" \
    "$BASE_URL/budgets?select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
if [ "$status" = "401" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 401 - correctly rejected unauthorized request)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 401, got $status)"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test without API key
echo -n "  Testing: GET without API key... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -X "GET" \
    "$BASE_URL/budgets?select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
if [ "$status" = "401" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 401 - correctly rejected request without API key)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 401, got $status)"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo -e "\n${BLUE}🔍 Test 4: Edge Cases${NC}"

# Test with malformed JSON
echo -n "  Testing: Malformed JSON in POST... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X "POST" \
    "$BASE_URL/budgets" \
    -d '{"name":}' 2>/dev/null || echo "HTTPSTATUS:400")

status=$(echo "$response" | grep -o '[0-9]*$')
if [ "$status" = "400" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 400 - correctly rejected malformed JSON)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400, got $status)"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test creating budget with duplicate name
echo -n "  Testing: Duplicate budget name... "
response1=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X "POST" \
    "$BASE_URL/budgets" \
    -d "{\"user_id\":\"$USER_ID\",\"name\":\"Duplicate Test\",\"is_default\":false}")

status1=$(echo "$response1" | grep -o '[0-9]*$')

if [ "$status1" = "201" ]; then
    # Try to create another with same name
    response2=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $(cat .token)" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -X "POST" \
        "$BASE_URL/budgets" \
        -d "{\"user_id\":\"$USER_ID\",\"name\":\"Duplicate Test\",\"is_default\":false}")
    
    status2=$(echo "$response2" | grep -o '[0-9]*$')
    
    if [ "$status2" = "409" ] || [ "$status2" = "400" ]; then
        echo -e "${GREEN}✓${NC} (HTTP $status2 - correctly rejected duplicate name)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # Clean up - delete the duplicate test budget
        duplicate_id=$(echo "$response1" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq -r '.[0].id // .id')
        if [ -n "$duplicate_id" ] && [ "$duplicate_id" != "null" ]; then
            curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" -X DELETE "$BASE_URL/budgets?id=eq.$duplicate_id" > /dev/null
        fi
    else
        echo -e "${RED}✗${NC} (Expected 409 for duplicate, got $status2)"
    fi
else
    echo -e "${RED}✗${NC} (Failed to create first budget for duplicate test, got $status1)"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo -e "\n${BLUE}🧹 Test 5: Cleanup${NC}"

# Delete the test budget we created
if [ -n "$CREATED_BUDGET_ID" ] && [ "$CREATED_BUDGET_ID" != "null" ]; then
    run_test "Delete test budget (cleanup)" "DELETE" "/budgets?id=eq.$CREATED_BUDGET_ID" "" "204"
else
    echo "  No test budget to clean up"
fi

echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "=================================="

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}✅ All tests passed: $PASSED_TESTS/$TOTAL_TESTS${NC}"
    echo -e "${GREEN}✅ Budgets API working via direct PostgREST${NC}"
    echo -e "${GREEN}✅ GET budgets working (all budgets and specific budget)${NC}"
    echo -e "${GREEN}✅ POST budget creation working with validation${NC}"
    echo -e "${GREEN}✅ PATCH budget updates working with validation${NC}"
    echo -e "${GREEN}✅ DELETE budget working${NC}"
    echo -e "${GREEN}✅ Error handling working for invalid requests${NC}"
    echo -e "${GREEN}✅ Authentication and authorization working${NC}"
    echo -e "${GREEN}✅ Database constraints working${NC}"
    echo ""
    echo -e "${GREEN}🎉 Budgets API ready via PostgREST!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed: $PASSED_TESTS/$TOTAL_TESTS passed${NC}"
    echo -e "${YELLOW}⚠️  Please review failed tests before proceeding${NC}"
    exit 1
fi