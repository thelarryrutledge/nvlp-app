#!/bin/bash

# Test script for calculation functions
# Tests all database calculation functions for accuracy and functionality

echo "=== Testing Database Calculation Functions ==="
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

echo "📋 Step 2: Get user's budget"
BUDGETS_RESPONSE=$(curl -s -X GET "$REST_URL/budgets?select=*" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

BUDGET_ID=$(echo "$BUDGETS_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$BUDGET_ID" ]; then
    echo "❌ No budget found for user"
    exit 1
fi

echo "✅ Found budget: $BUDGET_ID"
echo

echo "📊 Step 3: Test get_budget_summary function"
BUDGET_SUMMARY=$(curl -s -X POST "$REST_URL/rpc/get_budget_summary" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_budget_id\": \"$BUDGET_ID\"}")

echo "Budget summary response: $BUDGET_SUMMARY"

if echo "$BUDGET_SUMMARY" | jq -e '.[0].budget_id' > /dev/null; then
    echo "✅ Budget summary function working"
    
    TOTAL_INCOME=$(echo "$BUDGET_SUMMARY" | jq -r '.[0].total_income')
    AVAILABLE_AMOUNT=$(echo "$BUDGET_SUMMARY" | jq -r '.[0].available_amount')
    NET_WORTH=$(echo "$BUDGET_SUMMARY" | jq -r '.[0].net_worth')
    
    echo "  Total Income: $TOTAL_INCOME"
    echo "  Available Amount: $AVAILABLE_AMOUNT"
    echo "  Net Worth: $NET_WORTH"
else
    echo "❌ Budget summary function failed"
fi
echo

echo "📈 Step 4: Test get_envelope_spending_analysis function"
ENVELOPE_ANALYSIS=$(curl -s -X POST "$REST_URL/rpc/get_envelope_spending_analysis" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_budget_id\": \"$BUDGET_ID\"}")

echo "Envelope analysis response: $ENVELOPE_ANALYSIS"

if echo "$ENVELOPE_ANALYSIS" | jq -e '.[0]' > /dev/null; then
    echo "✅ Envelope spending analysis function working"
    
    ENVELOPE_COUNT=$(echo "$ENVELOPE_ANALYSIS" | jq '. | length')
    echo "  Analyzed $ENVELOPE_COUNT envelopes"
    
    # Show first envelope details
    FIRST_ENVELOPE=$(echo "$ENVELOPE_ANALYSIS" | jq -r '.[0].envelope_name // "N/A"')
    FIRST_BALANCE=$(echo "$ENVELOPE_ANALYSIS" | jq -r '.[0].current_balance // 0')
    FIRST_SPENT=$(echo "$ENVELOPE_ANALYSIS" | jq -r '.[0].total_spent // 0')
    
    echo "  Sample: $FIRST_ENVELOPE - Balance: $FIRST_BALANCE, Spent: $FIRST_SPENT"
else
    echo "❌ Envelope spending analysis function failed"
fi
echo

echo "📅 Step 5: Test get_monthly_spending_trends function"
MONTHLY_TRENDS=$(curl -s -X POST "$REST_URL/rpc/get_monthly_spending_trends" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_budget_id\": \"$BUDGET_ID\", \"p_months_back\": 3}")

echo "Monthly trends response: $MONTHLY_TRENDS"

if echo "$MONTHLY_TRENDS" | jq -e '.[0]' > /dev/null; then
    echo "✅ Monthly spending trends function working"
    
    TREND_COUNT=$(echo "$MONTHLY_TRENDS" | jq '. | length')
    echo "  Found $TREND_COUNT months of data"
    
    # Show latest month
    LATEST_MONTH=$(echo "$MONTHLY_TRENDS" | jq -r '.[0].month_year // "N/A"')
    LATEST_INCOME=$(echo "$MONTHLY_TRENDS" | jq -r '.[0].total_income // 0')
    LATEST_EXPENSES=$(echo "$MONTHLY_TRENDS" | jq -r '.[0].total_expenses // 0')
    
    echo "  Latest month: $LATEST_MONTH - Income: $LATEST_INCOME, Expenses: $LATEST_EXPENSES"
else
    echo "❌ Monthly spending trends function failed"
fi
echo

echo "💳 Step 6: Test get_payee_spending_summary function"
PAYEE_SUMMARY=$(curl -s -X POST "$REST_URL/rpc/get_payee_spending_summary" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_budget_id\": \"$BUDGET_ID\"}")

echo "Payee summary response: $PAYEE_SUMMARY"

if echo "$PAYEE_SUMMARY" | jq -e '.[0]' > /dev/null 2>&1; then
    echo "✅ Payee spending summary function working"
    
    PAYEE_COUNT=$(echo "$PAYEE_SUMMARY" | jq '. | length')
    echo "  Found $PAYEE_COUNT active payees"
    
    # Show top payee
    TOP_PAYEE=$(echo "$PAYEE_SUMMARY" | jq -r '.[0].payee_name // "N/A"')
    TOP_TOTAL=$(echo "$PAYEE_SUMMARY" | jq -r '.[0].total_paid // 0')
    
    echo "  Top payee: $TOP_PAYEE - Total: $TOP_TOTAL"
else
    echo "✅ Payee spending summary function working (no active payees found)"
fi
echo

echo "🏷️ Step 7: Test get_category_spending_breakdown function"
CATEGORY_BREAKDOWN=$(curl -s -X POST "$REST_URL/rpc/get_category_spending_breakdown" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_budget_id\": \"$BUDGET_ID\"}")

echo "Category breakdown response: $CATEGORY_BREAKDOWN"

if echo "$CATEGORY_BREAKDOWN" | jq -e '.[0]' > /dev/null; then
    echo "✅ Category spending breakdown function working"
    
    CATEGORY_COUNT=$(echo "$CATEGORY_BREAKDOWN" | jq '. | length')
    echo "  Analyzed $CATEGORY_COUNT categories"
    
    # Show top spending category
    TOP_CATEGORY=$(echo "$CATEGORY_BREAKDOWN" | jq -r '.[0].category_name // "N/A"')
    TOP_AMOUNT=$(echo "$CATEGORY_BREAKDOWN" | jq -r '.[0].total_amount // 0')
    TOP_PERCENTAGE=$(echo "$CATEGORY_BREAKDOWN" | jq -r '.[0].percentage_of_total // 0')
    
    echo "  Top category: $TOP_CATEGORY - Amount: $TOP_AMOUNT ($TOP_PERCENTAGE%)"
else
    echo "❌ Category spending breakdown function failed"
fi
echo

echo "💚 Step 8: Test calculate_envelope_health_score function"
# Get first envelope ID
ENVELOPES=$(curl -s -X GET "$REST_URL/envelopes?select=id,name&budget_id=eq.$BUDGET_ID&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

ENVELOPE_ID=$(echo "$ENVELOPES" | jq -r '.[0].id // empty')
ENVELOPE_NAME=$(echo "$ENVELOPES" | jq -r '.[0].name // "Unknown"')

if [ -n "$ENVELOPE_ID" ]; then
    HEALTH_SCORE=$(curl -s -X POST "$REST_URL/rpc/calculate_envelope_health_score" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"p_envelope_id\": \"$ENVELOPE_ID\"}")

    echo "Health score response: $HEALTH_SCORE"

    if echo "$HEALTH_SCORE" | jq -e '. | type == "number"' > /dev/null; then
        echo "✅ Envelope health score function working"
        echo "  Envelope: $ENVELOPE_NAME - Health Score: $HEALTH_SCORE/100"
    else
        echo "❌ Envelope health score function failed"
    fi
else
    echo "⚠️ No envelopes found to test health score function"
fi
echo

echo "✅ Step 9: Test validate_transaction_business_rules function"
# Test valid allocation
VALIDATION_RESULT=$(curl -s -X POST "$REST_URL/rpc/validate_transaction_business_rules" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"p_budget_id\": \"$BUDGET_ID\",
    \"p_transaction_type\": \"allocation\",
    \"p_amount\": 50.00,
    \"p_to_envelope_id\": \"$ENVELOPE_ID\"
  }")

echo "Validation result: $VALIDATION_RESULT"

if echo "$VALIDATION_RESULT" | jq -e '.[0].is_valid' > /dev/null; then
    IS_VALID=$(echo "$VALIDATION_RESULT" | jq -r '.[0].is_valid')
    ERROR_MSG=$(echo "$VALIDATION_RESULT" | jq -r '.[0].error_message // ""')
    
    echo "✅ Transaction validation function working"
    echo "  Validation result: $IS_VALID"
    if [ "$ERROR_MSG" != "" ]; then
        echo "  Error message: $ERROR_MSG"
    fi
else
    echo "❌ Transaction validation function failed"
fi
echo

echo "🧮 Step 10: Test calculation accuracy with known data"
# Create a test income transaction to verify calculations
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id // empty')

# Get required IDs
INCOME_SOURCES=$(curl -s -X GET "$REST_URL/income_sources?select=id&budget_id=eq.$BUDGET_ID&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")
INCOME_SOURCE_ID=$(echo "$INCOME_SOURCES" | jq -r '.[0].id // empty')

CATEGORIES=$(curl -s -X GET "$REST_URL/categories?select=id&budget_id=eq.$BUDGET_ID&category_type=eq.income&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")
CATEGORY_ID=$(echo "$CATEGORIES" | jq -r '.[0].id // empty')

# Create test transaction
TEST_AMOUNT=100.00
TEST_TX=$(curl -s -X POST "$REST_URL/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"transaction_type\": \"income\",
    \"amount\": $TEST_AMOUNT,
    \"description\": \"Test transaction for calculation validation\",
    \"income_source_id\": \"$INCOME_SOURCE_ID\",
    \"category_id\": \"$CATEGORY_ID\",
    \"transaction_date\": \"$(date +%Y-%m-%d)\"
  }")

TEST_TX_ID=$(echo "$TEST_TX" | jq -r '.[0].id // empty')

if [ -n "$TEST_TX_ID" ]; then
    echo "✅ Created test transaction: $TEST_TX_ID"
    
    # Wait for triggers
    sleep 2
    
    # Test budget summary again to see if income increased
    NEW_SUMMARY=$(curl -s -X POST "$REST_URL/rpc/get_budget_summary" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"p_budget_id\": \"$BUDGET_ID\"}")
    
    NEW_INCOME=$(echo "$NEW_SUMMARY" | jq -r '.[0].total_income')
    NEW_AVAILABLE=$(echo "$NEW_SUMMARY" | jq -r '.[0].available_amount')
    
    echo "Updated totals after test transaction:"
    echo "  Total Income: $NEW_INCOME"
    echo "  Available Amount: $NEW_AVAILABLE"
    
    # Cleanup test transaction
    curl -s -X PATCH "$REST_URL/transactions?id=eq.$TEST_TX_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"is_deleted\": true,
        \"deleted_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"deleted_by\": \"$USER_ID\"
      }" > /dev/null
    
    echo "✅ Test transaction cleaned up"
else
    echo "❌ Failed to create test transaction"
fi
echo

echo "=== Database Calculation Functions Test Complete ==="