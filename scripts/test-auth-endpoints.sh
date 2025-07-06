#!/bin/bash

# Load environment variables
source .env.local

echo "=================================================="
echo "NVLP Authentication Endpoints Test"
echo "=================================================="
echo "API Base URL: ${API_BASE_URL}"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
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

# Test 1: Register a new user
print_test "Test 1: Register new user"
echo "curl -X POST \"${API_BASE_URL}/auth/register\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \${SUPABASE_ANON_KEY}\" \\"
echo "  -d '{\"email\": \"test@example.com\", \"password\": \"testpass123\"}'"
echo ""

REGISTER_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "test@example.com", "password": "testpass123"}')

if [[ $REGISTER_RESPONSE == *"success"* ]]; then
    print_success "Registration successful"
    echo "Response: $REGISTER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGISTER_RESPONSE"
else
    print_warning "Registration may have failed (user might already exist)"
    echo "Response: $REGISTER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGISTER_RESPONSE"
fi

echo ""
echo "=================================================="

# Test 2: Login with existing user (your confirmed account)
print_test "Test 2: Login with confirmed user"
echo "curl -X POST \"${API_BASE_URL}/auth/login\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \${SUPABASE_ANON_KEY}\" \\"
echo "  -d '{\"email\": \"larryjrutledge@gmail.com\", \"password\": \"testpass123\"}'"
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "larryjrutledge@gmail.com", "password": "testpass123"}')

if [[ $LOGIN_RESPONSE == *"success"* ]]; then
    print_success "Login successful"
    echo "Response:"
    echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"
    
    # Extract access token for next test
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['session']['access_token'])" 2>/dev/null)
    if [ -n "$ACCESS_TOKEN" ]; then
        print_success "Access token extracted: ${ACCESS_TOKEN:0:50}..."
    fi
else
    print_error "Login failed"
    echo "Response: $LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"
fi

echo ""
echo "=================================================="

# Test 3: Test with invalid credentials
print_test "Test 3: Login with invalid credentials"
echo "curl -X POST \"${API_BASE_URL}/auth/login\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \${SUPABASE_ANON_KEY}\" \\"
echo "  -d '{\"email\": \"invalid@example.com\", \"password\": \"wrongpass\"}'"
echo ""

INVALID_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "invalid@example.com", "password": "wrongpass"}')

if [[ $INVALID_RESPONSE == *"error"* ]]; then
    print_success "Invalid credentials properly rejected"
    echo "Response: $INVALID_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$INVALID_RESPONSE"
else
    print_error "Expected authentication failure"
    echo "Response: $INVALID_RESPONSE"
fi

echo ""
echo "=================================================="

# Test 4: Test protected endpoint (if we have a token)
if [ -n "$ACCESS_TOKEN" ]; then
    print_test "Test 4: Test protected endpoint with JWT token"
    echo "curl -X GET \"${API_BASE_URL}/hello\" \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -H \"Authorization: Bearer \${ACCESS_TOKEN}\""
    echo ""
    
    PROTECTED_RESPONSE=$(curl -s -X GET "${API_BASE_URL}/hello" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    if [[ $PROTECTED_RESPONSE == *"Hello from NVLP"* ]]; then
        print_success "Protected endpoint accessible with JWT token"
        echo "Response: $PROTECTED_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PROTECTED_RESPONSE"
    else
        print_warning "Protected endpoint response unexpected"
        echo "Response: $PROTECTED_RESPONSE"
    fi
else
    print_warning "Skipping protected endpoint test (no access token)"
fi

echo ""
echo "=================================================="

# Test 5: Test validation errors
print_test "Test 5: Test validation errors"
echo "curl -X POST \"${API_BASE_URL}/auth/register\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \${SUPABASE_ANON_KEY}\" \\"
echo "  -d '{\"email\": \"invalid-email\", \"password\": \"123\"}'"
echo ""

VALIDATION_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "invalid-email", "password": "123"}')

if [[ $VALIDATION_RESPONSE == *"error"* ]]; then
    print_success "Validation errors properly handled"
    echo "Response: $VALIDATION_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$VALIDATION_RESPONSE"
else
    print_error "Expected validation error"
    echo "Response: $VALIDATION_RESPONSE"
fi

echo ""
echo "=================================================="
echo "Authentication endpoint testing complete!"
echo ""
echo "📋 USAGE EXAMPLES:"
echo ""
echo "Register new user:"
echo "curl -X POST \"${API_BASE_URL}/auth/register\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \${SUPABASE_ANON_KEY}\" \\"
echo "  -d '{\"email\": \"user@example.com\", \"password\": \"securepass123\"}'"
echo ""
echo "Login existing user:"
echo "curl -X POST \"${API_BASE_URL}/auth/login\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \${SUPABASE_ANON_KEY}\" \\"
echo "  -d '{\"email\": \"user@example.com\", \"password\": \"securepass123\"}'"
echo ""
echo "Use JWT token for protected endpoints:"
echo "curl -X GET \"${API_BASE_URL}/protected-endpoint\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \${JWT_TOKEN_FROM_LOGIN}\""
echo "=================================================="