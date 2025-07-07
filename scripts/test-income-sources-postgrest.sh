#!/bin/bash

# Test script for Income Sources PostgREST API endpoints
# Tests CRUD operations, constraints, and RLS policies

set -e

echo "🔍 Testing Income Sources PostgREST API"
echo "======================================"

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

# Ensure we have a valid token
if [ ! -f .token ]; then
    echo -e "${YELLOW}⚠️  No token found. Running login script...${NC}"
    ./scripts/login-and-save-token.sh
fi

# Get current user ID and default budget
USER_ID=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/user_profiles?select=id" | jq -r '.[0].id')
BUDGET_ID=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/budgets?is_default=eq.true&select=id" | jq -r '.[0].id')

echo -e "\n${BLUE}📊 Setup Information${NC}"
echo "  User ID: $USER_ID"
echo "  Default Budget ID: $BUDGET_ID"

echo -e "\n${BLUE}🧹 Cleanup: Remove any existing test income sources${NC}"
# Clean up any test income sources
response=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/income_sources?select=*" 2>/dev/null)
if [ $? -eq 0 ]; then
    test_ids=$(echo "$response" | jq -r '.[] | select(.name | startswith("Test")) | .id' | tr '\n' ' ')
    for id in $test_ids; do
        if [ -n "$id" ] && [ "$id" != "null" ]; then
            curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" -X DELETE "$BASE_URL/income_sources?id=eq.$id" > /dev/null
            echo "  Cleaned up test income source: $id"
        fi
    done
fi

echo -e "\n${BLUE}📋 Test 1: GET - List Default Income Sources${NC}"

echo -n "  Getting all income sources... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/income_sources?select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    # Check for default income sources
    count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Found $count income sources (should include defaults: Salary, Other Income)"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
    echo "    Response: $(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')"
fi

echo -e "\n${BLUE}📋 Test 2: POST - Create New Income Source${NC}"

echo -n "  Creating test income source... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -X POST \
    "$BASE_URL/income_sources" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Freelance\",\"description\":\"Test freelance income\",\"expected_monthly_amount\":2500.00,\"frequency\":\"monthly\",\"should_notify\":true}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "201" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 201)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    response_body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    # PostgREST returns an array even for single inserts
    if [ "$(echo "$response_body" | jq -r 'type')" = "array" ]; then
        income_source_id=$(echo "$response_body" | jq -r '.[0].id')
    else
        income_source_id=$(echo "$response_body" | jq -r '.id')
    fi
    
    if [ "$income_source_id" != "null" ] && [ -n "$income_source_id" ]; then
        echo "    Created income source ID: $income_source_id"
    else
        echo "    Created income source (ID not returned in response)"
        # Get the most recent income source as fallback
        income_source_id=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/income_sources?name=eq.Test%20Freelance&select=id" | jq -r '.[0].id')
        echo "    Found income source ID via lookup: $income_source_id"
    fi
else
    echo -e "${RED}✗${NC} (Expected 201, got $status)"
    echo "    Response: $(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')"
fi

echo -e "\n${BLUE}📋 Test 3: POST - Create Custom Frequency Income Source${NC}"

echo -n "  Creating custom frequency income source... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -X POST \
    "$BASE_URL/income_sources" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Pension\",\"frequency\":\"custom\",\"custom_day\":15,\"expected_monthly_amount\":1200.00}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "201" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 201)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    response_body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    # PostgREST returns an array even for single inserts
    if [ "$(echo "$response_body" | jq -r 'type')" = "array" ]; then
        custom_income_id=$(echo "$response_body" | jq -r '.[0].id')
        next_date=$(echo "$response_body" | jq -r '.[0].next_expected_date')
    else
        custom_income_id=$(echo "$response_body" | jq -r '.id')
        next_date=$(echo "$response_body" | jq -r '.next_expected_date')
    fi
    
    if [ "$custom_income_id" != "null" ] && [ -n "$custom_income_id" ]; then
        echo "    Created custom income source ID: $custom_income_id"
    else
        echo "    Created custom income source (ID not returned in response)"
        # Get the most recent income source as fallback
        custom_income_id=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/income_sources?name=eq.Test%20Pension&select=id" | jq -r '.[0].id')
        echo "    Found custom income source ID via lookup: $custom_income_id"
    fi
    
    # Verify next_expected_date was calculated
    if [ "$next_date" != "null" ]; then
        echo "    Custom frequency income created with next_expected_date: $next_date"
    fi
else
    echo -e "${RED}✗${NC} (Expected 201, got $status)"
    echo "    Response: $(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')"
fi

echo -e "\n${BLUE}📋 Test 4: POST - Test Validation Constraints${NC}"

# Test empty name
echo -n "  Testing empty name constraint... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/income_sources" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "400" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 400 - Empty name rejected)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400, got $status)"
fi

# Test duplicate name
echo -n "  Testing duplicate name constraint... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/income_sources" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Freelance\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "409" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 409 - Duplicate name rejected)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 409, got $status)"
fi

# Test negative amount
echo -n "  Testing negative amount constraint... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/income_sources" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Negative\",\"expected_monthly_amount\":-100}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "400" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 400 - Negative amount rejected)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400, got $status)"
fi

# Test custom frequency without custom_day
echo -n "  Testing custom frequency without custom_day... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/income_sources" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Custom Bad\",\"frequency\":\"custom\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "400" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 400 - Custom frequency without custom_day rejected)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400, got $status)"
fi

echo -e "\n${BLUE}📋 Test 5: GET - Single Income Source${NC}"

if [ -n "$income_source_id" ] && [ "$income_source_id" != "null" ]; then
    echo -n "  Getting single income source... "
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $(cat .token)" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        "$BASE_URL/income_sources?id=eq.$income_source_id&select=*")

    status=$(echo "$response" | grep -o '[0-9]*$')
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" = "200" ]; then
        echo -e "${GREEN}✓${NC} (HTTP 200)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        name=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq -r '.[0].name')
        echo "    Retrieved income source: $name"
    else
        echo -e "${RED}✗${NC} (Expected 200, got $status)"
    fi
else
    echo -n "  Skipping single income source test (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
fi

echo -e "\n${BLUE}📋 Test 6: PATCH - Update Income Source${NC}"

if [ -n "$income_source_id" ] && [ "$income_source_id" != "null" ]; then
    echo -n "  Updating income source amount... "
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $(cat .token)" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -X PATCH \
        "$BASE_URL/income_sources?id=eq.$income_source_id" \
        -d '{"expected_monthly_amount":3000.00,"description":"Updated test income"}')

    status=$(echo "$response" | grep -o '[0-9]*$')
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" = "204" ]; then
        echo -e "${GREEN}✓${NC} (HTTP 204)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} (Expected 204, got $status)"
    fi

    # Verify the update
    echo -n "  Verifying update... "
    response=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/income_sources?id=eq.$income_source_id&select=expected_monthly_amount,description")
    amount=$(echo "$response" | jq -r '.[0].expected_monthly_amount')
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$amount" = "3000.00" ]; then
        echo -e "${GREEN}✓${NC} (Amount updated to $amount)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} (Expected 3000.00, got $amount)"
    fi
else
    echo -n "  Skipping update test (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
    echo -n "  Skipping update verification (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
fi

echo -e "\n${BLUE}📋 Test 7: Test Frequency Change and Date Recalculation${NC}"

if [ -n "$income_source_id" ] && [ "$income_source_id" != "null" ]; then
    echo -n "  Changing frequency to bi_weekly... "
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $(cat .token)" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -X PATCH \
        "$BASE_URL/income_sources?id=eq.$income_source_id" \
        -d '{"frequency":"bi_weekly"}')

    status=$(echo "$response" | grep -o '[0-9]*$')
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" = "204" ]; then
        echo -e "${GREEN}✓${NC} (HTTP 204)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # Verify next_expected_date was recalculated
        echo -n "  Verifying date recalculation... "
        response=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/income_sources?id=eq.$income_source_id&select=frequency,next_expected_date")
        frequency=$(echo "$response" | jq -r '.[0].frequency')
        next_date=$(echo "$response" | jq -r '.[0].next_expected_date')
        TOTAL_TESTS=$((TOTAL_TESTS + 1))

        if [ "$frequency" = "bi_weekly" ] && [ "$next_date" != "null" ]; then
            echo -e "${GREEN}✓${NC} (Frequency: $frequency, Next date: $next_date)"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}✗${NC} (Frequency: $frequency, Next date: $next_date)"
        fi
    else
        echo -e "${RED}✗${NC} (Expected 204, got $status)"
    fi
else
    echo -n "  Skipping frequency change test (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
    echo -n "  Skipping date recalculation verification (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
fi

echo -e "\n${BLUE}📋 Test 8: Test Filtering and Queries${NC}"

echo -n "  Getting active income sources only... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/income_sources?is_active=eq.true&select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    active_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Found $active_count active income sources"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
fi

echo -n "  Getting income sources with notifications... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/income_sources?should_notify=eq.true&select=name,next_expected_date")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    notify_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Found $notify_count income sources with notifications"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
fi

echo -e "\n${BLUE}📋 Test 9: Test Row Level Security (RLS)${NC}"

# Test with invalid budget_id (should be rejected by RLS)
echo -n "  Testing RLS with invalid budget_id... "
fake_budget_id="00000000-0000-0000-0000-000000000000"
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/income_sources" \
    -d "{\"budget_id\":\"$fake_budget_id\",\"name\":\"RLS Test\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "400" ] || [ "$status" = "403" ]; then
    echo -e "${GREEN}✓${NC} (HTTP $status - RLS blocked invalid budget)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400/403, got $status)"
fi

echo -e "\n${BLUE}📋 Test 10: DELETE - Remove Test Income Sources${NC}"

# Delete test income sources
deleted_count=0
for id in "$income_source_id" "$custom_income_id"; do
    if [ -n "$id" ] && [ "$id" != "null" ]; then
        echo -n "  Deleting test income source $id... "
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -H "Authorization: Bearer $(cat .token)" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -X DELETE \
            "$BASE_URL/income_sources?id=eq.$id")

        status=$(echo "$response" | grep -o '[0-9]*$')
        TOTAL_TESTS=$((TOTAL_TESTS + 1))

        if [ "$status" = "204" ]; then
            echo -e "${GREEN}✓${NC} (HTTP 204)"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            deleted_count=$((deleted_count + 1))
        else
            echo -e "${RED}✗${NC} (Expected 204, got $status)"
        fi
    fi
done

if [ $deleted_count -eq 0 ]; then
    echo -n "  No test income sources to delete (IDs not available)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
fi

echo -e "\n${BLUE}📊 Test Results Summary${NC}"
echo "======================================"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}✅ All tests passed: $PASSED_TESTS/$TOTAL_TESTS${NC}"
    echo -e "${GREEN}✅ Income Sources PostgREST API working correctly!${NC}"
    echo -e "${GREEN}✅ CRUD operations validated${NC}"
    echo -e "${GREEN}✅ Database constraints enforced${NC}"
    echo -e "${GREEN}✅ RLS policies working${NC}"
    echo -e "${GREEN}✅ Automatic date calculations working${NC}"
    echo ""
    echo -e "${GREEN}🎉 Income Sources API ready for use!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed: $PASSED_TESTS/$TOTAL_TESTS passed${NC}"
    echo -e "${YELLOW}⚠️  Please review failed tests${NC}"
    exit 1
fi