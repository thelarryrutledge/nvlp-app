# NVLP Project Memory - Consolidated

## Core Setup
- **Supabase Project**: qnpatlosomopoimtsmsr
- **Test Users**: larryjrutledge@gmail.com & larry@mariomurillo.org / Test1234!
- **Architecture**: Hybrid PostgREST Direct + Edge Functions
- **Custom Domains**: 
  - **Edge Functions**: edge-api.nvlp.app (for complex operations)
  - **PostgREST**: db-api.nvlp.app (for CRUD operations)
- **Direct URLs** (fallback):
  - **PostgREST**: https://qnpatlosomopoimtsmsr.supabase.co/rest/v1
  - **Edge Functions**: https://qnpatlosomopoimtsmsr.supabase.co/functions/v1

## Current Status: Phase 3 Complete ✅
**Backend**: 100% feature-complete, production-ready
**Next Phase**: Phase 4 - CLI Development (Go Implementation)

## Architecture Overview

### Authentication (Edge Functions)
- **Endpoints**: register, login, logout, refresh, password reset
- **Security**: JWT tokens, proper validation, CORS, security headers
- **Location**: /supabase/functions/auth/
- **Status**: Production ready ✅

### Database Schema (11 Tables)
**Core Tables**: user_profiles, budgets, categories, envelopes, payees, income_sources, transactions
**System Tables**: transaction_events (audit), user_state (balances), notification_acknowledgments
**Features**: RLS policies, triggers, auto-calculations, soft deletes, comprehensive constraints
**Performance**: Proper indexes, optimized queries
**Status**: Production ready ✅

### API Layer Architecture

#### PostgREST Direct (Fast CRUD)
- **URL**: https://qnpatlosomopoimtsmsr.supabase.co/rest/v1
- **Auth**: JWT + API key pattern
- **Performance**: 139-214ms response times
- **Endpoints**: user_profiles, budgets, categories, envelopes, payees, income_sources
- **Usage**: Simple CRUD operations, filtering, pagination
- **RLS**: All data properly isolated by user/budget

#### Edge Functions (Complex Logic)
- **URL**: https://qnpatlosomopoimtsmsr.supabase.co/functions/v1
- **Performance**: 300-950ms (acceptable with caching)
- **Functions**: auth, transactions, dashboard, reports, export, audit, notifications
- **Features**: Business logic validation, complex aggregations, data exports

### Transaction System (Edge Function)
- **Types**: income, allocation, expense, transfer, debt_payment
- **Validation**: Type-specific rules, resource ownership, balance checks
- **Features**: CRUD operations, automatic balance updates, audit trail
- **Testing**: 18 test cases, 100% pass rate
- **Location**: /supabase/functions/transactions/

### Advanced Features APIs

#### Dashboard API (/dashboard)
- **Data**: Budget overview, envelope summary, recent transactions, spending analysis, income vs expenses
- **Performance**: Complex aggregation, parallel queries
- **Caching**: 5-minute TTL, 70-80% performance improvement
- **Testing**: Multi-user validated

#### Reporting APIs (/reports)
- **Endpoints**: transactions, category-trends, income-expense, envelope-history, budget-performance
- **Features**: Date filtering, grouping, pagination, export-ready data
- **Caching**: 10-15 minute TTL based on volatility
- **Testing**: 13 test cases, 100% pass rate

#### Data Export (/export)
- **Formats**: CSV, JSON with proper escaping
- **Exports**: transactions, complete budget, individual entities
- **Features**: Date filtering, automatic file naming
- **Testing**: 19 test cases, 100% pass rate

#### Audit Trail (/audit)
- **Features**: Transaction event history, user activity tracking, filtering
- **Storage**: transaction_events table with comprehensive logging
- **Testing**: 14 test cases, 100% pass rate

#### Notifications (/notifications)
- **Types**: income due/overdue, envelope thresholds, overbudget alerts, old transactions
- **Features**: Timezone support, acknowledgment system, smart filtering
- **Storage**: notification_acknowledgments table
- **Testing**: Core functionality validated

### Caching System ✅
- **Implementation**: Shared cache utility (/supabase/functions/_shared/cache.ts)
- **Features**: TTL-based, automatic cleanup, invalidation patterns
- **Performance Impact**: 70-80% improvement for cached endpoints
- **Cache TTLs**: Dashboard (5min), Reports (10-15min), Components (2-3min)
- **Invalidation**: Automatic on transaction changes, budget-scoped patterns
- **Testing**: Comprehensive cache performance test suite

### Performance Analysis ✅
- **PostgREST**: Excellent (139-214ms)
- **Edge Functions**: Acceptable (300-950ms, much faster with cache)
- **Database**: Well-optimized with proper indexes
- **Scalability**: Current architecture handles datasets efficiently
- **Testing**: Multiple performance test scripts created
- **Documentation**: Complete performance analysis in /docs/PERFORMANCE_ANALYSIS.md

## Client Libraries

### TypeScript Client (/src/client/) ✅
- **Architecture**: Dual transport (PostgREST + Edge Functions)
- **Features**: Complete auth management, token persistence, auto-refresh
- **Files**: nvlp-client.ts, token-manager.ts, transports/, types.ts, errors.ts
- **Status**: Production-ready, comprehensive testing
- **Usage**: Future web/Node.js integrations

## Documentation ✅

### API Documentation
- **OpenAPI Spec**: /docs/api-specification.yaml (comprehensive, production-ready)
- **Data Dictionary**: /docs/data-dictionary.md (all schemas, constraints, relationships)
- **Performance Analysis**: /docs/PERFORMANCE_ANALYSIS.md
- **Caching Implementation**: /docs/CACHING_IMPLEMENTATION.md

### Legacy Docs Removed
- Consolidated from 7 individual API docs into single OpenAPI spec
- Maintains AUTH_QUICK_REFERENCE.md, RLS_POLICIES.md for implementation details

## Testing Infrastructure ✅

### Test Scripts (/scripts/)
**Core**: login-and-save-token.sh (auth), working-performance-test.sh (performance)
**Performance**: test-caching-performance.sh (cache validation), performance-analysis.sh (large datasets)
**API Testing**: Individual function test scripts for all endpoints
**Results**: 118/119 tests passed (99.2% success rate) across all APIs

### Test Results Summary
- **Profile API**: 15/15 ✅
- **Budget API**: 15/15 ✅ 
- **Income Sources API**: 17/17 ✅
- **Categories API**: 19/19 ✅
- **Envelopes API**: 23/23 ✅
- **Payees API**: 24/24 ✅
- **Transaction System**: 18/18 ✅
- **Advanced Features**: All endpoints tested and validated

## Key Implementation Patterns

### Authentication Pattern
```bash
# Get token
curl -X POST "https://qnpatlosomopoimtsmsr.supabase.co/functions/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ANON_KEY}" \
  -d '{"email":"user@example.com","password":"password"}'

# Use token
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
     -H "apikey: {ANON_KEY}" \
     "https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/budgets"
```

### PostgREST Patterns
- **URL**: /rest/v1/{table}
- **Auth**: Bearer token + apikey header
- **Filtering**: ?column=eq.value, ?budget_id=eq.{id}
- **Pagination**: ?limit=50&offset=100
- **Selection**: ?select=id,name,description
- **Ordering**: ?order=name.asc
- **RLS**: Automatic user isolation

### Edge Function Patterns
- **URL**: /functions/v1/{function}
- **Auth**: Bearer token only
- **Response**: {success: boolean, data/error: object}
- **Caching**: Automatic with TTL
- **Validation**: Comprehensive business rules

## Database Money Flow
```
Income Sources → available_amount (user_state) → Envelopes → Payees
```
**Transaction Types**: income (adds to available), allocation (available→envelope), expense (envelope→payee), transfer (envelope→envelope), debt_payment (envelope→payee)

## Critical File Locations

### Database
- **Migrations**: /supabase/migrations/ (11 migration files)
- **Schema**: Complete in data-dictionary.md

### APIs
- **Edge Functions**: /supabase/functions/{auth,transactions,dashboard,reports,export,audit,notifications}/
- **Shared Utils**: /supabase/functions/_shared/cache.ts

### Documentation
- **/docs/**: All production documentation
- **API Spec**: api-specification.yaml
- **Data Dictionary**: data-dictionary.md
- **Performance**: PERFORMANCE_ANALYSIS.md
- **Caching**: CACHING_IMPLEMENTATION.md

### Client Libraries
- **TypeScript**: /src/client/ (complete implementation)
- **Go**: Not yet implemented (Phase 4)

### Testing
- **/scripts/**: All test scripts
- **Key Scripts**: login-and-save-token.sh, working-performance-test.sh, test-caching-performance.sh

## Production Readiness Status ✅

### Backend APIs
- **Authentication**: Production ready
- **Database**: Production ready with RLS, triggers, constraints
- **CRUD APIs**: Production ready (PostgREST)
- **Business Logic**: Production ready (Edge Functions)
- **Performance**: Optimized with caching (70-80% improvement)
- **Security**: Comprehensive (RLS, JWT, CORS, headers)
- **Testing**: Extensive test coverage (99.2% pass rate)
- **Documentation**: Complete OpenAPI specification

### Deployment
- **Supabase**: Fully deployed and functional
- **Edge Functions**: All 7 functions deployed and tested
- **Database**: All tables, RLS, triggers active
- **Custom Domain**: Configured (may need verification)

## Next Phase: Phase 4 - CLI Development

### Planned Go Implementation
- **Task 11**: Go Client Library (port from TypeScript) - IN PROGRESS
- **Task 12**: CLI Foundation (cobra/viper)
- **Task 13**: Basic CLI Commands (auth, config)
- **Task 14**: Business Logic Commands (budgets, transactions, dashboard)

### Key Requirements
- Port TypeScript client architecture to Go
- Implement token persistence (~/.nvlp/)
- Create cobra-based CLI with colored output
- Support all current API operations
- Maintain same authentication patterns

### Go Client Library Structure ✅
**Location**: `/internal/client/` and `/internal/auth/`
**Architecture**: Matches TypeScript client with dual transport pattern
**Key Files**:
- `types.go` - All type definitions (mirrors TypeScript types)
- `errors.go` - Custom error types with HTTP status mapping
- `nvlp_client.go` - Main client implementation
- `client.go` - Package entry point with defaults
- `transports/postgrest.go` - PostgREST transport layer
- `transports/edge_function.go` - Edge Function transport layer
- `auth/token_manager.go` - Token persistence (~/.nvlp/auth.json)
- `config/config.go` - Configuration management (viper)
- `cmd/nvlp/main.go` - CLI entry point (cobra)
- `go.mod` - Go module with required dependencies

**Dependencies**:
- `github.com/spf13/cobra` - CLI framework
- `github.com/spf13/viper` - Configuration management
- `github.com/fatih/color` - Colored output
- `github.com/AlecAivazis/survey/v2` - Interactive prompts
- `github.com/golang-jwt/jwt/v5` - JWT token handling

**Token Storage**: `~/.nvlp/auth.json` (same pattern as TypeScript client)

**PostgREST Transport Implementation**: ✅
- Complete CRUD operations for all resource types (profiles, budgets, income sources, categories, envelopes, payees)
- Query parameter handling with PostgREST filtering (eq., select, limit, order)
- Authentication via Bearer token + apikey headers
- Error handling with HTTP status code mapping
- JSON request/response parsing with proper type conversion
- URL query building for GET requests with filters
- Prefer header support for POST/PATCH operations

**Edge Function Transport Implementation**: ✅
- Complete transaction system with CRUD operations
- Dashboard API with budget overview, envelope summary, spending analysis
- Reporting APIs (transaction reports, category trends, income vs expenses)
- Export functionality (transactions, budget data) with CSV/JSON formats
- Audit trail with event tracking and filtering
- Notification system with acknowledgment support
- All complex business logic operations via Edge Functions
- Matches TypeScript client Edge Function patterns

**Authentication Management & Token Persistence**: ✅
- Token storage in `~/.nvlp/auth.json` with secure permissions (0600)
- JWT token parsing and validation using `github.com/golang-jwt/jwt/v5`
- Automatic token refresh detection (5-minute threshold)
- Cross-platform home directory detection
- Complete error handling and recovery
- Session restoration on client initialization
- Shared type system in `/internal/types/` to avoid import cycles
- Full compatibility with TypeScript client authentication patterns

**Complete Type System & Error Handling**: ✅
- Comprehensive domain types in `/internal/types/domain.go` (all entities)
- Input types for CRUD operations in `/internal/types/inputs.go`
- Transport interfaces and API types in `/internal/types/transport.go`
- Full error hierarchy with HTTP status mapping in `/internal/types/errors.go`
- Custom error types: Authentication, Authorization, Validation, NotFound, Network, Server, Conflict, RateLimit, Timeout
- Error utility functions: retry detection, status extraction, code mapping
- Type aliases in client package to maintain clean API surface
- All types match TypeScript client for full compatibility

## Environment
- **Working Directory**: /Users/larryrutledge/Projects/nvlp-app
- **Git Status**: Clean, ahead of origin by commits
- **Token File**: .token (for testing)
- **Platform**: macOS (Darwin 24.5.0)

## Critical Notes for Next Session
1. **Phase 3 Complete**: All backend features implemented and tested
2. **Architecture**: Hybrid PostgREST + Edge Functions with caching
3. **Performance**: Optimized and production-ready
4. **Documentation**: Comprehensive and up-to-date
5. **Testing**: Extensive coverage with automated scripts
6. **Next**: Begin Phase 4 Go CLI implementation
7. **Auth Pattern**: JWT + apikey for PostgREST, JWT only for Edge Functions
8. **Cache Invalidation**: Automatic on transaction changes
9. **Database URLs**: Use direct Supabase URLs, not custom domain for reliable access