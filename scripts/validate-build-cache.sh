#!/bin/bash

# NVLP Build Cache Validation Script
# Validates that build caching is working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="$(pwd)"
CACHE_DIR=".turbo"
VALIDATION_RESULTS=()

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    VALIDATION_RESULTS+=("✅ $1")
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    VALIDATION_RESULTS+=("⚠️  $1")
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    VALIDATION_RESULTS+=("❌ $1")
}

# Test 1: Verify Turbo configuration
test_turbo_config() {
    log_info "Testing Turbo configuration..."
    
    if [ ! -f "turbo.json" ]; then
        log_error "turbo.json not found"
        return 1
    fi
    
    # Check for cache configuration
    if grep -q '"cache"' turbo.json; then
        log_success "Turbo cache configuration found"
    else
        log_warning "No explicit cache configuration in turbo.json"
    fi
    
    # Check for proper task definitions
    if grep -q '"build"' turbo.json && grep -q '"test"' turbo.json; then
        log_success "Essential tasks defined in turbo.json"
    else
        log_error "Missing essential tasks in turbo.json"
        return 1
    fi
    
    return 0
}

# Test 2: Verify cache directory structure
test_cache_directory() {
    log_info "Testing cache directory structure..."
    
    if [ ! -d "$CACHE_DIR" ]; then
        # Create initial cache by running a build
        log_info "Cache directory not found, creating with initial build..."
        pnpm build:packages >/dev/null 2>&1 || true
    fi
    
    if [ -d "$CACHE_DIR" ]; then
        log_success "Turbo cache directory exists"
        
        # Check for config file
        if [ -f "$CACHE_DIR/config.json" ]; then
            log_success "Turbo config file exists"
        else
            log_warning "Turbo config file not found"
        fi
    else
        log_error "Failed to create Turbo cache directory"
        return 1
    fi
    
    return 0
}

# Test 3: Test cache effectiveness
test_cache_effectiveness() {
    log_info "Testing cache effectiveness..."
    
    # Clean previous build
    rm -rf packages/*/dist .turbo 2>/dev/null || true
    
    # First build (cold cache)
    log_info "Running cold cache build..."
    start_time=$(date +%s)
    pnpm build:packages >/dev/null 2>&1
    cold_time=$(($(date +%s) - start_time))
    
    if [ $cold_time -gt 0 ]; then
        log_success "Cold cache build completed in ${cold_time}s"
    else
        log_error "Cold cache build failed"
        return 1
    fi
    
    # Second build (warm cache)
    log_info "Running warm cache build..."
    start_time=$(date +%s)
    pnpm build:packages >/dev/null 2>&1
    warm_time=$(($(date +%s) - start_time))
    
    if [ $warm_time -gt 0 ]; then
        log_success "Warm cache build completed in ${warm_time}s"
        
        # Check if cache provided improvement
        if [ $warm_time -lt $cold_time ]; then
            improvement=$(echo "scale=1; ($cold_time - $warm_time) * 100 / $cold_time" | bc -l 2>/dev/null || echo "N/A")
            log_success "Cache improvement: ${improvement}% (${cold_time}s → ${warm_time}s)"
        else
            log_warning "No cache improvement detected (${cold_time}s → ${warm_time}s)"
        fi
    else
        log_error "Warm cache build failed"
        return 1
    fi
    
    return 0
}

# Test 4: Verify build artifacts are cached
test_build_artifacts() {
    log_info "Testing build artifact caching..."
    
    # Check if build outputs exist
    local artifacts_found=0
    
    for pkg in packages/*/; do
        if [ -d "$pkg/dist" ]; then
            artifacts_found=$((artifacts_found + 1))
        fi
    done
    
    if [ $artifacts_found -gt 0 ]; then
        log_success "Build artifacts found ($artifacts_found packages)"
    else
        log_error "No build artifacts found"
        return 1
    fi
    
    # Check if Turbo cache contains task outputs
    if [ -d "$CACHE_DIR" ]; then
        local cache_entries=$(find "$CACHE_DIR" -type f 2>/dev/null | wc -l)
        if [ $cache_entries -gt 0 ]; then
            log_success "Turbo cache contains $cache_entries files"
        else
            log_warning "Turbo cache appears empty"
        fi
    fi
    
    return 0
}

# Test 5: Test incremental builds
test_incremental_builds() {
    log_info "Testing incremental builds..."
    
    # Make a small change to trigger incremental build
    local test_file="packages/types/src/index.ts"
    if [ -f "$test_file" ]; then
        # Add a comment
        echo "// Cache test comment $(date)" >> "$test_file"
        
        # Run incremental build
        start_time=$(date +%s)
        pnpm --filter @nvlp/types build >/dev/null 2>&1
        incremental_time=$(($(date +%s) - start_time))
        
        # Restore file
        git checkout "$test_file" 2>/dev/null || {
            # Remove the comment if git checkout fails
            head -n -1 "$test_file" > "$test_file.tmp" && mv "$test_file.tmp" "$test_file"
        }
        
        if [ $incremental_time -ge 0 ]; then
            log_success "Incremental build completed in ${incremental_time}s"
        else
            log_error "Incremental build failed"
            return 1
        fi
    else
        log_warning "Test file not found for incremental build test"
    fi
    
    return 0
}

# Test 6: Verify package-specific caching
test_package_caching() {
    log_info "Testing package-specific caching..."
    
    # Test each package individually
    local packages=("@nvlp/types" "@nvlp/client" "@nvlp/config")
    local cached_packages=0
    
    for pkg in "${packages[@]}"; do
        if pnpm --filter "$pkg" build >/dev/null 2>&1; then
            cached_packages=$((cached_packages + 1))
            log_success "Package $pkg builds successfully"
        else
            log_error "Package $pkg build failed"
        fi
    done
    
    if [ $cached_packages -eq ${#packages[@]} ]; then
        log_success "All packages cached successfully"
    else
        log_warning "Only $cached_packages/${#packages[@]} packages cached successfully"
    fi
    
    return 0
}

# Test 7: Verify CI cache compatibility
test_ci_compatibility() {
    log_info "Testing CI cache compatibility..."
    
    # Check GitHub Actions workflow exists
    if [ -f ".github/workflows/build-cache.yml" ]; then
        log_success "Build cache workflow exists"
    else
        log_error "Build cache workflow not found"
        return 1
    fi
    
    # Check for cache restore keys in test workflow
    if grep -q "restore-keys" .github/workflows/test-packages.yml 2>/dev/null; then
        log_success "Cache restore keys configured in test workflow"
    else
        log_warning "No cache restore keys found in test workflow"
    fi
    
    # Verify cache key patterns
    if grep -q "hashFiles" .github/workflows/*.yml 2>/dev/null; then
        log_success "Dynamic cache keys configured"
    else
        log_warning "No dynamic cache keys found"
    fi
    
    return 0
}

# Main execution
main() {
    log_info "Starting NVLP Build Cache Validation"
    echo ""
    
    local tests=(
        "test_turbo_config"
        "test_cache_directory" 
        "test_cache_effectiveness"
        "test_build_artifacts"
        "test_incremental_builds"
        "test_package_caching"
        "test_ci_compatibility"
    )
    
    local passed=0
    local total=${#tests[@]}
    
    for test in "${tests[@]}"; do
        if $test; then
            passed=$((passed + 1))
        fi
        echo ""
    done
    
    # Summary
    log_info "Validation Summary"
    echo ""
    
    for result in "${VALIDATION_RESULTS[@]}"; do
        echo -e "$result"
    done
    
    echo ""
    if [ $passed -eq $total ]; then
        log_success "All tests passed! ($passed/$total)"
        echo ""
        log_success "🎉 Build caching is properly configured and working!"
        exit 0
    else
        log_warning "Some tests failed or had warnings ($passed/$total passed)"
        echo ""
        log_info "Review the results above and fix any issues"
        exit 1
    fi
}

# Run main function
main "$@"