#!/bin/bash

# Load environment variables from .env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check if .tokens.json exists
if [ ! -f .tokens.json ]; then
  echo "❌ No .tokens.json file found. Please authenticate first with magic link."
  exit 1
fi

# Extract access token from .tokens.json
ACCESS_TOKEN=$(cat .tokens.json | jq -r '.access_token')

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ No access token found in .tokens.json"
  exit 1
fi

echo "Testing auth-logout function..."
echo "URL: https://idmvyzmjcbxqusvjvzna.supabase.co/functions/v1/auth-logout"
echo "Using access token: ${ACCESS_TOKEN:0:20}..."

curl -X POST https://idmvyzmjcbxqusvjvzna.supabase.co/functions/v1/auth-logout \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" | jq .