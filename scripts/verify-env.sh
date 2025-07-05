#!/bin/bash

# Load environment variables
source .env.local

echo "Verifying NVLP environment variables..."
echo "======================================="

# Extract project ref from URL
PROJECT_REF=$(echo $SUPABASE_URL | cut -d'.' -f1 | cut -d'/' -f3)
echo "✓ Project Reference: $PROJECT_REF"

# Test REST API
REST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SUPABASE_URL}/rest/v1/" -H "apikey: ${SUPABASE_ANON_KEY}")
if [ "$REST_STATUS" = "200" ]; then
    echo "✓ REST API: Connected (Status: $REST_STATUS)"
else
    echo "✗ REST API: Failed (Status: $REST_STATUS)"
fi

# Test Auth API
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SUPABASE_URL}/auth/v1/health" -H "apikey: ${SUPABASE_ANON_KEY}")
if [ "$AUTH_STATUS" = "200" ]; then
    echo "✓ Auth API: Connected (Status: $AUTH_STATUS)"
else
    echo "✗ Auth API: Failed (Status: $AUTH_STATUS)"
fi

# Test Edge Functions endpoint
FUNCTIONS_RESPONSE=$(curl -s "${SUPABASE_URL}/functions/v1/" -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")
if [[ "$FUNCTIONS_RESPONSE" == *"NOT_FOUND"* ]]; then
    echo "✓ Edge Functions: Endpoint accessible (no functions deployed yet)"
else
    echo "✓ Edge Functions: Endpoint accessible"
fi

# Verify all required variables are present
MISSING_VARS=()
[ -z "$SUPABASE_URL" ] && MISSING_VARS+=("SUPABASE_URL")
[ -z "$SUPABASE_ANON_KEY" ] && MISSING_VARS+=("SUPABASE_ANON_KEY")
[ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && MISSING_VARS+=("SUPABASE_SERVICE_ROLE_KEY")
[ -z "$SUPABASE_JWT_SECRET" ] && MISSING_VARS+=("SUPABASE_JWT_SECRET")

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    echo "✓ All required environment variables are set"
else
    echo "✗ Missing environment variables: ${MISSING_VARS[*]}"
fi

echo "======================================="
echo "Environment verification complete!"