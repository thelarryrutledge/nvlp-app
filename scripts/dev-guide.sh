#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo "🚀 NVLP Development Workflow Guide"
echo ""

# Function to print section
print_section() {
    echo -e "${BLUE}═══ $1 ═══${NC}"
}

# Function to print command
print_command() {
    echo -e "${GREEN}→ $1${NC}"
    echo -e "  ${CYAN}$2${NC}"
    echo ""
}

print_section "Development Workflows"

print_command "pnpm dev" \
"Start packages (types, client) + API in watch mode"

print_command "pnpm dev:all" \
"Start packages + API + mobile Metro bundler"

print_command "pnpm dev:full" \
"Start all components individually with detailed output"

print_command "pnpm dev:packages" \
"Start only packages (types, client) in watch mode"

print_command "pnpm dev:apps" \
"Start only apps (API, mobile Metro) in watch mode"

print_section "Individual Services"

print_command "pnpm dev:api" \
"Start Supabase API and Edge Functions"

print_command "pnpm dev:mobile" \
"Start React Native Metro bundler"

print_command "pnpm dev:mobile:ios" \
"Start Metro + iOS simulator"

print_command "pnpm dev:mobile:android" \
"Start Metro + Android emulator"

print_command "pnpm dev:db" \
"Start only Supabase database"

print_section "Recommended Workflows"

echo -e "${YELLOW}🔧 For Package Development:${NC}"
echo "  pnpm dev:packages     # Watch mode for types & client libraries"
echo ""

echo -e "${YELLOW}📱 For Mobile Development:${NC}"
echo "  pnpm dev              # Packages + API (then run mobile separately)"
echo "  pnpm dev:mobile:ios   # Or start mobile with iOS"
echo ""

echo -e "${YELLOW}🌐 For API Development:${NC}"
echo "  pnpm dev:api          # API + database"
echo "  pnpm dev:packages     # Run in another terminal for library changes"
echo ""

echo -e "${YELLOW}🎯 For Full Stack Development:${NC}"
echo "  pnpm dev:all          # Everything except platform-specific mobile"
echo "  pnpm dev:full         # Individual processes with detailed output"
echo ""

print_section "Development Tips"

echo -e "${CYAN}Hot Reloading:${NC}"
echo "  • Types & Client: Auto-rebuild on file changes"
echo "  • Mobile: Metro bundler with fast refresh"
echo "  • API: Supabase auto-reload on function changes"
echo ""

echo -e "${CYAN}Process Management:${NC}"
echo "  • Use Ctrl+C to stop all concurrent processes"
echo "  • Each service has color-coded output"
echo "  • Monitor logs for build/error status"
echo ""

echo -e "${CYAN}Dependency Chain:${NC}"
echo "  • Types changes auto-rebuild Client"
echo "  • Client changes available to Mobile/API instantly"
echo "  • Workspace packages use latest local builds"
echo ""

print_section "Troubleshooting"

echo -e "${RED}Common Issues:${NC}"
echo "  • Port conflicts: Check if services are already running"
echo "  • Build errors: Run 'pnpm clean && pnpm build' to reset"
echo "  • Dependency issues: Run 'pnpm clean:deep' for full reset"
echo "  • Mobile Metro: Use 'pnpm dev:mobile:metro --reset' to clear cache"
echo ""

echo -e "${GREEN}Need help? Check:${NC}"
echo "  • DEVELOPMENT.md for detailed setup instructions"
echo "  • Individual package README files"
echo "  • Supabase local development docs"
echo ""