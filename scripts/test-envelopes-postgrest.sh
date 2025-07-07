#!/bin/bash

# Test script for Envelopes PostgREST API endpoints
# Tests CRUD operations, constraints, and RLS policies

set -e

echo "🔍 Testing Envelopes PostgREST API"
echo "================================="

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

echo -e "\n${BLUE}🧹 Cleanup: Remove any existing test envelopes${NC}"
# Clean up any test envelopes
response=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/envelopes?select=*" 2>/dev/null)
if [ $? -eq 0 ]; then
    test_ids=$(echo "$response" | jq -r '.[] | select(.name | startswith("Test")) | .id' | tr '\n' ' ')
    for id in $test_ids; do
        if [ -n "$id" ] && [ "$id" != "null" ]; then
            curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" -X DELETE "$BASE_URL/envelopes?id=eq.$id" > /dev/null
            echo "  Cleaned up test envelope: $id"
        fi
    done
fi

echo -e "\n${BLUE}📋 Test 1: GET - List Default Envelopes${NC}"

echo -n "  Getting all envelopes... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/envelopes?select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    # Check for default envelopes
    count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Found $count envelopes"
    echo "    Should include defaults: Emergency Fund, Groceries, Transportation, etc."
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
    echo "    Response: $(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')"
fi

echo -e "\n${BLUE}📋 Test 2: POST - Create New Envelope with Target${NC}"

echo -n "  Creating test envelope with target amount... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -X POST \
    "$BASE_URL/envelopes" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Vacation Fund\",\"description\":\"Saving for annual vacation\",\"color\":\"#2196F3\",\"icon\":\"vacation\",\"target_amount\":2500.00,\"sort_order\":10}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "201" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 201)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    response_body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    # PostgREST returns an array even for single inserts
    if [ "$(echo "$response_body" | jq -r 'type')" = "array" ]; then
        envelope_id=$(echo "$response_body" | jq -r '.[0].id')
        target_amount=$(echo "$response_body" | jq -r '.[0].target_amount')
        current_balance=$(echo "$response_body" | jq -r '.[0].current_balance')
    else
        envelope_id=$(echo "$response_body" | jq -r '.id')
        target_amount=$(echo "$response_body" | jq -r '.target_amount')
        current_balance=$(echo "$response_body" | jq -r '.current_balance')
    fi
    
    if [ "$envelope_id" != "null" ] && [ -n "$envelope_id" ]; then
        echo "    Created envelope ID: $envelope_id"
        echo "    Target: \$$target_amount, Balance: \$$current_balance"
    else
        echo "    Created envelope (ID not returned in response)"
        # Get the most recent envelope as fallback
        envelope_id=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/envelopes?name=eq.Test%20Vacation%20Fund&select=id" | jq -r '.[0].id')
        echo "    Found envelope ID via lookup: $envelope_id"
    fi
else
    echo -e "${RED}✗${NC} (Expected 201, got $status)"
    echo "    Response: $(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')"
fi

echo -e "\n${BLUE}📋 Test 3: POST - Create Envelope with Amount Notification${NC}"

echo -n "  Creating envelope with amount notification... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -X POST \
    "$BASE_URL/envelopes" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Car Maintenance\",\"description\":\"Emergency car repairs\",\"target_amount\":500.00,\"should_notify\":true,\"notify_amount\":400.00}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "201" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 201)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    response_body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    # PostgREST returns an array even for single inserts
    if [ "$(echo "$response_body" | jq -r 'type')" = "array" ]; then
        notification_envelope_id=$(echo "$response_body" | jq -r '.[0].id')
        should_notify=$(echo "$response_body" | jq -r '.[0].should_notify')
        notify_amount=$(echo "$response_body" | jq -r '.[0].notify_amount')
    else
        notification_envelope_id=$(echo "$response_body" | jq -r '.id')
        should_notify=$(echo "$response_body" | jq -r '.should_notify')
        notify_amount=$(echo "$response_body" | jq -r '.notify_amount')
    fi
    
    if [ "$notification_envelope_id" != "null" ] && [ -n "$notification_envelope_id" ]; then
        echo "    Created envelope with notification: $notification_envelope_id"
        echo "    Notify enabled: $should_notify, Notify at: \$$notify_amount"
    else
        echo "    Created envelope with notification (ID not returned)"
        notification_envelope_id=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/envelopes?name=eq.Test%20Car%20Maintenance&select=id" | jq -r '.[0].id')
        echo "    Found envelope ID via lookup: $notification_envelope_id"
    fi
else
    echo -e "${RED}✗${NC} (Expected 201, got $status)"
    echo "    Response: $(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')"
fi

echo -e "\n${BLUE}📋 Test 4: POST - Create Envelope with Date Notification${NC}"

echo -n "  Creating envelope with date notification... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -X POST \
    "$BASE_URL/envelopes" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Holiday Gifts\",\"description\":\"Christmas gift budget\",\"target_amount\":800.00,\"should_notify\":true,\"notify_date\":\"2025-12-01\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "201" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 201)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    response_body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    # PostgREST returns an array even for single inserts
    if [ "$(echo "$response_body" | jq -r 'type')" = "array" ]; then
        date_envelope_id=$(echo "$response_body" | jq -r '.[0].id')
        notify_date=$(echo "$response_body" | jq -r '.[0].notify_date')
    else
        date_envelope_id=$(echo "$response_body" | jq -r '.id')
        notify_date=$(echo "$response_body" | jq -r '.notify_date')
    fi
    
    if [ "$date_envelope_id" != "null" ] && [ -n "$date_envelope_id" ]; then
        echo "    Created envelope with date notification: $date_envelope_id"
        echo "    Notify date: $notify_date"
    else
        echo "    Created envelope with date notification (ID not returned)"
        date_envelope_id=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/envelopes?name=eq.Test%20Holiday%20Gifts&select=id" | jq -r '.[0].id')
        echo "    Found envelope ID via lookup: $date_envelope_id"
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
    "$BASE_URL/envelopes" \
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
    "$BASE_URL/envelopes" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Vacation Fund\"}")

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
    "$BASE_URL/envelopes" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Bad Color\",\"color\":\"invalid\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "400" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 400 - Invalid color format rejected)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400, got $status)"
fi

# Test negative target amount
echo -n "  Testing negative target amount... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/envelopes" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Negative Target\",\"target_amount\":-100}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "400" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 400 - Negative target amount rejected)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400, got $status)"
fi

# Test notification logic constraint
echo -n "  Testing notification logic constraint... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/envelopes" \
    -d "{\"budget_id\":\"$BUDGET_ID\",\"name\":\"Test Bad Notification\",\"should_notify\":true}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "400" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 400 - Notification without date/amount rejected)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400, got $status)"
fi

echo -e "\n${BLUE}📋 Test 6: GET - Single Envelope${NC}"

if [ -n "$envelope_id" ] && [ "$envelope_id" != "null" ]; then
    echo -n "  Getting single envelope... "
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $(cat .token)" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        "$BASE_URL/envelopes?id=eq.$envelope_id&select=*")

    status=$(echo "$response" | grep -o '[0-9]*$')
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" = "200" ]; then
        echo -e "${GREEN}✓${NC} (HTTP 200)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        name=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq -r '.[0].name')
        echo "    Retrieved envelope: $name"
    else
        echo -e "${RED}✗${NC} (Expected 200, got $status)"
    fi
else
    echo -n "  Skipping single envelope test (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
fi

echo -e "\n${BLUE}📋 Test 7: PATCH - Update Envelope${NC}"

if [ -n "$envelope_id" ] && [ "$envelope_id" != "null" ]; then
    echo -n "  Updating envelope target and description... "
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $(cat .token)" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -X PATCH \
        "$BASE_URL/envelopes?id=eq.$envelope_id" \
        -d '{"target_amount":3000.00,"description":"Updated vacation fund","color":"#FF5722","sort_order":5}')

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
    response=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/envelopes?id=eq.$envelope_id&select=target_amount,color,sort_order")
    target_amount=$(echo "$response" | jq -r '.[0].target_amount')
    color=$(echo "$response" | jq -r '.[0].color')
    sort_order=$(echo "$response" | jq -r '.[0].sort_order')
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$target_amount" = "3000.00" ] && [ "$color" = "#FF5722" ] && [ "$sort_order" = "5" ]; then
        echo -e "${GREEN}✓${NC} (Target: \$$target_amount, Color: $color, Sort: $sort_order)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} (Target: \$$target_amount, Color: $color, Sort: $sort_order)"
    fi
else
    echo -n "  Skipping update test (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
    echo -n "  Skipping update verification (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
fi

echo -e "\n${BLUE}📋 Test 8: Test Envelope Filtering and Queries${NC}"

echo -n "  Getting active envelopes only... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/envelopes?is_active=eq.true&select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    active_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Found $active_count active envelopes"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
fi

echo -n "  Getting envelopes with notifications... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/envelopes?should_notify=eq.true&select=*")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    notify_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Found $notify_count envelopes with notifications"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
fi

echo -n "  Getting envelopes with target amounts... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/envelopes?target_amount=not.is.null&select=name,current_balance,target_amount")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    target_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Found $target_count envelopes with target amounts"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
fi

echo -n "  Testing envelope sorting by sort_order... "
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$BASE_URL/envelopes?budget_id=eq.$BUDGET_ID&order=sort_order.asc&select=name,sort_order")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓${NC} (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    sorted_count=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | jq '. | length')
    echo "    Retrieved $sorted_count envelopes in sorted order"
else
    echo -e "${RED}✗${NC} (Expected 200, got $status)"
fi

echo -e "\n${BLUE}📋 Test 9: Test Notification Updates${NC}"

if [ -n "$envelope_id" ] && [ "$envelope_id" != "null" ]; then
    echo -n "  Adding notification to existing envelope... "
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $(cat .token)" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -X PATCH \
        "$BASE_URL/envelopes?id=eq.$envelope_id" \
        -d '{"should_notify":true,"notify_amount":2500.00,"notify_date":"2025-12-31"}')

    status=$(echo "$response" | grep -o '[0-9]*$')
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" = "204" ]; then
        echo -e "${GREEN}✓${NC} (HTTP 204)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # Verify notification was added
        echo -n "  Verifying notification settings... "
        response=$(curl -s -H "Authorization: Bearer $(cat .token)" -H "apikey: $SUPABASE_ANON_KEY" "$BASE_URL/envelopes?id=eq.$envelope_id&select=should_notify,notify_amount,notify_date")
        should_notify=$(echo "$response" | jq -r '.[0].should_notify')
        notify_amount=$(echo "$response" | jq -r '.[0].notify_amount')
        notify_date=$(echo "$response" | jq -r '.[0].notify_date')
        TOTAL_TESTS=$((TOTAL_TESTS + 1))

        if [ "$should_notify" = "true" ] && [ "$notify_amount" = "2500.00" ] && [ "$notify_date" = "2025-12-31" ]; then
            echo -e "${GREEN}✓${NC} (Notifications enabled with amount and date)"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}✗${NC} (Notification settings incorrect)"
        fi
    else
        echo -e "${RED}✗${NC} (Expected 204, got $status)"
    fi

    # Test disabling notifications
    echo -n "  Disabling notifications... "
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $(cat .token)" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -X PATCH \
        "$BASE_URL/envelopes?id=eq.$envelope_id" \
        -d '{"should_notify":false,"notify_amount":null,"notify_date":null}')

    status=$(echo "$response" | grep -o '[0-9]*$')
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" = "204" ]; then
        echo -e "${GREEN}✓${NC} (HTTP 204 - Notifications disabled)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} (Expected 204, got $status)"
    fi
else
    echo -n "  Skipping notification tests (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
    echo -n "  Skipping notification verification (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
    echo -n "  Skipping disable notification test (no valid ID)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
fi

echo -e "\n${BLUE}📋 Test 10: Test Row Level Security (RLS)${NC}"

# Test with invalid budget_id (should be rejected by RLS)
echo -n "  Testing RLS with invalid budget_id... "
fake_budget_id="00000000-0000-0000-0000-000000000000"
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $(cat .token)" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/envelopes" \
    -d "{\"budget_id\":\"$fake_budget_id\",\"name\":\"RLS Test Envelope\"}")

status=$(echo "$response" | grep -o '[0-9]*$')
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if [ "$status" = "400" ] || [ "$status" = "403" ]; then
    echo -e "${GREEN}✓${NC} (HTTP $status - RLS blocked invalid budget)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} (Expected 400/403, got $status)"
fi

echo -e "\n${BLUE}📋 Test 11: DELETE - Remove Test Envelopes${NC}"

# Delete test envelopes
deleted_count=0
for id in "$envelope_id" "$notification_envelope_id" "$date_envelope_id"; do
    if [ -n "$id" ] && [ "$id" != "null" ]; then
        echo -n "  Deleting test envelope $id... "
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -H "Authorization: Bearer $(cat .token)" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -X DELETE \
            "$BASE_URL/envelopes?id=eq.$id")

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
    echo -n "  No test envelopes to delete (IDs not available)... "
    echo -e "${YELLOW}⚠️${NC} (Skipped)"
fi

echo -e "\n${BLUE}📊 Test Results Summary${NC}"
echo "================================="

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}✅ All tests passed: $PASSED_TESTS/$TOTAL_TESTS${NC}"
    echo -e "${GREEN}✅ Envelopes PostgREST API working correctly!${NC}"
    echo -e "${GREEN}✅ CRUD operations validated${NC}"
    echo -e "${GREEN}✅ Database constraints enforced${NC}"
    echo -e "${GREEN}✅ RLS policies working${NC}"
    echo -e "${GREEN}✅ Notification features working${NC}"
    echo -e "${GREEN}✅ Target amounts and filtering working${NC}"
    echo ""
    echo -e "${GREEN}🎉 Envelopes API ready for use!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed: $PASSED_TESTS/$TOTAL_TESTS passed${NC}"
    echo -e "${YELLOW}⚠️  Please review failed tests${NC}"
    exit 1
fi