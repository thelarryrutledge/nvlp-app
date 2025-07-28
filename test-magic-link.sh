#!/bin/bash

# Load environment variables from .env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Test the magic link function
echo "Testing auth-magic-link function..."
echo "URL: https://idmvyzmjcbxqusvjvzna.supabase.co/functions/v1/auth-magic-link"

curl -X POST https://idmvyzmjcbxqusvjvzna.supabase.co/functions/v1/auth-magic-link \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "redirectTo": "https://nvlp.app/verify"
  }' | jq .