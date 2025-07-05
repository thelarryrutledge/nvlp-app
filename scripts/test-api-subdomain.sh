#!/bin/bash

# Load environment variables
source .env.local

echo "Testing API Subdomain (api.nvlp.app)..."
echo "======================================="

# Test GET request
echo "Testing GET request:"
RESPONSE=$(curl -s -X GET "https://api.nvlp.app/hello" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -w "\nSTATUS:%{http_code}")

if [[ $RESPONSE == *"Hello from NVLP Edge Function!"* ]]; then
    echo "✓ GET request successful"
    echo "Response: $(echo "$RESPONSE" | head -n -1)"
    echo "Status: $(echo "$RESPONSE" | tail -n 1)"
else
    echo "✗ GET request failed"
    echo "Response: $RESPONSE"
fi

echo ""

# Test POST request
echo "Testing POST request:"
RESPONSE=$(curl -s -X POST "https://api.nvlp.app/hello" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  -w "\nSTATUS:%{http_code}")

if [[ $RESPONSE == *"Hello from NVLP Edge Function!"* ]]; then
    echo "✓ POST request successful"
    echo "Response: $(echo "$RESPONSE" | head -n -1)"
    echo "Status: $(echo "$RESPONSE" | tail -n 1)"
else
    echo "✗ POST request failed"
    echo "Response: $RESPONSE"
fi

echo ""

# Test without auth
echo "Testing without authorization (should fail):"
RESPONSE=$(curl -s -X GET "https://api.nvlp.app/hello" \
  -H "Content-Type: application/json" \
  -w "\nSTATUS:%{http_code}")

if [[ $RESPONSE == *"STATUS:401"* ]]; then
    echo "✓ Auth required (as expected)"
    echo "Response: $(echo "$RESPONSE" | head -n -1)"
else
    echo "⚠ Unexpected response:"
    echo "Response: $RESPONSE"
fi

echo "======================================="
echo "API subdomain testing complete!"
echo "Base URL: https://api.nvlp.app"