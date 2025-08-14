#!/bin/bash

# NVLP Cleanup Jobs Management Script
# This script helps manage and monitor database cleanup jobs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL=${SUPABASE_URL:-""}
CLEANUP_ENDPOINT="/functions/v1/cleanup-jobs"

# Helper functions
print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE} NVLP Database Cleanup Management${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  run         Run cleanup jobs manually"
    echo "  dry-run     Check what would be cleaned without doing it"
    echo "  stats       Show cleanup statistics"
    echo "  schedule    Show scheduling instructions"
    echo "  deploy      Deploy cleanup edge function"
    echo "  test        Test cleanup functionality"
    echo ""
    echo "Options:"
    echo "  --help      Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  SUPABASE_URL              Supabase project URL"
    echo "  SUPABASE_SERVICE_ROLE_KEY Service role key for cleanup operations"
}

check_dependencies() {
    if [ -z "$SUPABASE_URL" ]; then
        echo -e "${RED}Error: SUPABASE_URL environment variable is required${NC}"
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

make_request() {
    local endpoint="$1"
    local data="$2"
    local method="${3:-POST}"
    
    local url="${SUPABASE_URL}${endpoint}"
    
    if command -v jq &> /dev/null; then
        curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
            -d "$data" \
            "$url" | jq .
    else
        curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
            -d "$data" \
            "$url"
    fi
}

run_cleanup() {
    echo -e "${GREEN}Running cleanup jobs...${NC}"
    echo ""
    
    local result=$(make_request "$CLEANUP_ENDPOINT" '{"manual": true}')
    echo "$result"
    
    # Check if cleanup was successful
    if echo "$result" | grep -q '"success": true'; then
        echo ""
        echo -e "${GREEN}✅ Cleanup completed successfully${NC}"
    else
        echo ""
        echo -e "${RED}❌ Cleanup failed${NC}"
        exit 1
    fi
}

run_dry_run() {
    echo -e "${YELLOW}Running dry run (no actual cleanup)...${NC}"
    echo ""
    
    local result=$(make_request "$CLEANUP_ENDPOINT" '{"dry_run": true}')
    echo "$result"
}

show_stats() {
    echo -e "${BLUE}Getting cleanup statistics...${NC}"
    echo ""
    
    # This would typically query the cleanup_logs table
    # For now, we'll run a dry run to show current state
    run_dry_run
}

deploy_function() {
    echo -e "${GREEN}Deploying cleanup Edge Function...${NC}"
    echo ""
    
    if command -v supabase &> /dev/null; then
        supabase functions deploy cleanup-jobs --no-verify-jwt
        echo ""
        echo -e "${GREEN}✅ Edge Function deployed successfully${NC}"
        echo -e "${YELLOW}💡 You can now schedule this function to run periodically${NC}"
    else
        echo -e "${RED}Error: Supabase CLI not found${NC}"
        echo "Please install the Supabase CLI first:"
        echo "npm install -g supabase"
        exit 1
    fi
}

show_scheduling() {
    echo -e "${BLUE}Cleanup Job Scheduling Instructions${NC}"
    echo ""
    echo "There are several ways to schedule cleanup jobs:"
    echo ""
    
    echo -e "${GREEN}1. GitHub Actions (Recommended)${NC}"
    echo "   Create .github/workflows/cleanup.yml:"
    echo ""
    cat << 'EOF'
   name: Database Cleanup
   on:
     schedule:
       - cron: '0 2 * * *'  # Daily at 2 AM UTC
   jobs:
     cleanup:
       runs-on: ubuntu-latest
       steps:
         - name: Run Cleanup
           run: |
             curl -X POST \
               -H "Content-Type: application/json" \
               -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
               -d '{"manual": false}' \
               ${{ secrets.SUPABASE_URL }}/functions/v1/cleanup-jobs
EOF
    echo ""
    
    echo -e "${GREEN}2. Cron Job${NC}"
    echo "   Add to your crontab:"
    echo "   0 2 * * * curl -X POST -H 'Authorization: Bearer \$SUPABASE_SERVICE_ROLE_KEY' -d '{\"manual\":false}' \$SUPABASE_URL/functions/v1/cleanup-jobs"
    echo ""
    
    echo -e "${GREEN}3. External Monitoring Service${NC}"
    echo "   Use services like UptimeRobot, Pingdom, or similar to call:"
    echo "   POST $SUPABASE_URL/functions/v1/cleanup-jobs"
    echo ""
    
    echo -e "${GREEN}4. Manual Execution${NC}"
    echo "   Run this script: $0 run"
}

test_functionality() {
    echo -e "${BLUE}Testing cleanup functionality...${NC}"
    echo ""
    
    echo "1. Testing dry run..."
    if run_dry_run | grep -q '"success": true'; then
        echo -e "   ${GREEN}✅ Dry run works${NC}"
    else
        echo -e "   ${RED}❌ Dry run failed${NC}"
        return 1
    fi
    
    echo ""
    echo "2. Testing Edge Function deployment status..."
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL$CLEANUP_ENDPOINT" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -d '{"dry_run": true}')
    
    if [ "$status" = "200" ]; then
        echo -e "   ${GREEN}✅ Edge Function is accessible${NC}"
    else
        echo -e "   ${RED}❌ Edge Function not accessible (HTTP $status)${NC}"
        echo -e "   ${YELLOW}💡 Run: $0 deploy${NC}"
        return 1
    fi
    
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo -e "${YELLOW}💡 You can now schedule cleanup jobs to run automatically${NC}"
}

# Main command handling
case "${1:-}" in
    "run")
        print_header
        check_dependencies
        run_cleanup
        ;;
    "dry-run")
        print_header
        check_dependencies
        run_dry_run
        ;;
    "stats")
        print_header
        check_dependencies
        show_stats
        ;;
    "schedule")
        print_header
        show_scheduling
        ;;
    "deploy")
        print_header
        deploy_function
        ;;
    "test")
        print_header
        check_dependencies
        test_functionality
        ;;
    "--help"|"help"|"")
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