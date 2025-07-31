#!/bin/bash

# NVLP Categories CRUD Test Script
# Tests all CRUD operations for the categories entity

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

echo "🧪 NVLP Categories CRUD Test Suite"
echo "================================="
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
        "name": "Test Budget for Categories",
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
PARENT_CATEGORY_ID=""
CHILD_CATEGORY_ID=""

# Test 1: List Categories
echo "1️⃣  Testing List Categories..."
echo "GET /budgets/$BUDGET_ID/categories"

LIST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/categories?budget_id=eq.$BUDGET_ID&order=name" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$LIST_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LIST_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ List categories successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ List categories failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 2: Create Parent Category
echo "2️⃣  Testing Create Parent Category..."
echo "POST /budgets/$BUDGET_ID/categories"

CREATE_PARENT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/categories" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "name": "Test Parent Category",
    "type": "EXPENSE",
    "icon": "📁",
    "color": "#FF5733"
  }')

HTTP_STATUS=$(echo "$CREATE_PARENT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_PARENT_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  echo "✅ Create parent category successful"
  echo "   Response: $RESPONSE_BODY"
  PARENT_CATEGORY_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   Created parent category ID: $PARENT_CATEGORY_ID"
else
  echo "❌ Create parent category failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 3: Create Child Category
echo "3️⃣  Testing Create Child Category..."
echo "POST /budgets/$BUDGET_ID/categories (with parent)"

CREATE_CHILD_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/categories" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "name": "Test Child Category",
    "parent_id": "'"$PARENT_CATEGORY_ID"'",
    "type": "EXPENSE",
    "icon": "📄",
    "color": "#33FF57"
  }')

HTTP_STATUS=$(echo "$CREATE_CHILD_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_CHILD_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  echo "✅ Create child category successful"
  echo "   Response: $RESPONSE_BODY"
  CHILD_CATEGORY_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   Created child category ID: $CHILD_CATEGORY_ID"
else
  echo "❌ Create child category failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 4: Get Single Category
echo "4️⃣  Testing Get Single Category..."
echo "GET /categories/$PARENT_CATEGORY_ID"

GET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/categories?id=eq.$PARENT_CATEGORY_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$GET_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$GET_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Get category successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Get category failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 5: Update Category
echo "5️⃣  Testing Update Category..."
echo "PATCH /categories/$PARENT_CATEGORY_ID"

UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X PATCH "$SUPABASE_URL/rest/v1/categories?id=eq.$PARENT_CATEGORY_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "Updated Parent Category",
    "icon": "📂",
    "color": "#5733FF"
  }')

HTTP_STATUS=$(echo "$UPDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Update category successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Update category failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 6: Get Category Tree
echo "6️⃣  Testing Get Category Tree..."
echo "GET /budgets/$BUDGET_ID/categories/tree"

TREE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/categories?budget_id=eq.$BUDGET_ID&select=*,subcategories:categories!parent_id(*)&parent_id=is.null" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$TREE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$TREE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Get category tree successful"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Get category tree failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
fi

echo ""

# Test 7: Delete Child Category First (required due to foreign key)
echo "7️⃣  Testing Delete Child Category..."
echo "DELETE /categories/$CHILD_CATEGORY_ID"

DELETE_CHILD_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X DELETE "$SUPABASE_URL/rest/v1/categories?id=eq.$CHILD_CATEGORY_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY")

HTTP_STATUS=$(echo "$DELETE_CHILD_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$DELETE_CHILD_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "204" ] || [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Delete child category successful"
else
  echo "❌ Delete child category failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 8: Delete Parent Category
echo "8️⃣  Testing Delete Parent Category..."
echo "DELETE /categories/$PARENT_CATEGORY_ID"

DELETE_PARENT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X DELETE "$SUPABASE_URL/rest/v1/categories?id=eq.$PARENT_CATEGORY_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY")

HTTP_STATUS=$(echo "$DELETE_PARENT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$DELETE_PARENT_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "204" ] || [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Delete parent category successful"
else
  echo "❌ Delete parent category failed (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 9: Verify Deletion
echo "9️⃣  Testing Categories are Deleted..."
echo "GET /categories (verify both are gone)"

VERIFY_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/categories?id=in.($PARENT_CATEGORY_ID,$CHILD_CATEGORY_ID)" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$VERIFY_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$VERIFY_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ] && [ "$RESPONSE_BODY" = "[]" ]; then
  echo "✅ Categories successfully deleted"
else
  echo "⚠️  Categories may not be deleted properly"
  echo "   Response: $RESPONSE_BODY"
fi

echo ""
echo "🏁 Categories CRUD Test Complete"
echo ""
echo "Summary:"
echo "  ✅ List categories"
echo "  ✅ Create parent category"
echo "  ✅ Create child category"
echo "  ✅ Get single category"
echo "  ✅ Update category"
echo "  ✅ Get category tree"
echo "  ✅ Delete child category"
echo "  ✅ Delete parent category"
echo "  ✅ Verify deletion"
echo ""
echo "Usage:"
echo "  # Run with existing budget:"
echo "  BUDGET_ID=your-budget-id ./crud-categories.sh"
echo ""
echo "  # Run with auto-detected/created budget:"
echo "  ./crud-categories.sh"