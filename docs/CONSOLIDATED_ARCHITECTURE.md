# NVLP - Complete System Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Architecture](#core-architecture) 
3. [Database Design](#database-design)
4. [Transaction System](#transaction-system)
5. [Security Implementation](#security-implementation)
6. [Performance Optimizations](#performance-optimizations)
7. [API Implementation](#api-implementation)
8. [Development Guide](#development-guide)

---

## System Overview

NVLP is a modern digital implementation of the envelope budgeting method, providing users with granular control over their finances through virtual envelopes that represent spending categories. The system implements a comprehensive money flow model with full audit trails, soft deletion capabilities, and real-time balance tracking.

### Technology Stack
- **Backend**: Supabase (PostgreSQL database, authentication, Edge Functions)
- **API**: REST API via Supabase PostgREST + Edge Functions
- **Authentication**: Supabase Auth with magic link + device management
- **Security**: Row Level Security (RLS) policies + session invalidation
- **Client**: TypeScript packages for API consumption

---

## Core Architecture

### Money Flow Model

The system implements a **zero-sum money flow model** where every transaction represents money moving between defined states:

- **Available Pool** → Money not yet allocated to any purpose
- **Envelopes** → Virtual containers representing spending categories  
- **External World** → Sources (income) and destinations (expenses) outside the system

### Transaction Types & Flow Rules

#### 1. Income Transactions
- **Flow**: `External Source → Available Pool`
- **Effect**: Increases budget's available amount
- **Required**: `income_source_id` only
- **Validation**: Amount must be positive

#### 2. Allocation Transactions  
- **Flow**: `Available Pool → Envelope`
- **Effect**: Decreases available, increases envelope balance
- **Required**: `to_envelope_id` only
- **Validation**: Cannot allocate more than available

#### 3. Expense Transactions
- **Flow**: `Envelope → External Payee`
- **Effect**: Decreases envelope balance (money leaves system)
- **Required**: `from_envelope_id` + `payee_id`
- **Validation**: Can create negative balances (overdraft allowed)

#### 4. Transfer Transactions
- **Flow**: `Envelope → Envelope`
- **Effect**: Moves money between envelopes (zero-sum)
- **Required**: `from_envelope_id` + `to_envelope_id` (must be different)
- **Validation**: Both envelopes must exist and belong to same budget

#### 5. Debt Payment Transactions
- **Flow**: `Envelope → External Debt Payee`
- **Effect**: Same as expense but tracked separately for debt reduction
- **Required**: `from_envelope_id` + `payee_id` (payee must have debt tracking)
- **Validation**: Can create negative balances

### Entity Relationships

```
User (1) → (M) Budget
Budget (1) → (M) Category
Budget (1) → (M) Envelope  
Budget (1) → (M) Income Source
Budget (1) → (M) Payee
Budget (1) → (M) Transaction

Category (1) → (M) Envelope [optional hierarchy]
Envelope (1) → (M) Transaction [from/to]
Income Source (1) → (M) Transaction
Payee (1) → (M) Transaction
```

---

## Database Design

### Core Tables

```sql
-- User profiles with auth integration
user_profiles (
  id: UUID PK [references auth.users]
  display_name: TEXT
  avatar_url: TEXT
  default_budget_id: UUID FK
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
)

-- Budget containers
budgets (
  id: UUID PK
  user_id: UUID FK
  name: TEXT NOT NULL
  description: TEXT
  currency: TEXT DEFAULT 'USD'
  available_amount: DECIMAL(12,2) DEFAULT 0
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
)

-- Virtual envelopes for money allocation
envelopes (
  id: UUID PK
  budget_id: UUID FK
  category_id: UUID FK [optional]
  name: TEXT NOT NULL
  description: TEXT
  target_amount: DECIMAL(12,2)
  current_balance: DECIMAL(12,2) DEFAULT 0
  target_date: DATE
  is_hidden: BOOLEAN DEFAULT FALSE
  sort_order: INTEGER
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
)

-- All money movements
transactions (
  id: UUID PK
  budget_id: UUID FK
  transaction_type: transaction_type_enum NOT NULL
  amount: DECIMAL(12,2) NOT NULL CHECK (amount > 0)
  description: TEXT
  transaction_date: DATE NOT NULL
  
  -- Source/destination references (based on type)
  from_envelope_id: UUID FK [nullable]
  to_envelope_id: UUID FK [nullable]
  income_source_id: UUID FK [nullable]
  payee_id: UUID FK [nullable]
  
  -- Metadata
  is_cleared: BOOLEAN DEFAULT FALSE
  is_deleted: BOOLEAN DEFAULT FALSE
  notes: TEXT
  tags: TEXT[]
  
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  deleted_at: TIMESTAMPTZ
)
```

### Security Tables

```sql
-- Device tracking for security
user_devices (
  id: UUID PK
  user_id: UUID FK
  device_id: TEXT NOT NULL
  device_fingerprint: TEXT NOT NULL
  device_name: TEXT
  device_type: TEXT
  first_seen: TIMESTAMPTZ DEFAULT NOW()
  last_seen: TIMESTAMPTZ DEFAULT NOW()
  ip_address: INET
  location_country: TEXT
  location_city: TEXT
  is_current: BOOLEAN DEFAULT FALSE
  is_revoked: BOOLEAN DEFAULT FALSE
  created_at: TIMESTAMPTZ DEFAULT NOW()
  updated_at: TIMESTAMPTZ DEFAULT NOW()
  
  UNIQUE(user_id, device_id)
)

-- Session invalidation tracking
invalidated_sessions (
  id: UUID PK
  user_id: UUID FK
  device_id: TEXT -- NULL means all devices
  invalidated_at: TIMESTAMPTZ DEFAULT NOW()
  reason: TEXT
)
```

### Database Functions

```sql
-- Balance update triggers
CREATE OR REPLACE FUNCTION update_envelope_balance()
CREATE OR REPLACE FUNCTION update_budget_available()
CREATE OR REPLACE FUNCTION handle_transaction_event()

-- Device management
CREATE OR REPLACE FUNCTION register_device()
CREATE OR REPLACE FUNCTION is_session_invalidated()
CREATE OR REPLACE FUNCTION invalidate_sessions()

-- Cleanup functions
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
CREATE OR REPLACE FUNCTION cleanup_inactive_devices()
```

---

## Transaction System

### Transaction Validation Rules

#### General Rules
1. **Amount**: Must be positive decimal (12,2)
2. **Date**: Cannot be in future beyond 7 days
3. **Budget Access**: User must own the budget
4. **Soft Delete**: Deleted transactions maintain referential integrity

#### Type-Specific Validation

```typescript
interface TransactionValidation {
  INCOME: {
    required: ['income_source_id']
    forbidden: ['from_envelope_id', 'to_envelope_id', 'payee_id']
    effect: 'increases budget.available_amount'
  }
  
  ALLOCATION: {
    required: ['to_envelope_id']
    forbidden: ['from_envelope_id', 'income_source_id', 'payee_id']
    effect: 'decreases budget.available_amount, increases envelope.current_balance'
    constraint: 'amount <= budget.available_amount'
  }
  
  EXPENSE: {
    required: ['from_envelope_id', 'payee_id']
    forbidden: ['to_envelope_id', 'income_source_id']
    effect: 'decreases envelope.current_balance'
    constraint: 'none (overdraft allowed)'
  }
  
  TRANSFER: {
    required: ['from_envelope_id', 'to_envelope_id']
    forbidden: ['income_source_id', 'payee_id']
    effect: 'zero-sum between envelopes'
    constraint: 'from_envelope_id != to_envelope_id'
  }
  
  DEBT_PAYMENT: {
    required: ['from_envelope_id', 'payee_id']
    forbidden: ['to_envelope_id', 'income_source_id']
    effect: 'same as expense but tracked for debt reduction'
    constraint: 'payee must support debt tracking'
  }
}
```

### Balance Update Logic

```sql
-- Income: Increases available pool
UPDATE budgets 
SET available_amount = available_amount + NEW.amount 
WHERE id = NEW.budget_id;

-- Allocation: Available → Envelope
UPDATE budgets 
SET available_amount = available_amount - NEW.amount 
WHERE id = NEW.budget_id;

UPDATE envelopes 
SET current_balance = current_balance + NEW.amount 
WHERE id = NEW.to_envelope_id;

-- Expense/Debt Payment: Envelope → External
UPDATE envelopes 
SET current_balance = current_balance - NEW.amount 
WHERE id = NEW.from_envelope_id;

-- Transfer: Envelope → Envelope (zero-sum)
UPDATE envelopes 
SET current_balance = current_balance - NEW.amount 
WHERE id = NEW.from_envelope_id;

UPDATE envelopes 
SET current_balance = current_balance + NEW.amount 
WHERE id = NEW.to_envelope_id;
```

---

## Security Implementation

### Authentication Flow

1. **Magic Link Request**: POST `/functions/v1/auth-magic-link`
2. **Enhanced Email**: Sophisticated template with NVLP branding
3. **Device Registration**: Automatic on successful auth
4. **Session Management**: JWT + device tracking + invalidation

### Device Management

```typescript
interface DeviceManagement {
  registration: {
    trigger: 'automatic on new device login'
    data: 'device_id, fingerprint, name, type, location'
    notification: 'enhanced email template to user'
  }
  
  tracking: {
    headers: 'X-Device-ID on all requests'
    validation: 'middleware checks device + session status'
    invalidation: 'server-side session tracking (JWT can\'t be revoked)'
  }
  
  security: {
    signout_device: 'adds entry to invalidated_sessions'
    signout_all: 'invalidates all user sessions except current'
    cleanup: 'automated removal of 180+ day inactive devices'
  }
}
```

### Row Level Security (RLS)

```sql
-- Budget access policies
CREATE POLICY "Users can only access their own budgets"
  ON budgets FOR ALL
  USING (user_id = auth.uid());

-- Envelope access through budget ownership
CREATE POLICY "Users can only access envelopes in their budgets"
  ON envelopes FOR ALL
  USING (budget_id IN (
    SELECT id FROM budgets WHERE user_id = auth.uid()
  ));

-- Transaction access through budget ownership
CREATE POLICY "Users can only access transactions in their budgets"
  ON transactions FOR ALL
  USING (budget_id IN (
    SELECT id FROM budgets WHERE user_id = auth.uid()
  ));
```

### Session Validation Middleware

```typescript
const validateSession = async (headers: Record<string, string>) => {
  const deviceId = headers['x-device-id']
  if (!deviceId) return { isValid: false, error: 'Device ID required' }
  
  // Verify JWT with Supabase
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { isValid: false, error: 'Invalid auth' }
  
  // Check session invalidation
  const { data: isInvalidated } = await supabase.rpc('is_session_invalidated', {
    p_user_id: user.id,
    p_device_id: deviceId
  })
  
  if (isInvalidated) {
    return { isValid: false, error: 'Session invalidated', code: 'SESSION_INVALIDATED' }
  }
  
  return { isValid: true, userId: user.id }
}
```

---

## Performance Optimizations

### Database Indexes

```sql
-- Query optimization indexes
CREATE INDEX idx_transactions_budget_date ON transactions(budget_id, transaction_date DESC);
CREATE INDEX idx_transactions_envelope ON transactions(from_envelope_id, to_envelope_id);
CREATE INDEX idx_envelopes_budget ON envelopes(budget_id, is_hidden);
CREATE INDEX idx_user_devices_active ON user_devices(user_id, is_revoked, last_seen);

-- Partial indexes for common queries
CREATE INDEX idx_transactions_active ON transactions(budget_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_uncleared ON transactions(budget_id) WHERE is_cleared = FALSE;
```

### Caching Strategy

```typescript
interface CachingLayers {
  supabase: {
    level: 'built-in PostgREST response caching'
    duration: '300 seconds for GET requests'
    invalidation: 'automatic on data changes'
  }
  
  client: {
    level: '@nvlp/client package memory cache'
    strategy: 'cache-first for reference data'
    invalidation: 'manual or TTL-based'
  }
  
  jwks: {
    level: 'automatic JWT verification caching'
    performance: '61% improvement (316ms → 123ms)'
    provider: 'Supabase built-in optimization'
  }
}
```

### Connection Pooling

```sql
-- Supabase managed connection pooling
Pool Size: 15 connections (default)
Idle Timeout: 10 minutes
Max Lifetime: 1 hour
Pool Mode: Transaction pooling for optimal performance
```

### N+1 Query Prevention

```typescript
// Use PostgREST embedding instead of multiple calls
GET /budgets/123/envelopes?select=*,category(name,color)
// Instead of: GET /envelopes + GET /categories for each

// Use aggregate functions for summaries
GET /budgets/123?select=*,envelopes(count),transactions(count)
// Instead of: separate count queries
```

---

## API Implementation

### Architecture Pattern

```typescript
interface APIArchitecture {
  simple_crud: {
    method: 'PostgREST direct database access'
    endpoints: '/budgets, /envelopes, /categories, etc.'
    benefits: 'auto-generated, type-safe, optimized'
  }
  
  complex_logic: {
    method: 'Supabase Edge Functions'
    endpoints: '/functions/v1/device-management, /auth-magic-link'
    benefits: 'custom business logic, email sending, external APIs'
  }
  
  validation: {
    layer: 'TypeScript types + Zod validation'
    location: 'shared @nvlp/types package'
    enforcement: 'compile-time + runtime validation'
  }
}
```

### API Endpoints Summary

```yaml
Authentication:
  POST /functions/v1/auth-magic-link: Send enhanced magic link email
  
Device Management:
  POST /functions/v1/device-management/register: Register new device
  GET /functions/v1/device-management/list: List user devices
  DELETE /functions/v1/device-management/{id}: Sign out device
  POST /functions/v1/device-management/signout-all: Sign out all devices

Core Entities (PostgREST):
  GET /budgets: List user budgets
  GET /budgets/{id}/envelopes: List budget envelopes
  GET /budgets/{id}/transactions: List budget transactions
  POST /budgets/{id}/transactions: Create transaction
  
Setup Helpers:
  POST /budgets/{id}/setup/defaults: Add default categories/envelopes
  POST /budgets/{id}/setup/demo: Add demo data for testing
```

### Error Handling

```typescript
interface APIErrorCodes {
  VALIDATION_ERROR: 'Invalid request data'
  UNAUTHORIZED: 'Authentication required'
  SESSION_INVALIDATED: 'Device session invalidated - re-auth required'
  FORBIDDEN: 'Access denied to resource'
  NOT_FOUND: 'Resource not found'
  CONFLICT: 'Resource conflict (e.g., duplicate name)'
  RATE_LIMITED: 'Too many requests'
  INSUFFICIENT_FUNDS: 'Cannot allocate more than available'
}
```

---

## Development Guide

### Quick Start

```bash
# Setup
pnpm install
cp .env.example .env  # Configure SUPABASE_URL, keys

# Development
pnpm dev              # Start all packages in dev mode
pnpm type-check       # Check TypeScript across monorepo
pnpm test             # Run test suites

# Database
supabase db push      # Apply migrations
supabase functions deploy --no-verify-jwt  # Deploy edge functions
```

### Package Structure

```
packages/
├── types/           # Shared TypeScript definitions
├── api/            # Service layer with Supabase integration  
├── client/         # Client library for API consumption
└── mobile/         # React Native app (future)
```

### Testing

```bash
# Email system testing
./scripts/test-email-templates.sh test-all-enhanced

# API endpoint testing  
./scripts/test-api-endpoints.sh

# Database cleanup testing
./scripts/manage-cleanup-jobs.sh dry-run
```

### Security Best Practices

1. **Always include X-Device-ID header** in API requests
2. **Handle SESSION_INVALIDATED responses** with re-authentication
3. **Use PostgREST for simple CRUD** (inherits RLS automatically)
4. **Use Edge Functions for complex logic** with manual auth validation
5. **Test RLS policies** with multiple user scenarios

### Mobile Integration

```typescript
// Required for React Native
import { DeviceService } from '@nvlp/client'

// Device registration on auth success
await client.device.registerDevice({
  device_id: await getDeviceId(),
  device_fingerprint: await getDeviceFingerprint(),
  device_name: await getDeviceName(),
  device_type: Platform.OS,
  // ... other device info
})

// Handle session invalidation
client.on('sessionInvalidated', () => {
  // Clear local auth state
  // Navigate to login screen
  // Show user-friendly message
})
```

---

## Operational Guides

### Database Maintenance

```sql
-- Automated cleanup (runs daily via GitHub Actions)
SELECT cleanup_old_sessions(30);        -- Remove 30+ day old sessions
SELECT cleanup_inactive_devices(180);   -- Remove 180+ day inactive devices
SELECT cleanup_old_transactions(365);   -- Archive 365+ day old transactions
```

### Monitoring

```bash
# Check system health
curl /functions/v1/health-check

# Monitor email delivery
./scripts/test-email-templates.sh verify

# Check cleanup job status
./scripts/manage-cleanup-jobs.sh status
```

### Deployment

```bash
# Deploy all functions
supabase functions deploy --no-verify-jwt

# Apply database changes
supabase db push

# Run post-deployment tests
./scripts/test-api-endpoints.sh
```

---

This consolidated document provides a complete technical reference for the NVLP system, combining architectural decisions, implementation details, and operational procedures in a single, maintainable resource.