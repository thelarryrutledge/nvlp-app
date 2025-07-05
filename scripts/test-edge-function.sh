#!/bin/bash

# Load environment variables
source .env.local

echo "Testing Edge Function via Custom API Domain..."
echo "=============================================="
echo "API Base URL: ${API_BASE_URL}"
echo ""

# Test GET request
echo "Testing GET request:"
RESPONSE=$(curl -s -X GET "${API_BASE_URL}/hello" \
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
RESPONSE=$(curl -s -X POST "${API_BASE_URL}/hello" \
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
RESPONSE=$(curl -s -X OPTIONS "${API_BASE_URL}/hello" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}")

if [[ $RESPONSE == *"Status: 200"* ]]; then
    echo "✓ CORS headers properly configured"
else
    echo "✗ CORS configuration issue"
fi

echo ""

# Test without authorization (should fail)
echo "Testing without authorization (should fail):"
RESPONSE=$(curl -s -X GET "${API_BASE_URL}/hello" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}")

if [[ $RESPONSE == *"Status: 401"* ]] || [[ $RESPONSE == *"401"* ]]; then
    echo "✓ Authorization properly required"
else
    echo "⚠ Unexpected response (auth may not be required):"
    echo "Response: $RESPONSE"
fi

echo "=============================================="
echo "Custom API domain testing complete!"