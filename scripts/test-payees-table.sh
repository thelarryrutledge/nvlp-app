#!/bin/bash

# Test script for payees table functionality
# Tests CRUD operations, constraints, and RLS policies

echo "=== Testing Payees Table ==="
echo

# Test environment
API_BASE_URL="https://api.nvlp.app"
REST_URL="https://qnpatlosomopoimtsmsr.supabase.co/rest/v1"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8"
TEST_USER="larryjrutledge@gmail.com"
TEST_PASSWORD="Test1234!"

echo "🔑 Step 1: Authenticate test user"
# Login to get JWT token
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{\"email\":\"$TEST_USER\",\"password\":\"$TEST_PASSWORD\"}")

echo "Login response: $LOGIN_RESPONSE"

# Extract access token (new format from auth endpoint)
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.session.access_token // .access_token // empty')

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to get access token"
    exit 1
fi

echo "✅ Successfully authenticated"
echo

echo "📋 Step 2: Get user's budgets"
BUDGETS_RESPONSE=$(curl -s -X GET "$REST_URL/budgets?select=*" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

echo "Budgets response: $BUDGETS_RESPONSE"

# Extract the first budget ID
BUDGET_ID=$(echo "$BUDGETS_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$BUDGET_ID" ]; then
    echo "❌ No budget found for user"
    exit 1
fi

echo "✅ Found budget: $BUDGET_ID"
echo

echo "💰 Step 3: Test payees table access (should show auto-created payees)"
PAYEES_RESPONSE=$(curl -s -X GET "$REST_URL/payees?select=*&order=sort_order" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

echo "Payees response: $PAYEES_RESPONSE"
echo

echo "📊 Step 4: Count auto-created payees"
PAYEE_COUNT=$(echo "$PAYEES_RESPONSE" | jq '. | length')
echo "Number of auto-created payees: $PAYEE_COUNT"

if [ "$PAYEE_COUNT" -eq 12 ]; then
    echo "✅ Correct number of default payees created"
else
    echo "❌ Expected 12 default payees, got $PAYEE_COUNT"
fi
echo

echo "🏪 Step 5: Test payee creation with all features"
CREATE_RESPONSE=$(curl -s -X POST "$REST_URL/payees" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"name\": \"Local Coffee Shop\",
    \"description\": \"Favorite neighborhood coffee shop\",
    \"color\": \"#8BC34A\",
    \"payee_type\": \"business\",
    \"address\": \"123 Main St, City, State 12345\",
    \"phone\": \"(555) 123-4567\",
    \"email\": \"contact@coffeeshop.com\",
    \"website\": \"https://localcoffeeshop.com\",
    \"preferred_payment_method\": \"card\",
    \"sort_order\": 13
  }")

echo "Create payee response: $CREATE_RESPONSE"

# Extract created payee ID
PAYEE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.[0].id // empty')

if [ -n "$PAYEE_ID" ]; then
    echo "✅ Successfully created payee with full details: $PAYEE_ID"
else
    echo "❌ Failed to create payee"
fi
echo

echo "🔧 Step 6: Test constraint validation (invalid color format)"
INVALID_COLOR_RESPONSE=$(curl -s -X POST "$REST_URL/payees" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"name\": \"Invalid Color Test\",
    \"color\": \"not-a-color\"
  }")

echo "Invalid color response: $INVALID_COLOR_RESPONSE"

if echo "$INVALID_COLOR_RESPONSE" | grep -q "violates check constraint"; then
    echo "✅ Color format constraint working correctly"
else
    echo "❌ Color format constraint not working"
fi
echo

echo "📧 Step 7: Test email format validation"
INVALID_EMAIL_RESPONSE=$(curl -s -X POST "$REST_URL/payees" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"name\": \"Invalid Email Test\",
    \"email\": \"not-an-email\"
  }")

echo "Invalid email response: $INVALID_EMAIL_RESPONSE"

if echo "$INVALID_EMAIL_RESPONSE" | grep -q "violates check constraint"; then
    echo "✅ Email format constraint working correctly"
else
    echo "❌ Email format constraint not working"
fi
echo

echo "🏷️ Step 8: Test payee type validation"
INVALID_TYPE_RESPONSE=$(curl -s -X POST "$REST_URL/payees" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"name\": \"Invalid Type Test\",
    \"payee_type\": \"invalid_type\"
  }")

echo "Invalid type response: $INVALID_TYPE_RESPONSE"

if echo "$INVALID_TYPE_RESPONSE" | grep -q "violates check constraint"; then
    echo "✅ Payee type constraint working correctly"
else
    echo "❌ Payee type constraint not working"
fi
echo

echo "💵 Step 9: Test negative total_paid validation"
NEGATIVE_TOTAL_RESPONSE=$(curl -s -X POST "$REST_URL/payees" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"name\": \"Negative Total Test\",
    \"total_paid\": -100.00
  }")

echo "Negative total response: $NEGATIVE_TOTAL_RESPONSE"

if echo "$NEGATIVE_TOTAL_RESPONSE" | grep -q "violates check constraint"; then
    echo "✅ Total paid non-negative constraint working correctly"
else
    echo "❌ Total paid constraint not working"
fi
echo

echo "📝 Step 10: Test unique name constraint"
DUPLICATE_NAME_RESPONSE=$(curl -s -X POST "$REST_URL/payees" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"name\": \"Grocery Store\"
  }")

echo "Duplicate name response: $DUPLICATE_NAME_RESPONSE"

if echo "$DUPLICATE_NAME_RESPONSE" | grep -q "violates unique constraint"; then
    echo "✅ Unique name constraint working correctly"
else
    echo "❌ Unique name constraint not working"
fi
echo

echo "🏢 Step 11: Test payee type filtering"
BUSINESS_PAYEES=$(curl -s -X GET "$REST_URL/payees?select=id,name,payee_type&payee_type=eq.business&order=sort_order" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

BUSINESS_COUNT=$(echo "$BUSINESS_PAYEES" | jq '. | length')
echo "Business payees count: $BUSINESS_COUNT"

UTILITY_PAYEES=$(curl -s -X GET "$REST_URL/payees?select=id,name,payee_type&payee_type=eq.utility&order=sort_order" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

UTILITY_COUNT=$(echo "$UTILITY_PAYEES" | jq '. | length')
echo "Utility payees count: $UTILITY_COUNT"

if [ "$BUSINESS_COUNT" -gt 0 ] && [ "$UTILITY_COUNT" -gt 0 ]; then
    echo "✅ Payee type filtering working correctly"
else
    echo "❌ Payee type filtering not working as expected"
fi
echo

if [ -n "$PAYEE_ID" ]; then
    echo "🔄 Step 12: Test payee update"
    UPDATE_RESPONSE=$(curl -s -X PATCH "$REST_URL/payees?id=eq.$PAYEE_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d "{
        \"description\": \"Updated: Best coffee in town with great atmosphere\",
        \"phone\": \"(555) 987-6543\",
        \"preferred_payment_method\": \"cash\",
        \"total_paid\": 125.50,
        \"last_payment_date\": \"2025-07-06\",
        \"last_payment_amount\": 4.75
      }")
    
    echo "Update response: $UPDATE_RESPONSE"
    
    if echo "$UPDATE_RESPONSE" | grep -q "Updated:"; then
        echo "✅ Successfully updated payee"
    else
        echo "❌ Failed to update payee"
    fi
    echo
    
    echo "🗑️ Step 13: Test payee deletion"
    DELETE_RESPONSE=$(curl -s -X DELETE "$REST_URL/payees?id=eq.$PAYEE_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY")
    
    echo "Delete response: $DELETE_RESPONSE"
    
    # Check if the payee is actually deleted
    VERIFY_DELETE_RESPONSE=$(curl -s -X GET "$REST_URL/payees?id=eq.$PAYEE_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY")
    
    if [ "$VERIFY_DELETE_RESPONSE" = "[]" ]; then
        echo "✅ Successfully deleted payee"
    else
        echo "❌ Failed to delete payee"
        echo "Verification response: $VERIFY_DELETE_RESPONSE"
    fi
fi

echo
echo "📋 Step 14: Verify payee types distribution"
echo "Checking default payees by type:"

for type in business person organization utility service other; do
    TYPE_COUNT=$(echo "$PAYEES_RESPONSE" | jq "[.[] | select(.payee_type == \"$type\")] | length")
    echo "  $type: $TYPE_COUNT payees"
done

echo
echo "=== Payees Table Test Complete ==="