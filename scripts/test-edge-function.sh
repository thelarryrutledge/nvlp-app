#!/bin/bash

# Load environment variables
source .env.local

echo "Testing Edge Function Deployment..."
echo "===================================="

# Test GET request
echo "Testing GET request:"
RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/functions/v1/hello" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json")

if [[ $RESPONSE == *"Hello from NVLP Edge Function!"* ]]; then
    echo "✓ GET request successful"
    echo "Response: $RESPONSE"
else
    echo "✗ GET request failed"
    echo "Response: $RESPONSE"
fi

echo ""

# Test POST request
echo "Testing POST request:"
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/hello" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}')

if [[ $RESPONSE == *"Hello from NVLP Edge Function!"* ]]; then
    echo "✓ POST request successful"
    echo "Response: $RESPONSE"
else
    echo "✗ POST request failed"
    echo "Response: $RESPONSE"
fi

echo ""

# Test CORS with OPTIONS request
echo "Testing CORS (OPTIONS request):"
RESPONSE=$(curl -s -X OPTIONS "${SUPABASE_URL}/functions/v1/hello" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}")

if [[ $RESPONSE == *"Status: 200"* ]]; then
    echo "✓ CORS headers properly configured"
else
    echo "✗ CORS configuration issue"
fi

echo "===================================="
echo "Edge Function testing complete!"