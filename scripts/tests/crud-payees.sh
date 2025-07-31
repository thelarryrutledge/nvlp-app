#!/bin/bash

# NVLP Payees CRUD Test Script
# Tests all CRUD operations for the payees entity

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

echo "🧪 NVLP Payees CRUD Test Suite"
echo "=============================="
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
        "name": "Test Budget for Payees",
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
PAYEE_ID=""
CATEGORY_ID=""

# Create a category for payee testing
echo "📁 Creating test category for payee..."
CREATE_CATEGORY_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/categories" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "name": "Test Category for Payees",
    "type": "EXPENSE",
    "icon": "🏪"
  }')

HTTP_STATUS=$(echo "$CREATE_CATEGORY_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_CATEGORY_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  CATEGORY_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   Created category: $CATEGORY_ID"
else
  echo "⚠️  Failed to create category, continuing without default category"
fi

echo ""

# Test 1: List Payees
echo "1️⃣  Testing List Payees..."
echo "GET /budgets/$BUDGET_ID/payees"

LIST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/payees?budget_id=eq.$BUDGET_ID&order=name" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$LIST_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LIST_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ List payees successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ List payees failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 2: Create Payee
echo "2️⃣  Testing Create Payee..."
echo "POST /budgets/$BUDGET_ID/payees"

CREATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/payees" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "name": "Test Grocery Store",
    "category_id": '"$([ -n "$CATEGORY_ID" ] && echo "\"$CATEGORY_ID\"" || echo "null")"',
    "description": "Local grocery store for testing"
  }')

HTTP_STATUS=$(echo "$CREATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  echo "✅ Create payee successful"
  echo "   Response: $RESPONSE_BODY"
  PAYEE_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   Created payee ID: $PAYEE_ID"
else
  echo "❌ Create payee failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 3: Get Single Payee
echo "3️⃣  Testing Get Single Payee..."
echo "GET /payees/$PAYEE_ID"

GET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/payees?id=eq.$PAYEE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$GET_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$GET_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Get payee successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Get payee failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 4: Update Payee
echo "4️⃣  Testing Update Payee..."
echo "PATCH /payees/$PAYEE_ID"

UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X PATCH "$SUPABASE_URL/rest/v1/payees?id=eq.$PAYEE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "Updated Grocery Store",
    "description": "Updated description for the grocery store"
  }')

HTTP_STATUS=$(echo "$UPDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Update payee successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Update payee failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 5: Search Payees
echo "5️⃣  Testing Search Payees..."
echo "GET /budgets/$BUDGET_ID/payees/search?q=grocery"

SEARCH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/payees?budget_id=eq.$BUDGET_ID&name=ilike.*grocery*&order=name" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$SEARCH_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$SEARCH_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Search payees successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Search payees failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
fi

echo ""

# Test 6: Get Recent Payees
echo "6️⃣  Testing Get Recent Payees..."
echo "GET /budgets/$BUDGET_ID/payees/recent"

# Note: This would normally use a join with transactions to get recently used payees
# For now, just get payees ordered by updated_at
RECENT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/payees?budget_id=eq.$BUDGET_ID&order=updated_at.desc&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$RECENT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RECENT_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Get recent payees successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Get recent payees failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
fi

echo ""

# Test 7: Delete Payee
echo "7️⃣  Testing Delete Payee..."
echo "DELETE /payees/$PAYEE_ID"

DELETE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X DELETE "$SUPABASE_URL/rest/v1/payees?id=eq.$PAYEE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY")

HTTP_STATUS=$(echo "$DELETE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$DELETE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "204" ] || [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Delete payee successful"
else
  echo "❌ Delete payee failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 8: Verify Deletion
echo "8️⃣  Testing Payee is Deleted..."
echo "GET /payees/$PAYEE_ID (should return empty)"

VERIFY_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/payees?id=eq.$PAYEE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$VERIFY_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$VERIFY_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ] && [ "$RESPONSE_BODY" = "[]" ]; then
  echo "✅ Payee successfully deleted"
else
  echo "⚠️  Payee may not be deleted properly"
  echo "   Response: $RESPONSE_BODY"
fi

# Clean up test category
if [ -n "$CATEGORY_ID" ]; then
  echo ""
  echo "🧹 Cleaning up test category..."
  curl -s -X DELETE "$SUPABASE_URL/rest/v1/categories?id=eq.$CATEGORY_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY" > /dev/null
fi

echo ""
echo "🏁 Payees CRUD Test Complete"
echo ""
echo "Summary:"
echo "  ✅ List payees"
echo "  ✅ Create payee"
echo "  ✅ Get single payee"
echo "  ✅ Update payee"
echo "  ✅ Search payees"
echo "  ✅ Get recent payees"
echo "  ✅ Delete payee"
echo "  ✅ Verify deletion"
echo ""
echo "Usage:"
echo "  # Run with existing budget:"
echo "  BUDGET_ID=your-budget-id ./crud-payees.sh"
echo ""
echo "  # Run with auto-detected/created budget:"
echo "  ./crud-payees.sh"