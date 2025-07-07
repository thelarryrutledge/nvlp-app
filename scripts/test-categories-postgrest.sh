#!/bin/bash

# Test script for Categories PostgREST API endpoints
# Tests CRUD operations, constraints, and RLS policies

set -e

echo "🔍 Testing Categories PostgREST API"
echo "=================================="

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

echo -e "\n${BLUE}🧹 Cleanup: Remove any existing test categories${NC}"
# Clean up any test categories
response=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/categories?select=*" 2>/dev/null)
if [ $? -eq 0 ]; then
    test_ids=$(echo "$response" | jq -r '.[] | select(.name | startswith("Test")) | .id' | tr '\n' ' ')
    for id in $test_ids; do
        if [ -n "$id" ] && [ "$id" != "null" ]; then
            curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" -X DELETE "$BASE_URL/categories?id=eq.$id" > /dev/null
            echo "  Cleaned up test category: $id"
        fi
    done
fi

echo -e "\n${BLUE}📋 Test 1: GET - List Default Categories${NC}"

echo -n "  Getting all categories... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/categories?select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    # Check for default categories
    count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    expense_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '[.[] | select(.category_type == "expense")] | length')
    income_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '[.[] | select(.category_type == "income")] | length')
    echo "    Found $count categories ($expense_count expense, $income_count income)"
    echo "    Should include defaults: Groceries, Transportation, Salary Income, Other Income"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
    echo "    Response: $(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')"
fi

echo -e "\n${BLUE}📋 Test 2: POST - Create New Expense Category${NC}"

echo -n "  Creating test expense category... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -X POST \
    "$BASE_URL/categories" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Home Office\",\"description\":\"Office supplies and equipment\",\"color\":\"#795548\",\"icon\":\"office\",\"category_type\":\"expense\",\"sort_order\":10}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "201" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 201)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    response_body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    # PostgREST returns an array even for single inserts
    if [ "$(echo "$response_body" | jq -r 'type')" = "array" ]; then
        category_id=$(echo "$response_body" | jq -r '.[0].id')
        category_color=$(echo "$response_body" | jq -r '.[0].color')
    else
        category_id=$(echo "$response_body" | jq -r '.id')
        category_color=$(echo "$response_body" | jq -r '.color')
    fi
    
    if [ "$category_id" != "null" ] && [ -n "$category_id" ]; then
        echo "    Created category ID: $category_id (color: $category_color)"
    else
        echo "    Created category (ID not returned in response)"
        # Get the most recent category as fallback
        category_id=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/categories?name=eq.Test%20Home%20Office&select=id" | jq -r '.[0].id')
        echo "    Found category ID via lookup: $category_id"
    fi
else
    echo -e "${RED}✗${NC} (Expected 201, got $status)"
    echo "    Response: $(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')"
fi

echo -e "\n${BLUE}📋 Test 3: POST - Create New Income Category${NC}"

echo -n "  Creating test income category... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -X POST \
    "$BASE_URL/categories" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Freelance Income\",\"description\":\"Income from freelance work\",\"color\":\"#8BC34A\",\"category_type\":\"income\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "201" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 201)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    response_body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    # PostgREST returns an array even for single inserts
    if [ "$(echo "$response_body" | jq -r 'type')" = "array" ]; then
        income_category_id=$(echo "$response_body" | jq -r '.[0].id')
        category_type=$(echo "$response_body" | jq -r '.[0].category_type')
    else
        income_category_id=$(echo "$response_body" | jq -r '.id')
        category_type=$(echo "$response_body" | jq -r '.category_type')
    fi
    
    if [ "$income_category_id" != "null" ] && [ -n "$income_category_id" ]; then
        echo "    Created income category ID: $income_category_id (type: $category_type)"
    else
        echo "    Created income category (ID not returned in response)"
        # Get the most recent income category as fallback
        income_category_id=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/categories?name=eq.Test%20Freelance%20Income&select=id" | jq -r '.[0].id')
        echo "    Found income category ID via lookup: $income_category_id"
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
    "$BASE_URL/categories" \
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
    "$BASE_URL/categories" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Home Office\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "409" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 409 - Duplicate name rejected)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 409, got $status)"
fi

# Test invalid color format
echo -n "  Testing invalid color format... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/categories" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Bad Color\",\"color\":\"invalid\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "400" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 400 - Invalid color format rejected)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400, got $status)"
fi

# Test negative sort order
echo -n "  Testing negative sort order... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/categories" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Negative Sort\",\"sort_order\":-1}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "400" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 400 - Negative sort order rejected)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400, got $status)"
fi

echo -e "\n${BLUE}📋 Test 5: GET - Single Category${NC}"

if [ -n "$category_id" ] && [ "$category_id" != "null" ]; then
    echo -n "  Getting single category... "
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $(cat .token)" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        "$BASE_URL/categories?id=eq.$category_id&select=*")

    status=$(echo "$response" | grep -o '[0-9]*$')
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" = "200" ]; then
        echo -e "${GREEN}✓${NC} (HTTP 200)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        name=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq -r '.[0].name')
        echo "    Retrieved category: $name"
    else
        echo -e "${RED}✗${NC} (Expected 200, got $status)"
    fi
else
    echo -n "  Skipping single category test (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
fi

echo -e "\n${BLUE}📋 Test 6: PATCH - Update Category${NC}"

if [ -n "$category_id" ] && [ "$category_id" != "null" ]; then
    echo -n "  Updating category color and description... "
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $(cat .token)" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -X PATCH \
        "$BASE_URL/categories?id=eq.$category_id" \
        -d '{"color":"#FF5722","description":"Updated office category","sort_order":5}')

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
    response=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/categories?id=eq.$category_id&select=color,description,sort_order")
    color=$(echo "$response" | jq -r '.[0].color')
    sort_order=$(echo "$response" | jq -r '.[0].sort_order')
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$color" = "#FF5722" ] && [ "$sort_order" = "5" ]; then
        echo -e "${GREEN}✓${NC} (Color: $color, Sort order: $sort_order)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} (Color: $color, Sort order: $sort_order)"
    fi
else
    echo -n "  Skipping update test (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
    echo -n "  Skipping update verification (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
fi

echo -e "\n${BLUE}📋 Test 7: Test Category Filtering and Queries${NC}"

echo -n "  Getting categories by type (expense)... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/categories?category_type=eq.expense&select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    expense_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Found $expense_count expense categories"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
fi

echo -n "  Getting categories by type (income)... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/categories?category_type=eq.income&select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    income_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Found $income_count income categories"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
fi

echo -n "  Getting active categories only... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/categories?is_active=eq.true&select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    active_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Found $active_count active categories"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
fi

echo -n "  Testing category sorting by type and order... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/categories?budget_id=eq.$BUDGET_ID&order=category_type.asc,sort_order.asc&select=name,category_type,sort_order")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    sorted_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Retrieved $sorted_count categories in sorted order"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
fi

echo -e "\n${BLUE}📋 Test 8: Test Category Deactivation${NC}"

if [ -n "$category_id" ] && [ "$category_id" != "null" ]; then
    echo -n "  Deactivating category... "
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $(cat .token)" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -X PATCH \
        "$BASE_URL/categories?id=eq.$category_id" \
        -d '{"is_active":false}')

    status=$(echo "$response" | grep -o '[0-9]*$')
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" = "204" ]; then
        echo -e "${GREEN}✓${NC} (HTTP 204)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # Verify deactivation
        echo -n "  Verifying deactivation... "
        response=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/categories?id=eq.$category_id&select=is_active")
        is_active=$(echo "$response" | jq -r '.[0].is_active')
        TOTAL_TESTS=$((TOTAL_TESTS + 1))

        if [ "$is_active" = "false" ]; then
            echo -e "${GREEN}✓${NC} (Category deactivated)"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}✗${NC} (Category still active)"
        fi
    else
        echo -e "${RED}✗${NC} (Expected 204, got $status)"
    fi
else
    echo -n "  Skipping deactivation test (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
    echo -n "  Skipping deactivation verification (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
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
    "$BASE_URL/categories" \
    -d "{\"budget_id\":\"$fake_budget_id\",\"name\":\"RLS Test Category\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "400" ] || [ "$status" = "403" ]; then
    echo -e "${GREEN}✓${NC} (HTTP $status - RLS blocked invalid budget)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400/403, got $status)"
fi

echo -e "\n${BLUE}📋 Test 10: DELETE - Remove Test Categories${NC}"

# Delete test categories
deleted_count=0
for id in "$category_id" "$income_category_id"; do
    if [ -n "$id" ] && [ "$id" != "null" ]; then
        echo -n "  Deleting test category $id... "
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -H "Authorization: Bearer $(cat .token)" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -X DELETE \
            "$BASE_URL/categories?id=eq.$id")

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
    echo -n "  No test categories to delete (IDs not available)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
fi

echo -e "\n${BLUE}📊 Test Results Summary${NC}"
echo "=================================="

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}✅ All tests passed: $PASSED_TESTS/$TOTAL_TESTS${NC}"
    echo -e "${GREEN}✅ Categories PostgREST API working correctly!${NC}"
    echo -e "${GREEN}✅ CRUD operations validated${NC}"
    echo -e "${GREEN}✅ Database constraints enforced${NC}"
    echo -e "${GREEN}✅ RLS policies working${NC}"
    echo -e "${GREEN}✅ Category types and filtering working${NC}"
    echo -e "${GREEN}✅ Color validation and sorting working${NC}"
    echo ""
    echo -e "${GREEN}🎉 Categories API ready for use!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed: $PASSED_TESTS/$TOTAL_TESTS passed${NC}"
    echo -e "${YELLOW}⚠️  Please review failed tests${NC}"
    exit 1
fi