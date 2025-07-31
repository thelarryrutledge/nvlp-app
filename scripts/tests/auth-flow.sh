#!/bin/bash

# NVLP Auth Flow Test Script
# Tests the complete authentication flow including magic link, user profile, and logout

set -e

# Load environment variables from .env file if it exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  echo "📄 Loading environment from $ENV_FILE"
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Configuration
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
ANON_KEY="${SUPABASE_ANON_KEY:-your_anon_key}"
TEST_EMAIL="${TEST_EMAIL:-larryjrutledge@gmail.com}"
# Use your hosted verify page to see tokens
REDIRECT_TO="${REDIRECT_TO:-https://nvlp.app/verify}"

# Validate required environment variables
if [ "$SUPABASE_URL" = "https://your-project.supabase.co" ] || [ "$ANON_KEY" = "your_anon_key" ]; then
  echo "❌ Error: Missing required environment variables"
  echo "   Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env file or as environment variables"
  exit 1
fi

echo "🧪 NVLP Auth Flow Test Suite"
echo "==========================="
echo "Supabase URL: $SUPABASE_URL"
echo "Test Email: $TEST_EMAIL"
echo "Redirect To: $REDIRECT_TO"
echo ""

# Check if we already have an access token
if [ -n "$ACCESS_TOKEN" ]; then
  echo "✅ Using existing ACCESS_TOKEN"
  echo "   Skipping magic link request..."
  echo ""
else
  # Test 1: Send Magic Link
  echo "1️⃣  Testing Magic Link Request..."
  echo "POST /auth/magic-link"

  MAGIC_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$SUPABASE_URL/functions/v1/auth-magic-link" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_EMAIL\",
      \"redirectTo\": \"$REDIRECT_TO\"
    }")

  HTTP_STATUS=$(echo "$MAGIC_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  RESPONSE_BODY=$(echo "$MAGIC_RESPONSE" | sed '/HTTP_STATUS/d')

  if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Magic link sent successfully"
    echo "   Response: $RESPONSE_BODY"
  else
    echo "❌ Magic link failed (HTTP $HTTP_STATUS)"
    echo "   Response: $RESPONSE_BODY"
    exit 1
  fi

  echo ""

  # Note: In a real test, user would click the magic link and get an access token
  # For testing purposes, we'll need to simulate having a valid token

  echo "📝 Manual Step Required:"
  echo "   1. Check your email for the magic link"
  echo "   2. Click the magic link in your email"
  echo "   3. The link will verify your email with Supabase"
  echo "   4. You'll be redirected to: $REDIRECT_TO"
  echo ""
  echo "📌 Token Extraction:"
  if [[ "$REDIRECT_TO" == nvlp://* ]]; then
    echo "   - For mobile deep links, tokens are in the URL fragment after redirect"
    echo "   - The app should handle token extraction automatically"
  else
    echo "   - For web URLs, tokens will be in the URL fragment (#access_token=...)"
    echo "   - If using a local web server, you can extract tokens from the redirect URL"
  fi
  echo ""
  echo "   Set ACCESS_TOKEN environment variable to continue testing:"
  echo "   export ACCESS_TOKEN=<your_access_token>"
  echo ""
fi

# Test 2: Get User Profile (requires valid token)
if [ -n "$ACCESS_TOKEN" ]; then
  echo "2️⃣  Testing Get User Profile..."
  echo "GET /auth/user"
  
  USER_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET "$SUPABASE_URL/functions/v1/auth-user" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")
  
  HTTP_STATUS=$(echo "$USER_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  RESPONSE_BODY=$(echo "$USER_RESPONSE" | sed '/HTTP_STATUS/d')
  
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ User profile retrieved successfully"
    echo "   Response: $RESPONSE_BODY"
  else
    echo "❌ Get user profile failed (HTTP $HTTP_STATUS)"
    echo "   Response: $RESPONSE_BODY"
  fi
  
  echo ""
  
  # Test 3: Update User Profile
  echo "3️⃣  Testing Update User Profile..."
  echo "PATCH /auth/user"
  
  UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X PATCH "$SUPABASE_URL/functions/v1/auth-user-update" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"display_name\": \"Test User Updated\",
      \"avatar_url\": \"https://example.com/avatar.jpg\"
    }")
  
  HTTP_STATUS=$(echo "$UPDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '/HTTP_STATUS/d')
  
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ User profile updated successfully"
    echo "   Response: $RESPONSE_BODY"
  else
    echo "❌ Update user profile failed (HTTP $HTTP_STATUS)"
    echo "   Response: $RESPONSE_BODY"
  fi
  
  echo ""
  
  # Test 4: Logout
  echo "4️⃣  Testing Logout..."
  echo "POST /auth/logout"
  
  LOGOUT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$SUPABASE_URL/functions/v1/auth-logout" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")
  
  HTTP_STATUS=$(echo "$LOGOUT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  RESPONSE_BODY=$(echo "$LOGOUT_RESPONSE" | sed '/HTTP_STATUS/d')
  
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Logout successful"
    echo "   Response: $RESPONSE_BODY"
  else
    echo "❌ Logout failed (HTTP $HTTP_STATUS)"
    echo "   Response: $RESPONSE_BODY"
  fi
  
  echo ""
  
  # Test 5: Verify Token is Invalid After Logout
  echo "5️⃣  Testing Access After Logout (should fail)..."
  echo "GET /auth/user (with logged out token)"
  
  INVALID_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET "$SUPABASE_URL/functions/v1/auth-user" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")
  
  HTTP_STATUS=$(echo "$INVALID_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  RESPONSE_BODY=$(echo "$INVALID_RESPONSE" | sed '/HTTP_STATUS/d')
  
  if [ "$HTTP_STATUS" = "401" ] || [ "$HTTP_STATUS" = "403" ]; then
    echo "✅ Access properly denied after logout"
    echo "   Response: $RESPONSE_BODY"
  else
    echo "⚠️  Unexpected response after logout (HTTP $HTTP_STATUS)"
    echo "   Response: $RESPONSE_BODY"
  fi
  
else
  echo "⏭️  Skipping user profile tests (no ACCESS_TOKEN set)"
  echo "   To test with a real token:"
  echo "   export ACCESS_TOKEN=your_access_token_here"
  echo "   ./auth-flow.sh"
fi

echo ""
echo "🏁 Auth Flow Test Complete"
echo ""
echo "Usage Examples:"
echo "  # Basic test (magic link only):"
echo "  ./auth-flow.sh"
echo ""
echo "  # Full test with custom email:"
echo "  TEST_EMAIL=myemail@example.com ./auth-flow.sh"
echo ""
echo "  # Test with existing access token:"
echo "  ACCESS_TOKEN=eyJhbGci... ./auth-flow.sh"
echo ""
echo "  # Test with different Supabase project:"
echo "  SUPABASE_URL=https://myproject.supabase.co \\"
echo "  SUPABASE_ANON_KEY=eyJhbGci... \\"
echo "  ./auth-flow.sh"
