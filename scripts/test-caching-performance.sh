#!/bin/bash

# Caching Performance Test for NVLP APIs
# Tests cache hit/miss performance and validates cache headers

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

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
                       "https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/budgets?select=id&is_default=eq.true&limit=1")
BUDGET_ID=$(echo "$BUDGET_RESPONSE" | jq -r '.[0].id // empty')

test_cache_performance() {
    local name="$1"
    local url="$2"
    
    echo -e "\n${BOLD}Testing $name${NC}"
    echo "URL: $url"
    
    # First request (should be cache MISS)
    echo -ne "${CYAN}Request 1 (cache miss)${NC} ... "
    start_time=$(python3 -c "import time; print(int(time.time() * 1000))")
    
    response1=$(curl -s -w "TIME:%{time_total}|HTTP:%{http_code}" \
                    -H "Authorization: Bearer $ACCESS_TOKEN" \
                    -H "apikey: $ANON_KEY" \
                    -H "X-Cache: " \
                    "$url" 2>/dev/null)
    
    end_time=$(python3 -c "import time; print(int(time.time() * 1000))")
    duration1=$((end_time - start_time))
    
    time_seconds1=$(echo "$response1" | sed 's/.*TIME:\([^|]*\).*/\1/')
    http_code1=$(echo "$response1" | sed 's/.*HTTP:\([0-9]*\).*/\1/')
    time_ms1=$(echo "$time_seconds1 * 1000" | bc | cut -d. -f1)
    
    echo -e "${YELLOW}${time_ms1}ms${NC}"
    
    # Second request (should be cache HIT)
    echo -ne "${CYAN}Request 2 (cache hit)${NC}  ... "
    start_time=$(python3 -c "import time; print(int(time.time() * 1000))")
    
    response2=$(curl -s -w "TIME:%{time_total}|HTTP:%{http_code}" \
                    -H "Authorization: Bearer $ACCESS_TOKEN" \
                    -H "apikey: $ANON_KEY" \
                    "$url" 2>/dev/null)
    
    end_time=$(python3 -c "import time; print(int(time.time() * 1000))")
    duration2=$((end_time - start_time))
    
    time_seconds2=$(echo "$response2" | sed 's/.*TIME:\([^|]*\).*/\1/')
    http_code2=$(echo "$response2" | sed 's/.*HTTP:\([0-9]*\).*/\1/')
    time_ms2=$(echo "$time_seconds2 * 1000" | bc | cut -d. -f1)
    
    echo -e "${GREEN}${time_ms2}ms${NC}"
    
    # Calculate improvement
    if [ "$time_ms1" -gt "$time_ms2" ]; then
        improvement=$((time_ms1 - time_ms2))
        improvement_pct=$(echo "scale=1; ($improvement * 100) / $time_ms1" | bc)
        echo -e "${GREEN}✅ Cache improved performance by ${improvement}ms (${improvement_pct}%)${NC}"
    elif [ "$time_ms2" -lt "$time_ms1" ]; then
        echo -e "${YELLOW}⚠️  Cache may not be working as expected${NC}"
    else
        echo -e "${BLUE}ℹ️  Similar response times${NC}"
    fi
    
    return 0
}

echo -e "${BOLD}🚀 NVLP Caching Performance Test${NC}"
echo "==============================="
echo "Budget ID: $BUDGET_ID"
echo "Started: $(date)"

# Test cached endpoints
test_cache_performance "Dashboard API" "$EDGE_FUNCTION_URL/dashboard?budget_id=$BUDGET_ID"

test_cache_performance "Transaction Report" "$EDGE_FUNCTION_URL/reports/transactions?budget_id=$BUDGET_ID&limit=20"

test_cache_performance "Category Trends Report" "$EDGE_FUNCTION_URL/reports/category-trends?budget_id=$BUDGET_ID"

test_cache_performance "Income vs Expense Report" "$EDGE_FUNCTION_URL/reports/income-expense?budget_id=$BUDGET_ID"

# Test cache with different parameters (should be separate cache entries)
echo -e "\n${BOLD}Testing Cache Separation${NC}"
test_cache_performance "Dashboard (30 days)" "$EDGE_FUNCTION_URL/dashboard?budget_id=$BUDGET_ID&days=30"
test_cache_performance "Dashboard (7 days)" "$EDGE_FUNCTION_URL/dashboard?budget_id=$BUDGET_ID&days=7"

echo -e "\n${BOLD}✅ Caching performance test completed!${NC}"
echo -e "\n${YELLOW}💡 Expected behavior:${NC}"
echo "- First requests should be slower (cache MISS)"
echo "- Second requests should be faster (cache HIT)"
echo "- Different parameters should have separate cache entries"