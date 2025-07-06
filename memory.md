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

## Next Steps
Phase 1, Task 3: 5/6 done (docs remaining)
Then: Phase 2 - Database Schema