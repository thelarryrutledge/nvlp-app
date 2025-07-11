# NVLP Project Memory

## STATUS: Backend Complete ✅ | Frontend Ready | React Native Phase 1.3 ✅ COMPLETE

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
- **Environment Variables**: react-native-config with .env files for dev/staging/prod
- **iOS Setup**: ✅ Complete - Xcode installed, CocoaPods 1.16.2, iOS SDK 18.5 available
- **Android Setup**: ✅ Complete - JDK 17, Android Studio, emulator working
- **Debugging**: ✅ React DevTools 11.3.0, Chrome DevTools, Metro Inspector
- **Hot Reload**: ✅ Fast Refresh configured with Metro watch folders and test component
- **Device Testing**: ✅ iOS simulators (iPhone 16 Pro, iPad Pro) and Android emulators ready
- **PATH Fix**: ✅ Node environment issue resolved in package.json scripts
- **Status**: PAUSED - Migrating to Monorepo Structure
- **Monorepo Migration**: Phase 1.1 Environment Setup (2/5 complete)
- **Latest**: pnpm 10.13.1 installed globally
- **Next Monorepo Task**: Create migration branch
- **React Native Status**: Phase 2.1 Complete, Phase 2.2 pending monorepo completion