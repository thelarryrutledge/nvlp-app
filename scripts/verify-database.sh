#!/bin/bash

# Load environment variables
source .env.local

echo "Verifying NVLP database access..."
echo "===================================="

# Test REST API with anon key
echo "Testing REST API with anon key:"
ANON_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SUPABASE_URL}/rest/v1/" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

if [ "$ANON_STATUS" = "200" ]; then
    echo "✓ Anon key database access: Working (Status: $ANON_STATUS)"
else
    echo "✗ Anon key database access: Failed (Status: $ANON_STATUS)"
fi

# Test REST API with service role key  
echo "Testing REST API with service role key:"
SERVICE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SUPABASE_URL}/rest/v1/" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

if [ "$SERVICE_STATUS" = "200" ]; then
    echo "✓ Service role database access: Working (Status: $SERVICE_STATUS)"
else
    echo "✗ Service role database access: Failed (Status: $SERVICE_STATUS)"
fi

# Get database version info
echo ""
echo "Database information:"
DB_INFO=$(curl -s "${SUPABASE_URL}/rest/v1/" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" | \
  python3 -c "import sys, json; data=json.load(sys.stdin); print(f'Version: {data[\"info\"][\"version\"]}'); print(f'Host: {data[\"host\"]}')" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "✓ $DB_INFO"
else
    echo "✗ Could not retrieve database info"
fi

# Test if we can access public schema
echo ""
echo "Testing public schema access:"
PUBLIC_RESPONSE=$(curl -s "${SUPABASE_URL}/rest/v1/" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

if [[ $PUBLIC_RESPONSE == *"public schema"* ]]; then
    echo "✓ Public schema accessible"
else
    echo "✗ Public schema access failed"
fi

echo "===================================="
echo "Database verification complete!"
echo "Ready for table creation and migrations"