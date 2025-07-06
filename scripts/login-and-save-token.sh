#!/bin/bash

# Script to login and save JWT token for easy API testing
# Usage: ./scripts/login-and-save-token.sh [email] [password]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default test credentials
DEFAULT_EMAIL="larryjrutledge@gmail.com"
DEFAULT_PASSWORD="Test1234!"

# Use provided credentials or defaults
EMAIL="${1:-$DEFAULT_EMAIL}"
PASSWORD="${2:-$DEFAULT_PASSWORD}"

# API configuration
API_BASE_URL="https://api.nvlp.app"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8"

echo -e "${BLUE}🔑 Logging in to NVLP API...${NC}"
echo "Email: $EMAIL"

# Login to get JWT token
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Extract access token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.session.access_token // .access_token // empty')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
    echo -e "${RED}❌ Login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

# Save token to .token file
echo "$ACCESS_TOKEN" > .token

echo -e "${GREEN}✅ Login successful!${NC}"
echo "Token saved to .token file"
echo ""
echo -e "${BLUE}📋 Quick test - Get your profile:${NC}"
echo "curl -H \"Authorization: Bearer \$(cat .token)\" $API_BASE_URL/profile"
echo ""
echo -e "${BLUE}📋 Quick test - Get your budgets:${NC}"
echo "curl -H \"Authorization: Bearer \$(cat .token)\" $API_BASE_URL/budgets"
echo ""
echo -e "${BLUE}💡 Usage in curl commands:${NC}"
echo "Just use: -H \"Authorization: Bearer \$(cat .token)\""
echo "Example: curl -H \"Authorization: Bearer \$(cat .token)\" $API_BASE_URL/endpoint"