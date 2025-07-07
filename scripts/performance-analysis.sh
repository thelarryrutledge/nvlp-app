#!/bin/bash

# Performance Analysis Script - Create larger datasets and measure performance
# This script creates test data and measures API performance under load

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

# Get existing token
if [ ! -f ".token" ]; then
    echo -e "${RED}❌ No token file found. Run ./scripts/login-and-save-token.sh first${NC}"
    exit 1
fi

ACCESS_TOKEN=$(cat .token)

# Get budget ID
echo -e "${BLUE}🔍 Getting budget information...${NC}"
BUDGET_RESPONSE=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
                       -H "apikey: $ANON_KEY" \
                       "$API_BASE_URL/budgets?select=id&is_default=eq.true&limit=1")

BUDGET_ID=$(echo "$BUDGET_RESPONSE" | jq -r '.[0].id // empty')
USER_ID=$(echo "$ACCESS_TOKEN" | jq -R 'split(".") | .[1] | @base64d | fromjson | .sub')

if [ -z "$BUDGET_ID" ]; then
    echo -e "${RED}❌ Could not get budget ID${NC}"
    exit 1
fi

echo "Budget ID: $BUDGET_ID"
echo "User ID: $USER_ID"

# Function to measure API performance
measure_api_performance() {
    local description="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="${4:-}"
    
    echo -ne "${CYAN}$description${NC} ... "
    
    # Measure time using curl's built-in timing
    if [ "$method" = "GET" ]; then
        result=$(curl -s -w "time_total:%{time_total}|http_code:%{http_code}" \
                     -H "Authorization: Bearer $ACCESS_TOKEN" \
                     -H "apikey: $ANON_KEY" \
                     "$url")
    elif [ "$method" = "POST" ]; then
        result=$(curl -s -w "time_total:%{time_total}|http_code:%{http_code}" \
                     -X POST \
                     -H "Authorization: Bearer $ACCESS_TOKEN" \
                     -H "apikey: $ANON_KEY" \
                     -H "Content-Type: application/json" \
                     -d "$data" \
                     "$url")
    fi
    
    # Extract timing and status
    time_total=$(echo "$result" | grep -o 'time_total:[^|]*' | cut -d: -f2)
    http_code=$(echo "$result" | grep -o 'http_code:[^|]*' | cut -d: -f2)
    
    # Convert to milliseconds
    time_ms=$(echo "$time_total * 1000" | bc | cut -d. -f1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        if [ "$time_ms" -lt 200 ]; then
            echo -e "${GREEN}✅ ${time_ms}ms (FAST)${NC}"
        elif [ "$time_ms" -lt 1000 ]; then
            echo -e "${YELLOW}⚠️  ${time_ms}ms (OK)${NC}"
        else
            echo -e "${RED}❌ ${time_ms}ms (SLOW)${NC}"
        fi
    else
        echo -e "${RED}❌ ${time_ms}ms (ERROR: $http_code)${NC}"
    fi
}

# Function to create test data
create_test_data() {
    local count="$1"
    local type="$2"
    
    echo -e "\n${BOLD}📊 Creating $count test $type...${NC}"
    
    for i in $(seq 1 $count); do
        case $type in
            "categories")
                data="{\"budget_id\":\"$BUDGET_ID\",\"user_id\":$USER_ID,\"name\":\"Perf Test Category $i\",\"description\":\"Performance test category $i\",\"category_type\":\"expense\"}"
                url="$API_BASE_URL/categories"
                ;;
            "envelopes")
                data="{\"budget_id\":\"$BUDGET_ID\",\"user_id\":$USER_ID,\"name\":\"Perf Test Envelope $i\",\"description\":\"Performance test envelope $i\",\"target_amount\":$(($i * 100))}"
                url="$API_BASE_URL/envelopes"
                ;;
            "payees")
                data="{\"budget_id\":\"$BUDGET_ID\",\"user_id\":$USER_ID,\"name\":\"Perf Test Payee $i\",\"description\":\"Performance test payee $i\",\"payee_type\":\"business\"}"
                url="$API_BASE_URL/payees"
                ;;
            "income_sources")
                data="{\"budget_id\":\"$BUDGET_ID\",\"user_id\":$USER_ID,\"name\":\"Perf Test Income $i\",\"description\":\"Performance test income $i\",\"expected_monthly_amount\":$(($i * 500))}"
                url="$API_BASE_URL/income_sources"
                ;;
        esac
        
        if [ $((i % 10)) -eq 0 ]; then
            echo -ne "${CYAN}Created $i/$count $type${NC}\r"
        fi
        
        curl -s -X POST \
             -H "Authorization: Bearer $ACCESS_TOKEN" \
             -H "apikey: $ANON_KEY" \
             -H "Content-Type: application/json" \
             -d "$data" \
             "$url" > /dev/null
    done
    echo -e "\n${GREEN}✅ Created $count $type${NC}"
}

# Function to test performance with different dataset sizes
test_performance_with_size() {
    local entity_type="$1"
    local current_count="$2"
    
    echo -e "\n${BOLD}📈 Testing $entity_type performance (current count: $current_count)${NC}"
    
    # Test with current data
    measure_api_performance "Get all $entity_type" "$API_BASE_URL/$entity_type?budget_id=eq.$BUDGET_ID"
    measure_api_performance "Get $entity_type (limit 10)" "$API_BASE_URL/$entity_type?budget_id=eq.$BUDGET_ID&limit=10"
    measure_api_performance "Get $entity_type (limit 50)" "$API_BASE_URL/$entity_type?budget_id=eq.$BUDGET_ID&limit=50"
    
    if [ "$current_count" -gt 10 ]; then
        measure_api_performance "Get $entity_type with ordering" "$API_BASE_URL/$entity_type?budget_id=eq.$BUDGET_ID&order=name.asc&limit=20"
    fi
}

echo -e "${BOLD}🔬 NVLP Performance Analysis${NC}"
echo "=========================="
echo "This script will create test data and measure API performance"

# Step 1: Check current data size
echo -e "\n${BOLD}📊 Current Data Size${NC}"
categories_count=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" -H "apikey: $ANON_KEY" "$API_BASE_URL/categories?budget_id=eq.$BUDGET_ID" | jq '. | length')
envelopes_count=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" -H "apikey: $ANON_KEY" "$API_BASE_URL/envelopes?budget_id=eq.$BUDGET_ID" | jq '. | length')
payees_count=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" -H "apikey: $ANON_KEY" "$API_BASE_URL/payees?budget_id=eq.$BUDGET_ID" | jq '. | length')
income_sources_count=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" -H "apikey: $ANON_KEY" "$API_BASE_URL/income_sources?budget_id=eq.$BUDGET_ID" | jq '. | length')

echo "Categories: $categories_count"
echo "Envelopes: $envelopes_count"
echo "Payees: $payees_count"
echo "Income Sources: $income_sources_count"

# Step 2: Test performance with current data
echo -e "\n${BOLD}🚀 Baseline Performance Tests${NC}"
measure_api_performance "Dashboard API" "$EDGE_FUNCTION_URL/dashboard?budget_id=$BUDGET_ID"
test_performance_with_size "categories" "$categories_count"
test_performance_with_size "envelopes" "$envelopes_count"
test_performance_with_size "payees" "$payees_count"

# Step 3: Create larger datasets and test
echo -e "\n${BOLD}📈 Scaling Up Data Size${NC}"

# Add 20 more categories
if [ "$categories_count" -lt 25 ]; then
    create_test_data 20 "categories"
    test_performance_with_size "categories" "22"
fi

# Add 50 more envelopes  
if [ "$envelopes_count" -lt 50 ]; then
    create_test_data 50 "envelopes"
    test_performance_with_size "envelopes" "58"
fi

# Add 100 more payees
if [ "$payees_count" -lt 100 ]; then
    create_test_data 100 "payees"
    test_performance_with_size "payees" "102"
fi

# Add 10 more income sources
if [ "$income_sources_count" -lt 15 ]; then
    create_test_data 10 "income_sources"
    test_performance_with_size "income_sources" "11"
fi

# Step 4: Test complex operations with larger dataset
echo -e "\n${BOLD}🔄 Complex Operations with Larger Dataset${NC}"
measure_api_performance "Dashboard API (with larger dataset)" "$EDGE_FUNCTION_URL/dashboard?budget_id=$BUDGET_ID"
measure_api_performance "Envelopes with categories join" "$API_BASE_URL/envelopes?budget_id=eq.$BUDGET_ID&select=*,categories(name)&limit=30"
measure_api_performance "Transactions API" "$EDGE_FUNCTION_URL/transactions?budget_id=$BUDGET_ID&limit=20"
measure_api_performance "Reports API" "$EDGE_FUNCTION_URL/reports/transactions?budget_id=$BUDGET_ID&limit=20"

echo -e "\n${BOLD}✅ Performance analysis completed!${NC}"
echo -e "\n${YELLOW}📋 Summary:${NC}"
echo "- Created larger test dataset to stress-test APIs"
echo "- Measured performance across different data sizes"
echo "- Tested both PostgREST and Edge Function endpoints"
echo "- Monitor for queries taking >1000ms for optimization opportunities"