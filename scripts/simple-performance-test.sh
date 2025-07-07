#!/bin/bash

# Simple Performance Test for NVLP APIs
# Tests key endpoints with timing measurements

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
API_BASE_URL="https://api.nvlp.app"
EDGE_FUNCTION_URL="https://qnpatlosomopoimtsmsr.supabase.co/functions/v1"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8"
TEST_EMAIL="larryjrutledge@gmail.com"
TEST_PASSWORD="Test1234!"

# Performance counters
TOTAL_TESTS=0
FAST_TESTS=0
SLOW_TESTS=0

test_endpoint() {
    local description="$1"
    local url="$2"
    local method="${3:-GET}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -ne "${CYAN}Testing: $description${NC} ... "
    
    # Use curl's time measurement
    if [ "$method" = "GET" ]; then
        time_total=$(curl -s -w "%{time_total}" -o /dev/null \
                         -H "Authorization: Bearer $ACCESS_TOKEN" \
                         -H "apikey: $ANON_KEY" \
                         "$url")
    fi
    
    # Convert to milliseconds
    duration_ms=$(echo "$time_total * 1000" | bc | cut -d. -f1)
    
    if [ "$duration_ms" -lt 500 ]; then
        FAST_TESTS=$((FAST_TESTS + 1))
        echo -e "${GREEN}✅ ${duration_ms}ms (FAST)${NC}"
    else
        SLOW_TESTS=$((SLOW_TESTS + 1))
        echo -e "${YELLOW}⚠️  ${duration_ms}ms (SLOW)${NC}"
    fi
}

echo -e "${BOLD}🔬 NVLP API Simple Performance Test${NC}"
echo "=================================="

# Step 1: Login
echo -e "\n${BOLD}🔑 Authentication${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$EDGE_FUNCTION_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.session.access_token // .access_token // empty')

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Authentication failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Authentication successful${NC}"

# Get budget ID
BUDGET_RESPONSE=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
                       -H "apikey: $ANON_KEY" \
                       "$API_BASE_URL/budgets?select=id&is_default=eq.true&limit=1")

BUDGET_ID=$(echo "$BUDGET_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$BUDGET_ID" ]; then
    echo -e "${RED}❌ Could not get budget ID${NC}"
    exit 1
fi

echo "Using budget ID: $BUDGET_ID"

# Step 2: Test key endpoints
echo -e "\n${BOLD}📊 Testing Key Endpoints${NC}"

# PostgREST endpoints
test_endpoint "User Profile" "$API_BASE_URL/user_profiles"
test_endpoint "Budgets List" "$API_BASE_URL/budgets"
test_endpoint "Categories (limit 50)" "$API_BASE_URL/categories?budget_id=eq.$BUDGET_ID&limit=50"
test_endpoint "Envelopes (limit 50)" "$API_BASE_URL/envelopes?budget_id=eq.$BUDGET_ID&limit=50"
test_endpoint "Payees (limit 50)" "$API_BASE_URL/payees?budget_id=eq.$BUDGET_ID&limit=50"
test_endpoint "Income Sources" "$API_BASE_URL/income_sources?budget_id=eq.$BUDGET_ID"

# Edge Function endpoints
test_endpoint "Dashboard API" "$EDGE_FUNCTION_URL/dashboard?budget_id=$BUDGET_ID"
test_endpoint "Transactions API" "$EDGE_FUNCTION_URL/transactions?budget_id=$BUDGET_ID&limit=20"
test_endpoint "Reports - Transactions" "$EDGE_FUNCTION_URL/reports/transactions?budget_id=$BUDGET_ID&limit=20"
test_endpoint "Notifications API" "$EDGE_FUNCTION_URL/notifications?budget_id=$BUDGET_ID"

# Step 3: Summary
echo -e "\n${BOLD}📈 Performance Summary${NC}"
echo "======================"
echo -e "Total tests: ${BOLD}$TOTAL_TESTS${NC}"
echo -e "Fast (<500ms): ${GREEN}$FAST_TESTS${NC}"
echo -e "Slow (≥500ms): ${YELLOW}$SLOW_TESTS${NC}"

if [ "$FAST_TESTS" -gt "$SLOW_TESTS" ]; then
    echo -e "\n${GREEN}🚀 Overall performance: GOOD${NC}"
else
    echo -e "\n${YELLOW}⚠️  Overall performance: NEEDS ATTENTION${NC}"
fi

echo -e "\n${BOLD}✅ Performance test completed!${NC}"