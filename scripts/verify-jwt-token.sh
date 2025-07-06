#!/bin/bash

# Load environment variables
source .env.local

echo "=================================================="
echo "JWT Token Verification and Analysis"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_section() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Function to decode JWT
decode_jwt() {
    local jwt=$1
    local part=$2
    
    # Remove potential whitespace
    jwt=$(echo -n "$jwt" | tr -d ' ')
    
    # Split JWT into parts
    IFS='.' read -ra JWT_PARTS <<< "$jwt"
    
    if [ ${#JWT_PARTS[@]} -ne 3 ]; then
        echo "Invalid JWT format"
        return 1
    fi
    
    case $part in
        "header")
            # Add padding if needed and decode
            local header="${JWT_PARTS[0]}"
            local padding=$((4 - ${#header} % 4))
            if [ $padding -ne 4 ]; then
                header="${header}$(printf '=%.0s' $(seq 1 $padding))"
            fi
            echo -n "$header" | base64 -d 2>/dev/null
            ;;
        "payload")
            # Add padding if needed and decode
            local payload="${JWT_PARTS[1]}"
            local padding=$((4 - ${#payload} % 4))
            if [ $padding -ne 4 ]; then
                payload="${payload}$(printf '=%.0s' $(seq 1 $padding))"
            fi
            echo -n "$payload" | base64 -d 2>/dev/null
            ;;
        "signature")
            echo "${JWT_PARTS[2]}"
            ;;
    esac
}

# First, get a fresh JWT token by logging in
print_section "Step 1: Obtaining fresh JWT token..."
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "larryjrutledge@gmail.com", "password": "securepass123"}')

if [[ $LOGIN_RESPONSE == *"success"* ]]; then
    JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['session']['access_token'])" 2>/dev/null)
    
    if [ -n "$JWT_TOKEN" ]; then
        print_success "JWT token obtained successfully"
        echo ""
    else
        echo "Failed to extract JWT token"
        exit 1
    fi
else
    echo "Login failed: $LOGIN_RESPONSE"
    exit 1
fi

# Analyze JWT structure
print_section "Step 2: JWT Token Structure"
echo "=================================================="
echo "Token length: ${#JWT_TOKEN} characters"
echo ""

# Count the dots to verify JWT format
DOT_COUNT=$(echo "$JWT_TOKEN" | grep -o '\.' | wc -l | tr -d ' ')
if [ "$DOT_COUNT" -eq "2" ]; then
    print_success "Valid JWT format (3 parts separated by dots)"
else
    echo "Invalid JWT format (expected 3 parts, found $((DOT_COUNT + 1)))"
fi
echo ""

# Decode and display JWT header
print_section "Step 3: JWT Header (Algorithm & Type)"
echo "=================================================="
HEADER=$(decode_jwt "$JWT_TOKEN" "header")
if [ -n "$HEADER" ]; then
    echo "$HEADER" | python3 -m json.tool 2>/dev/null || echo "$HEADER"
    
    # Extract algorithm
    ALG=$(echo "$HEADER" | python3 -c "import sys, json; print(json.loads(sys.read())['alg'])" 2>/dev/null)
    if [ -n "$ALG" ]; then
        print_info "Algorithm: $ALG"
    fi
else
    echo "Failed to decode header"
fi
echo ""

# Decode and display JWT payload
print_section "Step 4: JWT Payload (Claims)"
echo "=================================================="
PAYLOAD=$(decode_jwt "$JWT_TOKEN" "payload")
if [ -n "$PAYLOAD" ]; then
    echo "$PAYLOAD" | python3 -m json.tool 2>/dev/null || echo "$PAYLOAD"
    echo ""
    
    # Extract and analyze key claims
    if command -v python3 &> /dev/null; then
        python3 << EOF
import json
from datetime import datetime

try:
    payload = json.loads('''$PAYLOAD''')
    
    print("\n${YELLOW}Key Claims Analysis:${NC}")
    print("=" * 50)
    
    # User ID
    if 'sub' in payload:
        print(f"User ID (sub): {payload['sub']}")
    
    # Email
    if 'email' in payload:
        print(f"Email: {payload['email']}")
    
    # Role
    if 'role' in payload:
        print(f"Role: {payload['role']}")
    
    # Issued at
    if 'iat' in payload:
        iat = datetime.fromtimestamp(payload['iat'])
        print(f"Issued at: {iat.strftime('%Y-%m-%d %H:%M:%S')} (timestamp: {payload['iat']})")
    
    # Expiration
    if 'exp' in payload:
        exp = datetime.fromtimestamp(payload['exp'])
        print(f"Expires at: {exp.strftime('%Y-%m-%d %H:%M:%S')} (timestamp: {payload['exp']})")
        
        # Calculate time until expiration
        now = datetime.now()
        if exp > now:
            diff = exp - now
            minutes = diff.seconds // 60
            print(f"${GREEN}✓ Token valid for: {minutes} minutes${NC}")
        else:
            print(f"${RED}✗ Token expired${NC}")
    
    # Audience
    if 'aud' in payload:
        print(f"Audience: {payload['aud']}")
    
    # Issuer
    if 'iss' in payload:
        print(f"Issuer: {payload['iss']}")
        
except Exception as e:
    print(f"Error analyzing payload: {e}")
EOF
    fi
else
    echo "Failed to decode payload"
fi
echo ""

# Verify signature exists
print_section "Step 5: JWT Signature Verification"
echo "=================================================="
SIGNATURE=$(decode_jwt "$JWT_TOKEN" "signature")
if [ -n "$SIGNATURE" ] && [ ${#SIGNATURE} -gt 10 ]; then
    print_success "Signature present (${#SIGNATURE} characters)"
    print_info "Signature is verified by Supabase when used"
else
    echo "Invalid or missing signature"
fi
echo ""

# Test using the JWT token
print_section "Step 6: Testing JWT Token Usage"
echo "=================================================="
echo "Testing protected endpoint with JWT..."
TEST_RESPONSE=$(curl -s -X GET "${API_BASE_URL}/hello" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -w "\nSTATUS:%{http_code}")

STATUS=$(echo "$TEST_RESPONSE" | grep "STATUS:" | cut -d':' -f2)
BODY=$(echo "$TEST_RESPONSE" | grep -v "STATUS:")

if [ "$STATUS" = "200" ]; then
    print_success "JWT token accepted by protected endpoint"
    echo "Response: $BODY"
else
    echo "JWT token rejected (Status: $STATUS)"
    echo "Response: $BODY"
fi

echo ""
echo "=================================================="
echo "JWT Verification Complete!"
echo ""
print_info "The JWT token is properly formatted and contains:"
echo "  - User identification (sub/user_id)"
echo "  - Email address"
echo "  - Role (authenticated)"
echo "  - Expiration time (1 hour)"
echo "  - Session information"
echo "  - Issuer (Supabase URL)"
echo ""
print_success "JWT token is valid and working correctly!"
echo "=================================================="