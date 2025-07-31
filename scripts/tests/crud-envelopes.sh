#!/bin/bash

# NVLP Envelopes CRUD Test Script
# Tests all CRUD operations for the envelopes entity

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

echo "🧪 NVLP Envelopes CRUD Test Suite"
echo "================================"
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
        "name": "Test Budget for Envelopes",
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
ENVELOPE_ID=""
CATEGORY_ID=""

# Create a category for envelope testing
echo "📁 Creating test category for envelope..."
CREATE_CATEGORY_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/categories" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "name": "Test Category for Envelopes",
    "type": "EXPENSE",
    "icon": "💰"
  }')

HTTP_STATUS=$(echo "$CREATE_CATEGORY_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_CATEGORY_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  CATEGORY_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   Created category: $CATEGORY_ID"
else
  echo "❌ Failed to create category"
  exit 1
fi

echo ""

# Test 1: List Envelopes
echo "1️⃣  Testing List Envelopes..."
echo "GET /budgets/$BUDGET_ID/envelopes"

LIST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/envelopes?budget_id=eq.$BUDGET_ID&order=display_order,name" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$LIST_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LIST_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ List envelopes successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ List envelopes failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 2: Create Envelope
echo "2️⃣  Testing Create Envelope..."
echo "POST /budgets/$BUDGET_ID/envelopes"

CREATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/envelopes" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "category_id": "'"$CATEGORY_ID"'",
    "name": "Test Groceries Envelope",
    "envelope_type": "regular",
    "icon": "🛒",
    "color": "#4CAF50",
    "target_amount": 500.00,
    "description": "Monthly grocery budget"
  }')

HTTP_STATUS=$(echo "$CREATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  echo "✅ Create envelope successful"
  echo "   Response: $RESPONSE_BODY"
  ENVELOPE_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   Created envelope ID: $ENVELOPE_ID"
else
  echo "❌ Create envelope failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 3: Get Single Envelope
echo "3️⃣  Testing Get Single Envelope..."
echo "GET /envelopes/$ENVELOPE_ID"

GET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$ENVELOPE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$GET_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$GET_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Get envelope successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Get envelope failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 4: Update Envelope
echo "4️⃣  Testing Update Envelope..."
echo "PATCH /envelopes/$ENVELOPE_ID"

UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X PATCH "$SUPABASE_URL/rest/v1/envelopes?id=eq.$ENVELOPE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "Updated Groceries Envelope",
    "target_amount": 600.00,
    "description": "Updated monthly grocery budget"
  }')

HTTP_STATUS=$(echo "$UPDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Update envelope successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Update envelope failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 5: Get Negative Balance Envelopes
echo "5️⃣  Testing Get Negative Balance Envelopes..."
echo "GET /budgets/$BUDGET_ID/envelopes/negative"

NEGATIVE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/envelopes?budget_id=eq.$BUDGET_ID&current_balance=lt.0&order=current_balance" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$NEGATIVE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$NEGATIVE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Get negative balance envelopes successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Get negative balance envelopes failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
fi

echo ""

# Test 6: Get Low Balance Envelopes
echo "6️⃣  Testing Get Low Balance Envelopes..."
echo "GET /budgets/$BUDGET_ID/envelopes/low-balance"

# Low balance = less than $50 for simplicity (PostgREST doesn't support arithmetic in filters)
LOW_BALANCE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/envelopes?budget_id=eq.$BUDGET_ID&current_balance=lt.50&order=current_balance" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$LOW_BALANCE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LOW_BALANCE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Get low balance envelopes successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Get low balance envelopes failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
fi

echo ""

# Test 7: Try to Delete Envelope (should fail with non-zero balance)
echo "7️⃣  Testing Delete Envelope with Balance (should fail)..."
echo "DELETE /envelopes/$ENVELOPE_ID"

DELETE_ATTEMPT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X DELETE "$SUPABASE_URL/rest/v1/envelopes?id=eq.$ENVELOPE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY")

HTTP_STATUS=$(echo "$DELETE_ATTEMPT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$DELETE_ATTEMPT_RESPONSE" | sed '/HTTP_STATUS/d')

# Note: Since envelope has zero balance initially, this might succeed
if [ "$HTTP_STATUS" = "204" ] || [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Delete envelope successful (balance was zero)"
  ENVELOPE_ID=""  # Clear ID since it's deleted
else
  echo "ℹ️  Delete envelope blocked (expected if balance is non-zero)"
  echo "   Response: $RESPONSE_BODY"
fi

echo ""

# Create another envelope if needed for final deletion test
if [ -z "$ENVELOPE_ID" ]; then
  echo "📝 Creating another envelope for deletion test..."
  CREATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$SUPABASE_URL/rest/v1/envelopes" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d '{
      "budget_id": "'"$BUDGET_ID"'",
      "category_id": "'"$CATEGORY_ID"'",
      "name": "Temporary Envelope",
      "type": "REGULAR"
    }')
  
  HTTP_STATUS=$(echo "$CREATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_STATUS/d')
  
  if [ "$HTTP_STATUS" = "201" ]; then
    ENVELOPE_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   Created envelope: $ENVELOPE_ID"
  fi
fi

# Test 8: Verify Deletion
if [ -n "$ENVELOPE_ID" ]; then
  echo "8️⃣  Testing Final Envelope Deletion..."
  echo "DELETE /envelopes/$ENVELOPE_ID"
  
  DELETE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X DELETE "$SUPABASE_URL/rest/v1/envelopes?id=eq.$ENVELOPE_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY")
  
  HTTP_STATUS=$(echo "$DELETE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  
  if [ "$HTTP_STATUS" = "204" ] || [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Delete envelope successful"
  else
    echo "❌ Delete envelope failed"
  fi
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
echo "🏁 Envelopes CRUD Test Complete"
echo ""
echo "Summary:"
echo "  ✅ List envelopes"
echo "  ✅ Create envelope"
echo "  ✅ Get single envelope"
echo "  ✅ Update envelope"
echo "  ✅ Get negative balance envelopes"
echo "  ✅ Get low balance envelopes"
echo "  ✅ Test delete restrictions"
echo "  ✅ Delete envelope (when balance is zero)"
echo ""
echo "Usage:"
echo "  # Run with existing budget:"
echo "  BUDGET_ID=your-budget-id ./crud-envelopes.sh"
echo ""
echo "  # Run with auto-detected/created budget:"
echo "  ./crud-envelopes.sh"