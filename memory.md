# NVLP Project Memory

## Core Setup
- Supabase project: qnpatlosomopoimtsmsr
- API URL: https://api.nvlp.app (via Vercel proxy)
- Test user: larryjrutledge@gmail.com / Test1234!
- All Edge Functions require wrapping PostgREST calls

## Auth Implementation
7 endpoints in auth Edge Function:
- POST /auth/register (anon key)
- POST /auth/login (anon key) → returns access_token + refresh_token
- POST /auth/logout (JWT required)
- GET /auth/profile (JWT required)
- POST /auth/refresh (anon key + refresh_token)
- POST /auth/reset-password (anon key)
- POST /auth/update-password (recovery token via setSession)

Key fixes:
- Recovery tokens need setSession before updateUser
- Email normalization: trim().toLowerCase()
- CORS headers include x-requested-with
- Centralized error/success response helpers

## Money Flow (Future)
Income → available_amount → Envelopes → Payees (exit)
Transaction types: income(NULL→NULL), allocation(NULL→envelope), expense(envelope→NULL+payee), transfer(envelope→envelope)

## Validation & Security
Enhanced input validation and sanitization:
- Request size limits (10KB max)
- Email sanitization: trim().toLowerCase() + format validation
- Password validation: length, character set (printable ASCII), bcrypt limits
- Type checking for all inputs
- Safe JSON parsing with error handling
- Security headers: CSP, HSTS, XSS protection, frame options
- Generic error messages to prevent enumeration

## Documentation
Complete API documentation created:
- AUTH_API_COMPLETE.md: Full spec for all 7 endpoints with examples
- AUTH_QUICK_REFERENCE.md: Updated with all endpoints and usage
- Comprehensive error codes, validation rules, security features
- Test scripts and web page references included

## Database Schema (Phase 2)
user_profiles table created successfully:
- Migration: supabase/migrations/20250706142628_create_user_profiles.sql
- Applied via: SUPABASE_DB_PASSWORD + supabase db push
- Extends auth.users with display_name, timezone, currency_code, date_format
- Includes RLS policies: users can only access own profile
- Auto-creation trigger: handle_new_user() VERIFIED WORKING ✅

budgets table created successfully:
- Migration: supabase/migrations/20250706145134_create_budgets.sql  
- Links to user_profiles via user_id foreign key
- Includes name, description, is_default, is_active fields
- RLS policies: users can only access own budgets
- Auto-creation trigger: create_default_budget_for_user() VERIFIED WORKING ✅
- Tested: new user registration creates profile + default budget automatically
- Foreign key link: user_profiles.default_budget_id → budgets.id

## Database Testing
Created test-database-tables.sh script that verifies:
- Table accessibility via REST API ✅
- Data integrity and foreign key relationships ✅
- Auto-creation triggers functionality ✅
- Constraint enforcement (single default budget per user) ✅
- Proper CRUD operations and data consistency ✅

## RLS Policies Implementation
Created comprehensive RLS security:
- user_profiles: SELECT/INSERT/UPDATE policies using auth.uid() = id ✅
- budgets: SELECT/INSERT/UPDATE/DELETE policies using auth.uid() = user_id ✅
- Data isolation verified: users can only access their own data ✅
- Service role can bypass RLS for admin operations ✅
- Created test-rls-policies.sh script for verification ✅
- Documented in docs/RLS_POLICIES.md ✅

## Multi-User RLS Testing
Comprehensive multi-user testing completed:
- Created 2 real test users: larryjrutledge@gmail.com & larry@mariomurillo.org ✅
- Email verification and login successful for both users ✅
- Auto-creation triggers worked for both users (profiles + budgets) ✅
- Perfect data isolation: each user sees only their own data ✅
- Cross-user access attempts return empty results [] ✅
- Service role can see all data (admin access working) ✅
- RLS policies enforce complete data security at database level ✅

## Default Budget Automation
Comprehensive automation system implemented and verified:
- Auto-creation: Default budget created when user profile is created ✅
- Auto-linking: user_profiles.default_budget_id automatically set ✅
- Single default constraint: Only one default budget per user enforced ✅
- Constraint enforcement: Creating new default demotes previous default ✅
- Functions: create_default_budget_for_user() & ensure_single_default_budget() ✅
- Triggers: Profile creation and budget constraint triggers working ✅
- Tested: Existing users verified, constraint testing successful ✅
- Documented: Complete automation documentation in docs/ ✅

## Next Steps
Phase 1: AUTHENTICATION FOUNDATION COMPLETE ✅
Phase 2, Task 4: CORE TABLES CREATION COMPLETE ✅
All subtasks 1-6 completed: user_profiles, budgets, testing, RLS, multi-user RLS, automation
Next: Phase 2, Task 5 - Business Logic Tables