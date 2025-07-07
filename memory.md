# NVLP Project Memory

## Core Setup
- Supabase: qnpatlosomopoimtsmsr
- Test users: larryjrutledge@gmail.com & larry@mariomurillo.org / Test1234!

## Status: Phase 2 Complete ✅
**Auth (Edge Function)**: 7 endpoints with full security 
**Database**: 9 tables, RLS, triggers, automation (profiles→budgets→defaults)
**APIs**: Profile + Budget endpoints converted to direct PostgREST (<50ms vs 2-10s cold start)

## Architecture: PostgREST Direct
- JWT + API key auth pattern
- Database constraints replace Edge Function validation  
- Status codes: 200/201/204 vs 400/409
- Must include user_id in POST for RLS

## Database Tables
user_profiles, budgets, income_sources, categories, envelopes, payees, transactions, transaction_events, user_state
- All have RLS + auto-creation triggers (except transactions)
- Budget constraint fixed: partial unique index for default budgets only
- Multi-user tested ✅

## Money Flow
Income → available_amount → Envelopes → Payees
Types: income, allocation, expense, transfer, debt_payment

## Test Scripts (Essential 5)
test-profile-postgrest.sh, test-budgets-postgrest.sh, test-budget-constraint-fix.sh, test-budget-multi-user.sh, login-and-save-token.sh

## Completed ✅
**Income Sources API**: Complete CRUD documentation + test script (17/17 tests pass)
- API_INCOME_SOURCES_POSTGREST.md with full PostgREST patterns
- test-income-sources-postgrest.sh validates all operations
- Prefer: return=representation header for ID retrieval
- Frequency-based date calculations working

## Next: Task 9 - Categories CRUD (PostgREST)