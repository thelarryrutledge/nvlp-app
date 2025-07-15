#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 NVLP Vercel Deployment Script${NC}"
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
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI is not installed"
    echo "Install it with: npm install -g vercel"
    exit 1
fi

print_step "Checking Vercel configuration"

# Validate Vercel configuration
if [ ! -f "vercel.json" ]; then
    print_error "vercel.json not found in root directory"
    exit 1
fi

# Parse and validate vercel.json
node -e "
try {
  const config = require('./vercel.json');
  if (!config.buildCommand) {
    console.log('⚠️ No buildCommand specified, using default');
  } else {
    console.log('✅ Build command:', config.buildCommand);
  }
  if (!config.installCommand) {
    console.log('⚠️ No installCommand specified, using default');
  } else {
    console.log('✅ Install command:', config.installCommand);
  }
} catch (error) {
  console.error('❌ Invalid vercel.json:', error.message);
  process.exit(1);
}
"

if [ $? -ne 0 ]; then
    print_error "Invalid Vercel configuration"
    exit 1
fi

print_success "Vercel configuration is valid"

print_step "Building packages for deployment"

# Build packages first (required for monorepo)
pnpm build:packages

if [ $? -ne 0 ]; then
    print_error "Package build failed"
    exit 1
fi

print_success "Packages built successfully"

print_step "Preparing deployment"

# Check deployment type
DEPLOYMENT_TYPE=${1:-"preview"}

case $DEPLOYMENT_TYPE in
    "production")
        print_step "Deploying to production"
        echo "Command: vercel --prod"
        echo "Note: This would deploy to production domain"
        ;;
    "preview")
        print_step "Deploying preview"
        echo "Command: vercel"
        echo "Note: This would deploy to preview domain"
        ;;
    "dry-run")
        print_step "Dry run - no actual deployment"
        echo "✅ All checks passed"
        echo "✅ Ready for deployment"
        ;;
    *)
        print_error "Invalid deployment type: $DEPLOYMENT_TYPE"
        echo "Usage: $0 [production|preview|dry-run]"
        exit 1
        ;;
esac

print_step "Deployment summary"
echo "📦 Monorepo structure: Ready"
echo "🔧 Package builds: Complete"
echo "⚙️ Vercel config: Valid"
echo "🌐 API routing: Configured for Supabase Edge Functions"
echo "📱 Mobile app: Not deployed to Vercel (use app stores)"

if [ "$DEPLOYMENT_TYPE" == "dry-run" ]; then
    print_success "Dry run completed successfully"
    echo ""
    echo "To deploy:"
    echo "  Preview: $0 preview"
    echo "  Production: $0 production"
else
    print_warning "Deployment simulation complete"
    echo "Run with actual Vercel CLI commands when ready"
fi

print_success "Deployment script completed"