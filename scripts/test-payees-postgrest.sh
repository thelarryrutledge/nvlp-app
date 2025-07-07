#!/bin/bash

# Test script for Payees PostgREST API endpoints
# Tests CRUD operations, constraints, and RLS policies

set -e

echo "🔍 Testing Payees PostgREST API"
echo "=============================="

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

echo -e "\n${BLUE}🧹 Cleanup: Remove any existing test payees${NC}"
# Clean up any test payees
response=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/payees?select=*" 2>/dev/null)
if [ $? -eq 0 ]; then
    test_ids=$(echo "$response" | jq -r '.[] | select(.name | startswith("Test")) | .id' | tr '\n' ' ')
    for id in $test_ids; do
        if [ -n "$id" ] && [ "$id" != "null" ]; then
            curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" -X DELETE "$BASE_URL/payees?id=eq.$id" > /dev/null
            echo "  Cleaned up test payee: $id"
        fi
    done
fi

echo -e "\n${BLUE}📋 Test 1: GET - List Default Payees${NC}"

echo -n "  Getting all payees... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/payees?select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    # Check for default payees
    count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    business_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '[.[] | select(.payee_type == "business")] | length')
    utility_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '[.[] | select(.payee_type == "utility")] | length')
    service_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '[.[] | select(.payee_type == "service")] | length')
    echo "    Found $count payees ($business_count business, $utility_count utility, $service_count service)"
    echo "    Should include defaults: Grocery Store, Electric Company, Bank, etc."
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
    echo "    Response: $(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')"
fi

echo -e "\n${BLUE}📋 Test 2: POST - Create Business Payee${NC}"

echo -n "  Creating test business payee... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -X POST \
    "$BASE_URL/payees" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Coffee Shop\",\"description\":\"Daily coffee expenses\",\"color\":\"#8D6E63\",\"icon\":\"coffee\",\"payee_type\":\"business\",\"address\":\"456 Main St, Coffee Town, CT 67890\",\"phone\":\"(555) 987-6543\",\"website\":\"https://testcoffee.com\",\"preferred_payment_method\":\"card\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "201" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 201)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    response_body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    # PostgREST returns an array even for single inserts
    if [ "$(echo "$response_body" | jq -r 'type')" = "array" ]; then
        business_payee_id=$(echo "$response_body" | jq -r '.[0].id')
        payee_type=$(echo "$response_body" | jq -r '.[0].payee_type')
        total_paid=$(echo "$response_body" | jq -r '.[0].total_paid')
    else
        business_payee_id=$(echo "$response_body" | jq -r '.id')
        payee_type=$(echo "$response_body" | jq -r '.payee_type')
        total_paid=$(echo "$response_body" | jq -r '.total_paid')
    fi
    
    if [ "$business_payee_id" != "null" ] && [ -n "$business_payee_id" ]; then
        echo "    Created business payee ID: $business_payee_id"
        echo "    Type: $payee_type, Total paid: \$$total_paid"
    else
        echo "    Created business payee (ID not returned in response)"
        business_payee_id=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/payees?name=eq.Test%20Coffee%20Shop&select=id" | jq -r '.[0].id')
        echo "    Found payee ID via lookup: $business_payee_id"
    fi
else
    echo -e "${RED}✗${NC} (Expected 201, got $status)"
    echo "    Response: $(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')"
fi

echo -e "\n${BLUE}📋 Test 3: POST - Create Utility Payee with Account Number${NC}"

echo -n "  Creating test utility payee... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -X POST \
    "$BASE_URL/payees" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Water Department\",\"description\":\"Monthly water and sewer\",\"payee_type\":\"utility\",\"address\":\"789 Water Way, Utility City, UC 13579\",\"phone\":\"(555) 246-8135\",\"email\":\"billing@testwater.gov\",\"account_number\":\"WTR-987654321\",\"preferred_payment_method\":\"bank_transfer\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "201" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 201)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    response_body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    # PostgREST returns an array even for single inserts
    if [ "$(echo "$response_body" | jq -r 'type')" = "array" ]; then
        utility_payee_id=$(echo "$response_body" | jq -r '.[0].id')
        account_number=$(echo "$response_body" | jq -r '.[0].account_number')
        email=$(echo "$response_body" | jq -r '.[0].email')
    else
        utility_payee_id=$(echo "$response_body" | jq -r '.id')
        account_number=$(echo "$response_body" | jq -r '.account_number')
        email=$(echo "$response_body" | jq -r '.email')
    fi
    
    if [ "$utility_payee_id" != "null" ] && [ -n "$utility_payee_id" ]; then
        echo "    Created utility payee ID: $utility_payee_id"
        echo "    Account: $account_number, Email: $email"
    else
        echo "    Created utility payee (ID not returned)"
        utility_payee_id=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/payees?name=eq.Test%20Water%20Department&select=id" | jq -r '.[0].id')
        echo "    Found payee ID via lookup: $utility_payee_id"
    fi
else
    echo -e "${RED}✗${NC} (Expected 201, got $status)"
    echo "    Response: $(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')"
fi

echo -e "\n${BLUE}📋 Test 4: POST - Create Service Provider${NC}"

echo -n "  Creating test service provider... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -X POST \
    "$BASE_URL/payees" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Dr. Smith Dental\",\"description\":\"Family dentist\",\"payee_type\":\"service\",\"address\":\"321 Health Plaza, Medical City, MC 24680\",\"phone\":\"(555) 369-2580\",\"email\":\"appointments@testdental.com\",\"website\":\"https://testdental.com\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "201" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 201)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    response_body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    # PostgREST returns an array even for single inserts
    if [ "$(echo "$response_body" | jq -r 'type')" = "array" ]; then
        service_payee_id=$(echo "$response_body" | jq -r '.[0].id')
        website=$(echo "$response_body" | jq -r '.[0].website')
    else
        service_payee_id=$(echo "$response_body" | jq -r '.id')
        website=$(echo "$response_body" | jq -r '.website')
    fi
    
    if [ "$service_payee_id" != "null" ] && [ -n "$service_payee_id" ]; then
        echo "    Created service payee ID: $service_payee_id"
        echo "    Website: $website"
    else
        echo "    Created service payee (ID not returned)"
        service_payee_id=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/payees?name=eq.Test%20Dr.%20Smith%20Dental&select=id" | jq -r '.[0].id')
        echo "    Found payee ID via lookup: $service_payee_id"
    fi
else
    echo -e "${RED}✗${NC} (Expected 201, got $status)"
    echo "    Response: $(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')"
fi

echo -e "\n${BLUE}📋 Test 5: POST - Test Validation Constraints${NC}"

# Test empty name
echo -n "  Testing empty name constraint... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/payees" \
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
    "$BASE_URL/payees" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Coffee Shop\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "409" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 409 - Duplicate name rejected)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 409, got $status)"
fi

# Test invalid email format
echo -n "  Testing invalid email format... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/payees" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Bad Email\",\"email\":\"invalid-email\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "400" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 400 - Invalid email format rejected)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400, got $status)"
fi

# Test invalid color format
echo -n "  Testing invalid color format... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/payees" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Bad Color\",\"color\":\"invalid\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "400" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 400 - Invalid color format rejected)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400, got $status)"
fi

# Test address too long
echo -n "  Testing address length constraint... "
long_address=$(printf 'A%.0s' {1..600})  # Create 600 character string
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/payees" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Long Address\",\"address\":\"$long_address\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "400" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 400 - Address too long rejected)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400, got $status)"
fi

echo -e "\n${BLUE}📋 Test 6: GET - Single Payee${NC}"

if [ -n "$business_payee_id" ] && [ "$business_payee_id" != "null" ]; then
    echo -n "  Getting single payee... "
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $(cat .token)" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        "$BASE_URL/payees?id=eq.$business_payee_id&select=*")

    status=$(echo "$response" | grep -o '[0-9]*$')
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" = "200" ]; then
        echo -e "${GREEN}✓${NC} (HTTP 200)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        name=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq -r '.[0].name')
        echo "    Retrieved payee: $name"
    else
        echo -e "${RED}✗${NC} (Expected 200, got $status)"
    fi
else
    echo -n "  Skipping single payee test (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
fi

echo -e "\n${BLUE}📋 Test 7: PATCH - Update Payee Contact Information${NC}"

if [ -n "$business_payee_id" ] && [ "$business_payee_id" != "null" ]; then
    echo -n "  Updating payee contact info... "
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $(cat .token)" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -X PATCH \
        "$BASE_URL/payees?id=eq.$business_payee_id" \
        -d '{"description":"Updated coffee shop description","phone":"(555) 111-2222","email":"updated@testcoffee.com","preferred_payment_method":"check"}')

    status=$(echo "$response" | grep -o '[0-9]*$')
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" = "204" ]; then
        echo -e "${GREEN}✓${NC} (HTTP 204)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} (Expected 204, got $status)"
    fi

    # Verify the update
    echo -n "  Verifying contact info update... "
    response=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/payees?id=eq.$business_payee_id&select=phone,email,preferred_payment_method")
    phone=$(echo "$response" | jq -r '.[0].phone')
    email=$(echo "$response" | jq -r '.[0].email')
    payment_method=$(echo "$response" | jq -r '.[0].preferred_payment_method')
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$phone" = "(555) 111-2222" ] && [ "$email" = "updated@testcoffee.com" ] && [ "$payment_method" = "check" ]; then
        echo -e "${GREEN}✓${NC} (Contact info updated successfully)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} (Contact info not updated correctly)"
    fi
else
    echo -n "  Skipping update test (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
    echo -n "  Skipping update verification (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
fi

echo -e "\n${BLUE}📋 Test 8: Test Payee Filtering and Queries${NC}"

echo -n "  Getting payees by type (utility)... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/payees?payee_type=eq.utility&select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    utility_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Found $utility_count utility payees"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
fi

echo -n "  Getting payees by type (business)... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/payees?payee_type=eq.business&select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    business_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Found $business_count business payees"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
fi

echo -n "  Getting active payees only... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/payees?is_active=eq.true&select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    active_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Found $active_count active payees"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
fi

echo -n "  Testing payee sorting by type and name... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/payees?budget_id=eq.$BUDGET_ID&order=payee_type.asc,name.asc&select=name,payee_type")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    sorted_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Retrieved $sorted_count payees in sorted order"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
fi

echo -e "\n${BLUE}📋 Test 9: Test Payee Type Changes${NC}"

if [ -n "$business_payee_id" ] && [ "$business_payee_id" != "null" ]; then
    echo -n "  Changing payee type from business to service... "
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $(cat .token)" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -X PATCH \
        "$BASE_URL/payees?id=eq.$business_payee_id" \
        -d '{"payee_type":"service","color":"#2196F3"}')

    status=$(echo "$response" | grep -o '[0-9]*$')
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" = "204" ]; then
        echo -e "${GREEN}✓${NC} (HTTP 204)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # Verify the type change
        echo -n "  Verifying payee type change... "
        response=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/payees?id=eq.$business_payee_id&select=payee_type,color")
        new_type=$(echo "$response" | jq -r '.[0].payee_type')
        new_color=$(echo "$response" | jq -r '.[0].color')
        TOTAL_TESTS=$((TOTAL_TESTS + 1))

        if [ "$new_type" = "service" ] && [ "$new_color" = "#2196F3" ]; then
            echo -e "${GREEN}✓${NC} (Type changed to $new_type with color $new_color)"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}✗${NC} (Type: $new_type, Color: $new_color)"
        fi
    else
        echo -e "${RED}✗${NC} (Expected 204, got $status)"
    fi
else
    echo -n "  Skipping type change test (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
    echo -n "  Skipping type change verification (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
fi

echo -e "\n${BLUE}📋 Test 10: Test Search and Advanced Queries${NC}"

echo -n "  Searching payees by name pattern... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/payees?budget_id=eq.$BUDGET_ID&name=ilike.*test*&select=name,payee_type")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    search_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Found $search_count payees matching 'test' pattern"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
fi

echo -n "  Getting payees with contact info... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/payees?budget_id=eq.$BUDGET_ID&email=not.is.null&phone=not.is.null&select=name,email,phone")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    contact_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Found $contact_count payees with both email and phone"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
fi

echo -e "\n${BLUE}📋 Test 11: Test Row Level Security (RLS)${NC}"

# Test with invalid budget_id (should be rejected by RLS)
echo -n "  Testing RLS with invalid budget_id... "
fake_budget_id="00000000-0000-0000-0000-000000000000"
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/payees" \
    -d "{\"budget_id\":\"$fake_budget_id\",\"name\":\"RLS Test Payee\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "400" ] || [ "$status" = "403" ]; then
    echo -e "${GREEN}✓${NC} (HTTP $status - RLS blocked invalid budget)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400/403, got $status)"
fi

echo -e "\n${BLUE}📋 Test 12: DELETE - Remove Test Payees${NC}"

# Delete test payees
deleted_count=0
for id in "$business_payee_id" "$utility_payee_id" "$service_payee_id"; do
    if [ -n "$id" ] && [ "$id" != "null" ]; then
        echo -n "  Deleting test payee $id... "
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -H "Authorization: Bearer $(cat .token)" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -X DELETE \
            "$BASE_URL/payees?id=eq.$id")

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
    echo -n "  No test payees to delete (IDs not available)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
fi

echo -e "\n${BLUE}📊 Test Results Summary${NC}"
echo "=============================="

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}✅ All tests passed: $PASSED_TESTS/$TOTAL_TESTS${NC}"
    echo -e "${GREEN}✅ Payees PostgREST API working correctly!${NC}"
    echo -e "${GREEN}✅ CRUD operations validated${NC}"
    echo -e "${GREEN}✅ Database constraints enforced${NC}"
    echo -e "${GREEN}✅ RLS policies working${NC}"
    echo -e "${GREEN}✅ Payee types and contact info working${NC}"
    echo -e "${GREEN}✅ Search and filtering working${NC}"
    echo ""
    echo -e "${GREEN}🎉 Payees API ready for use!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed: $PASSED_TESTS/$TOTAL_TESTS passed${NC}"
    echo -e "${YELLOW}⚠️  Please review failed tests${NC}"
    exit 1
fi