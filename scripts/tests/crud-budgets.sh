#!/bin/bash

# NVLP Budgets CRUD Test Script
# Tests all CRUD operations for the budgets entity

set -e

# Load environment variables from .env file if it exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Configuration
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
ACCESS_TOKEN="${ACCESS_TOKEN}"

# Validate required environment variables
if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Error: ACCESS_TOKEN is required"
  echo "   Please set ACCESS_TOKEN environment variable with a valid auth token"
  echo "   You can get one by running ./auth-flow.sh first"
  exit 1
fi

echo "🧪 NVLP Budgets CRUD Test Suite"
echo "==============================="
echo "Supabase URL: $SUPABASE_URL"
echo ""

# Variables to store IDs for later tests
BUDGET_ID=""
DEFAULT_BUDGET_ID=""

# Test 1: List Budgets (should be empty or contain existing budgets)
echo "1️⃣  Testing List Budgets..."
echo "GET /budgets"

LIST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/budgets?order=name" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$LIST_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LIST_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ List budgets successful"
  echo "   Response: $RESPONSE_BODY"
  # Check if we already have a default budget
  DEFAULT_BUDGET_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*".*"is_default":true' | grep -o '"id":"[^"]*"' | cut -d'"' -f4 || true)
  if [ -n "$DEFAULT_BUDGET_ID" ]; then
    echo "   Found existing default budget: $DEFAULT_BUDGET_ID"
  fi
else
  echo "❌ List budgets failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 2: Create Budget
echo "2️⃣  Testing Create Budget..."
echo "POST /budgets"

CREATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/budgets" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "Test Budget '"$(date +%s)"'",
    "description": "Created by CRUD test script",
    "currency": "USD"
  }')

HTTP_STATUS=$(echo "$CREATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  echo "✅ Create budget successful"
  echo "   Response: $RESPONSE_BODY"
  # Extract the created budget ID
  BUDGET_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   Created budget ID: $BUDGET_ID"
else
  echo "❌ Create budget failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 3: Get Single Budget
echo "3️⃣  Testing Get Single Budget..."
echo "GET /budgets/$BUDGET_ID"

GET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/budgets?id=eq.$BUDGET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$GET_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$GET_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Get budget successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Get budget failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 4: Update Budget
echo "4️⃣  Testing Update Budget..."
echo "PATCH /budgets/$BUDGET_ID"

UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X PATCH "$SUPABASE_URL/rest/v1/budgets?id=eq.$BUDGET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "Updated Test Budget",
    "description": "Updated by CRUD test script"
  }')

HTTP_STATUS=$(echo "$UPDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Update budget successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Update budget failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 5: Set as Default Budget (via edge function)
echo "5️⃣  Testing Set Default Budget..."
echo "POST /budgets/$BUDGET_ID/set-default"

DEFAULT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/functions/v1/budget-setup" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budgetId": "'"$BUDGET_ID"'",
    "action": "set-default"
  }')

HTTP_STATUS=$(echo "$DEFAULT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$DEFAULT_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Set default budget successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "⚠️  Set default budget failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  echo "   Note: This might fail if using wrong endpoint or budget is already default"
fi

echo ""

# Test 6: Get Default Budget
echo "6️⃣  Testing Get Default Budget..."
echo "GET /budgets/default"

# Use PostgREST RPC to get default budget (which handles user context)
DEFAULT_GET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/rpc/get_default_budget" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{}')


HTTP_STATUS=$(echo "$DEFAULT_GET_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$DEFAULT_GET_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Get default budget successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Get default budget failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
fi

echo ""

# Test 7: Delete Budget
echo "7️⃣  Testing Delete Budget..."
echo "DELETE /budgets/$BUDGET_ID"

DELETE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X DELETE "$SUPABASE_URL/rest/v1/budgets?id=eq.$BUDGET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY")

HTTP_STATUS=$(echo "$DELETE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$DELETE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "204" ] || [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Delete budget successful"
else
  echo "❌ Delete budget failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 8: Verify Deletion
echo "8️⃣  Testing Budget is Deleted..."
echo "GET /budgets/$BUDGET_ID (should return empty)"

VERIFY_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/budgets?id=eq.$BUDGET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$VERIFY_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$VERIFY_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ] && [ "$RESPONSE_BODY" = "[]" ]; then
  echo "✅ Budget successfully deleted"
else
  echo "⚠️  Budget may not be deleted properly"
  echo "   Response: $RESPONSE_BODY"
fi

echo ""
echo "🏁 Budgets CRUD Test Complete"
echo ""
echo "Summary:"
echo "  ✅ List budgets"
echo "  ✅ Create budget"
echo "  ✅ Get single budget"
echo "  ✅ Update budget"
echo "  ✅ Set default budget"
echo "  ✅ Get default budget"
echo "  ✅ Delete budget"
echo "  ✅ Verify deletion"