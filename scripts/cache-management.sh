#!/bin/bash

# NVLP Cache Management Script
# Manages build caches for optimal development and CI performance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CACHE_DIR=".turbo"
PNPM_STORE_DIR=$(pnpm store path 2>/dev/null || echo "")
NODE_MODULES_DIRS=("node_modules" "apps/*/node_modules" "packages/*/node_modules")
TYPESCRIPT_CACHE=("**/*.tsbuildinfo")
ESLINT_CACHE=("**/.eslintcache")

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

show_usage() {
    echo "NVLP Cache Management"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  status       Show cache status and sizes"
    echo "  clean        Clean all caches"
    echo "  clean-turbo  Clean only Turbo cache"
    echo "  clean-deps   Clean dependency caches (node_modules, pnpm store)"
    echo "  clean-ts     Clean TypeScript build cache"
    echo "  clean-lint   Clean ESLint cache"
    echo "  stats        Show detailed cache statistics"
    echo "  optimize     Optimize cache configuration"
    echo "  help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status                # Show current cache status"
    echo "  $0 clean                 # Clean all caches"
    echo "  $0 clean-turbo          # Clean only Turbo cache"
}

get_dir_size() {
    local dir="$1"
    if [ -d "$dir" ]; then
        du -sh "$dir" 2>/dev/null | cut -f1
    else
        echo "0B"
    fi
}

count_files() {
    local pattern="$1"
    find . -name "$pattern" 2>/dev/null | wc -l | tr -d ' '
}

show_cache_status() {
    log_info "Cache Status Report"
    echo ""
    
    # Turbo cache
    echo "📦 Turbo Cache:"
    if [ -d "$CACHE_DIR" ]; then
        local turbo_size=$(get_dir_size "$CACHE_DIR")
        local turbo_files=$(find "$CACHE_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
        echo "  Size: $turbo_size"
        echo "  Files: $turbo_files"
        echo "  Location: $CACHE_DIR"
    else
        echo "  Status: Not found"
    fi
    echo ""
    
    # pnpm store
    echo "📦 pnpm Store:"
    if [ -n "$PNPM_STORE_DIR" ] && [ -d "$PNPM_STORE_DIR" ]; then
        local pnpm_size=$(get_dir_size "$PNPM_STORE_DIR")
        echo "  Size: $pnpm_size"
        echo "  Location: $PNPM_STORE_DIR"
    else
        echo "  Status: Not found or pnpm not available"
    fi
    echo ""
    
    # Node modules
    echo "📦 Node Modules:"
    local total_nm_size=0
    for pattern in "${NODE_MODULES_DIRS[@]}"; do
        local dirs=$(find . -path "./$pattern" -type d 2>/dev/null || true)
        if [ -n "$dirs" ]; then
            while IFS= read -r dir; do
                if [ -d "$dir" ]; then
                    local size=$(get_dir_size "$dir")
                    echo "  $dir: $size"
                fi
            done <<< "$dirs"
        fi
    done
    echo ""
    
    # TypeScript cache
    echo "📦 TypeScript Cache:"
    local ts_files=$(count_files "*.tsbuildinfo")
    echo "  Files: $ts_files"
    if [ "$ts_files" -gt 0 ]; then
        find . -name "*.tsbuildinfo" -exec ls -lh {} \; 2>/dev/null | head -5
        if [ "$ts_files" -gt 5 ]; then
            echo "  ... and $((ts_files - 5)) more files"
        fi
    fi
    echo ""
    
    # ESLint cache
    echo "📦 ESLint Cache:"
    local eslint_files=$(count_files ".eslintcache")
    echo "  Files: $eslint_files"
    if [ "$eslint_files" -gt 0 ]; then
        find . -name ".eslintcache" -exec ls -lh {} \; 2>/dev/null
    fi
}

clean_turbo_cache() {
    log_info "Cleaning Turbo cache..."
    if [ -d "$CACHE_DIR" ]; then
        rm -rf "$CACHE_DIR"
        log_success "Turbo cache cleaned"
    else
        log_warning "Turbo cache directory not found"
    fi
}

clean_dependency_caches() {
    log_info "Cleaning dependency caches..."
    
    # Clean node_modules
    for pattern in "${NODE_MODULES_DIRS[@]}"; do
        find . -path "./$pattern" -type d -exec rm -rf {} + 2>/dev/null || true
    done
    
    # Clean pnpm store if requested
    if [ -n "$PNPM_STORE_DIR" ]; then
        read -p "Clean pnpm store at $PNPM_STORE_DIR? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pnpm store prune 2>/dev/null || log_warning "Could not prune pnpm store"
            log_success "pnpm store pruned"
        fi
    fi
    
    log_success "Dependency caches cleaned"
}

clean_typescript_cache() {
    log_info "Cleaning TypeScript cache..."
    find . -name "*.tsbuildinfo" -delete 2>/dev/null || true
    log_success "TypeScript cache cleaned"
}

clean_eslint_cache() {
    log_info "Cleaning ESLint cache..."
    find . -name ".eslintcache" -delete 2>/dev/null || true
    log_success "ESLint cache cleaned"
}

clean_all_caches() {
    log_info "Cleaning all caches..."
    clean_turbo_cache
    clean_typescript_cache
    clean_eslint_cache
    
    # Ask about dependencies
    read -p "Also clean dependency caches (node_modules, pnpm)? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        clean_dependency_caches
    fi
    
    log_success "All requested caches cleaned"
}

show_detailed_stats() {
    log_info "Detailed Cache Statistics"
    echo ""
    
    # Turbo cache analysis
    if [ -d "$CACHE_DIR" ]; then
        echo "🔍 Turbo Cache Analysis:"
        echo "  Cache directory: $CACHE_DIR"
        echo "  Total size: $(get_dir_size "$CACHE_DIR")"
        
        # Show cache hit breakdown by task
        if [ -d "$CACHE_DIR" ]; then
            echo "  Task caches:"
            find "$CACHE_DIR" -type d -maxdepth 2 -mindepth 1 2>/dev/null | while read -r dir; do
                local size=$(get_dir_size "$dir")
                local task=$(basename "$dir")
                echo "    $task: $size"
            done 2>/dev/null || echo "    No task caches found"
        fi
        echo ""
    fi
    
    # Package-specific analysis
    echo "📊 Package Build Analysis:"
    for pkg in packages/*/; do
        if [ -d "$pkg" ]; then
            local pkg_name=$(basename "$pkg")
            echo "  $pkg_name:"
            [ -d "$pkg/dist" ] && echo "    dist: $(get_dir_size "$pkg/dist")"
            [ -d "$pkg/node_modules" ] && echo "    node_modules: $(get_dir_size "$pkg/node_modules")"
            [ -f "$pkg/*.tsbuildinfo" ] && echo "    TypeScript cache: present"
        fi
    done
    echo ""
}

optimize_cache_config() {
    log_info "Optimizing cache configuration..."
    
    # Check if .turbo/config.json exists and is optimal
    if [ ! -f ".turbo/config.json" ]; then
        log_warning ".turbo/config.json not found - this should be created by the setup"
    else
        log_success ".turbo/config.json found"
    fi
    
    # Check turbo.json configuration
    if [ -f "turbo.json" ]; then
        log_success "turbo.json found"
        
        # Validate cache configuration
        if grep -q '"cache": true' turbo.json; then
            log_success "Explicit caching enabled for tasks"
        else
            log_warning "Consider enabling explicit caching for specific tasks"
        fi
    else
        log_error "turbo.json not found"
    fi
    
    # Check for .gitignore entries
    if grep -q ".turbo" .gitignore 2>/dev/null; then
        log_success ".turbo directory ignored in git"
    else
        log_warning "Consider adding .turbo to .gitignore"
        echo ".turbo" >> .gitignore
        log_success "Added .turbo to .gitignore"
    fi
    
    log_success "Cache optimization complete"
}

# Main script logic
case "${1:-}" in
    "status")
        show_cache_status
        ;;
    "clean")
        clean_all_caches
        ;;
    "clean-turbo")
        clean_turbo_cache
        ;;
    "clean-deps")
        clean_dependency_caches
        ;;
    "clean-ts")
        clean_typescript_cache
        ;;
    "clean-lint")
        clean_eslint_cache
        ;;
    "stats")
        show_detailed_stats
        ;;
    "optimize")
        optimize_cache_config
        ;;
    "help"|"--help"|"-h")
        show_usage
        ;;
    "")
        show_usage
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac