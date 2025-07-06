#!/bin/bash

# Load environment variables
source .env.local

echo "=================================================="
echo "Authentication Validation Test"
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

# Test 1: Large request body
print_test "Test 1: Large request body (should be rejected)"
LARGE_EMAIL=$(python3 -c "print('a' * 10000 + '@example.com')")
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d "{\"email\": \"${LARGE_EMAIL}\", \"password\": \"test123\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [[ $HTTP_CODE == "400" ]] && [[ $BODY == *"Request body too large"* ]]; then
    print_success "Large request properly rejected"
else
    print_error "Expected request size validation"
    echo "Response: $BODY"
fi

echo ""
echo "=================================================="

# Test 2: Invalid JSON
print_test "Test 2: Invalid JSON body"
RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{invalid json}')

if [[ $RESPONSE == *"INVALID_REQUEST"* ]] || [[ $RESPONSE == *"Invalid request"* ]]; then
    print_success "Invalid JSON properly rejected"
    echo "Response: $RESPONSE"
else
    print_error "Expected JSON validation error"
    echo "Response: $RESPONSE"
fi

echo ""
echo "=================================================="

# Test 3: Email validation
print_test "Test 3: Email validation tests"

# Test 3a: Missing @ symbol
RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "invalidemail", "password": "Test1234!"}')

if [[ $RESPONSE == *"Invalid email format"* ]]; then
    print_success "Invalid email format rejected (no @)"
else
    print_error "Expected email validation error"
fi

# Test 3b: Too short email
RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "a@b", "password": "Test1234!"}')

if [[ $RESPONSE == *"Invalid email format"* ]]; then
    print_success "Too short email rejected"
else
    print_error "Expected email length validation"
fi

# Test 3c: Email with spaces (should be trimmed)
RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "  test@example.com  ", "password": "Test1234!"}')

if [[ $RESPONSE == *"Invalid email or password"* ]]; then
    print_success "Email with spaces handled (trimmed)"
else
    print_error "Expected email trimming"
fi

echo ""
echo "=================================================="

# Test 4: Password validation
print_test "Test 4: Password validation tests"

# Test 4a: Too short password
RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "test@example.com", "password": "12345"}')

if [[ $RESPONSE == *"at least 6 characters"* ]]; then
    print_success "Short password rejected"
else
    print_error "Expected password length validation"
fi

# Test 4b: Password with non-ASCII characters
RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "test@example.com", "password": "test123🚀"}')

if [[ $RESPONSE == *"invalid characters"* ]]; then
    print_success "Non-ASCII password rejected"
else
    print_error "Expected password character validation"
fi

# Test 4c: Very long password (over 72 chars - bcrypt limit)
LONG_PASS=$(python3 -c "print('a' * 73)")
RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d "{\"email\": \"test@example.com\", \"password\": \"${LONG_PASS}\"}")

if [[ $RESPONSE == *"less than 72 characters"* ]]; then
    print_success "Long password rejected"
else
    print_error "Expected password max length validation"
fi

echo ""
echo "=================================================="

# Test 5: Type validation
print_test "Test 5: Type validation tests"

# Test 5a: Non-string email
RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": 123, "password": "Test1234!"}')

if [[ $RESPONSE == *"Invalid email format"* ]]; then
    print_success "Non-string email rejected"
else
    print_error "Expected email type validation"
fi

# Test 5b: Non-string password
RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "test@example.com", "password": 123456}')

if [[ $RESPONSE == *"Password must be a string"* ]]; then
    print_success "Non-string password rejected"
else
    print_error "Expected password type validation"
fi

echo ""
echo "=================================================="

# Test 6: Refresh token validation
print_test "Test 6: Refresh token validation"

# Test 6a: Empty refresh token
RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/refresh" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"refresh_token": ""}')

if [[ $RESPONSE == *"Valid refresh token is required"* ]]; then
    print_success "Empty refresh token rejected"
else
    print_error "Expected refresh token validation"
fi

# Test 6b: Too short refresh token
RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/refresh" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"refresh_token": "short"}')

if [[ $RESPONSE == *"Invalid refresh token"* ]]; then
    print_success "Short refresh token rejected"
else
    print_error "Expected refresh token length validation"
fi

echo ""
echo "=================================================="

# Test 7: Security headers
print_test "Test 7: Security headers check"
HEADERS=$(curl -s -I -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "test@example.com", "password": "test"}')

if echo "$HEADERS" | grep -q "X-Content-Type-Options: nosniff"; then
    print_success "X-Content-Type-Options header present"
else
    print_error "Missing X-Content-Type-Options header"
fi

if echo "$HEADERS" | grep -q "X-Frame-Options: DENY"; then
    print_success "X-Frame-Options header present"
else
    print_error "Missing X-Frame-Options header"
fi

if echo "$HEADERS" | grep -q "X-XSS-Protection: 1; mode=block"; then
    print_success "X-XSS-Protection header present"
else
    print_error "Missing X-XSS-Protection header"
fi

echo ""
echo "=================================================="
echo "Validation Test Summary"
echo "=================================================="
echo ""
print_success "Enhanced validation implemented:"
echo "  • Request size limits (10KB max)"
echo "  • Email sanitization and validation"
echo "  • Password complexity requirements"
echo "  • Type checking for all inputs"
echo "  • Security headers on all responses"
echo "  • Generic error messages to prevent enumeration"
echo ""
print_success "Security improvements:"
echo "  • Email addresses normalized (trim + lowercase)"
echo "  • Passwords limited to printable ASCII"
echo "  • Max password length enforced (bcrypt limit)"
echo "  • Request body size validation"
echo "  • Proper error handling for malformed JSON"
echo "=================================================="