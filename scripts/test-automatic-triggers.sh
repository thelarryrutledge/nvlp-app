#!/bin/bash

# Test script for automatic update triggers
# Tests all triggers work correctly with RLS policies and data updates

echo "=== Testing Automatic Update Triggers ==="
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
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id // empty')

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to get access token"
    exit 1
fi

echo "✅ Successfully authenticated"
echo

echo "📋 Step 2: Get user's budget and initial state"
BUDGETS_RESPONSE=$(curl -s -X GET "$REST_URL/budgets?select=*" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

BUDGET_ID=$(echo "$BUDGETS_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$BUDGET_ID" ]; then
    echo "❌ No budget found for user"
    exit 1
fi

echo "✅ Found budget: $BUDGET_ID"

# Get initial user_state
INITIAL_STATE=$(curl -s -X GET "$REST_URL/user_state?select=*&budget_id=eq.$BUDGET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

INITIAL_AVAILABLE=$(echo "$INITIAL_STATE" | jq -r '.[0].available_amount // 0')
INITIAL_ENVELOPE_TOTAL=$(echo "$INITIAL_STATE" | jq -r '.[0].total_envelope_balance // 0')
INITIAL_INCOME_MONTH=$(echo "$INITIAL_STATE" | jq -r '.[0].total_income_this_month // 0')

echo "Initial state:"
echo "  Available: $INITIAL_AVAILABLE"
echo "  Envelope Total: $INITIAL_ENVELOPE_TOTAL"
echo "  Income This Month: $INITIAL_INCOME_MONTH"
echo

echo "🔄 Step 3: Test envelope balance cache trigger"
# Get an envelope to test with
ENVELOPES=$(curl -s -X GET "$REST_URL/envelopes?select=id,name,current_balance&budget_id=eq.$BUDGET_ID&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

ENVELOPE_ID=$(echo "$ENVELOPES" | jq -r '.[0].id // empty')
ENVELOPE_NAME=$(echo "$ENVELOPES" | jq -r '.[0].name // "Unknown"')
ENVELOPE_BALANCE_BEFORE=$(echo "$ENVELOPES" | jq -r '.[0].current_balance // 0')

echo "Testing with envelope: $ENVELOPE_NAME (ID: $ENVELOPE_ID)"
echo "Current balance: $ENVELOPE_BALANCE_BEFORE"

# Manually update envelope balance to test cache trigger
NEW_BALANCE=999.99
UPDATE_ENVELOPE=$(curl -s -X PATCH "$REST_URL/envelopes?id=eq.$ENVELOPE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"current_balance\": $NEW_BALANCE}")

echo "Updated envelope balance to: $NEW_BALANCE"

# Wait for trigger to execute
sleep 2

# Check if user_state cached total was updated
UPDATED_STATE=$(curl -s -X GET "$REST_URL/user_state?select=total_envelope_balance&budget_id=eq.$BUDGET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

NEW_ENVELOPE_TOTAL=$(echo "$UPDATED_STATE" | jq -r '.[0].total_envelope_balance // 0')

echo "User state envelope total changed from $INITIAL_ENVELOPE_TOTAL to $NEW_ENVELOPE_TOTAL"

# Calculate expected change
EXPECTED_CHANGE=$(echo "$NEW_BALANCE - $ENVELOPE_BALANCE_BEFORE" | bc)
ACTUAL_CHANGE=$(echo "$NEW_ENVELOPE_TOTAL - $INITIAL_ENVELOPE_TOTAL" | bc)

if [ "$EXPECTED_CHANGE" = "$ACTUAL_CHANGE" ]; then
    echo "✅ Envelope balance cache trigger working correctly"
else
    echo "❌ Envelope balance cache trigger not working (expected change: $EXPECTED_CHANGE, actual: $ACTUAL_CHANGE)"
fi

# Restore original balance
curl -s -X PATCH "$REST_URL/envelopes?id=eq.$ENVELOPE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"current_balance\": $ENVELOPE_BALANCE_BEFORE}" > /dev/null
echo

echo "💰 Step 4: Test monthly cache trigger with income transaction"
# Get required IDs for transaction
INCOME_SOURCES=$(curl -s -X GET "$REST_URL/income_sources?select=id&budget_id=eq.$BUDGET_ID&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")
INCOME_SOURCE_ID=$(echo "$INCOME_SOURCES" | jq -r '.[0].id // empty')

CATEGORIES=$(curl -s -X GET "$REST_URL/categories?select=id&budget_id=eq.$BUDGET_ID&category_type=eq.income&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")
CATEGORY_ID=$(echo "$CATEGORIES" | jq -r '.[0].id // empty')

# Create income transaction for current month
TEST_INCOME_AMOUNT=500.00
INCOME_TX=$(curl -s -X POST "$REST_URL/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"transaction_type\": \"income\",
    \"amount\": $TEST_INCOME_AMOUNT,
    \"description\": \"Test income for monthly cache trigger\",
    \"income_source_id\": \"$INCOME_SOURCE_ID\",
    \"category_id\": \"$CATEGORY_ID\",
    \"transaction_date\": \"$(date +%Y-%m-%d)\"
  }")

INCOME_TX_ID=$(echo "$INCOME_TX" | jq -r '.[0].id // empty')

if [ -n "$INCOME_TX_ID" ]; then
    echo "✅ Created test income transaction: $INCOME_TX_ID"
    
    # Wait for triggers
    sleep 3
    
    # Check if monthly cache was updated
    MONTHLY_STATE=$(curl -s -X GET "$REST_URL/user_state?select=total_income_this_month,available_amount&budget_id=eq.$BUDGET_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY")
    
    NEW_INCOME_MONTH=$(echo "$MONTHLY_STATE" | jq -r '.[0].total_income_this_month // 0')
    NEW_AVAILABLE=$(echo "$MONTHLY_STATE" | jq -r '.[0].available_amount // 0')
    
    echo "Monthly income total changed from $INITIAL_INCOME_MONTH to $NEW_INCOME_MONTH"
    echo "Available amount changed from $INITIAL_AVAILABLE to $NEW_AVAILABLE"
    
    EXPECTED_INCOME_CHANGE=$(echo "$TEST_INCOME_AMOUNT" | bc)
    ACTUAL_INCOME_CHANGE=$(echo "$NEW_INCOME_MONTH - $INITIAL_INCOME_MONTH" | bc)
    
    if [ "$EXPECTED_INCOME_CHANGE" = "$ACTUAL_INCOME_CHANGE" ]; then
        echo "✅ Monthly cache trigger working correctly"
    else
        echo "❌ Monthly cache trigger not working correctly"
    fi
else
    echo "❌ Failed to create test income transaction"
fi
echo

echo "👤 Step 5: Test payee last payment trigger"
# Get a payee to test with
PAYEES=$(curl -s -X GET "$REST_URL/payees?select=id,name,last_payment_date,last_payment_amount&budget_id=eq.$BUDGET_ID&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

PAYEE_ID=$(echo "$PAYEES" | jq -r '.[0].id // empty')
PAYEE_NAME=$(echo "$PAYEES" | jq -r '.[0].name // "Unknown"')
LAST_PAYMENT_BEFORE=$(echo "$PAYEES" | jq -r '.[0].last_payment_amount // 0')

echo "Testing with payee: $PAYEE_NAME (ID: $PAYEE_ID)"
echo "Last payment amount before: $LAST_PAYMENT_BEFORE"

# Create expense transaction to test payee trigger
if [ -n "$PAYEE_ID" ] && [ -n "$ENVELOPE_ID" ]; then
    TEST_EXPENSE_AMOUNT=75.50
    EXPENSE_TX=$(curl -s -X POST "$REST_URL/transactions" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d "{
        \"budget_id\": \"$BUDGET_ID\",
        \"transaction_type\": \"expense\",
        \"amount\": $TEST_EXPENSE_AMOUNT,
        \"description\": \"Test expense for payee trigger\",
        \"from_envelope_id\": \"$ENVELOPE_ID\",
        \"payee_id\": \"$PAYEE_ID\",
        \"category_id\": \"$CATEGORY_ID\",
        \"transaction_date\": \"$(date +%Y-%m-%d)\"
      }")

    EXPENSE_TX_ID=$(echo "$EXPENSE_TX" | jq -r '.[0].id // empty')

    if [ -n "$EXPENSE_TX_ID" ]; then
        echo "✅ Created test expense transaction: $EXPENSE_TX_ID"
        
        # Wait for trigger
        sleep 2
        
        # Check if payee last payment was updated
        UPDATED_PAYEE=$(curl -s -X GET "$REST_URL/payees?select=last_payment_date,last_payment_amount&id=eq.$PAYEE_ID" \
          -H "Authorization: Bearer $ACCESS_TOKEN" \
          -H "apikey: $ANON_KEY")
        
        LAST_PAYMENT_AFTER=$(echo "$UPDATED_PAYEE" | jq -r '.[0].last_payment_amount // 0')
        LAST_PAYMENT_DATE=$(echo "$UPDATED_PAYEE" | jq -r '.[0].last_payment_date // "N/A"')
        
        echo "Last payment amount after: $LAST_PAYMENT_AFTER"
        echo "Last payment date: $LAST_PAYMENT_DATE"
        
        if [ "$LAST_PAYMENT_AFTER" = "$TEST_EXPENSE_AMOUNT" ]; then
            echo "✅ Payee last payment trigger working correctly"
        else
            echo "❌ Payee last payment trigger not working correctly"
        fi
    else
        echo "❌ Failed to create test expense transaction"
    fi
else
    echo "⚠️ Missing payee or envelope ID, skipping payee trigger test"
fi
echo

echo "🔧 Step 6: Test data consistency validation function"
CONSISTENCY_CHECK=$(curl -s -X POST "$REST_URL/rpc/validate_budget_consistency" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_budget_id\": \"$BUDGET_ID\"}")

echo "Consistency check response: $CONSISTENCY_CHECK"

if echo "$CONSISTENCY_CHECK" | jq -e '.[0]' > /dev/null; then
    echo "✅ Data consistency validation function working"
    
    # Check for any consistency issues
    ISSUES=$(echo "$CONSISTENCY_CHECK" | jq -r '.[] | select(.is_valid == false) | .check_name')
    if [ -n "$ISSUES" ]; then
        echo "⚠️ Found consistency issues:"
        echo "$ISSUES"
    else
        echo "✅ All consistency checks passed"
    fi
else
    echo "❌ Data consistency validation function failed"
fi
echo

echo "♻️ Step 7: Test cache refresh function"
REFRESH_RESULT=$(curl -s -X POST "$REST_URL/rpc/refresh_budget_cache" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_budget_id\": \"$BUDGET_ID\"}")

echo "Cache refresh result: $REFRESH_RESULT"

# Check that data is still consistent after refresh
FINAL_STATE=$(curl -s -X GET "$REST_URL/user_state?select=*&budget_id=eq.$BUDGET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

FINAL_AVAILABLE=$(echo "$FINAL_STATE" | jq -r '.[0].available_amount // 0')
FINAL_ENVELOPE_TOTAL=$(echo "$FINAL_STATE" | jq -r '.[0].total_envelope_balance // 0')

echo "Final state after cache refresh:"
echo "  Available: $FINAL_AVAILABLE"
echo "  Envelope Total: $FINAL_ENVELOPE_TOTAL"
echo "✅ Cache refresh function working"
echo

echo "🧹 Step 8: Cleanup test transactions"
if [ -n "$INCOME_TX_ID" ]; then
    curl -s -X PATCH "$REST_URL/transactions?id=eq.$INCOME_TX_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"is_deleted\": true,
        \"deleted_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"deleted_by\": \"$USER_ID\"
      }" > /dev/null
fi

if [ -n "$EXPENSE_TX_ID" ]; then
    curl -s -X PATCH "$REST_URL/transactions?id=eq.$EXPENSE_TX_ID" \
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

echo "=== Automatic Update Triggers Test Complete ==="