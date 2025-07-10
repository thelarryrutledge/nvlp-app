# NVLP Project Memory

## STATUS: Backend Complete ✅ | Frontend Ready | React Native Phase 1.1 (5/6 complete)

## Core Info
- **Supabase**: qnpatlosomopoimtsmsr
- **Test User**: larryjrutledge@gmail.com / Test1234!
- **APIs**: edge-api.nvlp.app (complex), db-api.nvlp.app (CRUD)
- **TypeScript Client**: `/src/client/`, `/dist/client/` (production-ready)

## Architecture
**NVLP = Virtual Envelope Budget App**
- **Money Flow**: Income Sources → Available Bucket → Envelopes → Payees
- **Database**: 11 tables with RLS, triggers, constraints
- **Hybrid API**: PostgREST (fast CRUD) + Edge Functions (complex logic)
- **Auth**: JWT tokens with automatic refresh
- **Performance**: TTL caching (70-80% improvement)

## Development Workflow
1. **Single Task Focus**: One roadmap subtask at a time
2. **Process**: TodoWrite → Implement → Test → Update roadmap → Commit → Wait for confirmation
3. **File Permissions**: 
   - No confirmation: memory.md, roadmap files, guidelines.md
   - Requires confirmation: source code, config files, new files

## Key Patterns
```bash
# Auth
curl -X POST "https://edge-api.nvlp.app/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# CRUD
curl -H "Authorization: Bearer {TOKEN}" \
     -H "apikey: {ANON_KEY}" \
     "https://db-api.nvlp.app/budgets"
```

## Transaction Types
- income, allocation, expense, transfer, debt_payment
- Manual entry (no bank sync)
- Audit logging with event tracking

## Envelope Types (NEW)
- **Regular**: Standard envelopes for budgeting
- **Savings**: Goal-based envelopes (notify_above_amount = goal)
- **Debt**: Debt tracking envelopes with debt_balance, minimum_payment, due_date
- System categories (auto-created, protected):
  - "Savings" - for savings envelopes only
  - "Loans" - for loan debt envelopes  
  - "Credit Cards" - for credit card debt envelopes
  - "Debt" - for other debt envelopes
- Constraints: savings→Savings, debt→any debt category, regular→non-system categories
- debt_payment transactions reduce both envelope balance AND debt_balance

## React Native Progress
- **Project**: NVLPMobile created with TypeScript support
- **Location**: /NVLPMobile/ (React Native 0.80.1)
- **Structure**: Modular architecture with components/, screens/, services/, utils/
- **TypeScript**: Strict mode enabled with path aliases (@/components, @/screens, etc.)
- **ESLint/Prettier**: Configured with React Native rules, TypeScript support, and path aliases
- **Absolute Imports**: Babel, Metro, TypeScript, and ESLint aligned with @ path aliases
- **Status**: Phase 1.1 - Initialize React Native Project (5/6 complete)
- **Next**: Set up environment variables (.env files for dev/staging/prod)