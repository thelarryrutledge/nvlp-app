# Scripts Directory

This directory contains essential utility and testing scripts for the NVLP project.

## Utility Scripts

- **login-and-save-token.sh** - Login and save JWT token for API testing
- **verify-env.sh** - Verify environment variables and basic connectivity
- **verify-database.sh** - Test database access with different auth levels

## Current Test Scripts

- **test-auth-endpoints.sh** - Comprehensive test of all 7 authentication endpoints (Edge Functions)
- **test-auth-flow.js** - Complete authentication flow testing with the TypeScript client
- **test-transactions-edge-function.sh** - Comprehensive transaction system testing (Edge Functions with retry logic)
- **test-multi-user-rls.sh** - Multi-user RLS testing for data isolation verification

## Script Features

### Authentication Testing
- **test-auth-endpoints.sh**: Tests all auth endpoints (register, login, logout, refresh, profile, reset, update)
- **test-auth-flow.js**: Tests the complete auth flow using the TypeScript client library

### Transaction Testing  
- **test-transactions-edge-function.sh**: Tests transaction validation and CRUD operations
  - Includes retry logic for Edge Function cold starts
  - Tests all transaction types: income, allocation, expense, transfer, debt_payment
  - Validates resource ownership and balance constraints
  - 18 comprehensive test cases with 100% success rate

### Security Testing
- **test-multi-user-rls.sh**: Verifies Row Level Security policies prevent data leakage between users

## Usage

Run tests after major changes:

```bash
# Verify environment setup
./scripts/verify-env.sh

# Test authentication system  
./scripts/test-auth-endpoints.sh

# Test authentication flow with client library
node ./scripts/test-auth-flow.js

# Test transaction system (with cold start handling)
./scripts/test-transactions-edge-function.sh

# Verify multi-user data isolation
./scripts/test-multi-user-rls.sh
```

## Notes

- All Edge Function tests include retry logic for cold start scenarios
- Scripts require proper environment variables (`.env.local`) to be configured
- Transaction tests automatically handle envelope balances and resource setup
- Scripts follow the principle of testing real production scenarios rather than isolated units

## Maintenance

This directory has been cleaned up to contain only essential, current scripts. Redundant and deprecated scripts have been removed to maintain focus and usefulness. The remaining scripts reflect the current architecture using:

- PostgREST for fast CRUD operations (<50ms)
- Edge Functions for complex business logic (auth, transactions)
- Comprehensive validation and security testing