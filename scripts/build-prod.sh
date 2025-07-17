#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "🚀 NVLP Production Build Pipeline"
echo ""

# Function to print step
print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if we're in the project root
if [ ! -f "package.json" ] || [ ! -d "apps" ] || [ ! -d "packages" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

# Parse command line arguments
BUILD_TARGET=""
SKIP_TESTS=false
SKIP_ENV_CHECK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --target)
            BUILD_TARGET="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-env-check)
            SKIP_ENV_CHECK=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--target all|packages|mobile|api] [--skip-tests] [--skip-env-check]"
            exit 1
            ;;
    esac
done

# Set default target if not specified
if [ -z "$BUILD_TARGET" ]; then
    BUILD_TARGET="all"
fi

print_step "Production Build Configuration"
echo "Target: $BUILD_TARGET"
echo "Skip Tests: $SKIP_TESTS"
echo "Skip Env Check: $SKIP_ENV_CHECK"
echo ""

# Step 1: Environment validation
if [ "$SKIP_ENV_CHECK" = false ]; then
    print_step "Validating environment variables..."
    if node ./scripts/validate-env.js; then
        print_success "Environment validation passed"
    else
        print_error "Environment validation failed"
        exit 1
    fi
else
    print_warning "Skipping environment validation"
fi

# Step 2: Clean previous builds
print_step "Cleaning previous builds..."
pnpm clean:all > /dev/null 2>&1
print_success "Clean completed"

# Step 3: Install dependencies
print_step "Installing dependencies..."
pnpm install --frozen-lockfile
if [ $? -eq 0 ]; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 4: Type checking
print_step "Running type checks..."
pnpm typecheck
if [ $? -eq 0 ]; then
    print_success "Type checking passed"
else
    print_error "Type checking failed"
    exit 1
fi

# Step 5: Linting
print_step "Running linters..."
pnpm lint
if [ $? -eq 0 ]; then
    print_success "Linting passed"
else
    print_error "Linting failed"
    exit 1
fi

# Step 6: Tests (optional)
if [ "$SKIP_TESTS" = false ]; then
    print_step "Running tests..."
    pnpm test
    if [ $? -eq 0 ]; then
        print_success "All tests passed"
    else
        print_error "Tests failed"
        exit 1
    fi
else
    print_warning "Skipping tests"
fi

# Step 7: Production builds based on target
print_step "Starting production builds..."

case $BUILD_TARGET in
    "packages")
        print_step "Building packages for production..."
        NODE_ENV=production pnpm build:prod --filter='./packages/**'
        ;;
    "mobile")
        print_step "Building packages first..."
        NODE_ENV=production pnpm build:prod --filter='./packages/**'
        print_step "Building mobile app..."
        echo "Run platform-specific commands:"
        echo "  iOS: pnpm build:mobile:ios:prod"
        echo "  Android: pnpm build:mobile:android:prod"
        ;;
    "api")
        print_step "Building packages first..."
        NODE_ENV=production pnpm build:prod --filter='./packages/**'
        print_step "API uses remote Supabase - no build needed"
        echo "Deploy with: pnpm deploy:api"
        ;;
    "all"|*)
        print_step "Building all packages for production..."
        NODE_ENV=production pnpm build:prod
        ;;
esac

if [ $? -eq 0 ]; then
    print_success "Production build completed successfully!"
else
    print_error "Production build failed"
    exit 1
fi

# Step 8: Build analysis (optional)
if [ -f "turbo.json" ]; then
    print_step "Generating build analysis..."
    pnpm build:analyze > /dev/null 2>&1
    print_success "Build analysis available in dist/metafile-*.json"
fi

# Step 9: Summary
echo ""
echo "📊 Build Summary:"
echo "================"

# Show package sizes
if [ -d "packages/types/dist" ]; then
    TYPES_SIZE=$(du -sh packages/types/dist | cut -f1)
    echo "📦 @nvlp/types: $TYPES_SIZE"
fi

if [ -d "packages/client/dist" ]; then
    CLIENT_SIZE=$(du -sh packages/client/dist | cut -f1)
    echo "📦 @nvlp/client: $CLIENT_SIZE"
fi

echo ""
print_success "Production build pipeline completed!"
echo ""

# Next steps
echo "📝 Next Steps:"
case $BUILD_TARGET in
    "mobile")
        echo "1. Run platform-specific build:"
        echo "   - iOS: pnpm build:mobile:ios:prod"
        echo "   - Android: pnpm build:mobile:android:prod"
        echo "2. Test on real devices"
        echo "3. Submit to app stores"
        ;;
    "api")
        echo "1. Deploy edge functions: pnpm deploy:api"
        echo "2. Verify deployment in Supabase dashboard"
        echo "3. Test production endpoints"
        ;;
    *)
        echo "1. Deploy or distribute built packages"
        echo "2. Update version numbers if needed"
        echo "3. Tag release in git"
        ;;
esac

echo ""
echo "Use 'pnpm build:analyze' to view bundle sizes"
echo ""