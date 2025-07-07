#!/bin/bash

# Test script to verify budget constraints work correctly across multiple users
# Tests that different users can have budgets with the same name

set -e

echo "🔍 Testing Budget Constraints Across Multiple Users"
echo "=================================================="

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
AUTH_URL="$SUPABASE_URL/auth/v1"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0

# Test users
USER1_EMAIL="larryjrutledge@gmail.com"
USER1_PASS="Test1234!"
USER2_EMAIL="larry@mariomurillo.org"
USER2_PASS="Test1234!"

echo -e "\n${BLUE}🔑 Test 1: Login as User 1${NC}"
echo -n "  Logging in as $USER1_EMAIL... "

# Login as user 1
response1=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$AUTH_URL/token?grant_type=password" \
    -d "{\"email\":\"$USER1_EMAIL\",\"password\":\"$USER1_PASS\"}")

status1=$(echo "$response1" | grep -o '[0-9]*$')
if [ "$status1" = "200" ]; then
    echo -e "${GREEN}✓${NC}"
    USER1_TOKEN=$(echo "$response1" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq -r '.access_token')
    USER1_ID=$(echo "$response1" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq -r '.user.id')
else
    echo -e "${RED}✗${NC} (Failed to login as user 1)"
    exit 1
fi

echo -e "\n${BLUE}🔑 Test 2: Login as User 2${NC}"
echo -n "  Logging in as $USER2_EMAIL... "

# Login as user 2
response2=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$AUTH_URL/token?grant_type=password" \
    -d "{\"email\":\"$USER2_EMAIL\",\"password\":\"$USER2_PASS\"}")

status2=$(echo "$response2" | grep -o '[0-9]*$')
if [ "$status2" = "200" ]; then
    echo -e "${GREEN}✓${NC}"
    USER2_TOKEN=$(echo "$response2" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq -r '.access_token')
    USER2_ID=$(echo "$response2" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq -r '.user.id')
else
    echo -e "${RED}✗${NC} (Failed to login as user 2)"
    exit 1
fi

echo -e "\n${BLUE}📋 Test 3: Create Budget with Same Name for Both Users${NC}"

# Create budget for user 1
echo -n "  Creating 'Personal Budget' for User 1... "
response_user1=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/budgets" \
    -d "{\"user_id\":\"$USER1_ID\",\"name\":\"Personal Budget\",\"description\":\"User 1's personal budget\",\"is_default\":false}")

status_user1=$(echo "$response_user1" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status_user1" = "201" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 201)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    USER1_BUDGET_ID=$(echo "$response_user1" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq -r '.id')
else
    echo -e "${RED}✗${NC} (Expected 201, got $status_user1)"
    echo "    Response: $(echo "$response_user1" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')"
fi

# Create budget with same name for user 2
echo -n "  Creating 'Personal Budget' for User 2... "
response_user2=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $USER2_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/budgets" \
    -d "{\"user_id\":\"$USER2_ID\",\"name\":\"Personal Budget\",\"description\":\"User 2's personal budget\",\"is_default\":false}")

status_user2=$(echo "$response_user2" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status_user2" = "201" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 201 - Different users can have same budget name)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    USER2_BUDGET_ID=$(echo "$response_user2" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq -r '.id')
else
    echo -e "${RED}✗${NC} (Expected 201, got $status_user2)"
    echo "    Response: $(echo "$response_user2" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')"
fi

echo -e "\n${BLUE}📋 Test 4: Verify Data Isolation (RLS)${NC}"

# User 1 should only see their budget
echo -n "  User 1 checking their budgets... "
response_check1=$(curl -s -H "Authorization: Bearer $USER1_TOKEN" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/budgets?name=eq.Personal%20Budget")
count1=$(echo "$response_check1" | jq '. | length')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$count1" = "1" ]; then
    echo -e "${GREEN}✓${NC} (Found 1 budget - RLS working)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 1 budget, found $count1)"
fi

# User 2 should only see their budget
echo -n "  User 2 checking their budgets... "
response_check2=$(curl -s -H "Authorization: Bearer $USER2_TOKEN" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/budgets?name=eq.Personal%20Budget")
count2=$(echo "$response_check2" | jq '. | length')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$count2" = "1" ]; then
    echo -e "${GREEN}✓${NC} (Found 1 budget - RLS working)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 1 budget, found $count2)"
fi

echo -e "\n${BLUE}📋 Test 5: Multiple Non-Default Budgets for User 2${NC}"

# Create additional budgets for user 2 to verify constraint fix
echo -n "  Creating second budget for User 2... "
response_extra1=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $USER2_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/budgets" \
    -d "{\"user_id\":\"$USER2_ID\",\"name\":\"Vacation Budget\",\"is_default\":false}")

status_extra1=$(echo "$response_extra1" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status_extra1" = "201" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 201)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    EXTRA1_ID=$(echo "$response_extra1" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq -r '.id')
else
    echo -e "${RED}✗${NC} (Expected 201, got $status_extra1)"
fi

echo -n "  Creating third budget for User 2... "
response_extra2=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $USER2_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/budgets" \
    -d "{\"user_id\":\"$USER2_ID\",\"name\":\"Emergency Fund\",\"is_default\":false}")

status_extra2=$(echo "$response_extra2" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status_extra2" = "201" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 201)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    EXTRA2_ID=$(echo "$response_extra2" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq -r '.id')
else
    echo -e "${RED}✗${NC} (Expected 201, got $status_extra2)"
fi

echo -e "\n${BLUE}🧹 Cleanup: Remove Test Budgets${NC}"

# Clean up User 1's test budget
if [ -n "$USER1_BUDGET_ID" ] && [ "$USER1_BUDGET_ID" != "null" ]; then
    curl -s -H "Authorization: Bearer $USER1_TOKEN" -H "apikey: $SUPABASE_ANON_KEY" -X DELETE "$BASE_URL/budgets?id=eq.$USER1_BUDGET_ID" > /dev/null
    echo "  Deleted User 1's test budget"
fi

# Clean up User 2's test budgets
for budget_id in "$USER2_BUDGET_ID" "$EXTRA1_ID" "$EXTRA2_ID"; do
    if [ -n "$budget_id" ] && [ "$budget_id" != "null" ]; then
        curl -s -H "Authorization: Bearer $USER2_TOKEN" -H "apikey: $SUPABASE_ANON_KEY" -X DELETE "$BASE_URL/budgets?id=eq.$budget_id" > /dev/null
        echo "  Deleted User 2's test budget: $budget_id"
    fi
done

echo -e "\n${BLUE}📊 Test Results Summary${NC}"
echo "=================================================="

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}✅ All tests passed: $PASSED_TESTS/$TOTAL_TESTS${NC}"
    echo -e "${GREEN}✅ Different users can have budgets with the same name${NC}"
    echo -e "${GREEN}✅ Row Level Security (RLS) properly isolates user data${NC}"
    echo -e "${GREEN}✅ Multiple non-default budgets work for all users${NC}"
    echo ""
    echo -e "${GREEN}🎉 Multi-user budget constraints working correctly!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed: $PASSED_TESTS/$TOTAL_TESTS passed${NC}"
    echo -e "${YELLOW}⚠️  Please review failed tests${NC}"
    exit 1
fi