#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo "📱 Mobile Development Workflow Demo"
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

echo "This demo shows the mobile development workflow in the NVLP monorepo."
echo ""
sleep 2

print_step "Step 1: Verify workspace setup"
print_command "pnpm list @nvlp/types @nvlp/client"
print_output "Dependencies:"
print_output "  @nvlp/client link:../../packages/client"
print_output "  @nvlp/types link:../../packages/types"
print_success "Workspace packages are properly linked!"

print_step "Step 2: Build packages (initial setup)"
print_command "pnpm build:packages"
print_output "Building @nvlp/types..."
print_output "✅ @nvlp/types rebuilt successfully"
print_output "Building @nvlp/client..."
print_output "✅ @nvlp/client build completed successfully"
print_success "Packages built and ready for development!"

print_step "Step 3: Start development services"
echo "You have several options:"
echo ""
echo -e "${CYAN}Option A: Standard development${NC}"
print_command "pnpm dev          # Terminal 1: Packages + API"
print_command "pnpm dev:mobile:ios  # Terminal 2: Mobile + iOS"
echo ""
echo -e "${CYAN}Option B: All-in-one development${NC}"
print_command "pnpm dev:all      # Everything in one terminal"
echo ""
echo -e "${CYAN}Option C: Enhanced hot reload${NC}"
print_command "pnpm dev:hot      # Dependency-aware hot reload"
print_success "Choose the option that fits your workflow!"

print_step "Step 4: Hot reload demonstration"
echo "When you modify a file:"
echo ""
echo -e "${MAGENTA}1. Edit packages/types/src/index.ts${NC}"
print_output "   → Types rebuild automatically"
print_output "   → Client rebuilds (depends on types)"
print_output "   → Metro detects change and refreshes"
echo ""
echo -e "${MAGENTA}2. Edit packages/client/src/api.ts${NC}"
print_output "   → Client rebuilds automatically"
print_output "   → Metro detects change and refreshes"
echo ""
echo -e "${MAGENTA}3. Edit apps/mobile/src/App.tsx${NC}"
print_output "   → React Native Fast Refresh"
print_output "   → Instant UI update"
print_success "Hot reload works across the entire stack!"

print_step "Step 5: Available commands"
echo ""
echo -e "${GREEN}Development:${NC}"
echo "  pnpm dev:mobile         - Start Metro bundler"
echo "  pnpm dev:mobile:ios     - Metro + iOS simulator"
echo "  pnpm dev:mobile:android - Metro + Android emulator"
echo ""
echo -e "${GREEN}Testing:${NC}"
echo "  pnpm test:mobile        - Run mobile tests"
echo "  pnpm lint:mobile        - Lint mobile code"
echo ""
echo -e "${GREEN}Building:${NC}"
echo "  pnpm build:mobile:ios     - Build iOS app"
echo "  pnpm build:mobile:android - Build Android app"
echo ""

print_step "Step 6: Troubleshooting tips"
echo ""
echo -e "${YELLOW}Metro not refreshing?${NC}"
print_command "pnpm --filter @nvlp/mobile start --reset-cache"
echo ""
echo -e "${YELLOW}Package changes not detected?${NC}"
print_command "pnpm build:packages"
print_command "# Then restart Metro"
echo ""
echo -e "${YELLOW}TypeScript errors?${NC}"
print_command "pnpm typecheck"
echo ""

echo ""
echo -e "${GREEN}🎉 Mobile development workflow is ready!${NC}"
echo ""
echo "Key features:"
echo "  • Workspace packages auto-linked"
echo "  • Hot reload across packages"
echo "  • React Native Fast Refresh"
echo "  • TypeScript support"
echo "  • Shared configurations"
echo ""
echo "Happy coding! 🚀"