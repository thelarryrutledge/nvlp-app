#!/bin/bash

# Test script for Transactions Edge Function
# Tests transaction validation and CRUD operations

set -e

echo "🧪 Testing Transactions Edge Function..."

# Load environment variables
source .env.local

# API endpoints
API_BASE="https://api.nvlp.app"
TOKEN_FILE=".token"

# Check if token file exists
if [ ! -f "$TOKEN_FILE" ]; then
    echo "❌ Token file not found. Please run ./scripts/login-and-save-token.sh first"
    exit 1
fi

TOKEN=$(cat $TOKEN_FILE)
HEADERS="Authorization: Bearer $TOKEN"
APIKEY_HEADER="apikey: $SUPABASE_ANON_KEY"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_endpoint() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    echo -n "Testing $test_name... "
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -H "$HEADERS" \
            -d "$data" \
            "$API_BASE$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "$HEADERS" \
            "$API_BASE$endpoint")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "✅ PASSED (HTTP $status_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        
        # Extract and display relevant info
        if echo "$response_body" | jq -e . >/dev/null 2>&1; then
            if echo "$response_body" | jq -e '.transaction.id' >/dev/null 2>&1; then
                transaction_id=$(echo "$response_body" | jq -r '.transaction.id')
                echo "   Created transaction ID: $transaction_id"
            fi
        fi
    else
        echo "❌ FAILED (Expected HTTP $expected_status, got $status_code)"
        echo "   Response: $response_body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

echo ""
echo "=== Transaction Validation Tests ==="

# Get user budgets first to use in tests
echo "Getting user budgets..."
budgets_response=$(curl -s -H "$HEADERS" -H "$APIKEY_HEADER" "https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/budgets?select=id,name&is_default=eq.true")
DEFAULT_BUDGET_ID=$(echo "$budgets_response" | jq -r '.[0].id // empty')

if [ -z "$DEFAULT_BUDGET_ID" ] || [ "$DEFAULT_BUDGET_ID" = "null" ]; then
    echo "❌ No default budget found. Creating one..."
    create_budget_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "$HEADERS" \
        -H "$APIKEY_HEADER" \
        -H "Prefer: return=representation" \
        -d '{"name": "Test Budget for Transactions", "description": "Created for transaction testing"}' \
        "https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/budgets")
    DEFAULT_BUDGET_ID=$(echo "$create_budget_response" | jq -r '.[0].id // empty')
fi

echo "Using budget ID: $DEFAULT_BUDGET_ID"

# Get envelopes and payees for testing
echo "Getting envelopes and payees..."
envelopes_response=$(curl -s -H "$HEADERS" -H "$APIKEY_HEADER" "https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/envelopes?budget_id=eq.$DEFAULT_BUDGET_ID&select=id,name,current_balance&order=current_balance.desc&limit=2")
ENVELOPE_1_ID=$(echo "$envelopes_response" | jq -r '.[0].id // empty')
ENVELOPE_2_ID=$(echo "$envelopes_response" | jq -r '.[1].id // empty')

payees_response=$(curl -s -H "$HEADERS" -H "$APIKEY_HEADER" "https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/payees?budget_id=eq.$DEFAULT_BUDGET_ID&select=id,name&limit=1")
PAYEE_ID=$(echo "$payees_response" | jq -r '.[0].id // empty')

income_sources_response=$(curl -s -H "$HEADERS" -H "$APIKEY_HEADER" "https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/income_sources?budget_id=eq.$DEFAULT_BUDGET_ID&select=id,name&limit=1")
INCOME_SOURCE_ID=$(echo "$income_sources_response" | jq -r '.[0].id // empty')

ENVELOPE_1_NAME=$(echo "$envelopes_response" | jq -r '.[0].name // empty')
ENVELOPE_1_BALANCE=$(echo "$envelopes_response" | jq -r '.[0].current_balance // empty')
ENVELOPE_2_NAME=$(echo "$envelopes_response" | jq -r '.[1].name // empty')
ENVELOPE_2_BALANCE=$(echo "$envelopes_response" | jq -r '.[1].current_balance // empty')

echo "Test resources:"
echo "  Envelope 1: $ENVELOPE_1_ID ($ENVELOPE_1_NAME: \$$ENVELOPE_1_BALANCE)"
echo "  Envelope 2: $ENVELOPE_2_ID ($ENVELOPE_2_NAME: \$$ENVELOPE_2_BALANCE)" 
echo "  Payee: $PAYEE_ID"
echo "  Income Source: $INCOME_SOURCE_ID"
echo ""

# Test 1: Validate valid income transaction
test_endpoint "Validate income transaction" "POST" "/transactions/validate" \
    "{
        \"budget_id\": \"$DEFAULT_BUDGET_ID\",
        \"transaction_type\": \"income\",
        \"amount\": 1000.00,
        \"description\": \"Test income\",
        \"income_source_id\": \"$INCOME_SOURCE_ID\"
    }" "200"

# Test 2: Validate invalid income transaction (missing income_source_id)
test_endpoint "Validate invalid income (missing source)" "POST" "/transactions/validate" \
    "{
        \"budget_id\": \"$DEFAULT_BUDGET_ID\",
        \"transaction_type\": \"income\",
        \"amount\": 1000.00,
        \"description\": \"Test income\"
    }" "400"

# Test 3: Validate valid allocation transaction
test_endpoint "Validate allocation transaction" "POST" "/transactions/validate" \
    "{
        \"budget_id\": \"$DEFAULT_BUDGET_ID\",
        \"transaction_type\": \"allocation\",
        \"amount\": 500.00,
        \"description\": \"Test allocation\",
        \"to_envelope_id\": \"$ENVELOPE_1_ID\"
    }" "200"

# Test 4: Validate valid transfer transaction
test_endpoint "Validate transfer transaction" "POST" "/transactions/validate" \
    "{
        \"budget_id\": \"$DEFAULT_BUDGET_ID\",
        \"transaction_type\": \"transfer\",
        \"amount\": 100.00,
        \"description\": \"Test transfer\",
        \"from_envelope_id\": \"$ENVELOPE_1_ID\",
        \"to_envelope_id\": \"$ENVELOPE_2_ID\"
    }" "200"

# Test 5: Validate invalid transfer (same envelope)
test_endpoint "Validate invalid transfer (same envelope)" "POST" "/transactions/validate" \
    "{
        \"budget_id\": \"$DEFAULT_BUDGET_ID\",
        \"transaction_type\": \"transfer\",
        \"amount\": 100.00,
        \"description\": \"Test transfer\",
        \"from_envelope_id\": \"$ENVELOPE_1_ID\",
        \"to_envelope_id\": \"$ENVELOPE_1_ID\"
    }" "400"

# Test 6: Validate transfer with insufficient funds
test_endpoint "Validate transfer (insufficient funds)" "POST" "/transactions/validate" \
    "{
        \"budget_id\": \"$DEFAULT_BUDGET_ID\",
        \"transaction_type\": \"transfer\",
        \"amount\": 10000.00,
        \"description\": \"Test large transfer\",
        \"from_envelope_id\": \"$ENVELOPE_1_ID\",
        \"to_envelope_id\": \"$ENVELOPE_2_ID\"
    }" "400"

echo ""
echo "=== Transaction CRUD Tests ==="

# Test 7: Create income transaction
test_endpoint "Create income transaction" "POST" "/transactions" \
    "{
        \"budget_id\": \"$DEFAULT_BUDGET_ID\",
        \"transaction_type\": \"income\",
        \"amount\": 1000.00,
        \"description\": \"Test income transaction\",
        \"income_source_id\": \"$INCOME_SOURCE_ID\",
        \"transaction_date\": \"$(date +%Y-%m-%d)\"
    }" "201"

# Test 8: Create allocation transaction
test_endpoint "Create allocation transaction" "POST" "/transactions" \
    "{
        \"budget_id\": \"$DEFAULT_BUDGET_ID\",
        \"transaction_type\": \"allocation\",
        \"amount\": 500.00,
        \"description\": \"Test allocation transaction\",
        \"to_envelope_id\": \"$ENVELOPE_1_ID\",
        \"transaction_date\": \"$(date +%Y-%m-%d)\"
    }" "201"

# Test 9: Create expense transaction
test_endpoint "Create expense transaction" "POST" "/transactions" \
    "{
        \"budget_id\": \"$DEFAULT_BUDGET_ID\",
        \"transaction_type\": \"expense\",
        \"amount\": 50.00,
        \"description\": \"Test expense transaction\",
        \"from_envelope_id\": \"$ENVELOPE_1_ID\",
        \"payee_id\": \"$PAYEE_ID\",
        \"transaction_date\": \"$(date +%Y-%m-%d)\"
    }" "201"

# Test 10: List transactions
test_endpoint "List transactions" "GET" "/transactions?budget_id=$DEFAULT_BUDGET_ID&limit=10" "" "200"

# Test 11: List transactions by type
test_endpoint "List income transactions" "GET" "/transactions?budget_id=$DEFAULT_BUDGET_ID&transaction_type=income" "" "200"

echo ""
echo "=== Error Handling Tests ==="

# Test 12: Invalid transaction type
test_endpoint "Invalid transaction type" "POST" "/transactions/validate" \
    "{
        \"budget_id\": \"$DEFAULT_BUDGET_ID\",
        \"transaction_type\": \"invalid_type\",
        \"amount\": 100.00,
        \"description\": \"Test\"
    }" "400"

# Test 13: Missing required data
test_endpoint "Missing required data" "POST" "/transactions/validate" \
    "{
        \"transaction_type\": \"income\",
        \"amount\": 100.00
    }" "400"

# Test 14: Invalid amount
test_endpoint "Invalid amount (negative)" "POST" "/transactions/validate" \
    "{
        \"budget_id\": \"$DEFAULT_BUDGET_ID\",
        \"transaction_type\": \"income\",
        \"amount\": -100.00,
        \"description\": \"Test\",
        \"income_source_id\": \"$INCOME_SOURCE_ID\"
    }" "400"

# Test 15: Unauthorized access (invalid token)
echo -n "Testing unauthorized access... "
response=$(curl -s -w "\n%{http_code}" -X "POST" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer invalid_token" \
    -d '{"test": "data"}' \
    "$API_BASE/transactions/validate")
status_code=$(echo "$response" | tail -n1)

if [ "$status_code" = "401" ]; then
    echo "✅ PASSED (HTTP 401)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo "❌ FAILED (Expected HTTP 401, got $status_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "📊 Test Results:"
echo "✅ Passed: $TESTS_PASSED"
echo "❌ Failed: $TESTS_FAILED"
echo "📈 Success Rate: $(( TESTS_PASSED * 100 / (TESTS_PASSED + TESTS_FAILED) ))%"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed! Transactions Edge Function is working correctly."
    exit 0
else
    echo ""
    echo "⚠️  Some tests failed. Please review the output above."
    exit 1
fi