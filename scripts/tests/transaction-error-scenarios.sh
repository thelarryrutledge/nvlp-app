#!/bin/bash

# NVLP Transaction Error Scenarios Test Script
# Tests specific error conditions for transaction business logic

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

echo "🧪 NVLP Transaction Error Scenarios Test Suite"
echo "=============================================="
echo "Supabase URL: $SUPABASE_URL"
echo ""

# Helper function to test error response
test_transaction_error() {
  local test_name="$1"
  local expected_status="$2"
  local request_data="$3"
  
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$SUPABASE_URL/functions/v1/transactions" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$request_data")
  
  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
  
  if [ "$HTTP_STATUS" = "$expected_status" ]; then
    echo "✅ $test_name - Got expected error (HTTP $HTTP_STATUS)"
    echo "   Response: $RESPONSE_BODY"
  else
    echo "❌ $test_name - Expected HTTP $expected_status, got HTTP $HTTP_STATUS"
    echo "   Response: $RESPONSE_BODY"
  fi
  echo ""
}

# First, let's get a valid budget ID to use for tests
echo "📋 Getting or creating test budget..."
BUDGET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/budgets?order=created_at.desc&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Accept: application/json")

HTTP_STATUS=$(echo "$BUDGET_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BUDGET_DATA=$(echo "$BUDGET_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ] && [ "$BUDGET_DATA" != "[]" ]; then
  BUDGET_ID=$(echo "$BUDGET_DATA" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "✅ Using existing budget: $BUDGET_ID"
else
  # Create a test budget
  CREATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$SUPABASE_URL/rest/v1/budgets" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d '{
      "name": "Transaction Error Test Budget",
      "description": "Budget for testing transaction errors",
      "currency": "USD"
    }')
  
  HTTP_STATUS=$(echo "$CREATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  if [ "$HTTP_STATUS" = "201" ]; then
    BUDGET_ID=$(echo "$CREATE_RESPONSE" | sed '/HTTP_STATUS/d' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "✅ Created test budget: $BUDGET_ID"
  else
    echo "❌ Failed to create test budget"
    exit 1
  fi
fi

echo ""

# Test 1: Transaction Type Validation Errors
echo "🏷️  TRANSACTION TYPE VALIDATION ERRORS"
echo "======================================"

test_transaction_error \
  "Invalid Transaction Type" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"INVALID_TYPE\", \"amount\": 100, \"description\": \"Test\"}"

test_transaction_error \
  "Missing Transaction Type" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"amount\": 100, \"description\": \"Test\"}"

# Test 2: Required Field Validation for Each Transaction Type
echo "📝 REQUIRED FIELD VALIDATION ERRORS"
echo "==================================="

test_transaction_error \
  "Income Missing income_source_id" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"INCOME\", \"amount\": 100, \"description\": \"Income without source\"}"

test_transaction_error \
  "Allocation Missing to_envelope_id" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"ALLOCATION\", \"amount\": 100, \"description\": \"Allocation without envelope\"}"

test_transaction_error \
  "Expense Missing from_envelope_id" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"EXPENSE\", \"amount\": 100, \"description\": \"Expense without envelope\", \"payee_id\": \"00000000-0000-0000-0000-000000000000\"}"

test_transaction_error \
  "Expense Missing payee_id" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"EXPENSE\", \"amount\": 100, \"description\": \"Expense without payee\", \"from_envelope_id\": \"00000000-0000-0000-0000-000000000000\"}"

test_transaction_error \
  "Transfer Missing from_envelope_id" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"TRANSFER\", \"amount\": 100, \"description\": \"Transfer without from envelope\", \"to_envelope_id\": \"00000000-0000-0000-0000-000000000000\"}"

test_transaction_error \
  "Transfer Missing to_envelope_id" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"TRANSFER\", \"amount\": 100, \"description\": \"Transfer without to envelope\", \"from_envelope_id\": \"00000000-0000-0000-0000-000000000000\"}"

# Test 3: Amount Validation Errors
echo "💰 AMOUNT VALIDATION ERRORS"
echo "============================"

test_transaction_error \
  "Negative Amount" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"INCOME\", \"amount\": -100, \"description\": \"Negative income\", \"income_source_id\": \"00000000-0000-0000-0000-000000000000\"}"

test_transaction_error \
  "Zero Amount" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"INCOME\", \"amount\": 0, \"description\": \"Zero income\", \"income_source_id\": \"00000000-0000-0000-0000-000000000000\"}"

test_transaction_error \
  "Missing Amount" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"INCOME\", \"description\": \"Income without amount\", \"income_source_id\": \"00000000-0000-0000-0000-000000000000\"}"

# Test 4: UUID Format Validation
echo "🆔 UUID FORMAT VALIDATION ERRORS"
echo "================================="

test_transaction_error \
  "Invalid Budget ID Format" \
  400 \
  "{\"budget_id\": \"invalid-uuid\", \"type\": \"INCOME\", \"amount\": 100, \"description\": \"Invalid budget ID\", \"income_source_id\": \"00000000-0000-0000-0000-000000000000\"}"

test_transaction_error \
  "Invalid Envelope ID Format" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"ALLOCATION\", \"amount\": 100, \"description\": \"Invalid envelope ID\", \"to_envelope_id\": \"not-a-uuid\"}"

test_transaction_error \
  "Invalid Payee ID Format" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"EXPENSE\", \"amount\": 100, \"description\": \"Invalid payee ID\", \"from_envelope_id\": \"00000000-0000-0000-0000-000000000000\", \"payee_id\": \"not-a-uuid\"}"

# Test 5: Business Logic Validation Errors
echo "💼 BUSINESS LOGIC VALIDATION ERRORS"
echo "==================================="

test_transaction_error \
  "Transfer to Same Envelope" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"TRANSFER\", \"amount\": 100, \"description\": \"Self transfer\", \"from_envelope_id\": \"00000000-0000-0000-0000-000000000000\", \"to_envelope_id\": \"00000000-0000-0000-0000-000000000000\"}"

test_transaction_error \
  "Non-existent Budget ID" \
  400 \
  "{\"budget_id\": \"00000000-0000-0000-0000-000000000000\", \"type\": \"INCOME\", \"amount\": 100, \"description\": \"Income for non-existent budget\", \"income_source_id\": \"00000000-0000-0000-0000-000000000000\"}"

test_transaction_error \
  "Non-existent Income Source" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"INCOME\", \"amount\": 100, \"description\": \"Income from non-existent source\", \"income_source_id\": \"00000000-0000-0000-0000-000000000000\"}"

test_transaction_error \
  "Non-existent Envelope" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"ALLOCATION\", \"amount\": 100, \"description\": \"Allocation to non-existent envelope\", \"to_envelope_id\": \"00000000-0000-0000-0000-000000000000\"}"

test_transaction_error \
  "Non-existent Payee" \
  400 \
  "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"EXPENSE\", \"amount\": 100, \"description\": \"Payment to non-existent payee\", \"from_envelope_id\": \"00000000-0000-0000-0000-000000000000\", \"payee_id\": \"00000000-0000-0000-0000-000000000000\"}"

# Test 6: Cross-Budget Access Errors
echo "🚫 CROSS-BUDGET ACCESS ERRORS"
echo "=============================="

# Create another budget to test cross-budget access
OTHER_BUDGET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/budgets" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "Other Budget for Error Testing",
    "description": "Another budget for cross-budget tests",
    "currency": "USD"
  }')

HTTP_STATUS=$(echo "$OTHER_BUDGET_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
if [ "$HTTP_STATUS" = "201" ]; then
  OTHER_BUDGET_ID=$(echo "$OTHER_BUDGET_RESPONSE" | sed '/HTTP_STATUS/d' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "✅ Created second budget for cross-budget tests: $OTHER_BUDGET_ID"
  
  # Note: These tests would require existing envelopes/payees in the other budget
  # For now, we test with non-existent IDs which should still fail validation
  
  test_transaction_error \
    "Cross-Budget Envelope Access" \
    400 \
    "{\"budget_id\": \"$BUDGET_ID\", \"type\": \"ALLOCATION\", \"amount\": 100, \"description\": \"Allocation to envelope in other budget\", \"to_envelope_id\": \"$OTHER_BUDGET_ID\"}"
  
  # Clean up other budget
  curl -s -X DELETE "$SUPABASE_URL/rest/v1/budgets?id=eq.$OTHER_BUDGET_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY" > /dev/null
else
  echo "⚠️  Could not create second budget for cross-budget tests"
fi

# Test 7: Transaction Update Errors
echo "✏️  TRANSACTION UPDATE ERRORS"
echo "============================="

# Test updating with invalid data
INVALID_UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X PATCH "$SUPABASE_URL/functions/v1/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "00000000-0000-0000-0000-000000000000",
    "amount": -100,
    "description": "Invalid update"
  }')

HTTP_STATUS=$(echo "$INVALID_UPDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$INVALID_UPDATE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "400" ] || [ "$HTTP_STATUS" = "404" ]; then
  echo "✅ Invalid Transaction Update - Got expected error (HTTP $HTTP_STATUS)"
  echo "   Response: $RESPONSE_BODY"
else
  echo "❌ Invalid Transaction Update - Expected HTTP 400/404, got HTTP $HTTP_STATUS"
  echo "   Response: $RESPONSE_BODY"
fi
echo ""

echo ""
echo "🏁 Transaction Error Scenarios Test Complete"
echo ""
echo "📋 Summary:"
echo "   • Transaction type validation: Invalid/missing types"
echo "   • Required field validation: Missing required fields per transaction type"
echo "   • Amount validation: Negative, zero, missing amounts"
echo "   • UUID format validation: Invalid UUID formats"
echo "   • Business logic validation: Same envelope transfers, non-existent entities"
echo "   • Cross-budget access: Preventing access to other budget's resources"
echo "   • Transaction updates: Invalid update operations"
echo ""
echo "Usage Examples:"
echo "  # Run transaction error tests:"
echo "  ACCESS_TOKEN=eyJhbGci... ./transaction-error-scenarios.sh"
echo ""
echo "  # Test with custom environment:"
echo "  SUPABASE_URL=https://myproject.supabase.co \\"
echo "  ACCESS_TOKEN=eyJhbGci... \\"
echo "  ./transaction-error-scenarios.sh"