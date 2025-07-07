#!/bin/bash

# Quick Performance Test - Test current APIs with realistic timing
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

API_BASE_URL="https://api.nvlp.app"
EDGE_FUNCTION_URL="https://qnpatlosomopoimtsmsr.supabase.co/functions/v1"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8"

if [ ! -f ".token" ]; then
    echo -e "${RED}❌ No token file found. Run ./scripts/login-and-save-token.sh first${NC}"
    exit 1
fi

ACCESS_TOKEN=$(cat .token)

# Get budget ID
BUDGET_RESPONSE=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
                       -H "apikey: $ANON_KEY" \
                       "$API_BASE_URL/budgets?select=id&is_default=eq.true&limit=1")
BUDGET_ID=$(echo "$BUDGET_RESPONSE" | jq -r '.[0].id // empty')

performance_test() {
    local name="$1"
    local url="$2"
    echo -ne "${CYAN}Testing $name${NC} ... "
    
    start_time=$(date +%s%3N 2>/dev/null || echo $(($(date +%s) * 1000)))
    response=$(curl -s -w "%{http_code}" \
                   -H "Authorization: Bearer $ACCESS_TOKEN" \
                   -H "apikey: $ANON_KEY" \
                   "$url" 2>/dev/null)
    end_time=$(date +%s%3N 2>/dev/null || echo $(($(date +%s) * 1000)))
    
    duration=$((end_time - start_time))
    status_code="${response: -3}"
    
    if [ "$status_code" = "200" ]; then
        if [ "$duration" -lt 500 ]; then
            echo -e "${GREEN}✅ ${duration}ms (FAST)${NC}"
        elif [ "$duration" -lt 2000 ]; then
            echo -e "${YELLOW}⚠️  ${duration}ms (OK)${NC}"
        else
            echo -e "${RED}❌ ${duration}ms (SLOW)${NC}"
        fi
    else
        echo -e "${RED}❌ Error $status_code (${duration}ms)${NC}"
    fi
}

echo -e "${BOLD}🚀 Quick Performance Test${NC}"
echo "========================"
echo "Budget ID: $BUDGET_ID"

# Test core PostgREST endpoints
echo -e "\n${BOLD}📊 PostgREST Endpoints${NC}"
performance_test "User Profiles" "$API_BASE_URL/user_profiles"
performance_test "Budgets" "$API_BASE_URL/budgets"
performance_test "Categories" "$API_BASE_URL/categories?budget_id=eq.$BUDGET_ID"
performance_test "Envelopes" "$API_BASE_URL/envelopes?budget_id=eq.$BUDGET_ID"
performance_test "Payees" "$API_BASE_URL/payees?budget_id=eq.$BUDGET_ID"
performance_test "Income Sources" "$API_BASE_URL/income_sources?budget_id=eq.$BUDGET_ID"

# Test Edge Function endpoints
echo -e "\n${BOLD}⚡ Edge Function Endpoints${NC}"
performance_test "Dashboard" "$EDGE_FUNCTION_URL/dashboard?budget_id=$BUDGET_ID"
performance_test "Transactions" "$EDGE_FUNCTION_URL/transactions?budget_id=$BUDGET_ID&limit=10"
performance_test "Reports" "$EDGE_FUNCTION_URL/reports/transactions?budget_id=$BUDGET_ID&limit=10"
performance_test "Notifications" "$EDGE_FUNCTION_URL/notifications?budget_id=$BUDGET_ID"

echo -e "\n${BOLD}✅ Performance test completed!${NC}"