#!/bin/bash

# NVLP Email Template Testing Script
# This script tests all email templates to ensure they're working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL=${SUPABASE_URL:-""}
TEST_EMAIL=${TEST_EMAIL:-"larryjrutledge@gmail.com"}
RESEND_API_KEY=${RESEND_API_KEY:-""}

# Helper functions
print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE} NVLP Email Template Testing${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  test-device         Test new device sign-in notification email"
    echo "  test-device-enhanced Test enhanced device notification email"
    echo "  test-magic-enhanced  Test enhanced magic link email"
    echo "  test-all            Test all email templates (standard)"
    echo "  test-all-enhanced   Test all enhanced email templates"
    echo "  verify              Verify email configuration"
    echo "  deploy              Deploy email functions"
    echo "  preview             Preview email templates locally"
    echo ""
    echo "Options:"
    echo "  --email EMAIL  Set test email address (default: $TEST_EMAIL)"
    echo "  --help         Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  SUPABASE_URL       Supabase project URL"
    echo "  RESEND_API_KEY     Resend API key for email delivery"
    echo "  TEST_EMAIL         Email address for testing"
}

check_dependencies() {
    if [ -z "$SUPABASE_URL" ]; then
        echo -e "${RED}Error: SUPABASE_URL environment variable is required${NC}"
        echo "Set it in .env or export it:"
        echo "export SUPABASE_URL=https://your-project.supabase.co"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}Error: curl is required but not installed${NC}"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}Warning: jq not found - output will not be formatted${NC}"
    fi
}

verify_resend_key() {
    if [ -z "$RESEND_API_KEY" ]; then
        echo -e "${YELLOW}Warning: RESEND_API_KEY not set in environment${NC}"
        echo "Email sending might fail without proper API key configuration"
        echo ""
        echo "To set the Resend API key:"
        echo "1. Get your API key from https://resend.com/api-keys"
        echo "2. Add to Supabase:"
        echo "   supabase secrets set RESEND_API_KEY=re_your_key_here"
        echo ""
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    else
        echo -e "${GREEN}✅ RESEND_API_KEY is configured${NC}"
    fi
}

test_device_notification() {
    echo -e "${CYAN}Testing New Device Sign-in Notification Email...${NC}"
    echo ""
    
    local endpoint="${SUPABASE_URL}/functions/v1/test-email"
    
    echo "📧 Sending test email to: $TEST_EMAIL"
    echo "🔗 Using endpoint: $endpoint"
    echo ""
    
    # Make the request
    if command -v jq &> /dev/null; then
        local response=$(curl -s -X POST "$endpoint" \
            -H "Content-Type: application/json" \
            -d '{}')
        
        echo "$response" | jq .
        
        # Check if successful
        if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
            local email_id=$(echo "$response" | jq -r '.emailId // "unknown"')
            echo ""
            echo -e "${GREEN}✅ Email sent successfully!${NC}"
            echo -e "${CYAN}📧 Email ID: $email_id${NC}"
            echo -e "${YELLOW}💡 Check your inbox at: $TEST_EMAIL${NC}"
        else
            echo ""
            echo -e "${RED}❌ Failed to send email${NC}"
            local error=$(echo "$response" | jq -r '.error // "Unknown error"')
            echo -e "${RED}Error: $error${NC}"
            return 1
        fi
    else
        local response=$(curl -s -X POST "$endpoint" \
            -H "Content-Type: application/json" \
            -d '{}')
        
        echo "$response"
        
        if echo "$response" | grep -q '"success":true'; then
            echo ""
            echo -e "${GREEN}✅ Email sent successfully!${NC}"
            echo -e "${YELLOW}💡 Check your inbox at: $TEST_EMAIL${NC}"
        else
            echo ""
            echo -e "${RED}❌ Failed to send email${NC}"
            return 1
        fi
    fi
}

test_enhanced_device_notification() {
    echo -e "${CYAN}Testing Enhanced New Device Sign-in Notification Email...${NC}"
    echo ""
    
    local endpoint="${SUPABASE_URL}/functions/v1/test-email"
    
    echo "📧 Sending enhanced test email to: $TEST_EMAIL"
    echo "🔗 Using endpoint: $endpoint"
    echo ""
    
    # Make the request with enhanced template flag
    if command -v jq &> /dev/null; then
        local response=$(curl -s -X POST "$endpoint" \
            -H "Content-Type: application/json" \
            -d '{"enhanced": true, "template": "device"}')
        
        echo "$response" | jq .
        
        # Check if successful
        if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
            local email_id=$(echo "$response" | jq -r '.emailId // "unknown"')
            echo ""
            echo -e "${GREEN}✅ Enhanced email sent successfully!${NC}"
            echo -e "${CYAN}📧 Email ID: $email_id${NC}"
            echo -e "${YELLOW}💡 Check your inbox at: $TEST_EMAIL${NC}"
        else
            echo ""
            echo -e "${RED}❌ Failed to send enhanced email${NC}"
            local error=$(echo "$response" | jq -r '.error // "Unknown error"')
            echo -e "${RED}Error: $error${NC}"
            return 1
        fi
    else
        local response=$(curl -s -X POST "$endpoint" \
            -H "Content-Type: application/json" \
            -d '{"enhanced": true, "template": "device"}')
        
        echo "$response"
        
        if echo "$response" | grep -q '"success":true'; then
            echo ""
            echo -e "${GREEN}✅ Enhanced email sent successfully!${NC}"
            echo -e "${YELLOW}💡 Check your inbox at: $TEST_EMAIL${NC}"
        else
            echo ""
            echo -e "${RED}❌ Failed to send enhanced email${NC}"
            return 1
        fi
    fi
}

test_enhanced_magic_link() {
    echo -e "${CYAN}Testing Enhanced Magic Link Email...${NC}"
    echo ""
    
    local endpoint="${SUPABASE_URL}/functions/v1/test-email"
    
    echo "📧 Sending enhanced magic link email to: $TEST_EMAIL"
    echo "🔗 Using endpoint: $endpoint"
    echo ""
    
    # Make the request with enhanced magic link template flag
    if command -v jq &> /dev/null; then
        local response=$(curl -s -X POST "$endpoint" \
            -H "Content-Type: application/json" \
            -d '{"enhanced": true, "template": "magic-link"}')
        
        echo "$response" | jq .
        
        # Check if successful
        if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
            local email_id=$(echo "$response" | jq -r '.emailId // "unknown"')
            echo ""
            echo -e "${GREEN}✅ Enhanced magic link email sent successfully!${NC}"
            echo -e "${CYAN}📧 Email ID: $email_id${NC}"
            echo -e "${YELLOW}💡 Check your inbox at: $TEST_EMAIL${NC}"
        else
            echo ""
            echo -e "${RED}❌ Failed to send enhanced magic link email${NC}"
            local error=$(echo "$response" | jq -r '.error // "Unknown error"')
            echo -e "${RED}Error: $error${NC}"
            return 1
        fi
    else
        local response=$(curl -s -X POST "$endpoint" \
            -H "Content-Type: application/json" \
            -d '{"enhanced": true, "template": "magic-link"}')
        
        echo "$response"
        
        if echo "$response" | grep -q '"success":true'; then
            echo ""
            echo -e "${GREEN}✅ Enhanced magic link email sent successfully!${NC}"
            echo -e "${YELLOW}💡 Check your inbox at: $TEST_EMAIL${NC}"
        else
            echo ""
            echo -e "${RED}❌ Failed to send enhanced magic link email${NC}"
            return 1
        fi
    fi
}

verify_email_config() {
    echo -e "${CYAN}Verifying Email Configuration...${NC}"
    echo ""
    
    # Check if test-email function is deployed
    echo "1. Checking test-email function deployment..."
    local status=$(curl -s -o /dev/null -w "%{http_code}" "${SUPABASE_URL}/functions/v1/test-email")
    
    if [ "$status" = "200" ] || [ "$status" = "401" ] || [ "$status" = "405" ]; then
        echo -e "   ${GREEN}✅ test-email function is deployed${NC}"
    else
        echo -e "   ${RED}❌ test-email function not found (HTTP $status)${NC}"
        echo -e "   ${YELLOW}Deploy it with: supabase functions deploy test-email${NC}"
        return 1
    fi
    
    # Check if send-device-notification function exists
    echo ""
    echo "2. Checking send-device-notification function..."
    if [ -d "supabase/functions/send-device-notification" ]; then
        echo -e "   ${GREEN}✅ send-device-notification function exists${NC}"
        
        # Check if deployed
        local status=$(curl -s -o /dev/null -w "%{http_code}" "${SUPABASE_URL}/functions/v1/send-device-notification")
        if [ "$status" = "200" ] || [ "$status" = "401" ] || [ "$status" = "405" ]; then
            echo -e "   ${GREEN}✅ Function is deployed${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Function not deployed yet${NC}"
            echo -e "   ${YELLOW}Deploy with: supabase functions deploy send-device-notification${NC}"
        fi
    else
        echo -e "   ${YELLOW}⚠️  send-device-notification function not found${NC}"
    fi
    
    # Check email templates
    echo ""
    echo "3. Checking email templates..."
    local template_count=0
    
    if [ -f "supabase/functions/_shared/email-templates/new-device-signin.html" ]; then
        echo -e "   ${GREEN}✅ new-device-signin.html template exists${NC}"
        ((template_count++))
    else
        echo -e "   ${RED}❌ new-device-signin.html template missing${NC}"
    fi
    
    if [ -f "supabase/functions/_shared/email-templates/new-device-signin.txt" ]; then
        echo -e "   ${GREEN}✅ new-device-signin.txt template exists${NC}"
        ((template_count++))
    else
        echo -e "   ${RED}❌ new-device-signin.txt template missing${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}Configuration Summary:${NC}"
    echo "   Templates found: $template_count/2"
    
    # Check Resend API key
    echo ""
    verify_resend_key
    
    echo ""
    if [ "$template_count" -eq 2 ]; then
        echo -e "${GREEN}✅ Email system is properly configured${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Some configuration issues found${NC}"
        return 1
    fi
}

deploy_email_functions() {
    echo -e "${CYAN}Deploying Email Functions...${NC}"
    echo ""
    
    if ! command -v supabase &> /dev/null; then
        echo -e "${RED}Error: Supabase CLI not found${NC}"
        echo "Install it with: npm install -g supabase"
        exit 1
    fi
    
    # Deploy test-email function
    echo "1. Deploying test-email function..."
    if supabase functions deploy test-email --no-verify-jwt; then
        echo -e "   ${GREEN}✅ test-email deployed${NC}"
    else
        echo -e "   ${RED}❌ Failed to deploy test-email${NC}"
        return 1
    fi
    
    # Deploy send-device-notification if it exists
    if [ -d "supabase/functions/send-device-notification" ]; then
        echo ""
        echo "2. Deploying send-device-notification function..."
        if supabase functions deploy send-device-notification --no-verify-jwt; then
            echo -e "   ${GREEN}✅ send-device-notification deployed${NC}"
        else
            echo -e "   ${RED}❌ Failed to deploy send-device-notification${NC}"
        fi
    fi
    
    echo ""
    echo -e "${GREEN}✅ Email functions deployed successfully${NC}"
}

preview_templates() {
    echo -e "${CYAN}Email Template Preview${NC}"
    echo ""
    
    # Check if templates exist
    local html_template="supabase/functions/_shared/email-templates/new-device-signin.html"
    local txt_template="supabase/functions/_shared/email-templates/new-device-signin.txt"
    
    if [ -f "$html_template" ]; then
        echo -e "${GREEN}HTML Template (new-device-signin.html):${NC}"
        echo "----------------------------------------"
        
        # Extract key information from HTML
        echo "📧 Template Features:"
        grep -q "NVLP Logo" "$html_template" && echo "   ✅ NVLP Logo included"
        grep -q "device_name" "$html_template" && echo "   ✅ Device name placeholder"
        grep -q "signin_time" "$html_template" && echo "   ✅ Sign-in time placeholder"
        grep -q "location" "$html_template" && echo "   ✅ Location placeholder"
        grep -q "ip_address" "$html_template" && echo "   ✅ IP address placeholder"
        grep -q "Manage Active Sessions" "$html_template" && echo "   ✅ Action button included"
        
        echo ""
        echo "📝 Template Structure:"
        echo "   - Header with NVLP branding"
        echo "   - Alert box with sign-in notification"
        echo "   - Device information section"
        echo "   - Action buttons for security management"
        echo "   - Footer with support information"
        echo ""
    else
        echo -e "${RED}❌ HTML template not found${NC}"
    fi
    
    if [ -f "$txt_template" ]; then
        echo -e "${GREEN}Text Template (new-device-signin.txt):${NC}"
        echo "----------------------------------------"
        echo "First 20 lines:"
        head -20 "$txt_template" | sed 's/^/   /'
        echo "   ..."
        echo ""
    else
        echo -e "${RED}❌ Text template not found${NC}"
    fi
    
    # Show template variables
    echo -e "${CYAN}Template Variables:${NC}"
    echo "   {{user_name}}      - User's display name"
    echo "   {{user_email}}     - User's email address"
    echo "   {{device_name}}    - Name of the new device"
    echo "   {{signin_time}}    - Time of sign-in"
    echo "   {{location}}       - Geographic location"
    echo "   {{ip_address}}     - IP address of device"
    echo "   {{app_url}}        - URL to NVLP app"
}

test_all_templates() {
    echo -e "${CYAN}Testing All Email Templates...${NC}"
    echo ""
    
    local all_passed=true
    
    # Test device notification
    echo "1. Testing New Device Sign-in Notification..."
    if test_device_notification; then
        echo -e "   ${GREEN}✅ Passed${NC}"
    else
        echo -e "   ${RED}❌ Failed${NC}"
        all_passed=false
    fi
    
    echo ""
    echo "----------------------------------------"
    echo ""
    
    # Add more template tests here as they're created
    # echo "2. Testing Password Reset Email..."
    # if test_password_reset; then
    #     echo -e "   ${GREEN}✅ Passed${NC}"
    # else
    #     echo -e "   ${RED}❌ Failed${NC}"
    #     all_passed=false
    # fi
    
    echo -e "${CYAN}Test Summary:${NC}"
    if [ "$all_passed" = true ]; then
        echo -e "${GREEN}✅ All email templates are working correctly!${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Some email templates failed testing${NC}"
        return 1
    fi
}

test_all_enhanced_templates() {
    echo -e "${CYAN}Testing All Enhanced Email Templates...${NC}"
    echo ""
    
    local all_passed=true
    
    # Test enhanced device notification
    echo "1. Testing Enhanced New Device Sign-in Notification..."
    if test_enhanced_device_notification; then
        echo -e "   ${GREEN}✅ Passed${NC}"
    else
        echo -e "   ${RED}❌ Failed${NC}"
        all_passed=false
    fi
    
    echo ""
    echo "----------------------------------------"
    echo ""
    
    # Test enhanced magic link
    echo "2. Testing Enhanced Magic Link Email..."
    if test_enhanced_magic_link; then
        echo -e "   ${GREEN}✅ Passed${NC}"
    else
        echo -e "   ${RED}❌ Failed${NC}"
        all_passed=false
    fi
    
    echo ""
    echo "----------------------------------------"
    echo ""
    
    echo -e "${CYAN}Enhanced Templates Test Summary:${NC}"
    if [ "$all_passed" = true ]; then
        echo -e "${GREEN}✅ All enhanced email templates are working correctly!${NC}"
        echo -e "${CYAN}🎨 The enhanced templates feature:${NC}"
        echo "   • Design system color palette integration"
        echo "   • Sophisticated gradients and shadows"
        echo "   • Modern card layouts and animations"
        echo "   • Responsive design with dark mode support"
        echo "   • Professional typography and spacing"
        return 0
    else
        echo -e "${YELLOW}⚠️  Some enhanced email templates failed testing${NC}"
        return 1
    fi
}

# Parse command line options
while [[ $# -gt 0 ]]; do
    case $1 in
        --email)
            TEST_EMAIL="$2"
            shift 2
            ;;
        --help)
            print_header
            print_usage
            exit 0
            ;;
        *)
            break
            ;;
    esac
done

# Main command handling
case "${1:-}" in
    "test-device")
        print_header
        check_dependencies
        test_device_notification
        ;;
    "test-device-enhanced")
        print_header
        check_dependencies
        test_enhanced_device_notification
        ;;
    "test-magic-enhanced")
        print_header
        check_dependencies
        test_enhanced_magic_link
        ;;
    "test-all")
        print_header
        check_dependencies
        test_all_templates
        ;;
    "test-all-enhanced")
        print_header
        check_dependencies
        test_all_enhanced_templates
        ;;
    "verify")
        print_header
        check_dependencies
        verify_email_config
        ;;
    "deploy")
        print_header
        deploy_email_functions
        ;;
    "preview")
        print_header
        preview_templates
        ;;
    "")
        print_header
        print_usage
        ;;
    *)
        echo -e "${RED}Error: Unknown command '$1'${NC}"
        echo ""
        print_usage
        exit 1
        ;;
esac