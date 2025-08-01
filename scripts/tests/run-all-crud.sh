#!/bin/bash

# NVLP Run All CRUD Tests Script
# Runs all entity CRUD test scripts in sequence

set -e

# Load environment variables from .env file if it exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Configuration
ACCESS_TOKEN="${ACCESS_TOKEN}"

# Validate required environment variables
if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Error: ACCESS_TOKEN is required"
  echo "   Please set ACCESS_TOKEN environment variable with a valid auth token"
  echo "   You can get one by running ./auth-flow.sh first"
  exit 1
fi

echo "🚀 NVLP Run All CRUD Tests"
echo "========================="
echo ""
echo "This will run CRUD tests for all entities in order:"
echo "  1. Budgets"
echo "  2. Categories"
echo "  3. Income Sources"
echo "  4. Payees"
echo "  5. Envelopes"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Create a test budget that will be used by all tests
echo "📝 Creating test budget for all CRUD tests..."
CREATE_BUDGET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$SUPABASE_URL/rest/v1/budgets" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "CRUD Test Budget '"$(date +%s)"'",
    "description": "Budget for running all CRUD tests",
    "currency": "USD"
  }')

HTTP_STATUS=$(echo "$CREATE_BUDGET_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_BUDGET_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "201" ]; then
  BUDGET_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "✅ Created test budget: $BUDGET_ID"
  export BUDGET_ID
else
  echo "❌ Failed to create test budget"
  echo "   Response: $RESPONSE_BODY"
  exit 1
fi

echo ""
echo "===================="
echo "Running Budgets CRUD"
echo "===================="
./crud-budgets.sh
echo ""

echo "======================"
echo "Running Categories CRUD"
echo "======================"
./crud-categories.sh
echo ""

echo "========================="
echo "Running Income Sources CRUD"
echo "========================="
./crud-income-sources.sh
echo ""

echo "=================="
echo "Running Payees CRUD"
echo "=================="
./crud-payees.sh
echo ""

echo "===================="
echo "Running Envelopes CRUD"
echo "===================="
./crud-envelopes.sh
echo ""

echo "======================="
echo "Running Error Scenarios"
echo "======================="
./error-scenarios.sh
echo ""

# Clean up test budget
echo "🧹 Cleaning up test budget..."
DELETE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X DELETE "$SUPABASE_URL/rest/v1/budgets?id=eq.$BUDGET_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY")

HTTP_STATUS=$(echo "$DELETE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
if [ "$HTTP_STATUS" = "204" ] || [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Test budget cleaned up"
else
  echo "⚠️  Failed to clean up test budget"
fi

echo ""
echo "🏁 All CRUD Tests Complete!"
echo ""
echo "Next steps:"
echo "  - Review any failures above"
echo "  - Run individual tests with: ./crud-<entity>.sh"
echo "  - Run with custom budget: BUDGET_ID=xxx ./crud-<entity>.sh"