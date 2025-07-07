#!/bin/bash

# Working Performance Test for NVLP APIs
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

API_BASE_URL="https://qnpatlosomopoimtsmsr.supabase.co/rest/v1"
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

# Function to test API performance using curl's built-in timing
test_api_performance() {
    local name="$1"
    local url="$2"
    
    echo -ne "${CYAN}Testing $name${NC} ... "
    
    # Use curl's time_total measurement
    result=$(curl -s -w "TIME:%{time_total}|HTTP:%{http_code}" -o /dev/null \
                 -H "Authorization: Bearer $ACCESS_TOKEN" \
                 -H "apikey: $ANON_KEY" \
                 "$url" 2>/dev/null)
    
    # Extract time and status
    time_seconds=$(echo "$result" | sed 's/.*TIME:\([^|]*\).*/\1/')
    http_code=$(echo "$result" | sed 's/.*HTTP:\([0-9]*\).*/\1/')
    
    # Convert to milliseconds (using bc for decimal handling)
    time_ms=$(echo "$time_seconds * 1000" | bc | cut -d. -f1)
    
    # Classify performance
    if [ "$http_code" = "200" ]; then
        if [ "$time_ms" -lt 200 ]; then
            echo -e "${GREEN}✅ ${time_ms}ms (FAST)${NC}"
            return 0
        elif [ "$time_ms" -lt 1000 ]; then
            echo -e "${YELLOW}⚠️  ${time_ms}ms (OK)${NC}"
            return 1
        else
            echo -e "${RED}❌ ${time_ms}ms (SLOW)${NC}"
            return 2
        fi
    else
        echo -e "${RED}❌ Error $http_code (${time_ms}ms)${NC}"
        return 3
    fi
}

# Performance counters
TOTAL_TESTS=0
FAST_TESTS=0
OK_TESTS=0
SLOW_TESTS=0
ERROR_TESTS=0

run_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    test_api_performance "$1" "$2"
    case $? in
        0) FAST_TESTS=$((FAST_TESTS + 1)) ;;
        1) OK_TESTS=$((OK_TESTS + 1)) ;;
        2) SLOW_TESTS=$((SLOW_TESTS + 1)) ;;
        3) ERROR_TESTS=$((ERROR_TESTS + 1)) ;;
    esac
}

echo -e "${BOLD}🚀 NVLP API Performance Test${NC}"
echo "========================"
echo "Budget ID: $BUDGET_ID"
echo "Started: $(date)"

# Test core PostgREST endpoints
echo -e "\n${BOLD}📊 PostgREST Direct Endpoints${NC}"
run_test "User Profiles" "$API_BASE_URL/user_profiles"
run_test "Budgets List" "$API_BASE_URL/budgets"
run_test "Categories" "$API_BASE_URL/categories?budget_id=eq.$BUDGET_ID"
run_test "Envelopes" "$API_BASE_URL/envelopes?budget_id=eq.$BUDGET_ID"
run_test "Payees" "$API_BASE_URL/payees?budget_id=eq.$BUDGET_ID"
run_test "Income Sources" "$API_BASE_URL/income_sources?budget_id=eq.$BUDGET_ID"

# Test with pagination and filtering
echo -e "\n${BOLD}🔍 PostgREST with Filters${NC}"
run_test "Categories (limit 10)" "$API_BASE_URL/categories?budget_id=eq.$BUDGET_ID&limit=10"
run_test "Envelopes (with select)" "$API_BASE_URL/envelopes?budget_id=eq.$BUDGET_ID&select=id,name,current_balance"
run_test "Payees (ordered)" "$API_BASE_URL/payees?budget_id=eq.$BUDGET_ID&order=name.asc&limit=20"

# Test Edge Function endpoints
echo -e "\n${BOLD}⚡ Edge Function Endpoints${NC}"
run_test "Dashboard API" "$EDGE_FUNCTION_URL/dashboard?budget_id=$BUDGET_ID"
run_test "Transactions List" "$EDGE_FUNCTION_URL/transactions?budget_id=$BUDGET_ID&limit=10"
run_test "Transaction Reports" "$EDGE_FUNCTION_URL/reports/transactions?budget_id=$BUDGET_ID&limit=10"
run_test "Notifications" "$EDGE_FUNCTION_URL/notifications?budget_id=$BUDGET_ID"
run_test "Audit Events" "$EDGE_FUNCTION_URL/audit/events?budget_id=$BUDGET_ID&limit=10"

# Test complex operations
echo -e "\n${BOLD}🔄 Complex Operations${NC}"
run_test "Category Trends Report" "$EDGE_FUNCTION_URL/reports/category-trends?budget_id=$BUDGET_ID"
run_test "Income vs Expense Report" "$EDGE_FUNCTION_URL/reports/income-expense?budget_id=$BUDGET_ID"
run_test "Export Transactions (CSV)" "$EDGE_FUNCTION_URL/export/transactions?budget_id=$BUDGET_ID&format=csv&limit=20"

# Performance Summary
echo -e "\n${BOLD}📈 Performance Summary${NC}"
echo "======================"
echo -e "Total Tests: ${BOLD}$TOTAL_TESTS${NC}"
echo -e "Fast (<200ms): ${GREEN}$FAST_TESTS${NC}"
echo -e "OK (200-1000ms): ${YELLOW}$OK_TESTS${NC}"
echo -e "Slow (>1000ms): ${RED}$SLOW_TESTS${NC}"
echo -e "Errors: ${RED}$ERROR_TESTS${NC}"
echo ""

# Calculate percentages
fast_pct=$((FAST_TESTS * 100 / TOTAL_TESTS))
ok_pct=$((OK_TESTS * 100 / TOTAL_TESTS))
slow_pct=$((SLOW_TESTS * 100 / TOTAL_TESTS))

echo -e "Performance Distribution:"
echo -e "  Fast: ${fast_pct}%"
echo -e "  OK: ${ok_pct}%"
echo -e "  Slow: ${slow_pct}%"

# Overall assessment
if [ "$fast_pct" -gt 70 ]; then
    echo -e "\n${GREEN}🚀 Excellent performance! Most endpoints are fast.${NC}"
elif [ "$((fast_pct + ok_pct))" -gt 80 ]; then
    echo -e "\n${YELLOW}👍 Good performance. Some room for optimization.${NC}"
else
    echo -e "\n${RED}⚠️  Performance needs attention. Consider optimization.${NC}"
fi

# Recommendations
if [ "$SLOW_TESTS" -gt 0 ]; then
    echo -e "\n${YELLOW}💡 Performance Recommendations:${NC}"
    echo "  - Review slow endpoints for optimization opportunities"
    echo "  - Consider database indexing for complex queries"
    echo "  - Monitor Edge Function cold starts"
    echo "  - Implement caching for frequently accessed data"
fi

echo -e "\n${BOLD}✅ Performance test completed!${NC}"
echo "Completed: $(date)"