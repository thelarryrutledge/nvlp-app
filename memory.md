# NVLP Project Memory

## Current Status: Phase 4 Task 11 Complete ✅
**Next**: Phase 4 Task 12 - CLI Foundation (Go)

## Core Setup
- **Supabase Project**: qnpatlosomopoimtsmsr  
- **Test User**: larryjrutledge@gmail.com / Test1234!
- **Custom Domains**: 
  - Edge Functions: edge-api.nvlp.app
  - PostgREST: db-api.nvlp.app
- **Fallback URLs**:
  - PostgREST: https://qnpatlosomopoimtsmsr.supabase.co/rest/v1
  - Edge Functions: https://qnpatlosomopoimtsmsr.supabase.co/functions/v1

## Architecture (Production Ready)
- **Database**: 11 tables with RLS, triggers, comprehensive constraints
- **PostgREST**: Direct CRUD (user_profiles, budgets, categories, envelopes, payees, income_sources)
- **Edge Functions**: Complex logic (auth, transactions, dashboard, reports, export, audit, notifications)
- **Authentication**: JWT tokens with proper validation
- **Caching**: TTL-based system with 70-80% performance improvement

## Auth Patterns
```bash
# Login (Edge Function)
curl -X POST "https://edge-api.nvlp.app/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ANON_KEY}" \
  -d '{"email":"user@example.com","password":"password"}'

# PostgREST CRUD
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
     -H "apikey: {ANON_KEY}" \
     "https://db-api.nvlp.app/budgets"
```

## Go Client Library ✅ (Complete)
**Location**: `/internal/client/`, `/internal/types/`, `/internal/auth/`

### Key Files
- `internal/client/nvlp_client.go` - Main client
- `internal/client/transports/postgrest.go` - CRUD operations  
- `internal/client/transports/edge_function.go` - Business logic
- `internal/auth/token_manager.go` - Token persistence (~/.nvlp/auth.json)
- `internal/types/` - Complete type system (domain, inputs, transport, errors, auth)

### Fixed Issues
- **Edge Function Response Format**: Fixed transport to handle auth responses without "data" wrapper
- **Import Cycles**: Resolved with shared types package
- **Custom Domains**: Both domains working correctly

### Testing Results
- Authentication, CRUD, Edge Functions, Token persistence all working
- Real data validation: 3 budgets, 10 categories, 8 envelopes, 2 income sources, 12 payees
- Comprehensive error handling with typed errors

### Documentation  
- `docs/go-client-library.md` - Complete API guide
- `internal/client/README.md` - Package documentation
- `examples/go-client/` - Working examples

## Database Schema Notes
**Money Flow**: Income Sources → available_amount (user_state) → Envelopes → Payees
**Transaction Types**: income, allocation, expense, transfer, debt_payment

## Critical Files for CLI Development
- `/supabase/functions/` - All Edge Functions (production ready)
- `/scripts/test-custom-domains.sh` - Domain validation
- `test_go_client_comprehensive.go` - Client library test
- `.env.example` - Environment configuration

## Known Working Patterns
- **PostgREST**: `?column=eq.value`, `?select=`, `?limit=`, `?order=`
- **Edge Functions**: `{success: boolean, data/error: object}` response format
- **Token Storage**: `~/.nvlp/auth.json` with 0600 permissions
- **Custom Domain Routing**: Vercel rewrites handle domain separation

## Environment
- **Working Directory**: /Users/larryrutledge/Projects/nvlp-app
- **Platform**: macOS Darwin 24.5.0
- **Go Module**: github.com/thelarryrutledge/nvlp-app

## Next Phase Dependencies
**CLI Framework**: cobra + viper + color + survey
**Token Storage**: ~/.nvlp/ directory structure
**Config Management**: Environment variables + config files