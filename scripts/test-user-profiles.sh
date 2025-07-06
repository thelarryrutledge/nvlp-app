#!/bin/bash

# Test user_profiles table functionality
# This script tests if the user_profiles table exists and works correctly

source .env.local

echo "Testing user_profiles table..."
echo "====================================="

# First, let's try to query the table to see if it exists
echo "1. Checking if user_profiles table exists:"
TABLE_CHECK=$(curl -s "${SUPABASE_URL}/rest/v1/user_profiles?select=*&limit=1" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

echo "Response: $TABLE_CHECK"

# Check if the response indicates success or if table doesn't exist
if [[ $TABLE_CHECK == *"relation \"public.user_profiles\" does not exist"* ]]; then
    echo "❌ Table user_profiles does not exist yet"
    echo ""
    echo "Manual steps needed:"
    echo "1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/qnpatlosomopoimtsmsr/sql"
    echo "2. Copy and paste the contents of database/001_create_user_profiles.sql"
    echo "3. Run the SQL to create the table"
    echo "4. Then re-run this test script"
    exit 1
elif [[ $TABLE_CHECK == *"error"* ]]; then
    echo "❌ Error accessing table: $TABLE_CHECK"
    exit 1
else
    echo "✓ Table user_profiles exists and is accessible"
fi

echo ""
echo "2. Testing table structure with our test user:"

# Get our test user's profile (should be auto-created if trigger is working)
echo "Checking if profile exists for test user..."
USER_PROFILE=$(curl -s "https://api.nvlp.app/auth/profile" \
  -H "Content-Type: application/json")

echo "Profile response: $USER_PROFILE"

if [[ $USER_PROFILE == *"larryjrutledge@gmail.com"* ]]; then
    echo "✓ Test user profile accessible via API"
else
    echo "⚠️  Need to login first or profile doesn't exist"
fi

echo ""
echo "3. Testing direct database access:"

# Test direct table query
PROFILE_COUNT=$(curl -s "${SUPABASE_URL}/rest/v1/user_profiles?select=count" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

echo "Profile count query result: $PROFILE_COUNT"

echo ""
echo "====================================="
echo "User profiles table test complete!"