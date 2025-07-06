# Scripts Directory

This directory contains essential utility and testing scripts for the NVLP project.

## Utility Scripts

- **verify-env.sh** - Verify environment variables and basic connectivity
- **verify-database.sh** - Test database access with different auth levels

## Test Scripts

- **test-auth-endpoints.sh** - Comprehensive test of all 7 authentication endpoints
- **test-envelopes-table.sh** - Complete test of envelopes table with CRUD, constraints, and notifications
- **test-multi-user-rls.sh** - Multi-user RLS testing for data isolation verification

## Notes

This directory has been cleaned up to contain only essential scripts. Redundant and deprecated scripts have been removed to maintain focus and usefulness. The remaining scripts follow the comprehensive testing pattern established in `test-envelopes-table.sh`.

## Usage

Run tests after major changes:
```bash
# Verify environment
./scripts/verify-env.sh

# Test authentication system  
./scripts/test-auth-endpoints.sh

# Test latest table implementation
./scripts/test-envelopes-table.sh

# Verify multi-user data isolation
./scripts/test-multi-user-rls.sh
```