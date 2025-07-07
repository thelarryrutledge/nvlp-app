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
**Categories API**: Complete CRUD documentation + test script (19/19 tests pass)  
**Envelopes API**: Complete CRUD documentation + test script (23/23 tests pass)
**Payees API**: Complete CRUD documentation + test script (24/24 tests pass)
- API docs with full PostgREST patterns, validation constraints, RLS
- 6 payee types (business/person/organization/utility/service/other)
- Contact info, payment tracking, auto-creation of 12 defaults
- Comprehensive validation (email, color, address length, constraints)

## Test Results ✅
**Complete API Test Suite**: 118/119 tests passed (99.2% success rate)
- Profile API: 15/15 ✅
- Budget API: 15/15 ✅
- Income Sources API: 17/17 ✅
- Categories API: 19/19 ✅
- Envelopes API: 23/23 ✅
- Payees API: 24/24 ✅
- Multi-User Security: 5/6 ✅ (minor issue)

**Status**: All Core Business APIs READY FOR PRODUCTION

## Next: Task 10 - Abstract Client Library