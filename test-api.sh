#!/bin/bash

# Test API helper script
# Usage: ./test-api.sh

# Load environment variables
if [ -f .env.test ]; then
    source .env.test
else
    echo "Error: .env.test not found"
    echo "Copy .env.test.example to .env.test and fill in your values"
    exit 1
fi

# Helper function for authenticated requests
auth_curl() {
    curl -H "Authorization: Bearer $USER_ACCESS_TOKEN" "$@"
}

# Helper function for anon requests
anon_curl() {
    curl -H "Authorization: Bearer $SUPABASE_ANON_KEY" "$@"
}

# Examples:
echo "=== Testing Auth User ==="
auth_curl -X GET "$SUPABASE_URL/functions/v1/auth-user"

echo -e "\n\n=== Testing Budgets ==="
auth_curl -X GET "$SUPABASE_URL/rest/v1/budgets?select=*"