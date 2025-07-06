# NVLP Project Memory

## Core Setup
- Supabase project: qnpatlosomopoimtsmsr
- API URL: https://api.nvlp.app (via Vercel proxy)
- Test users: larryjrutledge@gmail.com & larry@mariomurillo.org / Test1234!
- All Edge Functions require wrapping PostgREST calls

## Authentication System (COMPLETE ✅)
7 endpoints implemented with full security:
- POST /auth/register, /auth/login (anon key)
- POST /auth/logout, GET /auth/profile (JWT required)
- POST /auth/refresh (anon key + refresh_token)
- POST /auth/reset-password, /auth/update-password (recovery flow)

Security features: email normalization, input validation, CORS, CSP headers, generic error messages

## Money Flow Model
Income → available_amount → Envelopes → Payees (exit)
Transaction types: income(NULL→NULL), allocation(NULL→envelope), expense(envelope→NULL+payee), transfer(envelope→envelope)

## Database Schema (COMPLETE ✅)
Core tables implemented with full RLS security and automation:

**user_profiles**: Extends auth.users with display_name, timezone, currency_code, date_format
**budgets**: Budget management with user relationship and default budget automation  
**income_sources**: Budget-scoped income tracking with auto-creation of defaults
**categories**: Budget-scoped categories with 8 expense + 2 income defaults auto-created

All tables feature:
- Complete RLS policies enforcing user data isolation
- Auto-creation triggers for new users/budgets
- Comprehensive constraint validation
- Multi-user testing verified ✅

## Current Status & Next Steps
**COMPLETED ✅**
- Phase 1: Authentication Foundation (7 endpoints, full security)
- Phase 2: Core Tables (user_profiles, budgets, income_sources, categories)
- Multi-user RLS testing and automation verification

**NEXT: Phase 2, Task 5, Subtask 3**
Create envelopes table (budget-scoped) with auto-creation triggers