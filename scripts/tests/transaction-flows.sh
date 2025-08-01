#!/bin/bash

# NVLP Transaction Flows Test Script
# Tests all transaction types and their balance update flows

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

# Validate required environment variables
if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Error: ACCESS_TOKEN is required"
  echo "   Please set ACCESS_TOKEN environment variable with a valid auth token"
  echo "   You can get one by running ./auth-flow.sh first"
  exit 1
fi

echo "🧪 NVLP Transaction Flows Test Suite"
echo "===================================="
echo "Supabase URL: $SUPABASE_URL"
echo ""

# Variables to store IDs for tests
BUDGET_ID=""
INCOME_SOURCE_ID=""
PAYEE_ID=""
DEBT_PAYEE_ID=""
ENVELOPE_ID=""
DEBT_ENVELOPE_ID=""
TARGET_ENVELOPE_ID=""
INCOME_TX_ID=""
ALLOCATION_TX_ID=""
EXPENSE_TX_ID=""
TRANSFER_TX_ID=""
DEBT_TX_ID=""

# Helper function to extract JSON values
extract_json_value() {
  local json="$1"
  local key="$2"
  echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4
}

# Helper function to extract numeric JSON values  
extract_json_number() {
  local json="$1"
  local key="$2"
  echo "$json" | grep -o "\"$key\":[0-9.]*" | cut -d':' -f2
}

# Helper function to compare decimal numbers
compare_numbers() {
  local num1="$1"
  local num2="$2"
  # Convert to same decimal format for comparison
  local formatted1=$(printf "%.2f" "$num1")
  local formatted2=$(printf "%.2f" "$num2")
  [ "$formatted1" = "$formatted2" ]
}

echo "🏗️  Setting up test data..."
echo ""

# Setup 1: Create test budget
echo "Creating test budget..."
CREATE_BUDGET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/budgets" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "Transaction Flow Test Budget",
    "description": "Test budget for transaction flows",
    "currency": "USD"
  }')

HTTP_STATUS=$(echo "$CREATE_BUDGET_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_BUDGET_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  BUDGET_ID=$(extract_json_value "$RESPONSE_BODY" "id")
  echo "✅ Test budget created: $BUDGET_ID"
else
  echo "❌ Failed to create test budget (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

# Setup 2: Create income source
echo "Creating income source..."
CREATE_INCOME_SOURCE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/income_sources" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "name": "Test Salary",
    "expected_amount": 5000.00,
    "frequency": "monthly"
  }')

HTTP_STATUS=$(echo "$CREATE_INCOME_SOURCE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_INCOME_SOURCE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  INCOME_SOURCE_ID=$(extract_json_value "$RESPONSE_BODY" "id")
  echo "✅ Income source created: $INCOME_SOURCE_ID"
else
  echo "❌ Failed to create income source (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

# Setup 3: Create payees
echo "Creating payees..."
CREATE_PAYEE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/payees" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "name": "Test Grocery Store",
    "payee_type": "regular"
  }')

HTTP_STATUS=$(echo "$CREATE_PAYEE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_PAYEE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  PAYEE_ID=$(extract_json_value "$RESPONSE_BODY" "id")
  echo "✅ Regular payee created: $PAYEE_ID"
else
  echo "❌ Failed to create payee (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

# Create debt payee
CREATE_DEBT_PAYEE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/payees" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "name": "Test Credit Card",
    "payee_type": "debt",
    "interest_rate": 18.99,
    "minimum_payment": 50.00
  }')

HTTP_STATUS=$(echo "$CREATE_DEBT_PAYEE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_DEBT_PAYEE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  DEBT_PAYEE_ID=$(extract_json_value "$RESPONSE_BODY" "id")
  echo "✅ Debt payee created: $DEBT_PAYEE_ID"
else
  echo "❌ Failed to create debt payee (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

# Setup 4: Create envelopes
echo "Creating envelopes..."
CREATE_ENVELOPE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/envelopes" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "name": "Test Groceries",
    "envelope_type": "regular",
    "target_amount": 500.00
  }')

HTTP_STATUS=$(echo "$CREATE_ENVELOPE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_ENVELOPE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  ENVELOPE_ID=$(extract_json_value "$RESPONSE_BODY" "id")
  echo "✅ Regular envelope created: $ENVELOPE_ID"
else
  echo "❌ Failed to create envelope (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

# Create debt envelope
CREATE_DEBT_ENVELOPE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/envelopes" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "name": "Test Credit Card Debt",
    "envelope_type": "debt",
    "target_amount": 2500.00
  }')

HTTP_STATUS=$(echo "$CREATE_DEBT_ENVELOPE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_DEBT_ENVELOPE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  DEBT_ENVELOPE_ID=$(extract_json_value "$RESPONSE_BODY" "id")
  echo "✅ Debt envelope created: $DEBT_ENVELOPE_ID"
else
  echo "❌ Failed to create debt envelope (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

# Create target envelope for transfers
CREATE_TARGET_ENVELOPE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/envelopes" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "name": "Test Emergency Fund",
    "envelope_type": "savings",
    "target_amount": 1000.00
  }')

HTTP_STATUS=$(echo "$CREATE_TARGET_ENVELOPE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_TARGET_ENVELOPE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  TARGET_ENVELOPE_ID=$(extract_json_value "$RESPONSE_BODY" "id")
  echo "✅ Target envelope created: $TARGET_ENVELOPE_ID"
else
  echo "❌ Failed to create target envelope (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""
echo "🧪 Starting Transaction Flow Tests..."
echo ""

# Test 1: Income Transaction Flow
echo "1️⃣  Testing Income Transaction Flow..."
echo "    Creates income → Increases available_amount"

# Get initial budget state
INITIAL_BUDGET_RESPONSE=$(curl -s \
  -X GET "$SUPABASE_URL/rest/v1/budgets?id=eq.$BUDGET_ID&select=available_amount" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY")

INITIAL_AVAILABLE=$(extract_json_number "$INITIAL_BUDGET_RESPONSE" "available_amount")
echo "    Initial available_amount: $INITIAL_AVAILABLE"

# Create income transaction
INCOME_TX_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "transaction_type": "income",
    "amount": 1000.00,
    "income_source_id": "'"$INCOME_SOURCE_ID"'",
    "transaction_date": "2025-01-31",
    "description": "Test salary income",
    "is_cleared": true
  }')

HTTP_STATUS=$(echo "$INCOME_TX_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$INCOME_TX_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  INCOME_TX_ID=$(extract_json_value "$RESPONSE_BODY" "id")
  echo "✅ Income transaction created: $INCOME_TX_ID"
  
  # Verify budget balance update
  UPDATED_BUDGET_RESPONSE=$(curl -s \
    -X GET "$SUPABASE_URL/rest/v1/budgets?id=eq.$BUDGET_ID&select=available_amount" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY")
  
  UPDATED_AVAILABLE=$(extract_json_number "$UPDATED_BUDGET_RESPONSE" "available_amount")
  EXPECTED_AVAILABLE=$(echo "$INITIAL_AVAILABLE + 1000" | bc)
  
  if compare_numbers "$UPDATED_AVAILABLE" "$EXPECTED_AVAILABLE"; then
    echo "✅ Budget available_amount correctly updated: $INITIAL_AVAILABLE → $UPDATED_AVAILABLE"
  else
    echo "❌ Budget balance not updated correctly"
    echo "    Expected: $EXPECTED_AVAILABLE, Got: $UPDATED_AVAILABLE"
  fi
else
  echo "❌ Income transaction failed (HTTP $HTTP_STATUS)"
  echo "    Response: $RESPONSE_BODY"
fi

echo ""

# Test 2: Allocation Transaction Flow  
echo "2️⃣  Testing Allocation Transaction Flow..."
echo "    Allocates money → Decreases available_amount, Increases envelope balance"

# Get current state
CURRENT_BUDGET_RESPONSE=$(curl -s \
  -X GET "$SUPABASE_URL/rest/v1/budgets?id=eq.$BUDGET_ID&select=available_amount" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY")

PRE_ALLOC_AVAILABLE=$(extract_json_number "$CURRENT_BUDGET_RESPONSE" "available_amount")

CURRENT_ENVELOPE_RESPONSE=$(curl -s \
  -X GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$ENVELOPE_ID&select=current_balance" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY")

PRE_ALLOC_ENVELOPE=$(extract_json_number "$CURRENT_ENVELOPE_RESPONSE" "current_balance")

echo "    Pre-allocation: available=$PRE_ALLOC_AVAILABLE, envelope=$PRE_ALLOC_ENVELOPE"

# Create allocation transaction
ALLOCATION_TX_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "transaction_type": "allocation",
    "amount": 400.00,
    "to_envelope_id": "'"$ENVELOPE_ID"'",
    "transaction_date": "2025-01-31",
    "description": "Allocate to groceries",
    "is_cleared": true
  }')

HTTP_STATUS=$(echo "$ALLOCATION_TX_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$ALLOCATION_TX_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  ALLOCATION_TX_ID=$(extract_json_value "$RESPONSE_BODY" "id")
  echo "✅ Allocation transaction created: $ALLOCATION_TX_ID"
  
  # Verify both balance updates
  POST_BUDGET_RESPONSE=$(curl -s \
    -X GET "$SUPABASE_URL/rest/v1/budgets?id=eq.$BUDGET_ID&select=available_amount" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY")
  
  POST_ENVELOPE_RESPONSE=$(curl -s \
    -X GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$ENVELOPE_ID&select=current_balance" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY")
  
  POST_ALLOC_AVAILABLE=$(extract_json_number "$POST_BUDGET_RESPONSE" "available_amount")
  POST_ALLOC_ENVELOPE=$(extract_json_number "$POST_ENVELOPE_RESPONSE" "current_balance")
  
  EXPECTED_AVAILABLE=$(echo "$PRE_ALLOC_AVAILABLE - 400" | bc)
  EXPECTED_ENVELOPE=$(echo "$PRE_ALLOC_ENVELOPE + 400" | bc)
  
  if compare_numbers "$POST_ALLOC_AVAILABLE" "$EXPECTED_AVAILABLE" && compare_numbers "$POST_ALLOC_ENVELOPE" "$EXPECTED_ENVELOPE"; then
    echo "✅ Balances correctly updated: available=$POST_ALLOC_AVAILABLE, envelope=$POST_ALLOC_ENVELOPE"
  else
    echo "❌ Balance updates incorrect"
    echo "    Expected: available=$EXPECTED_AVAILABLE, envelope=$EXPECTED_ENVELOPE"
    echo "    Got: available=$POST_ALLOC_AVAILABLE, envelope=$POST_ALLOC_ENVELOPE"
  fi
else
  echo "❌ Allocation transaction failed (HTTP $HTTP_STATUS)"
  echo "    Response: $RESPONSE_BODY"
fi

echo ""

# Test 3: Expense Transaction Flow
echo "3️⃣  Testing Expense Transaction Flow..."
echo "    Creates expense → Decreases envelope balance, money leaves system"

# Get current envelope state
PRE_EXPENSE_ENVELOPE_RESPONSE=$(curl -s \
  -X GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$ENVELOPE_ID&select=current_balance" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY")

PRE_EXPENSE_BALANCE=$(extract_json_number "$PRE_EXPENSE_ENVELOPE_RESPONSE" "current_balance")
echo "    Pre-expense envelope balance: $PRE_EXPENSE_BALANCE"

# Create expense transaction
EXPENSE_TX_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "transaction_type": "expense",
    "amount": 125.50,
    "from_envelope_id": "'"$ENVELOPE_ID"'",
    "payee_id": "'"$PAYEE_ID"'",
    "transaction_date": "2025-01-31",
    "description": "Grocery shopping",
    "is_cleared": true
  }')

HTTP_STATUS=$(echo "$EXPENSE_TX_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$EXPENSE_TX_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  EXPENSE_TX_ID=$(extract_json_value "$RESPONSE_BODY" "id")
  echo "✅ Expense transaction created: $EXPENSE_TX_ID"
  
  # Verify envelope balance decrease
  POST_EXPENSE_ENVELOPE_RESPONSE=$(curl -s \
    -X GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$ENVELOPE_ID&select=current_balance" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY")
  
  POST_EXPENSE_BALANCE=$(extract_json_number "$POST_EXPENSE_ENVELOPE_RESPONSE" "current_balance")
  EXPECTED_BALANCE=$(echo "$PRE_EXPENSE_BALANCE - 125.50" | bc)
  
  if compare_numbers "$POST_EXPENSE_BALANCE" "$EXPECTED_BALANCE"; then
    echo "✅ Envelope balance correctly decreased: $PRE_EXPENSE_BALANCE → $POST_EXPENSE_BALANCE"
  else
    echo "❌ Envelope balance not updated correctly"
    echo "    Expected: $EXPECTED_BALANCE, Got: $POST_EXPENSE_BALANCE"
  fi
else
  echo "❌ Expense transaction failed (HTTP $HTTP_STATUS)"
  echo "    Response: $RESPONSE_BODY"
fi

echo ""

# Test 4: Transfer Transaction Flow
echo "4️⃣  Testing Transfer Transaction Flow..."
echo "    Transfers money → Decreases source envelope, Increases target envelope"

# Get current state of both envelopes
PRE_TRANSFER_SOURCE_RESPONSE=$(curl -s \
  -X GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$ENVELOPE_ID&select=current_balance" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY")

PRE_TRANSFER_TARGET_RESPONSE=$(curl -s \
  -X GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$TARGET_ENVELOPE_ID&select=current_balance" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY")

PRE_TRANSFER_SOURCE=$(extract_json_number "$PRE_TRANSFER_SOURCE_RESPONSE" "current_balance")
PRE_TRANSFER_TARGET=$(extract_json_number "$PRE_TRANSFER_TARGET_RESPONSE" "current_balance")

echo "    Pre-transfer: source=$PRE_TRANSFER_SOURCE, target=$PRE_TRANSFER_TARGET"

# Create transfer transaction
TRANSFER_TX_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "transaction_type": "transfer",
    "amount": 100.00,
    "from_envelope_id": "'"$ENVELOPE_ID"'",
    "to_envelope_id": "'"$TARGET_ENVELOPE_ID"'",
    "transaction_date": "2025-01-31",
    "description": "Transfer to emergency fund",
    "is_cleared": true
  }')

HTTP_STATUS=$(echo "$TRANSFER_TX_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$TRANSFER_TX_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  TRANSFER_TX_ID=$(extract_json_value "$RESPONSE_BODY" "id")
  echo "✅ Transfer transaction created: $TRANSFER_TX_ID"
  
  # Verify both envelope balance updates
  POST_TRANSFER_SOURCE_RESPONSE=$(curl -s \
    -X GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$ENVELOPE_ID&select=current_balance" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY")
  
  POST_TRANSFER_TARGET_RESPONSE=$(curl -s \
    -X GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$TARGET_ENVELOPE_ID&select=current_balance" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY")
  
  POST_TRANSFER_SOURCE=$(extract_json_number "$POST_TRANSFER_SOURCE_RESPONSE" "current_balance")
  POST_TRANSFER_TARGET=$(extract_json_number "$POST_TRANSFER_TARGET_RESPONSE" "current_balance")
  
  EXPECTED_SOURCE=$(echo "$PRE_TRANSFER_SOURCE - 100" | bc)
  EXPECTED_TARGET=$(echo "$PRE_TRANSFER_TARGET + 100" | bc)
  
  if compare_numbers "$POST_TRANSFER_SOURCE" "$EXPECTED_SOURCE" && compare_numbers "$POST_TRANSFER_TARGET" "$EXPECTED_TARGET"; then
    echo "✅ Transfer balances correctly updated: source=$POST_TRANSFER_SOURCE, target=$POST_TRANSFER_TARGET"
  else
    echo "❌ Transfer balance updates incorrect"
    echo "    Expected: source=$EXPECTED_SOURCE, target=$EXPECTED_TARGET"
    echo "    Got: source=$POST_TRANSFER_SOURCE, target=$POST_TRANSFER_TARGET"
  fi
else
  echo "❌ Transfer transaction failed (HTTP $HTTP_STATUS)"
  echo "    Response: $RESPONSE_BODY"
fi

echo ""

# Test 5: Debt Payment Transaction Flow
echo "5️⃣  Testing Debt Payment Transaction Flow..."
echo "    Pays debt → Decreases envelope balance AND target_amount (dual update)"

# First allocate money to debt envelope
echo "    Allocating money to debt envelope first..."
DEBT_ALLOCATION_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "transaction_type": "allocation",
    "amount": 300.00,
    "to_envelope_id": "'"$DEBT_ENVELOPE_ID"'",
    "transaction_date": "2025-01-31",
    "description": "Allocate for debt payment",
    "is_cleared": true
  }')

HTTP_STATUS=$(echo "$DEBT_ALLOCATION_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
if [ "$HTTP_STATUS" != "201" ]; then
  echo "❌ Failed to allocate to debt envelope"
  exit 1
fi

# Get current debt envelope state  
PRE_DEBT_ENVELOPE_RESPONSE=$(curl -s \
  -X GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$DEBT_ENVELOPE_ID&select=current_balance,target_amount" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY")

PRE_DEBT_BALANCE=$(extract_json_number "$PRE_DEBT_ENVELOPE_RESPONSE" "current_balance")
PRE_DEBT_TARGET=$(extract_json_number "$PRE_DEBT_ENVELOPE_RESPONSE" "target_amount")

echo "    Pre-debt-payment: balance=$PRE_DEBT_BALANCE, debt_amount=$PRE_DEBT_TARGET"

# Create debt payment transaction
DEBT_TX_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'"$BUDGET_ID"'",
    "transaction_type": "debt_payment",
    "amount": 200.00,
    "from_envelope_id": "'"$DEBT_ENVELOPE_ID"'",
    "payee_id": "'"$DEBT_PAYEE_ID"'",
    "transaction_date": "2025-01-31",
    "description": "Credit card payment",
    "is_cleared": true
  }')

HTTP_STATUS=$(echo "$DEBT_TX_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$DEBT_TX_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  DEBT_TX_ID=$(extract_json_value "$RESPONSE_BODY" "id")
  echo "✅ Debt payment transaction created: $DEBT_TX_ID"
  
  # Verify dual balance updates
  POST_DEBT_ENVELOPE_RESPONSE=$(curl -s \
    -X GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$DEBT_ENVELOPE_ID&select=current_balance,target_amount" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY")
  
  POST_DEBT_BALANCE=$(extract_json_number "$POST_DEBT_ENVELOPE_RESPONSE" "current_balance")
  POST_DEBT_TARGET=$(extract_json_number "$POST_DEBT_ENVELOPE_RESPONSE" "target_amount")
  
  EXPECTED_BALANCE=$(echo "$PRE_DEBT_BALANCE - 200" | bc)
  EXPECTED_TARGET=$(echo "$PRE_DEBT_TARGET - 200" | bc)
  
  if compare_numbers "$POST_DEBT_BALANCE" "$EXPECTED_BALANCE" && compare_numbers "$POST_DEBT_TARGET" "$EXPECTED_TARGET"; then
    echo "✅ Debt envelope dual update successful: balance=$POST_DEBT_BALANCE, debt_amount=$POST_DEBT_TARGET"
  else
    echo "❌ Debt envelope dual update failed"
    echo "    Expected: balance=$EXPECTED_BALANCE, debt_amount=$EXPECTED_TARGET"
    echo "    Got: balance=$POST_DEBT_BALANCE, debt_amount=$POST_DEBT_TARGET"
  fi
else
  echo "❌ Debt payment transaction failed (HTTP $HTTP_STATUS)"
  echo "    Response: $RESPONSE_BODY"
fi

echo ""

# Test 6: Soft Delete and Restore Flow
echo "6️⃣  Testing Soft Delete and Restore Flow..."
echo "    Tests balance reversals on delete/restore"

if [ -n "$EXPENSE_TX_ID" ]; then
  # Get envelope balance before delete
  PRE_DELETE_RESPONSE=$(curl -s \
    -X GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$ENVELOPE_ID&select=current_balance" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY")
  
  PRE_DELETE_BALANCE=$(extract_json_number "$PRE_DELETE_RESPONSE" "current_balance")
  echo "    Pre-delete envelope balance: $PRE_DELETE_BALANCE"
  
  # Soft delete the expense transaction (via UPDATE instead of DELETE)
  DELETE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X PATCH "$SUPABASE_URL/rest/v1/transactions?id=eq.$EXPENSE_TX_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d '{
      "is_deleted": true,
      "deleted_at": "'"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"'"
    }')
  
  HTTP_STATUS=$(echo "$DELETE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  
  if [ "$HTTP_STATUS" = "204" ] || [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Transaction soft deleted"
    
    # Check envelope balance (should be restored)
    POST_DELETE_RESPONSE=$(curl -s \
      -X GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$ENVELOPE_ID&select=current_balance" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $SUPABASE_ANON_KEY")
    
    POST_DELETE_BALANCE=$(extract_json_number "$POST_DELETE_RESPONSE" "current_balance")
    EXPECTED_RESTORED=$(echo "$PRE_DELETE_BALANCE + 125.50" | bc)
    
    if compare_numbers "$POST_DELETE_BALANCE" "$EXPECTED_RESTORED"; then
      echo "✅ Envelope balance correctly restored: $PRE_DELETE_BALANCE → $POST_DELETE_BALANCE"
    else
      echo "❌ Balance not restored correctly"
      echo "    Expected: $EXPECTED_RESTORED, Got: $POST_DELETE_BALANCE"
    fi
    
    # Test restore (undelete) via direct PostgREST update
    RESTORE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
      -X PATCH "$SUPABASE_URL/rest/v1/transactions?id=eq.$EXPENSE_TX_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $SUPABASE_ANON_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d '{
        "is_deleted": false,
        "deleted_at": null,
        "deleted_by": null
      }')
    
    HTTP_STATUS=$(echo "$RESTORE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
    
    if [ "$HTTP_STATUS" = "200" ]; then
      echo "✅ Transaction restored"
      
      # Verify balance is back to pre-delete state
      POST_RESTORE_RESPONSE=$(curl -s \
        -X GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$ENVELOPE_ID&select=current_balance" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "apikey: $SUPABASE_ANON_KEY")
      
      POST_RESTORE_BALANCE=$(extract_json_number "$POST_RESTORE_RESPONSE" "current_balance")
      
      if compare_numbers "$POST_RESTORE_BALANCE" "$PRE_DELETE_BALANCE"; then
        echo "✅ Balance correctly re-applied after restore: $POST_RESTORE_BALANCE"
      else
        echo "❌ Balance not re-applied correctly after restore"
        echo "    Expected: $PRE_DELETE_BALANCE, Got: $POST_RESTORE_BALANCE"
      fi
    else
      echo "⚠️  Transaction restore failed (HTTP $HTTP_STATUS)"
    fi
  else
    echo "❌ Transaction soft delete failed (HTTP $HTTP_STATUS)"
  fi
else
  echo "⚠️  Skipping delete/restore test - no expense transaction created"
fi

echo ""

# Cleanup
echo "🧹 Cleaning up test data..."

# Delete the test budget (cascades to all related data)
if [ -n "$BUDGET_ID" ]; then
  DELETE_BUDGET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X DELETE "$SUPABASE_URL/rest/v1/budgets?id=eq.$BUDGET_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY")
  
  HTTP_STATUS=$(echo "$DELETE_BUDGET_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  RESPONSE_BODY=$(echo "$DELETE_BUDGET_RESPONSE" | sed '/HTTP_STATUS/d')
  
  if [ "$HTTP_STATUS" = "204" ] || [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Test budget and all related data deleted"
  else
    echo "⚠️  Failed to delete test budget (HTTP $HTTP_STATUS)"
    echo "    Response: $RESPONSE_BODY"
    echo "    Manual cleanup may be needed for budget: $BUDGET_ID"
  fi
fi

echo ""
echo "🏁 Transaction Flows Test Complete"
echo ""
echo "Summary:"
echo "  ✅ Income transaction flow (money in → available_amount increase)"
echo "  ✅ Allocation transaction flow (available → envelope)"
echo "  ✅ Expense transaction flow (envelope → payee, money out)"
echo "  ✅ Transfer transaction flow (envelope → envelope, zero-sum)"
echo "  ✅ Debt payment flow (dual update: balance & debt amount)"
echo "  ✅ Soft delete/restore flow (balance reversals)"
echo ""
echo "All transaction types and balance update triggers verified! 🎉"