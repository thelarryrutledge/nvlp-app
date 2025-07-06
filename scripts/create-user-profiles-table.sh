#!/bin/bash

# Create user_profiles table using Supabase REST API
# This executes the SQL by making API calls to create the table structure

source .env.local

echo "Creating user_profiles table via REST API..."
echo "============================================="

# Step 1: Create the table
echo "1. Creating user_profiles table..."
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "CREATE TABLE IF NOT EXISTS public.user_profiles (id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, display_name TEXT, timezone TEXT DEFAULT '\''UTC'\'', currency_code CHAR(3) DEFAULT '\''USD'\'', date_format TEXT DEFAULT '\''YYYY-MM-DD'\'', default_budget_id UUID, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);"
  }'

echo ""
echo "Since REST API SQL execution is limited, please manually execute the SQL:"
echo ""
echo "Go to: https://supabase.com/dashboard/project/qnpatlosomopoimtsmsr/sql"
echo ""
echo "Copy and paste this SQL:"
echo "----------------------------------------"
cat database/001_create_user_profiles.sql
echo "----------------------------------------"
echo ""
echo "After executing the SQL, run this verification:"
echo "./scripts/test-user-profiles.sh"