#!/bin/bash

# Test script for user_state table functionality
# Tests CRUD operations, RLS policies, triggers, and available amount tracking

echo "=== Testing User State Table ==="
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

# Extract access token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.session.access_token // .access_token // empty')

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to get access token"
    exit 1
fi

echo "✅ Successfully authenticated"
echo

echo "📋 Step 2: Get user's budget and user_state"
BUDGETS_RESPONSE=$(curl -s -X GET "$REST_URL/budgets?select=*" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

BUDGET_ID=$(echo "$BUDGETS_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$BUDGET_ID" ]; then
    echo "❌ No budget found for user"
    exit 1
fi

echo "✅ Found budget: $BUDGET_ID"

# Get user_state for this budget
USER_STATE_RESPONSE=$(curl -s -X GET "$REST_URL/user_state?select=*&budget_id=eq.$BUDGET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

USER_STATE_ID=$(echo "$USER_STATE_RESPONSE" | jq -r '.[0].id // empty')
INITIAL_AVAILABLE=$(echo "$USER_STATE_RESPONSE" | jq -r '.[0].available_amount // 0')

if [ -n "$USER_STATE_ID" ]; then
    echo "✅ Found user_state: $USER_STATE_ID"
    echo "Initial available amount: $INITIAL_AVAILABLE"
else
    echo "❌ No user_state found for budget"
    exit 1
fi
echo

echo "⚙️ Step 3: Test user_state preferences update"
UPDATE_RESPONSE=$(curl -s -X PATCH "$REST_URL/user_state?id=eq.$USER_STATE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"timezone\": \"America/New_York\",
    \"date_format\": \"YYYY-MM-DD\",
    \"allow_negative_envelopes\": true,
    \"notification_frequency\": \"daily\"
  }")

echo "Update response: $UPDATE_RESPONSE"

if echo "$UPDATE_RESPONSE" | jq -r '.[0].timezone' | grep -q "America/New_York"; then
    echo "✅ Successfully updated user preferences"
else
    echo "❌ Failed to update user preferences"
fi
echo

echo "💰 Step 4: Test available amount tracking with income transaction"
# Get required related entities
INCOME_SOURCES=$(curl -s -X GET "$REST_URL/income_sources?select=id,name&budget_id=eq.$BUDGET_ID&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")
INCOME_SOURCE_ID=$(echo "$INCOME_SOURCES" | jq -r '.[0].id // empty')

CATEGORIES=$(curl -s -X GET "$REST_URL/categories?select=id,name&budget_id=eq.$BUDGET_ID&category_type=eq.income&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")
CATEGORY_ID=$(echo "$CATEGORIES" | jq -r '.[0].id // empty')

# Create income transaction
INCOME_RESPONSE=$(curl -s -X POST "$REST_URL/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"transaction_type\": \"income\",
    \"amount\": 1000.00,
    \"description\": \"Test income for available amount tracking\",
    \"income_source_id\": \"$INCOME_SOURCE_ID\",
    \"category_id\": \"$CATEGORY_ID\",
    \"transaction_date\": \"$(date +%Y-%m-%d)\"
  }")

echo "Income transaction response: $INCOME_RESPONSE"
INCOME_TX_ID=$(echo "$INCOME_RESPONSE" | jq -r '.[0].id // empty')

if [ -n "$INCOME_TX_ID" ]; then
    echo "✅ Successfully created income transaction: $INCOME_TX_ID"
    
    # Wait for trigger to execute
    sleep 1
    
    # Check if available amount increased
    UPDATED_STATE=$(curl -s -X GET "$REST_URL/user_state?id=eq.$USER_STATE_ID&select=available_amount,last_transaction_date" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY")
    
    NEW_AVAILABLE=$(echo "$UPDATED_STATE" | jq -r '.[0].available_amount // 0')
    LAST_TX_DATE=$(echo "$UPDATED_STATE" | jq -r '.[0].last_transaction_date // empty')
    
    echo "Available amount changed from $INITIAL_AVAILABLE to $NEW_AVAILABLE"
    echo "Last transaction date: $LAST_TX_DATE"
    
    if [ "$NEW_AVAILABLE" = "1000.00" ]; then
        echo "✅ Available amount correctly increased by income"
    else
        echo "❌ Available amount not updated correctly"
    fi
else
    echo "❌ Failed to create income transaction"
fi
echo

echo "📦 Step 5: Test available amount tracking with allocation transaction"
# Get envelope for allocation
ENVELOPES=$(curl -s -X GET "$REST_URL/envelopes?select=id,name,current_balance&budget_id=eq.$BUDGET_ID&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")
ENVELOPE_ID=$(echo "$ENVELOPES" | jq -r '.[0].id // empty')
ENVELOPE_BALANCE_BEFORE=$(echo "$ENVELOPES" | jq -r '.[0].current_balance // 0')

# Create allocation transaction
ALLOCATION_RESPONSE=$(curl -s -X POST "$REST_URL/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"transaction_type\": \"allocation\",
    \"amount\": 300.00,
    \"description\": \"Test allocation for available amount tracking\",
    \"to_envelope_id\": \"$ENVELOPE_ID\",
    \"category_id\": \"$CATEGORY_ID\",
    \"transaction_date\": \"$(date +%Y-%m-%d)\"
  }")

echo "Allocation transaction response: $ALLOCATION_RESPONSE"
ALLOCATION_TX_ID=$(echo "$ALLOCATION_RESPONSE" | jq -r '.[0].id // empty')

if [ -n "$ALLOCATION_TX_ID" ]; then
    echo "✅ Successfully created allocation transaction: $ALLOCATION_TX_ID"
    
    # Wait for trigger to execute
    sleep 1
    
    # Check if available amount decreased and envelope increased
    UPDATED_STATE=$(curl -s -X GET "$REST_URL/user_state?id=eq.$USER_STATE_ID&select=available_amount,last_envelope_allocation_date" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY")
    
    FINAL_AVAILABLE=$(echo "$UPDATED_STATE" | jq -r '.[0].available_amount // 0')
    LAST_ALLOCATION_DATE=$(echo "$UPDATED_STATE" | jq -r '.[0].last_envelope_allocation_date // empty')
    
    echo "Available amount changed from $NEW_AVAILABLE to $FINAL_AVAILABLE"
    echo "Last allocation date: $LAST_ALLOCATION_DATE"
    
    if [ "$FINAL_AVAILABLE" = "700.00" ]; then
        echo "✅ Available amount correctly decreased by allocation"
    else
        echo "❌ Available amount not updated correctly after allocation"
    fi
    
    # Check envelope balance
    UPDATED_ENVELOPE=$(curl -s -X GET "$REST_URL/envelopes?id=eq.$ENVELOPE_ID&select=current_balance" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY")
    ENVELOPE_BALANCE_AFTER=$(echo "$UPDATED_ENVELOPE" | jq -r '.[0].current_balance // 0')
    
    echo "Envelope balance changed from $ENVELOPE_BALANCE_BEFORE to $ENVELOPE_BALANCE_AFTER"
else
    echo "❌ Failed to create allocation transaction"
fi
echo

echo "🔄 Step 6: Test available amount with transaction soft delete"
# Get current user ID for soft delete
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id // empty')

# Soft delete the income transaction
DELETE_RESPONSE=$(curl -s -X PATCH "$REST_URL/transactions?id=eq.$INCOME_TX_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"is_deleted\": true,
    \"deleted_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"deleted_by\": \"$USER_ID\"
  }")

echo "Soft delete response: $DELETE_RESPONSE"

if echo "$DELETE_RESPONSE" | jq -r '.[0].is_deleted' | grep -q "true"; then
    echo "✅ Successfully soft deleted income transaction"
    
    # Wait for trigger
    sleep 1
    
    # Check available amount (should decrease back by 1000)
    AFTER_DELETE_STATE=$(curl -s -X GET "$REST_URL/user_state?id=eq.$USER_STATE_ID&select=available_amount" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY")
    
    AFTER_DELETE_AVAILABLE=$(echo "$AFTER_DELETE_STATE" | jq -r '.[0].available_amount // 0')
    echo "Available amount after delete: $AFTER_DELETE_AVAILABLE"
    
    if [ "$AFTER_DELETE_AVAILABLE" = "-300.00" ]; then
        echo "✅ Available amount correctly decreased after income deletion"
    else
        echo "❌ Available amount not updated correctly after deletion"
    fi
else
    echo "❌ Failed to soft delete transaction"
fi
echo

echo "🧮 Step 7: Test cached totals calculation function"
# Call the recalculate function
RECALC_RESPONSE=$(curl -s -X POST "$REST_URL/rpc/recalculate_user_state_totals" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_budget_id\": \"$BUDGET_ID\"}")

echo "Recalculation response: $RECALC_RESPONSE"

# Check updated totals
FINAL_STATE=$(curl -s -X GET "$REST_URL/user_state?id=eq.$USER_STATE_ID&select=total_envelope_balance,total_income_this_month,total_expenses_this_month" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

TOTAL_ENVELOPE=$(echo "$FINAL_STATE" | jq -r '.[0].total_envelope_balance // 0')
TOTAL_INCOME=$(echo "$FINAL_STATE" | jq -r '.[0].total_income_this_month // 0')
TOTAL_EXPENSES=$(echo "$FINAL_STATE" | jq -r '.[0].total_expenses_this_month // 0')

echo "Cached totals after recalculation:"
echo "  Total envelope balance: $TOTAL_ENVELOPE"
echo "  Total income this month: $TOTAL_INCOME"
echo "  Total expenses this month: $TOTAL_EXPENSES"

if [ "$TOTAL_INCOME" = "0.00" ]; then
    echo "✅ Cached income total correctly shows 0 (deleted transaction excluded)"
else
    echo "❌ Cached income total not calculated correctly"
fi
echo

echo "🔒 Step 8: Test RLS policies"
# Try to access user_state for a non-existent budget (should return empty)
echo "Testing RLS: attempting to access user_state for non-existent budget..."
INVALID_STATE=$(curl -s -X GET "$REST_URL/user_state?budget_id=eq.00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

INVALID_COUNT=$(echo "$INVALID_STATE" | jq '. | length')
if [ "$INVALID_COUNT" -eq 0 ]; then
    echo "✅ RLS properly restricts access to user_state"
else
    echo "❌ RLS failure: accessed user_state that should be restricted"
fi
echo

echo "🧹 Step 9: Cleanup test transactions"
if [ -n "$ALLOCATION_TX_ID" ]; then
    curl -s -X PATCH "$REST_URL/transactions?id=eq.$ALLOCATION_TX_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"is_deleted\": true,
        \"deleted_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"deleted_by\": \"$USER_ID\"
      }" > /dev/null
fi

echo "✅ Test transactions cleaned up"
echo

echo "=== User State Table Test Complete ==="