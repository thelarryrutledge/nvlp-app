# NVLP Project Memory

## Project Context
- Virtual envelope budgeting app with API-first architecture
- Using Supabase for database, auth, and edge functions
- Vercel for hosted assets (later phases)
- Building fully-featured REST API before any UI development
- Multiple UIs planned: CLI, React Native, Web

## Key Architecture Decisions
- All PostgREST functions must be wrapped in Supabase Edge Functions for consistent API interface
- Supabase Auth must be wrapped in edge function endpoints for consistency
- Anon key used for register/login endpoints, returning JWT for subsequent calls
- JWT expires on logout

## Money Flow Model
- Core flow: Income → Available Bucket → Envelopes → Payees (money leaves system)
- Available bucket tracked in user_state.available_amount
- Payees represent destinations where money exits the system

## Transaction Type Rules
- Income: NULL → NULL (increases available_amount)
- Allocation: NULL → envelope (from available to envelope)
- Expense: envelope → NULL + payee_id (money leaves to payee)
- Transfer: envelope → envelope (between envelopes)
- Debt payment: envelope → NULL + payee_id (money leaves to payee)

## Development Workflow
- Single subtask focus from todo.md
- Test everything immediately with curl/Postman before moving on
- Commit after each completed subtask
- Update todo.md, memory.md, and guidelines.md as needed

## Multi-Budget Support
- Users can have multiple budgets simultaneously (personal, business, etc.)
- All data is scoped to the active budget
- Users can switch between budgets
- No budget sharing between users

## API Design Decisions
- Edge functions organized by domain (auth, budgets, transactions, etc.)
- URL versioning (/api/v1/...)
- Each endpoint documented with example curl commands
- All endpoints tested as part of implementation

## Debt Handling
- Debts are regular payees
- Debt payments are a special transaction type (as detailed in implementation plan)
- From envelope → NULL + payee_id (money leaves to payee)

## Environment Configuration
- Using remote Supabase service only (no local Docker)
- All tokens/keys available in .env.local
- Vercel for hosting static auth pages (confirmation, password reset)
- Custom domain to be attached to Vercel

## Supabase Auth Configuration
- Site URL: Set in Authentication > URL Configuration (default redirect, exposed in email templates)
- Redirect URLs: Set in Authentication > URL Configuration (allowed redirect destinations, wildcards supported)
- Custom domain: nvlp.app

## Vercel Configuration
- Created static HTML pages for auth flows:
  - /public/auth/confirm.html - Email confirmation handler
  - /public/auth/reset.html - Password reset handler
  - /public/index.html - Simple landing page
- vercel.json configured to proxy /api/* to Supabase Edge Functions

## Completed Setup
- Supabase project verified accessible (qnpatlosomopoimtsmsr)
- Vercel project created and deployed to nvlp.app
- Custom domain configured in Vercel
- Supabase Auth URLs configured:
  - Site URL: https://nvlp.app
  - Redirect URLs: https://nvlp.app/*
- Static auth pages created for email confirmation and password reset
- API proxy configured: /api/* → Supabase Edge Functions

## Supabase CLI Setup
- CLI version: 2.26.9 (update available to 2.30.4)
- Successfully logged in with access token
- Project linked: qnpatlosomopoimtsmsr
- Local config differs from remote (auth settings)
- Edge functions list verified (empty, ready for deployment)

## Environment Variables Verified
- All required variables present in .env.local
- REST API: Connected (200 status)
- Auth API: Connected (200 status)  
- Edge Functions endpoint: Accessible (ready for deployment)
- Created verify-env.sh script for future verification

## Edge Function Deployment Verified
- Created hello function at supabase/functions/hello/index.ts
- Successfully deployed to Supabase
- GET, POST, and OPTIONS (CORS) requests all working
- Function accessible at: ${SUPABASE_URL}/functions/v1/hello
- Created test-edge-function.sh script for testing
- Vercel proxy working correctly:
  - Requests to www.nvlp.app/api/* proxy to Supabase Edge Functions
  - Authorization headers required and passed through
  - Note: nvlp.app redirects to www.nvlp.app (Vercel domain setting)

## Current Status
- Project initialized with core planning documents
- Requirements clarified and understood
- Phase 1, Task 1, Subtask 1 completed: Supabase project verified accessible
- Phase 1, Task 1, Subtask 2 completed: Supabase CLI connection tested
- Phase 1, Task 1, Subtask 3 completed: Environment variables verified correct
- Phase 1, Task 1, Subtask 4 completed: Edge Function deployment tested
- Next: Confirm database access with proper credentials