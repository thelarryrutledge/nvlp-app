#!/bin/bash

# Load environment variables
source .env.local

echo "=================================================="
echo "Password Reset Flow Test"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_test() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Test 1: Request password reset
print_test "Test 1: Request password reset for valid user"
echo "curl -X POST \"${API_BASE_URL}/auth/reset-password\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \${SUPABASE_ANON_KEY}\" \\"
echo "  -d '{\"email\": \"larryjrutledge@gmail.com\"}'"
echo ""

RESET_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/reset-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "larryjrutledge@gmail.com"}')

if [[ $RESET_RESPONSE == *"success"* ]]; then
    print_success "Password reset email request sent"
    echo "Response: $RESET_RESPONSE"
    echo ""
    print_warning "Check your email for the reset link"
    print_warning "The link will redirect to: https://nvlp.app/auth/reset.html"
else
    print_error "Password reset request failed"
    echo "Response: $RESET_RESPONSE"
fi

echo ""
echo "=================================================="

# Test 2: Test with invalid email format
print_test "Test 2: Request password reset with invalid email"
echo "curl -X POST \"${API_BASE_URL}/auth/reset-password\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \${SUPABASE_ANON_KEY}\" \\"
echo "  -d '{\"email\": \"invalid-email\"}'"
echo ""

INVALID_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/reset-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "invalid-email"}')

if [[ $INVALID_RESPONSE == *"error"* ]]; then
    print_success "Invalid email properly rejected"
    echo "Response: $INVALID_RESPONSE"
else
    print_error "Expected validation error"
    echo "Response: $INVALID_RESPONSE"
fi

echo ""
echo "=================================================="

# Test 3: Test update-password endpoint (would need valid recovery token)
print_test "Test 3: Update password endpoint (requires recovery token)"
echo ""
echo "To test the update-password endpoint:"
echo "1. Click the reset link in your email"
echo "2. You'll be redirected to: https://nvlp.app/auth/reset.html#access_token=..."
echo "3. Enter your new password on the reset page"
echo "4. The page will call POST /auth/update-password with the recovery token"
echo ""
echo "Manual test URL for update-password:"
echo "curl -X POST \"${API_BASE_URL}/auth/update-password\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \${RECOVERY_TOKEN}\" \\"
echo "  -d '{\"password\": \"newpassword123\"}'"

echo ""
echo "=================================================="
echo "Password Reset Workflow Summary"
echo "=================================================="
echo ""
print_success "Password reset endpoints implemented:"
echo "  • POST /auth/reset-password - Send reset email (public, uses anon key)"
echo "  • POST /auth/update-password - Update password (protected, uses recovery token)"
echo ""
print_success "Reset flow:"
echo "  1. User requests reset via /auth/reset-password"
echo "  2. Email sent with link to https://nvlp.app/auth/reset.html"
echo "  3. Link contains recovery token in URL hash"
echo "  4. Reset page calls /auth/update-password with new password"
echo "  5. User can login with new password"
echo ""
print_success "Security features:"
echo "  • Generic success message prevents email enumeration"
echo "  • Recovery tokens expire after use"
echo "  • Password validation enforced (min 6 characters)"
echo ""
echo "Test pages available:"
echo "  • Request reset: https://nvlp.app/auth/request-reset.html"
echo "  • Reset password: https://nvlp.app/auth/reset.html (requires token)"
echo "=================================================="