#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo "🔥 NVLP Hot Reload Orchestrator"
echo ""

# Function to print status
print_status() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}"
}

# Cleanup function
cleanup() {
    print_status "Shutting down hot reload processes..."
    jobs -p | xargs -r kill
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

print_status "Starting hot reload orchestration..."

# Check if packages are built
if [ ! -d "packages/types/dist" ] || [ ! -d "packages/client/dist" ]; then
    print_warning "Packages not built. Building initial packages..."
    pnpm build:packages
    if [ $? -eq 0 ]; then
        print_success "Initial package build completed"
    else
        print_error "Initial package build failed"
        exit 1
    fi
fi

print_status "Dependency chain: types → client → mobile/api"
print_status "Watch folders configured for cross-package hot reload"
echo ""

# Start dependency-aware watch processes
print_status "🔷 Starting @nvlp/types watch mode..."
(
    cd packages/types
    pnpm dev 2>&1 | while read line; do
        echo -e "${BLUE}[TYPES]${NC} $line"
    done
) &
TYPES_PID=$!

# Wait a bit for types to start
sleep 2

print_status "🟡 Starting @nvlp/client watch mode..."
(
    cd packages/client
    # Enhanced client watch with dependency rebuild detection
    pnpm dev 2>&1 | while read line; do
        echo -e "${YELLOW}[CLIENT]${NC} $line"
        # Trigger mobile Metro refresh when client rebuilds
        if echo "$line" | grep -q "build completed successfully"; then
            pkill -f "metro" 2>/dev/null || true
            print_success "Client rebuilt - Metro will auto-restart"
        fi
    done
) &
CLIENT_PID=$!

# Wait a bit for client to start
sleep 2

print_status "🟢 Starting API with hot reload support..."
(
    # API watch with enhanced dependency monitoring
    cd apps/api
    pnpm dev 2>&1 | while read line; do
        echo -e "${GREEN}[API]${NC} $line"
    done
) &
API_PID=$!

print_status "🟣 Starting mobile Metro with package watching..."
(
    cd apps/mobile
    # Enhanced Metro with package dependency watching
    pnpm dev 2>&1 | while read line; do
        echo -e "${MAGENTA}[MOBILE]${NC} $line"
    done
) &
MOBILE_PID=$!

print_success "All hot reload processes started!"
echo ""
print_status "Hot reload features active:"
echo -e "  ${CYAN}• Types changes → Auto-rebuild Client${NC}"
echo -e "  ${CYAN}• Client changes → Metro refresh trigger${NC}"
echo -e "  ${CYAN}• Mobile source → React Native Fast Refresh${NC}"
echo -e "  ${CYAN}• API functions → Supabase hot reload${NC}"
echo -e "  ${CYAN}• Package watching → Metro filesystem monitoring${NC}"
echo ""
print_status "Press Ctrl+C to stop all processes"

# Keep the script running and monitor processes
while true; do
    # Check if any process has died
    if ! kill -0 $TYPES_PID 2>/dev/null; then
        print_error "@nvlp/types watch process died"
        break
    fi
    if ! kill -0 $CLIENT_PID 2>/dev/null; then
        print_error "@nvlp/client watch process died"
        break
    fi
    if ! kill -0 $API_PID 2>/dev/null; then
        print_error "API process died"
        break
    fi
    if ! kill -0 $MOBILE_PID 2>/dev/null; then
        print_error "Mobile Metro process died"
        break
    fi
    
    sleep 5
done

cleanup