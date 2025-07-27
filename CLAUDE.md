# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
**App**: NVLP - Virtual Envelope Budgeting System  
**Type**: API-first personal finance management system  
**Stack**: TypeScript + Supabase (backend) → React Native (mobile) → Web (future)  
**Architecture**: pnpm monorepo with shared packages

## Development Commands

```bash
# Setup
pnpm install                    # Install all dependencies
cp .env.example .env           # Configure environment variables

# Development
pnpm build                     # Build all packages
pnpm dev                       # Start development mode for all packages
pnpm type-check                # Check TypeScript errors across monorepo
pnpm clean                     # Clean all build artifacts

# Package-specific commands
pnpm --filter @nvlp/types build        # Build types package only
pnpm --filter @nvlp/api type-check     # Type check API package only
```

## Core Architecture

### Monorepo Structure
- **`packages/types/`**: Shared TypeScript definitions for all entities (User, Budget, Envelope, Transaction, etc.)
- **`packages/api/`**: Service layer with Supabase integration
- **`packages/client/`**: Client library for API consumption (future)

### Money Flow Model
The system implements a zero-sum money flow:
1. **Income** → Available Pool (unallocated money)
2. **Allocation** → Available Pool → Envelopes  
3. **Expense/Debt Payment** → Envelopes → Payees (money leaves system)
4. **Transfer** → Envelope → Envelope

### Transaction Types & Validation Rules
Each transaction type has strict field requirements enforced in `TransactionService.validateTransactionRequest()`:
- **INCOME**: Requires `income_source_id` only
- **ALLOCATION**: Requires `to_envelope_id` only  
- **EXPENSE/DEBT_PAYMENT**: Requires `from_envelope_id` + `payee_id`
- **TRANSFER**: Requires `from_envelope_id` + `to_envelope_id` (must be different)

### Service Layer Pattern
All services extend `BaseService` which provides:
- Authentication via `getCurrentUserId()`
- Error handling with `ApiError` transformation
- Retry logic with `withRetry()`
- Budget access verification pattern

### API Strategy
- **PostgREST**: Direct database calls for simple CRUD operations
- **Edge Functions**: Complex business logic and validation
- **Magic Link Auth**: Primary authentication method
- **Automatic Token Refresh**: Built into client layer

## Current Development Phase

**Status**: API Foundation Complete  
**Active Roadmap**: `/API_ROADMAP.md`  
**Next Phase**: Phase 2 - Supabase Database Setup

### Key Design Decisions
- **Clean Budget Creation**: New budgets are created empty, no auto-populated defaults
- **Optional Setup Endpoints**: Separate endpoints for adding defaults vs demo data
- **Row Level Security**: All data isolated by user/budget ownership
- **Soft Deletes**: Transactions support soft delete with audit trail

## Environment Configuration

Required environment variables in `.env`:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Important Files
- **`/API_ROADMAP.md`**: Complete development roadmap with phase tracking
- **`/docs/TECHNICAL_ARCHITECTURE.md`**: System design and data flow
- **`/docs/IMPLEMENTATION_PLAN.md`**: Original implementation plan
- **`/packages/types/src/models/`**: Core entity type definitions
- **`/packages/api/src/services/`**: Service implementations

## Workflow Notes
- Always check TypeScript with `pnpm type-check` before committing
- Follow existing service patterns when adding new endpoints
- Update API_ROADMAP.md progress as features are completed
- Test API endpoints with cURL examples (will be documented per endpoint)

## Development Process Guidelines
- When executing a subtask from the roadmap, only execute that one subtask, make sure it works (either directly or via confirmation from me after a manual test), mark it complete in the roadmap, commit change to git, wait to be prompted before executing next subtask