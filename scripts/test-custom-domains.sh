#!/bin/bash

# Script to test custom domain connections
# Tests both edge-api.nvlp.app and db-api.nvlp.app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# API configuration
EDGE_API_URL="https://edge-api.nvlp.app"
DB_API_URL="https://db-api.nvlp.app"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8"

# Test credentials
EMAIL="larryjrutledge@gmail.com"
PASSWORD="Test1234!"

echo -e "${BLUE}🌐 Testing NVLP Custom Domains${NC}"
echo "================================"

# Test Edge API (edge-api.nvlp.app)
echo -e "\n${BLUE}1. Testing Edge API (edge-api.nvlp.app)${NC}"
echo -e "${YELLOW}   Testing login endpoint...${NC}"

LOGIN_RESPONSE=$(curl -s -X POST "$EDGE_API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.session.access_token // .access_token // empty')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
    echo -e "${RED}   ❌ Edge API login failed${NC}"
    echo "   Response: $LOGIN_RESPONSE"
    exit 1
else
    echo -e "${GREEN}   ✅ Edge API login successful${NC}"
    echo "$ACCESS_TOKEN" > .token
fi

# Test DB API (db-api.nvlp.app)
echo -e "\n${BLUE}2. Testing DB API (db-api.nvlp.app)${NC}"
echo -e "${YELLOW}   Testing user_profiles endpoint...${NC}"

PROFILE_RESPONSE=$(curl -s -X GET "$DB_API_URL/user_profiles" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

if echo "$PROFILE_RESPONSE" | jq -e '.[0].id' > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ DB API connection successful${NC}"
    PROFILE_NAME=$(echo "$PROFILE_RESPONSE" | jq -r '.[0].display_name')
    echo "   Profile: $PROFILE_NAME"
else
    echo -e "${RED}   ❌ DB API connection failed${NC}"
    echo "   Response: $PROFILE_RESPONSE"
    exit 1
fi

# Test some more endpoints
echo -e "\n${BLUE}3. Testing Additional Endpoints${NC}"

# Test budgets via DB API
echo -e "${YELLOW}   Testing budgets (PostgREST)...${NC}"
BUDGETS_RESPONSE=$(curl -s -X GET "$DB_API_URL/budgets" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

if echo "$BUDGETS_RESPONSE" | jq -e '.' > /dev/null 2>&1; then
    BUDGET_COUNT=$(echo "$BUDGETS_RESPONSE" | jq '. | length')
    echo -e "${GREEN}   ✅ Found $BUDGET_COUNT budget(s)${NC}"
else
    echo -e "${RED}   ❌ Failed to fetch budgets${NC}"
fi

# Test dashboard via Edge Functions
echo -e "${YELLOW}   Testing dashboard (Edge Function)...${NC}"
if [ "$BUDGET_COUNT" -gt 0 ]; then
    BUDGET_ID=$(echo "$BUDGETS_RESPONSE" | jq -r '.[0].id')
    DASHBOARD_RESPONSE=$(curl -s -X POST "$EDGE_API_URL/dashboard" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -d "{\"budget_id\":\"$BUDGET_ID\"}")
    
    if echo "$DASHBOARD_RESPONSE" | jq -e '.data.budget_overview' > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ Dashboard endpoint working${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Dashboard returned: $(echo "$DASHBOARD_RESPONSE" | jq -c '.')${NC}"
    fi
fi

# Summary
echo -e "\n${BLUE}📊 Summary${NC}"
echo "=========="
echo -e "${GREEN}✅ Edge API (edge-api.nvlp.app): Working${NC}"
echo -e "${GREEN}✅ DB API (db-api.nvlp.app): Working${NC}"
echo ""
echo -e "${BLUE}🔧 Configuration for clients:${NC}"
echo "TypeScript Client:"
echo "  apiBaseUrl: '$EDGE_API_URL'"
echo "  dbApiUrl: '$DB_API_URL'"
echo ""
echo "Go Client:"
echo "  APIBaseURL: \"$EDGE_API_URL\""
echo "  DBApiURL: \"$DB_API_URL\""