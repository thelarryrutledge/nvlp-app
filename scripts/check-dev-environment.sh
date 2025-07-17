#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 NVLP Development Environment Check"
echo ""

# Function to print check
print_check() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1${NC}"
    fi
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check Node.js
node --version > /dev/null 2>&1
print_check "Node.js $(node --version 2>/dev/null || echo 'not found')" $?

# Check pnpm
pnpm --version > /dev/null 2>&1
print_check "pnpm $(pnpm --version 2>/dev/null || echo 'not found')" $?

# Check Docker
docker --version > /dev/null 2>&1
DOCKER_STATUS=$?
print_check "Docker $(docker --version 2>/dev/null | cut -d' ' -f3 | sed 's/,//' || echo 'not found')" $DOCKER_STATUS

# Check Docker running
if [ $DOCKER_STATUS -eq 0 ]; then
    docker info > /dev/null 2>&1
    print_check "Docker daemon running" $?
else
    print_warning "Docker not available - Supabase local development will not work"
fi

# Check Supabase CLI
supabase --version > /dev/null 2>&1
print_check "Supabase CLI $(supabase --version 2>/dev/null || echo 'not found')" $?

# Check TypeScript
tsc --version > /dev/null 2>&1
print_check "TypeScript $(tsc --version 2>/dev/null || echo 'not found')" $?

echo ""
echo "📋 Port Status Check:"

# Check common development ports
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${YELLOW}⚠ Port $1 is in use${NC}"
        lsof -i :$1 | head -2
    else
        echo -e "${GREEN}✓ Port $1 is available${NC}"
    fi
}

check_port 3000  # General dev server
check_port 8081  # Metro bundler
check_port 54321 # Supabase local

echo ""
echo "🚀 Development Workflow Status:"

# Check if packages are built
if [ -d "packages/types/dist" ] && [ -d "packages/client/dist" ]; then
    print_check "Packages built and ready" 0
else
    print_warning "Packages need building - run 'pnpm build:packages'"
fi

# Check if node_modules exist
if [ -d "node_modules" ] && [ -d "apps/mobile/node_modules" ]; then
    print_check "Dependencies installed" 0
else
    print_warning "Dependencies need installation - run 'pnpm install'"
fi

echo ""
echo "📝 Recommendations:"

if [ $DOCKER_STATUS -ne 0 ]; then
    print_info "Install Docker Desktop for Supabase local development"
fi

echo -e "${BLUE}• Run 'pnpm dev:guide' for development workflow options${NC}"
echo -e "${BLUE}• Run 'pnpm build:packages' to ensure packages are built${NC}"
echo -e "${BLUE}• Use 'pnpm dev:packages' for library development${NC}"
echo -e "${BLUE}• Use 'pnpm dev:mobile' for React Native Metro bundler${NC}"

echo ""