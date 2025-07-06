#!/bin/bash

# Test script for transactions table functionality
# Tests CRUD operations, constraints, money flow model, and balance updates

echo "=== Testing Transactions Table ==="
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

echo "📋 Step 2: Get user's budget and related data"
BUDGETS_RESPONSE=$(curl -s -X GET "$REST_URL/budgets?select=*" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

BUDGET_ID=$(echo "$BUDGETS_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$BUDGET_ID" ]; then
    echo "❌ No budget found for user"
    exit 1
fi

echo "✅ Found budget: $BUDGET_ID"

# Get income sources, envelopes, payees, and categories for testing
INCOME_SOURCES=$(curl -s -X GET "$REST_URL/income_sources?select=id,name&budget_id=eq.$BUDGET_ID&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")
INCOME_SOURCE_ID=$(echo "$INCOME_SOURCES" | jq -r '.[0].id // empty')

ENVELOPES=$(curl -s -X GET "$REST_URL/envelopes?select=id,name,current_balance&budget_id=eq.$BUDGET_ID&limit=2" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")
ENVELOPE_ID_1=$(echo "$ENVELOPES" | jq -r '.[0].id // empty')
ENVELOPE_ID_2=$(echo "$ENVELOPES" | jq -r '.[1].id // empty')
ENVELOPE_1_BALANCE=$(echo "$ENVELOPES" | jq -r '.[0].current_balance // 0')

PAYEES=$(curl -s -X GET "$REST_URL/payees?select=id,name&budget_id=eq.$BUDGET_ID&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")
PAYEE_ID=$(echo "$PAYEES" | jq -r '.[0].id // empty')

CATEGORIES=$(curl -s -X GET "$REST_URL/categories?select=id,name&budget_id=eq.$BUDGET_ID&category_type=eq.expense&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")
CATEGORY_ID=$(echo "$CATEGORIES" | jq -r '.[0].id // empty')

echo "Income Source: $INCOME_SOURCE_ID"
echo "Envelopes: $ENVELOPE_ID_1, $ENVELOPE_ID_2"
echo "Payee: $PAYEE_ID"
echo "Category: $CATEGORY_ID"
echo

echo "💰 Step 3: Test INCOME transaction (NULL → NULL)"
INCOME_RESPONSE=$(curl -s -X POST "$REST_URL/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"transaction_type\": \"income\",
    \"amount\": 1000.00,
    \"description\": \"Monthly salary\",
    \"income_source_id\": \"$INCOME_SOURCE_ID\",
    \"category_id\": \"$CATEGORY_ID\",
    \"transaction_date\": \"2025-07-06\"
  }")

echo "Income response: $INCOME_RESPONSE"
INCOME_TX_ID=$(echo "$INCOME_RESPONSE" | jq -r '.[0].id // empty')

if [ -n "$INCOME_TX_ID" ]; then
    echo "✅ Successfully created income transaction: $INCOME_TX_ID"
else
    echo "❌ Failed to create income transaction"
fi
echo

echo "📦 Step 4: Test ALLOCATION transaction (NULL → envelope)"
ALLOCATION_RESPONSE=$(curl -s -X POST "$REST_URL/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"transaction_type\": \"allocation\",
    \"amount\": 200.00,
    \"description\": \"Allocate to groceries\",
    \"to_envelope_id\": \"$ENVELOPE_ID_1\",
    \"category_id\": \"$CATEGORY_ID\",
    \"transaction_date\": \"2025-07-06\"
  }")

echo "Allocation response: $ALLOCATION_RESPONSE"
ALLOCATION_TX_ID=$(echo "$ALLOCATION_RESPONSE" | jq -r '.[0].id // empty')

if [ -n "$ALLOCATION_TX_ID" ]; then
    echo "✅ Successfully created allocation transaction: $ALLOCATION_TX_ID"
    
    # Check envelope balance increased
    NEW_ENVELOPE=$(curl -s -X GET "$REST_URL/envelopes?id=eq.$ENVELOPE_ID_1&select=current_balance" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY")
    NEW_BALANCE=$(echo "$NEW_ENVELOPE" | jq -r '.[0].current_balance // 0')
    echo "Envelope balance changed from $ENVELOPE_1_BALANCE to $NEW_BALANCE"
else
    echo "❌ Failed to create allocation transaction"
fi
echo

echo "💸 Step 5: Test EXPENSE transaction (envelope → NULL + payee)"
EXPENSE_RESPONSE=$(curl -s -X POST "$REST_URL/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"transaction_type\": \"expense\",
    \"amount\": 50.00,
    \"description\": \"Grocery shopping\",
    \"from_envelope_id\": \"$ENVELOPE_ID_1\",
    \"payee_id\": \"$PAYEE_ID\",
    \"category_id\": \"$CATEGORY_ID\",
    \"transaction_date\": \"2025-07-06\",
    \"reference_number\": \"CHK-001\"
  }")

echo "Expense response: $EXPENSE_RESPONSE"
EXPENSE_TX_ID=$(echo "$EXPENSE_RESPONSE" | jq -r '.[0].id // empty')

if [ -n "$EXPENSE_TX_ID" ]; then
    echo "✅ Successfully created expense transaction: $EXPENSE_TX_ID"
else
    echo "❌ Failed to create expense transaction"
fi
echo

echo "🔄 Step 6: Test TRANSFER transaction (envelope → envelope)"
TRANSFER_RESPONSE=$(curl -s -X POST "$REST_URL/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"transaction_type\": \"transfer\",
    \"amount\": 25.00,
    \"description\": \"Transfer to savings\",
    \"from_envelope_id\": \"$ENVELOPE_ID_1\",
    \"to_envelope_id\": \"$ENVELOPE_ID_2\",
    \"transaction_date\": \"2025-07-06\",
    \"notes\": \"Monthly savings transfer\"
  }")

echo "Transfer response: $TRANSFER_RESPONSE"
TRANSFER_TX_ID=$(echo "$TRANSFER_RESPONSE" | jq -r '.[0].id // empty')

if [ -n "$TRANSFER_TX_ID" ]; then
    echo "✅ Successfully created transfer transaction: $TRANSFER_TX_ID"
else
    echo "❌ Failed to create transfer transaction"
fi
echo

echo "💳 Step 7: Test DEBT_PAYMENT transaction (envelope → NULL + payee)"
DEBT_PAYMENT_RESPONSE=$(curl -s -X POST "$REST_URL/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"transaction_type\": \"debt_payment\",
    \"amount\": 100.00,
    \"description\": \"Credit card payment\",
    \"from_envelope_id\": \"$ENVELOPE_ID_1\",
    \"payee_id\": \"$PAYEE_ID\",
    \"category_id\": \"$CATEGORY_ID\",
    \"transaction_date\": \"2025-07-06\",
    \"reference_number\": \"CC-PAYMENT-001\"
  }")

echo "Debt payment response: $DEBT_PAYMENT_RESPONSE"
DEBT_TX_ID=$(echo "$DEBT_PAYMENT_RESPONSE" | jq -r '.[0].id // empty')

if [ -n "$DEBT_TX_ID" ]; then
    echo "✅ Successfully created debt_payment transaction: $DEBT_TX_ID"
else
    echo "❌ Failed to create debt_payment transaction"
fi
echo

echo "🚫 Step 8: Test invalid transaction flows"

# Test invalid income (with payee)
echo "Testing invalid income with payee (should fail):"
INVALID_INCOME=$(curl -s -X POST "$REST_URL/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"transaction_type\": \"income\",
    \"amount\": 100.00,
    \"payee_id\": \"$PAYEE_ID\",
    \"income_source_id\": \"$INCOME_SOURCE_ID\"
  }")

if echo "$INVALID_INCOME" | grep -q "violates check constraint"; then
    echo "✅ Invalid income flow correctly rejected"
else
    echo "❌ Invalid income flow not rejected: $INVALID_INCOME"
fi

# Test invalid expense (without payee)
echo ""
echo "Testing invalid expense without payee (should fail):"
INVALID_EXPENSE=$(curl -s -X POST "$REST_URL/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"transaction_type\": \"expense\",
    \"amount\": 50.00,
    \"from_envelope_id\": \"$ENVELOPE_ID_1\"
  }")

if echo "$INVALID_EXPENSE" | grep -q "violates check constraint"; then
    echo "✅ Invalid expense flow correctly rejected"
else
    echo "❌ Invalid expense flow not rejected: $INVALID_EXPENSE"
fi

# Test self-transfer
echo ""
echo "Testing self-transfer (should fail):"
SELF_TRANSFER=$(curl -s -X POST "$REST_URL/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"transaction_type\": \"transfer\",
    \"amount\": 50.00,
    \"from_envelope_id\": \"$ENVELOPE_ID_1\",
    \"to_envelope_id\": \"$ENVELOPE_ID_1\"
  }")

if echo "$SELF_TRANSFER" | grep -q "violates check constraint"; then
    echo "✅ Self-transfer correctly rejected"
else
    echo "❌ Self-transfer not rejected: $SELF_TRANSFER"
fi
echo

echo "🗑️ Step 9: Test soft delete"
if [ -n "$EXPENSE_TX_ID" ]; then
    DELETE_RESPONSE=$(curl -s -X PATCH "$REST_URL/transactions?id=eq.$EXPENSE_TX_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d "{
        \"is_deleted\": true,
        \"deleted_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
      }")
    
    echo "Soft delete response: $DELETE_RESPONSE"
    
    if echo "$DELETE_RESPONSE" | jq -r '.[0].is_deleted' | grep -q "true"; then
        echo "✅ Successfully soft deleted transaction"
        
        # Check if envelope balance was restored
        RESTORED_ENVELOPE=$(curl -s -X GET "$REST_URL/envelopes?id=eq.$ENVELOPE_ID_1&select=current_balance" \
          -H "Authorization: Bearer $ACCESS_TOKEN" \
          -H "apikey: $ANON_KEY")
        RESTORED_BALANCE=$(echo "$RESTORED_ENVELOPE" | jq -r '.[0].current_balance // 0')
        echo "Envelope balance after soft delete: $RESTORED_BALANCE"
    else
        echo "❌ Failed to soft delete transaction"
    fi
fi
echo

echo "📊 Step 10: Test transaction queries"
# Get all transactions for the budget
ALL_TRANSACTIONS=$(curl -s -X GET "$REST_URL/transactions?select=*&budget_id=eq.$BUDGET_ID&is_deleted=eq.false&order=transaction_date.desc" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

TRANSACTION_COUNT=$(echo "$ALL_TRANSACTIONS" | jq '. | length')
echo "Total active transactions: $TRANSACTION_COUNT"

# Count by type
for type in income allocation expense transfer debt_payment; do
    TYPE_COUNT=$(echo "$ALL_TRANSACTIONS" | jq "[.[] | select(.transaction_type == \"$type\")] | length")
    echo "  $type: $TYPE_COUNT transactions"
done

echo
echo "=== Transactions Table Test Complete ==="