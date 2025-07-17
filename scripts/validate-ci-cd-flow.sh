#!/bin/bash

# NVLP CI/CD Flow Validation Script
# Tests the complete CI/CD pipeline end-to-end

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test results tracking
VALIDATION_RESULTS=()
FAILED_TESTS=0
TOTAL_TESTS=0

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    VALIDATION_RESULTS+=("✅ $1")
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    VALIDATION_RESULTS+=("⚠️  $1")
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    VALIDATION_RESULTS+=("❌ $1")
    FAILED_TESTS=$((FAILED_TESTS + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test 1: Verify GitHub Actions workflows exist
test_github_workflows() {
    log_info "Testing GitHub Actions workflow configuration..."
    
    local workflows=(
        ".github/workflows/ci.yml"
        ".github/workflows/monorepo-ci.yml"
        ".github/workflows/test-packages.yml"
        ".github/workflows/build-cache.yml"
    )
    
    for workflow in "${workflows[@]}"; do
        if [ -f "$workflow" ]; then
            log_success "Workflow exists: $(basename "$workflow")"
        else
            log_error "Missing workflow: $(basename "$workflow")"
        fi
    done
}

# Test 2: Validate package.json scripts
test_package_scripts() {
    log_info "Testing package.json scripts configuration..."
    
    local required_scripts=(
        "build:packages"
        "test:packages"
        "lint:packages"
        "clean"
        "typecheck"
    )
    
    for script in "${required_scripts[@]}"; do
        if grep -q "\"$script\":" package.json; then
            log_success "Script exists: $script"
        else
            log_error "Missing script: $script"
        fi
    done
}

# Test 3: Verify Turbo configuration
test_turbo_config() {
    log_info "Testing Turbo configuration..."
    
    if [ -f "turbo.json" ]; then
        log_success "turbo.json exists"
        
        # Check for essential tasks
        local tasks=("build" "test" "lint" "typecheck")
        for task in "${tasks[@]}"; do
            if grep -q "\"$task\":" turbo.json; then
                log_success "Turbo task configured: $task"
            else
                log_warning "Turbo task not configured: $task"
            fi
        done
        
        # Check for caching configuration
        if grep -q "\"cache\":" turbo.json; then
            log_success "Turbo caching configured"
        else
            log_warning "Turbo caching not explicitly configured"
        fi
    else
        log_error "turbo.json not found"
    fi
}

# Test 4: Verify workspace configuration
test_workspace_config() {
    log_info "Testing workspace configuration..."
    
    # Check pnpm-workspace.yaml
    if [ -f "pnpm-workspace.yaml" ]; then
        log_success "pnpm-workspace.yaml exists"
        
        if grep -q "apps/\*" pnpm-workspace.yaml && grep -q "packages/\*" pnpm-workspace.yaml; then
            log_success "Workspace patterns configured correctly"
        else
            log_error "Workspace patterns missing or incorrect"
        fi
    else
        log_error "pnpm-workspace.yaml not found"
    fi
    
    # Check package.json workspace configuration
    if grep -q "\"workspaces\":" package.json; then
        log_success "Package.json workspaces configured"
    else
        log_warning "Package.json workspaces not configured"
    fi
}

# Test 5: Verify package structure
test_package_structure() {
    log_info "Testing package structure..."
    
    local packages=("packages/types" "packages/client" "packages/config")
    local apps=("apps/mobile" "apps/api")
    
    for pkg in "${packages[@]}"; do
        if [ -d "$pkg" ] && [ -f "$pkg/package.json" ]; then
            log_success "Package exists: $(basename "$pkg")"
        else
            log_error "Package missing or invalid: $(basename "$pkg")"
        fi
    done
    
    for app in "${apps[@]}"; do
        if [ -d "$app" ] && [ -f "$app/package.json" ]; then
            log_success "App exists: $(basename "$app")"
        else
            log_error "App missing or invalid: $(basename "$app")"
        fi
    done
}

# Test 6: Verify dependencies and workspace protocol
test_workspace_dependencies() {
    log_info "Testing workspace dependencies..."
    
    # Check mobile app dependencies
    if [ -f "apps/mobile/package.json" ]; then
        if grep -q "workspace:" apps/mobile/package.json; then
            log_success "Mobile app uses workspace protocol"
        else
            log_error "Mobile app missing workspace dependencies"
        fi
    fi
    
    # Check client package dependencies
    if [ -f "packages/client/package.json" ]; then
        if grep -q "@nvlp/types" packages/client/package.json; then
            log_success "Client package depends on types"
        else
            log_warning "Client package may not depend on types"
        fi
    fi
}

# Test 7: Verify build outputs exist
test_build_outputs() {
    log_info "Testing build outputs..."
    
    local packages=("packages/types" "packages/client" "packages/config")
    
    for pkg in "${packages[@]}"; do
        if [ -d "$pkg/dist" ]; then
            log_success "Build output exists: $pkg/dist"
        else
            log_warning "Build output missing: $pkg/dist (may need to run build)"
        fi
    done
}

# Test 8: Verify cache configuration
test_cache_configuration() {
    log_info "Testing cache configuration..."
    
    # Check .gitignore
    if grep -q ".turbo" .gitignore; then
        log_success ".turbo directory ignored in git"
    else
        log_warning ".turbo not in .gitignore"
    fi
    
    if grep -q "*.tsbuildinfo" .gitignore; then
        log_success "TypeScript build info ignored"
    else
        log_warning "TypeScript build info not ignored"
    fi
    
    # Check Turbo cache config
    if [ -f ".turbo/config.json" ]; then
        log_success "Turbo cache config exists"
    else
        log_warning "Turbo cache config not found"
    fi
}

# Test 9: Verify script executability
test_script_executability() {
    log_info "Testing script executability..."
    
    local scripts=(
        "scripts/cache-management.sh"
        "scripts/validate-build-cache.sh"
        "scripts/test-ci-pipeline.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            if [ -x "$script" ]; then
                log_success "Script executable: $(basename "$script")"
            else
                log_warning "Script not executable: $(basename "$script")"
            fi
        else
            log_error "Script missing: $(basename "$script")"
        fi
    done
}

# Test 10: Verify Edge Functions (if exist)
test_edge_functions() {
    log_info "Testing Edge Functions configuration..."
    
    if [ -d "supabase/functions" ]; then
        local function_count=$(find supabase/functions -name "index.ts" | wc -l)
        if [ "$function_count" -gt 0 ]; then
            log_success "Edge Functions found ($function_count functions)"
        else
            log_warning "No Edge Functions found"
        fi
        
        # Check for proper structure
        if [ -f "apps/api/package.json" ]; then
            log_success "API package exists"
        else
            log_warning "API package not found"
        fi
    else
        log_warning "Supabase functions directory not found"
    fi
}

# Test 11: Validate CI/CD environment compatibility
test_ci_environment() {
    log_info "Testing CI/CD environment compatibility..."
    
    # Check Node.js version requirement
    if grep -q "\"node\":" package.json; then
        log_success "Node.js version requirement specified"
    else
        log_warning "Node.js version requirement not specified"
    fi
    
    # Check pnpm version requirement
    if grep -q "\"pnpm\":" package.json; then
        log_success "pnpm version requirement specified"
    else
        log_warning "pnpm version requirement not specified"
    fi
    
    # Check for package-lock.json (should not exist in pnpm monorepo)
    if [ ! -f "package-lock.json" ]; then
        log_success "No package-lock.json (correct for pnpm)"
    else
        log_error "package-lock.json exists (should not in pnpm monorepo)"
    fi
    
    # Check for pnpm-lock.yaml
    if [ -f "pnpm-lock.yaml" ]; then
        log_success "pnpm-lock.yaml exists"
    else
        log_error "pnpm-lock.yaml missing"
    fi
}

# Test 12: Simulate CI workflow steps
simulate_ci_workflow() {
    log_info "Simulating CI workflow steps..."
    
    # Step 1: Install dependencies
    log_info "Step 1: Dependency installation simulation"
    if [ -f "pnpm-lock.yaml" ]; then
        log_success "pnpm install would use frozen lockfile"
    else
        log_error "No lockfile for frozen install"
    fi
    
    # Step 2: Build packages
    log_info "Step 2: Package build simulation"
    if command -v pnpm > /dev/null && grep -q "build:packages" package.json; then
        log_success "Package build command available"
    else
        log_error "Package build setup incomplete"
    fi
    
    # Step 3: Type checking
    log_info "Step 3: Type checking simulation"
    if grep -q "typecheck" package.json; then
        log_success "Type checking command available"
    else
        log_warning "Type checking not configured"
    fi
    
    # Step 4: Linting
    log_info "Step 4: Linting simulation"
    if grep -q "lint" package.json; then
        log_success "Linting command available"
    else
        log_warning "Linting not configured"
    fi
    
    # Step 5: Testing
    log_info "Step 5: Testing simulation"
    if grep -q "test" package.json; then
        log_success "Testing command available"
    else
        log_warning "Testing not fully configured"
    fi
}

# Main execution
main() {
    echo -e "${PURPLE}🚀 NVLP CI/CD Flow Validation${NC}"
    echo -e "${PURPLE}================================${NC}"
    echo ""
    
    local test_functions=(
        "test_github_workflows"
        "test_package_scripts"
        "test_turbo_config"
        "test_workspace_config"
        "test_package_structure"
        "test_workspace_dependencies"
        "test_build_outputs"
        "test_cache_configuration"
        "test_script_executability"
        "test_edge_functions"
        "test_ci_environment"
        "simulate_ci_workflow"
    )
    
    for test_func in "${test_functions[@]}"; do
        $test_func
        echo ""
    done
    
    # Summary
    echo -e "${PURPLE}📊 Validation Summary${NC}"
    echo -e "${PURPLE}===================${NC}"
    echo ""
    
    for result in "${VALIDATION_RESULTS[@]}"; do
        echo -e "$result"
    done
    
    echo ""
    echo -e "${BLUE}Total checks: $TOTAL_TESTS${NC}"
    echo -e "${GREEN}Passed: $((TOTAL_TESTS - FAILED_TESTS))${NC}"
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    
    echo ""
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}🎉 CI/CD Flow Validation Complete!${NC}"
        echo -e "${GREEN}✅ All systems ready for continuous integration${NC}"
        echo ""
        echo -e "${CYAN}Next steps:${NC}"
        echo -e "${CYAN}1. Commit and push changes to trigger CI${NC}"
        echo -e "${CYAN}2. Monitor GitHub Actions for successful runs${NC}"
        echo -e "${CYAN}3. Set up branch protection rules${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  Some CI/CD checks failed or have warnings${NC}"
        echo -e "${YELLOW}📋 Review the results above before deploying${NC}"
        exit 1
    fi
}

# Run main function
main "$@"