#!/bin/bash

# Device Management Edge Function Test Script
# Tests the complete device management functionality for NVLP API

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration from environment or defaults
SUPABASE_URL="${SUPABASE_URL}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}"

# Check if environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set${NC}"
    exit 1
fi

echo -e "${BLUE}📱 NVLP Device Management Test Suite${NC}"
echo "=============================================="
echo -e "${CYAN}Supabase URL:${NC} $SUPABASE_URL"
echo ""

# Check if access token was provided as argument
if [ -n "$1" ]; then
    ACCESS_TOKEN="$1"
    echo -e "${GREEN}✓ Using provided access token${NC}"
else
    # Extract access token from magic link URL
    echo -e "${YELLOW}Please paste the magic link URL from your email:${NC}"
    read -r MAGIC_LINK_URL
    
    # Extract access_token from the URL
    if [[ "$MAGIC_LINK_URL" =~ access_token=([^&]+) ]]; then
        ACCESS_TOKEN="${BASH_REMATCH[1]}"
        echo -e "${GREEN}✓ Access token extracted from magic link${NC}"
    else
        echo -e "${RED}Error: Could not extract access token from URL${NC}"
        echo "Make sure you copied the complete magic link URL"
        exit 1
    fi
fi

echo "Access Token: ${ACCESS_TOKEN:0:20}..."

# Variables to store test data
DEVICE_ID_1=""
DEVICE_ID_2=""

# Function to test endpoint with error handling
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers=$4
    local expected_status=${5:-200}
    local description=$6
    
    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "Endpoint: $method $endpoint"
    
    if [ -n "$data" ]; then
        echo "Data: $data"
    fi
    
    # Make the request and capture response
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$endpoint" \
            -H "Content-Type: application/json" \
            $headers \
            -d "$data" 2>/dev/null || true)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$endpoint" \
            -H "Content-Type: application/json" \
            $headers 2>/dev/null || true)
    fi
    
    # Split response and status code
    body=$(echo "$response" | sed '$d')
    status_code=$(echo "$response" | tail -n 1)
    
    # Check status code
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ Status: $status_code (Expected: $expected_status)${NC}"
        if [ -n "$body" ]; then
            echo "Response: $body" | jq '.' 2>/dev/null || echo "$body"
        fi
        return 0
    else
        echo -e "${RED}✗ Status: $status_code (Expected: $expected_status)${NC}"
        if [ -n "$body" ]; then
            echo "Response: $body" | jq '.' 2>/dev/null || echo "$body"
        fi
        return 1
    fi
}

# Generate device IDs
DEVICE_ID_1=$(uuidgen | tr '[:upper:]' '[:lower:]')
DEVICE_ID_2=$(uuidgen | tr '[:upper:]' '[:lower:]')
DEVICE_FINGERPRINT_1=$(echo -n "test-device-1-${DEVICE_ID_1}" | openssl dgst -sha256 | cut -d' ' -f2)
DEVICE_FINGERPRINT_2=$(echo -n "test-device-2-${DEVICE_ID_2}" | openssl dgst -sha256 | cut -d' ' -f2)

echo -e "\n${CYAN}Generated Device IDs:${NC}"
echo "Device 1: $DEVICE_ID_1"
echo "Device 2: $DEVICE_ID_2"

# Step 1: Test Device Registration - First Device
echo -e "\n${BLUE}Step 1: Device Registration Tests${NC}"
echo "----------------------------------------"

REGISTER_DATA_1=$(cat <<EOF
{
    "device_id": "$DEVICE_ID_1",
    "device_fingerprint": "$DEVICE_FINGERPRINT_1",
    "device_name": "Test iPhone 15 Pro",
    "device_type": "ios",
    "device_model": "iPhone15,3",
    "os_version": "iOS 17.2",
    "app_version": "1.0.0",
    "push_token": "test-push-token-1"
}
EOF
)

test_endpoint "POST" \
    "$SUPABASE_URL/functions/v1/device-management/register" \
    "$REGISTER_DATA_1" \
    "-H \"Authorization: Bearer $ACCESS_TOKEN\" -H \"X-Device-ID: $DEVICE_ID_1\"" \
    200 \
    "Register First Device (iPhone)"

# Step 2: Register Second Device
echo ""
REGISTER_DATA_2=$(cat <<EOF
{
    "device_id": "$DEVICE_ID_2",
    "device_fingerprint": "$DEVICE_FINGERPRINT_2",
    "device_name": "Test Android Pixel 8",
    "device_type": "android",
    "device_model": "Pixel 8",
    "os_version": "Android 14",
    "app_version": "1.0.0",
    "push_token": "test-push-token-2"
}
EOF
)

test_endpoint "POST" \
    "$SUPABASE_URL/functions/v1/device-management/register" \
    "$REGISTER_DATA_2" \
    "-H \"Authorization: Bearer $ACCESS_TOKEN\" -H \"X-Device-ID: $DEVICE_ID_2\"" \
    200 \
    "Register Second Device (Android)"

# Step 3: List All Devices
echo -e "\n${BLUE}Step 2: Device Listing Tests${NC}"
echo "----------------------------------------"

test_endpoint "GET" \
    "$SUPABASE_URL/functions/v1/device-management/list" \
    "" \
    "-H \"Authorization: Bearer $ACCESS_TOKEN\" -H \"X-Device-ID: $DEVICE_ID_1\"" \
    200 \
    "List All User Devices"

# Step 4: Get Current Device
echo ""
test_endpoint "GET" \
    "$SUPABASE_URL/functions/v1/device-management/current" \
    "" \
    "-H \"Authorization: Bearer $ACCESS_TOKEN\" -H \"X-Device-ID: $DEVICE_ID_1\"" \
    200 \
    "Get Current Device Info"

# Step 5: Update Device Info
echo -e "\n${BLUE}Step 3: Device Update Tests${NC}"
echo "----------------------------------------"

UPDATE_DATA=$(cat <<EOF
{
    "device_name": "Larry's iPhone 15 Pro Max",
    "app_version": "1.0.1"
}
EOF
)

test_endpoint "PATCH" \
    "$SUPABASE_URL/functions/v1/device-management/current" \
    "$UPDATE_DATA" \
    "-H \"Authorization: Bearer $ACCESS_TOKEN\" -H \"X-Device-ID: $DEVICE_ID_1\"" \
    200 \
    "Update Current Device Info"

# Step 6: Sign Out Specific Device
echo -e "\n${BLUE}Step 4: Device Sign-Out Tests${NC}"
echo "----------------------------------------"

test_endpoint "DELETE" \
    "$SUPABASE_URL/functions/v1/device-management/$DEVICE_ID_2" \
    "" \
    "-H \"Authorization: Bearer $ACCESS_TOKEN\" -H \"X-Device-ID: $DEVICE_ID_1\"" \
    200 \
    "Sign Out Second Device"

# Step 7: Sign Out All Other Devices
echo ""
# First register a third device to test sign out all
DEVICE_ID_3=$(uuidgen | tr '[:upper:]' '[:lower:]')
DEVICE_FINGERPRINT_3=$(echo -n "test-device-3-${DEVICE_ID_3}" | openssl dgst -sha256 | cut -d' ' -f2)

REGISTER_DATA_3=$(cat <<EOF
{
    "device_id": "$DEVICE_ID_3",
    "device_fingerprint": "$DEVICE_FINGERPRINT_3",
    "device_name": "Test iPad Pro",
    "device_type": "ios",
    "device_model": "iPad14,1",
    "os_version": "iPadOS 17.2",
    "app_version": "1.0.0"
}
EOF
)

echo -e "${CYAN}Registering third device for testing...${NC}"
curl -s -X POST "$SUPABASE_URL/functions/v1/device-management/register" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "X-Device-ID: $DEVICE_ID_3" \
    -H "Content-Type: application/json" \
    -d "$REGISTER_DATA_3" > /dev/null 2>&1

test_endpoint "POST" \
    "$SUPABASE_URL/functions/v1/device-management/signout-all" \
    "{}" \
    "-H \"Authorization: Bearer $ACCESS_TOKEN\" -H \"X-Device-ID: $DEVICE_ID_1\"" \
    200 \
    "Sign Out All Other Devices"

# Step 8: Test Error Cases
echo -e "\n${BLUE}Step 5: Error Handling Tests${NC}"
echo "----------------------------------------"

test_endpoint "POST" \
    "$SUPABASE_URL/functions/v1/device-management/register" \
    '{"device_name": "Missing Required Fields"}' \
    "-H \"Authorization: Bearer $ACCESS_TOKEN\" -H \"X-Device-ID: $DEVICE_ID_1\"" \
    400 \
    "Register Device - Missing Required Fields"

echo ""
test_endpoint "GET" \
    "$SUPABASE_URL/functions/v1/device-management/current" \
    "" \
    "-H \"Authorization: Bearer $ACCESS_TOKEN\"" \
    400 \
    "Get Current Device - Missing Device ID Header"

echo ""
test_endpoint "DELETE" \
    "$SUPABASE_URL/functions/v1/device-management/invalid-device-id" \
    "" \
    "-H \"Authorization: Bearer $ACCESS_TOKEN\" -H \"X-Device-ID: $DEVICE_ID_1\"" \
    200 \
    "Sign Out Non-existent Device"

# Step 9: Test Revoke Device
echo -e "\n${BLUE}Step 6: Device Revocation Test${NC}"
echo "----------------------------------------"

# Register a device to revoke
DEVICE_ID_4=$(uuidgen | tr '[:upper:]' '[:lower:]')
DEVICE_FINGERPRINT_4=$(echo -n "test-device-4-${DEVICE_ID_4}" | openssl dgst -sha256 | cut -d' ' -f2)

REGISTER_DATA_4=$(cat <<EOF
{
    "device_id": "$DEVICE_ID_4",
    "device_fingerprint": "$DEVICE_FINGERPRINT_4",
    "device_name": "Device to Revoke",
    "device_type": "android",
    "device_model": "Test Device",
    "os_version": "Android 14",
    "app_version": "1.0.0"
}
EOF
)

echo -e "${CYAN}Registering device to test revocation...${NC}"
curl -s -X POST "$SUPABASE_URL/functions/v1/device-management/register" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "X-Device-ID: $DEVICE_ID_4" \
    -H "Content-Type: application/json" \
    -d "$REGISTER_DATA_4" > /dev/null 2>&1

test_endpoint "PATCH" \
    "$SUPABASE_URL/functions/v1/device-management/revoke/$DEVICE_ID_4" \
    "" \
    "-H \"Authorization: Bearer $ACCESS_TOKEN\" -H \"X-Device-ID: $DEVICE_ID_1\"" \
    200 \
    "Revoke Device"

# Summary
echo -e "\n${BLUE}=============================================="
echo -e "📊 Test Summary${NC}"
echo "=============================================="
echo -e "${GREEN}✓ Device Registration${NC}"
echo -e "${GREEN}✓ Device Listing${NC}"
echo -e "${GREEN}✓ Device Updates${NC}"
echo -e "${GREEN}✓ Device Sign-Out${NC}"
echo -e "${GREEN}✓ Device Revocation${NC}"
echo -e "${GREEN}✓ Error Handling${NC}"
echo ""
echo -e "${GREEN}All device management tests completed successfully!${NC}"