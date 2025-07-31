#!/bin/bash

# NVLP Income Sources CRUD Test Script
# Tests all CRUD operations for the income_sources entity

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
BUDGET_ID="${BUDGET_ID}"

# Validate required environment variables
if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Error: ACCESS_TOKEN is required"
  echo "   Please set ACCESS_TOKEN environment variable with a valid auth token"
  echo "   You can get one by running ./auth-flow.sh first"
  exit 1
fi

echo "🧪 NVLP Income Sources CRUD Test Suite"
echo "====================================="
echo "Supabase URL: $SUPABASE_URL"
echo ""

# Get or create a budget for testing
if [ -z "$BUDGET_ID" ]; then
  echo "📝 No BUDGET_ID provided, getting default budget..."
  
  # Try to get any budget for the user
  BUDGET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET "$SUPABASE_URL/rest/v1/budgets?limit=1" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Accept: application/json")
  
  HTTP_STATUS=$(echo "$BUDGET_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  RESPONSE_BODY=$(echo "$BUDGET_RESPONSE" | sed '/HTTP_STATUS/d')
  
  if [ "$HTTP_STATUS" = "200" ] && [ "$RESPONSE_BODY" != "[]" ]; then
    BUDGET_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   Using budget: $BUDGET_ID"
  else
    echo "   No default budget found, creating one..."
    CREATE_BUDGET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
      -X POST "$SUPABASE_URL/rest/v1/budgets" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $SUPABASE_ANON_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d '{
        "name": "Test Budget for Income Sources",
        "currency": "USD"
      }')
    
    HTTP_STATUS=$(echo "$CREATE_BUDGET_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$CREATE_BUDGET_RESPONSE" | sed '/HTTP_STATUS/d')
    
    if [ "$HTTP_STATUS" = "201" ]; then
      BUDGET_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
      echo "   Created budget: $BUDGET_ID"
    else
      echo "❌ Failed to create budget"
      exit 1
    fi
  fi
else
  echo "Using provided BUDGET_ID: $BUDGET_ID"
fi

echo ""

# Variables to store IDs for later tests
INCOME_SOURCE_ID=""

# Test 1: List Income Sources
echo "1️⃣  Testing List Income Sources..."
echo "GET /budgets/$BUDGET_ID/income-sources"

LIST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/income_sources?budget_id=eq.$BUDGET_ID&order=name" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$LIST_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LIST_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ List income sources successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ List income sources failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 2: Create Income Source
echo "2️⃣  Testing Create Income Source..."
echo "POST /budgets/$BUDGET_ID/income-sources"

# Calculate next payday (15th of next month)
NEXT_MONTH=$(date -v+1m +%Y-%m)
NEXT_PAYDAY="${NEXT_MONTH}-15"

CREATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/income_sources" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "name": "Test Salary",
    "description": "Monthly salary payment",
    "expected_amount": 5000.00,
    "frequency": "monthly",
    "next_expected_date": "'"$NEXT_PAYDAY"'",
    "is_active": true
  }')

HTTP_STATUS=$(echo "$CREATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  echo "✅ Create income source successful"
  echo "   Response: $RESPONSE_BODY"
  INCOME_SOURCE_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   Created income source ID: $INCOME_SOURCE_ID"
else
  echo "❌ Create income source failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 3: Get Single Income Source
echo "3️⃣  Testing Get Single Income Source..."
echo "GET /income-sources/$INCOME_SOURCE_ID"

GET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/income_sources?id=eq.$INCOME_SOURCE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$GET_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$GET_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Get income source successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Get income source failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 4: Update Income Source
echo "4️⃣  Testing Update Income Source..."
echo "PATCH /income-sources/$INCOME_SOURCE_ID"

UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X PATCH "$SUPABASE_URL/rest/v1/income_sources?id=eq.$INCOME_SOURCE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "Updated Test Salary",
    "expected_amount": 5500.00,
    "description": "Updated monthly salary payment"
  }')

HTTP_STATUS=$(echo "$UPDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Update income source successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Update income source failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 5: Get Overdue Income Sources
echo "5️⃣  Testing Get Overdue Income Sources..."
echo "GET /budgets/$BUDGET_ID/income-sources/overdue"

OVERDUE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/income_sources?budget_id=eq.$BUDGET_ID&is_active=eq.true&next_expected_date=lt.$(date +%Y-%m-%d)" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$OVERDUE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$OVERDUE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Get overdue income sources successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Get overdue income sources failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
fi

echo ""

# Test 6: Get Upcoming Income Sources
echo "6️⃣  Testing Get Upcoming Income Sources..."
echo "GET /budgets/$BUDGET_ID/income-sources/upcoming"

# Get income sources expected in next 30 days
FUTURE_DATE=$(date -v+30d +%Y-%m-%d)
UPCOMING_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/income_sources?budget_id=eq.$BUDGET_ID&is_active=eq.true&next_expected_date=gte.$(date +%Y-%m-%d)&next_expected_date=lte.$FUTURE_DATE&order=next_expected_date" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$UPCOMING_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPCOMING_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Get upcoming income sources successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Get upcoming income sources failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
fi

echo ""

# Test 7: Delete Income Source
echo "7️⃣  Testing Delete Income Source..."
echo "DELETE /income-sources/$INCOME_SOURCE_ID"

DELETE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X DELETE "$SUPABASE_URL/rest/v1/income_sources?id=eq.$INCOME_SOURCE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY")

HTTP_STATUS=$(echo "$DELETE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$DELETE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "204" ] || [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Delete income source successful"
else
  echo "❌ Delete income source failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 8: Verify Deletion
echo "8️⃣  Testing Income Source is Deleted..."
echo "GET /income-sources/$INCOME_SOURCE_ID (should return empty)"

VERIFY_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/income_sources?id=eq.$INCOME_SOURCE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$VERIFY_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$VERIFY_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ] && [ "$RESPONSE_BODY" = "[]" ]; then
  echo "✅ Income source successfully deleted"
else
  echo "⚠️  Income source may not be deleted properly"
  echo "   Response: $RESPONSE_BODY"
fi

echo ""
echo "🏁 Income Sources CRUD Test Complete"
echo ""
echo "Summary:"
echo "  ✅ List income sources"
echo "  ✅ Create income source"
echo "  ✅ Get single income source"
echo "  ✅ Update income source"
echo "  ✅ Get overdue income sources"
echo "  ✅ Get upcoming income sources"
echo "  ✅ Delete income source"
echo "  ✅ Verify deletion"
echo ""
echo "Usage:"
echo "  # Run with existing budget:"
echo "  BUDGET_ID=your-budget-id ./crud-income-sources.sh"
echo ""
echo "  # Run with auto-detected/created budget:"
echo "  ./crud-income-sources.sh"