#!/bin/bash

# Test script for envelopes table functionality
# Tests CRUD operations, constraints, and RLS policies

echo "=== Testing Envelopes Table ==="
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

echo "📨 Step 3: Test envelopes table access (should show auto-created envelopes)"
ENVELOPES_RESPONSE=$(curl -s -X GET "$REST_URL/envelopes?select=*&order=sort_order" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

echo "Envelopes response: $ENVELOPES_RESPONSE"
echo

echo "📊 Step 4: Count auto-created envelopes"
ENVELOPE_COUNT=$(echo "$ENVELOPES_RESPONSE" | jq '. | length')
echo "Number of auto-created envelopes: $ENVELOPE_COUNT"

if [ "$ENVELOPE_COUNT" -eq 8 ]; then
    echo "✅ Correct number of default envelopes created"
else
    echo "❌ Expected 8 default envelopes, got $ENVELOPE_COUNT"
fi
echo

echo "💰 Step 5: Test envelope creation with notification features"
CREATE_RESPONSE=$(curl -s -X POST "$REST_URL/envelopes" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"name\": \"Vacation Fund\",
    \"description\": \"Saving for summer vacation\",
    \"color\": \"#00BCD4\",
    \"target_amount\": 2000.00,
    \"should_notify\": true,
    \"notify_amount\": 1500.00,
    \"notify_date\": \"2025-08-01\",
    \"sort_order\": 9
  }")

echo "Create envelope response: $CREATE_RESPONSE"

# Extract created envelope ID
ENVELOPE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.[0].id // empty')

if [ -n "$ENVELOPE_ID" ]; then
    echo "✅ Successfully created envelope with notifications: $ENVELOPE_ID"
else
    echo "❌ Failed to create envelope"
fi
echo

echo "🔧 Step 6: Test constraint validation (invalid color format)"
INVALID_COLOR_RESPONSE=$(curl -s -X POST "$REST_URL/envelopes" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"name\": \"Invalid Color Test\",
    \"color\": \"invalid-color\"
  }")

echo "Invalid color response: $INVALID_COLOR_RESPONSE"

if echo "$INVALID_COLOR_RESPONSE" | grep -q "violates check constraint"; then
    echo "✅ Color format constraint working correctly"
else
    echo "❌ Color format constraint not working"
fi
echo

echo "🔔 Step 7: Test notification constraint (should_notify true without notify fields)"
INVALID_NOTIFICATION_RESPONSE=$(curl -s -X POST "$REST_URL/envelopes" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"name\": \"Invalid Notification Test\",
    \"should_notify\": true
  }")

echo "Invalid notification response: $INVALID_NOTIFICATION_RESPONSE"

if echo "$INVALID_NOTIFICATION_RESPONSE" | grep -q "violates check constraint"; then
    echo "✅ Notification logic constraint working correctly"
else
    echo "❌ Notification logic constraint not working"
fi
echo

echo "📝 Step 8: Test unique name constraint"
DUPLICATE_NAME_RESPONSE=$(curl -s -X POST "$REST_URL/envelopes" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"name\": \"Emergency Fund\"
  }")

echo "Duplicate name response: $DUPLICATE_NAME_RESPONSE"

if echo "$DUPLICATE_NAME_RESPONSE" | grep -q "violates unique constraint"; then
    echo "✅ Unique name constraint working correctly"
else
    echo "❌ Unique name constraint not working"
fi
echo

if [ -n "$ENVELOPE_ID" ]; then
    echo "🔄 Step 9: Test envelope update"
    UPDATE_RESPONSE=$(curl -s -X PATCH "$REST_URL/envelopes?id=eq.$ENVELOPE_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d "{
        \"description\": \"Updated: Saving for amazing summer vacation trip\",
        \"target_amount\": 2500.00,
        \"notify_amount\": 2000.00
      }")
    
    echo "Update response: $UPDATE_RESPONSE"
    
    if echo "$UPDATE_RESPONSE" | grep -q "Updated:"; then
        echo "✅ Successfully updated envelope"
    else
        echo "❌ Failed to update envelope"
    fi
    echo
    
    echo "🗑️ Step 10: Test envelope deletion"
    DELETE_RESPONSE=$(curl -s -X DELETE "$REST_URL/envelopes?id=eq.$ENVELOPE_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY")
    
    echo "Delete response: $DELETE_RESPONSE"
    
    # Check if the envelope is actually deleted
    VERIFY_DELETE_RESPONSE=$(curl -s -X GET "$REST_URL/envelopes?id=eq.$ENVELOPE_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY")
    
    if [ "$VERIFY_DELETE_RESPONSE" = "[]" ]; then
        echo "✅ Successfully deleted envelope"
    else
        echo "❌ Failed to delete envelope"
        echo "Verification response: $VERIFY_DELETE_RESPONSE"
    fi
fi

echo
echo "=== Envelopes Table Test Complete ==="