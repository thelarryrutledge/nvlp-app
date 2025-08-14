#!/bin/bash

# Script to add session validation to all Edge Functions that require authentication

# List of functions to update (excluding test functions and device-management)
FUNCTIONS=(
  "auth-user-update"
  "auth-user"
  "budget-setup"
  "bulk-operations"
  "dashboard"
  "notifications"
  "transactions-simple"
)

for func in "${FUNCTIONS[@]}"; do
  echo "Updating $func..."
  
  # Add import for session validation middleware
  if ! grep -q "sessionValidationMiddleware" "/Users/larryrutledge/Projects/nvlp-app/supabase/functions/$func/index.ts"; then
    # Find the line with corsHeaders import and add session validation import after it
    sed -i '' '/from.*cors\.ts/a\
import { sessionValidationMiddleware } from '\''../_shared/session-validation.ts'\''
' "/Users/larryrutledge/Projects/nvlp-app/supabase/functions/$func/index.ts"
  fi
  
  # Add session validation logic after auth check
  # Look for the pattern where auth is checked and add session validation after it
  if ! grep -q "sessionValidationMiddleware" "/Users/larryrutledge/Projects/nvlp-app/supabase/functions/$func/index.ts"; then
    # This is more complex, so we'll do it manually for critical functions
    echo "Please manually add session validation to $func"
  fi
done

echo "Session validation imports added. Manual validation logic needed for each function."