#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo "🌐 API Development Workflow Demo (Remote Supabase)"
echo ""

# Function to print step
print_step() {
    echo -e "${BLUE}▶ $1${NC}"
    sleep 1
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    echo ""
    sleep 1
}

# Function to print command
print_command() {
    echo -e "${CYAN}$ $1${NC}"
    sleep 0.5
}

# Function to print output
print_output() {
    echo -e "${YELLOW}$1${NC}"
}

echo "This demo shows the API development workflow using remote Supabase."
echo "Note: We use the remote Supabase service, not local Docker."
echo ""
sleep 2

print_step "Step 1: Verify workspace setup"
print_command "pnpm list @nvlp/types"
print_output "Dependencies:"
print_output "  @nvlp/types link:../../packages/types"
print_success "Workspace packages are properly linked!"

print_step "Step 2: Edge Functions structure"
print_command "ls supabase/functions/"
print_output "_shared/      auth/         dashboard/    export/"
print_output "audit/        notifications/ reports/      transactions/"
print_output "health/"
print_success "8 edge functions ready for development!"

print_step "Step 3: Development workflow"
echo "Since we use remote Supabase, the workflow is:"
echo ""
echo -e "${CYAN}1. Edit your edge functions:${NC}"
print_command "code supabase/functions/dashboard/index.ts"
echo ""
echo -e "${CYAN}2. Test using your remote Supabase URL:${NC}"
print_output "Use your SUPABASE_URL and SUPABASE_ANON_KEY from .env"
echo ""
echo -e "${CYAN}3. Deploy when ready:${NC}"
print_command "pnpm deploy:dashboard"
print_success "Edge function deployed to remote Supabase!"

print_step "Step 4: Hot reload with packages"
echo "When you modify shared packages:"
echo ""
echo -e "${MAGENTA}1. Edit packages/types/src/index.ts${NC}"
print_output "   → Types rebuild automatically"
print_output "   → Import map allows functions to use new types"
echo ""
echo -e "${MAGENTA}2. Deploy function to see changes:${NC}"
print_command "pnpm deploy:api"
print_output "   → Functions deployed with latest package versions"
print_success "Package changes integrated!"

print_step "Step 5: Available commands"
echo ""
echo -e "${GREEN}Deployment:${NC}"
echo "  pnpm deploy:api          - Deploy all functions"
echo "  pnpm deploy:auth         - Deploy auth function"
echo "  pnpm deploy:dashboard    - Deploy dashboard function"
echo "  pnpm deploy:transactions - Deploy transactions function"
echo "  pnpm deploy:reports      - Deploy reports function"
echo "  pnpm deploy:audit        - Deploy audit function"
echo "  pnpm deploy:export       - Deploy export function"
echo "  pnpm deploy:health       - Deploy health function"
echo "  pnpm deploy:notifications - Deploy notifications function"
echo ""
echo -e "${GREEN}Development:${NC}"
echo "  pnpm lint:api     - Lint edge functions"
echo "  pnpm format:api   - Format edge functions"
echo "  pnpm typecheck    - Check TypeScript types"
echo ""

print_step "Step 6: Environment configuration"
echo ""
echo -e "${YELLOW}Required environment variables:${NC}"
echo "  SUPABASE_URL     - Your Supabase project URL"
echo "  SUPABASE_ANON_KEY - Your Supabase anon key"
echo "  SUPABASE_SERVICE_ROLE_KEY - For admin operations"
echo ""
echo "Set these in your .env file (not committed to git)"
echo ""

print_step "Step 7: Testing workflow"
echo ""
echo -e "${CYAN}Since we use remote Supabase:${NC}"
echo "  1. Deploy your function: pnpm deploy:health"
echo "  2. Test via HTTP client or Supabase dashboard"
echo "  3. Check logs in Supabase dashboard"
echo "  4. Iterate and redeploy as needed"
echo ""

echo ""
echo -e "${GREEN}🎉 API development workflow is ready!${NC}"
echo ""
echo "Key points:"
echo "  • No Docker or local Supabase needed"
echo "  • Deploy directly to remote Supabase"
echo "  • Workspace packages integrated via import map"
echo "  • Individual function deployment for fast iteration"
echo "  • TypeScript and linting support"
echo ""
echo "Happy coding! 🚀"