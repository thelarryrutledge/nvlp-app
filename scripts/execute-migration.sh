#!/bin/bash

# Execute database migration via Supabase CLI
# Usage: ./execute-migration.sh database/001_create_user_profiles.sql

MIGRATION_FILE="$1"

if [ -z "$MIGRATION_FILE" ]; then
    echo "Usage: $0 <migration_file>"
    echo "Example: $0 database/001_create_user_profiles.sql"
    exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file '$MIGRATION_FILE' not found"
    exit 1
fi

echo "Executing migration: $MIGRATION_FILE"
echo "=========================================="

# Load environment variables
source .env.local

# Execute the migration using supabase CLI
echo "Running SQL migration..."
supabase db reset --linked --debug

# If reset fails, try direct SQL execution
if [ $? -ne 0 ]; then
    echo "Reset failed, trying direct SQL execution..."
    
    # Alternative: Use psql if available
    if command -v psql &> /dev/null; then
        echo "Using psql to execute migration..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d postgres -f "$MIGRATION_FILE"
    else
        echo "Error: Neither supabase reset nor psql available"
        echo "Please execute the SQL manually in Supabase SQL Editor:"
        echo "https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID/sql"
        exit 1
    fi
fi

echo "Migration execution complete!"