#!/bin/bash

# NVLP Error Scenarios Test Script
# Tests various error conditions across all API endpoints

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
ANON_KEY="${SUPABASE_ANON_KEY:-your_anon_key}"
ACCESS_TOKEN="${ACCESS_TOKEN}"

# Validate required environment variables
if [ "$SUPABASE_URL" = "https://your-project.supabase.co" ] || [ -z "$ANON_KEY" ]; then
  echo "❌ Error: Missing required environment variables"
  echo "   Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env file"
  exit 1
fi

echo "🧪 NVLP Error Scenarios Test Suite"
echo "=================================="
echo "Supabase URL: $SUPABASE_URL"
echo ""

# Helper function to test error response
test_error_response() {
  local test_name="$1"
  local expected_status="$2"
  local response="$3"
  
  HTTP_STATUS=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
  RESPONSE_BODY=$(echo "$response" | sed '/HTTP_STATUS/d')
  
  if [ "$HTTP_STATUS" = "$expected_status" ]; then
    echo "✅ $test_name - Got expected error (HTTP $HTTP_STATUS)"
    echo "   Response: $RESPONSE_BODY"
  else
    echo "❌ $test_name - Expected HTTP $expected_status, got HTTP $HTTP_STATUS"
    echo "   Response: $RESPONSE_BODY"
  fi
  echo ""
}

# Test 1: Authentication Errors
echo "🔐 AUTHENTICATION ERROR TESTS"
echo "=============================="

echo "1️⃣  Testing Missing Authorization Header..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/budgets" \
  -H "apikey: $ANON_KEY" \
  -H "Accept: application/json")
test_error_response "Missing Auth Header" "401" "$RESPONSE"

echo "2️⃣  Testing Invalid Access Token..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/budgets" \
  -H "Authorization: Bearer invalid_token_here" \
  -H "apikey: $ANON_KEY" \
  -H "Accept: application/json")
test_error_response "Invalid Token" "401" "$RESPONSE"

echo "3️⃣  Testing Expired Token (simulate with malformed JWT)..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$SUPABASE_URL/rest/v1/budgets" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.token" \
  -H "apikey: $ANON_KEY" \
  -H "Accept: application/json")
test_error_response "Expired/Malformed Token" "401" "$RESPONSE"

# Test 2: Magic Link Errors
echo "📧 MAGIC LINK ERROR TESTS"
echo "========================="

echo "4️⃣  Testing Magic Link with Invalid Email..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/functions/v1/auth-magic-link" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email", "redirectTo": "https://example.com"}')
test_error_response "Invalid Email Format" "400" "$RESPONSE"

echo "5️⃣  Testing Magic Link with Missing Email..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/functions/v1/auth-magic-link" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"redirectTo": "https://example.com"}')
test_error_response "Missing Email" "400" "$RESPONSE"

echo "6️⃣  Testing Magic Link with Invalid JSON..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/functions/v1/auth-magic-link" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{invalid json}')
test_error_response "Invalid JSON" "400" "$RESPONSE"

# Test 3: Resource Not Found Errors
echo "🔍 RESOURCE NOT FOUND ERROR TESTS"
echo "=================================="

# Only run these tests if we have a valid access token
if [ -n "$ACCESS_TOKEN" ]; then
  echo "7️⃣  Testing Get Non-existent Budget..."
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET "$SUPABASE_URL/rest/v1/budgets?id=eq.00000000-0000-0000-0000-000000000000" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $ANON_KEY" \
    -H "Accept: application/json")
  test_error_response "Non-existent Budget" "200" "$RESPONSE" # PostgREST returns empty array
  
  echo "8️⃣  Testing Get Non-existent Envelope..."
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.00000000-0000-0000-0000-000000000000" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $ANON_KEY" \
    -H "Accept: application/json")
  test_error_response "Non-existent Envelope" "200" "$RESPONSE" # PostgREST returns empty array
  
  echo "9️⃣  Testing Update Non-existent Budget..."
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X PATCH "$SUPABASE_URL/rest/v1/budgets?id=eq.00000000-0000-0000-0000-000000000000" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"name": "Updated Name"}')
  test_error_response "Update Non-existent Budget" "204" "$RESPONSE" # PostgREST returns 204 for no matches
else
  echo "⏭️  Skipping resource tests (no ACCESS_TOKEN set)"
fi

# Test 4: Validation Errors
echo "📝 VALIDATION ERROR TESTS"
echo "========================="

if [ -n "$ACCESS_TOKEN" ]; then
  echo "🔟 Testing Create Budget with Invalid Data..."
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$SUPABASE_URL/rest/v1/budgets" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"name": "", "currency": "INVALID"}')
  test_error_response "Invalid Budget Data" "400" "$RESPONSE"
  
  echo "1️⃣1️⃣ Testing Create Budget with Missing Required Fields..."
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$SUPABASE_URL/rest/v1/budgets" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{}')
  test_error_response "Missing Required Fields" "400" "$RESPONSE"
  
  echo "1️⃣2️⃣ Testing Create Transaction with Invalid Type..."
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$SUPABASE_URL/functions/v1/transactions" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "budget_id": "00000000-0000-0000-0000-000000000000",
      "type": "INVALID_TYPE",
      "amount": 100,
      "description": "Test"
    }')
  test_error_response "Invalid Transaction Type" "400" "$RESPONSE"
else
  echo "⏭️  Skipping validation tests (no ACCESS_TOKEN set)"
fi

# Test 5: Business Logic Errors
echo "💼 BUSINESS LOGIC ERROR TESTS"
echo "=============================="

if [ -n "$ACCESS_TOKEN" ]; then
  echo "1️⃣3️⃣ Testing Transaction with Insufficient Funds..."
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$SUPABASE_URL/functions/v1/transactions" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "budget_id": "00000000-0000-0000-0000-000000000000",
      "type": "EXPENSE",
      "amount": 999999,
      "description": "Huge expense",
      "from_envelope_id": "00000000-0000-0000-0000-000000000000",
      "payee_id": "00000000-0000-0000-0000-000000000000"
    }')
  test_error_response "Insufficient Funds" "400" "$RESPONSE"
  
  echo "1️⃣4️⃣ Testing Transfer to Same Envelope..."
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$SUPABASE_URL/functions/v1/transactions" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "budget_id": "00000000-0000-0000-0000-000000000000",
      "type": "TRANSFER",
      "amount": 50,
      "description": "Self transfer",
      "from_envelope_id": "00000000-0000-0000-0000-000000000000",
      "to_envelope_id": "00000000-0000-0000-0000-000000000000"
    }')
  test_error_response "Transfer to Same Envelope" "400" "$RESPONSE"
else
  echo "⏭️  Skipping business logic tests (no ACCESS_TOKEN set)"
fi

# Test 6: HTTP Method Errors
echo "🌐 HTTP METHOD ERROR TESTS"
echo "=========================="

echo "1️⃣5️⃣ Testing Unsupported HTTP Method on Budget Endpoint..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X PUT "$SUPABASE_URL/rest/v1/budgets" \
  -H "Authorization: Bearer ${ACCESS_TOKEN:-fake_token}" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json")
test_error_response "Unsupported HTTP Method" "405" "$RESPONSE"

# Test 7: Content Type Errors
echo "📋 CONTENT TYPE ERROR TESTS"
echo "============================"

echo "1️⃣6️⃣ Testing POST without Content-Type Header..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/functions/v1/auth-magic-link" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{"email": "test@example.com"}')
test_error_response "Missing Content-Type" "400" "$RESPONSE"

echo "1️⃣7️⃣ Testing POST with Wrong Content-Type..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/functions/v1/auth-magic-link" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: text/plain" \
  -d '{"email": "test@example.com"}')
test_error_response "Wrong Content-Type" "400" "$RESPONSE"

# Test 8: Rate Limiting (if implemented)
echo "⏱️  RATE LIMITING TESTS"
echo "======================"

echo "1️⃣8️⃣ Testing Rapid Requests (Rate Limiting)..."
echo "   Making 10 rapid requests to test rate limiting..."
for i in {1..10}; do
  curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$SUPABASE_URL/functions/v1/auth-magic-link" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "redirectTo": "https://example.com"}' \
    > /dev/null &
done
wait
echo "✅ Rate limiting test completed (check Supabase logs for rate limit responses)"
echo ""

# Test 9: Edge Function Specific Errors
echo "⚡ EDGE FUNCTION ERROR TESTS"
echo "============================"

echo "1️⃣9️⃣ Testing Non-existent Edge Function..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/functions/v1/non-existent-function" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}')
test_error_response "Non-existent Function" "404" "$RESPONSE"

if [ -n "$ACCESS_TOKEN" ]; then
  echo "2️⃣0️⃣ Testing Dashboard with Invalid Budget ID..."
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET "$SUPABASE_URL/functions/v1/dashboard?budget_id=invalid-uuid" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")
  test_error_response "Invalid UUID Format" "400" "$RESPONSE"
else
  echo "⏭️  Skipping dashboard test (no ACCESS_TOKEN set)"
fi

echo ""
echo "🏁 Error Scenarios Test Complete"
echo ""
echo "📋 Summary:"
echo "   • Authentication errors: Missing/invalid tokens"
echo "   • Magic link errors: Invalid email formats, missing data"
echo "   • Resource errors: Non-existent entities"
echo "   • Validation errors: Invalid data formats, missing fields"
echo "   • Business logic errors: Insufficient funds, invalid operations"
echo "   • HTTP method errors: Unsupported methods"
echo "   • Content type errors: Missing/wrong content types"
echo "   • Rate limiting: Rapid request handling"
echo "   • Edge function errors: Non-existent functions, invalid UUIDs"
echo ""
echo "Usage Examples:"
echo "  # Basic error tests (no auth required):"
echo "  ./error-scenarios.sh"
echo ""
echo "  # Full error tests with access token:"
echo "  ACCESS_TOKEN=eyJhbGci... ./error-scenarios.sh"
echo ""
echo "  # Test with custom environment:"
echo "  SUPABASE_URL=https://myproject.supabase.co \\"
echo "  SUPABASE_ANON_KEY=eyJhbGci... \\"
echo "  ACCESS_TOKEN=eyJhbGci... \\"
echo "  ./error-scenarios.sh"