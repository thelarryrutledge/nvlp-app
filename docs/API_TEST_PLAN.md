# NVLP API Complete Test Plan

## Overview
This document provides a comprehensive test plan for the NVLP API, starting from a clean state and testing all functionality including auto-calculations, triggers, and data integrity.

## Prerequisites
- Clean database (all tables cleared)
- Custom domains configured: `edge-api.nvlp.app` and `db-api.nvlp.app`
- API keys and environment variables ready

## Test Environment Setup

### Environment Variables
```bash
# Supabase Configuration
SUPABASE_URL="https://qnpatlosomopoimtsmsr.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8"

# Custom API Domains
EDGE_API_URL="https://edge-api.nvlp.app"
DB_API_URL="https://db-api.nvlp.app"

# Test User Credentials
TEST_EMAIL="test@example.com"
TEST_PASSWORD="Test1234!"
TEST_NAME="Test User"
```

---

## Phase 1: Authentication Testing

### 1.1 User Registration
**Test**: Create a new user account

```bash
curl -X POST "${EDGE_API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{
    "email": "'${TEST_EMAIL}'",
    "password": "'${TEST_PASSWORD}'",
    "display_name": "'${TEST_NAME}'"
  }'
```

**Expected Result**: 
- Status: 200
- Response contains `user` object with `id`, `email`
- Response contains `session` object with `access_token`, `refresh_token`

**Save for later**: Extract `user.id` and `session.access_token`

### 1.2 User Login
**Test**: Authenticate existing user

```bash
curl -X POST "${EDGE_API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{
    "email": "'${TEST_EMAIL}'",
    "password": "'${TEST_PASSWORD}'"
  }'
```

**Expected Result**:
- Status: 200
- Valid JWT token returned
- User object matches registration

**Save for later**: Extract `ACCESS_TOKEN` for subsequent requests

### 1.3 User Profile Creation (Auto-trigger)
**Test**: Verify user profile was automatically created

```bash
curl -H "Authorization: Bearer ${ACCESS_TOKEN}" \
     -H "apikey: ${SUPABASE_ANON_KEY}" \
     "${DB_API_URL}/user_profiles"
```

**Expected Result**:
- Status: 200
- Single profile record with correct user ID
- Default values set (timezone, currency, etc.)

### 1.4 User Logout
**Test**: Invalidate session

```bash
curl -X POST "${EDGE_API_URL}/auth/logout" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Expected Result**:
- Status: 200
- Token should be invalidated

### 1.5 Re-login for Continued Testing
**Test**: Login again to continue testing

```bash
curl -X POST "${EDGE_API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{
    "email": "'${TEST_EMAIL}'",
    "password": "'${TEST_PASSWORD}'"
  }'
```

**Save**: New `ACCESS_TOKEN` for Phase 2

---

## Phase 2: Core Data Setup

### 2.1 Create Budget
**Test**: Create a new budget (should auto-create default budget)

```bash
curl -X POST "${DB_API_URL}/budgets" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "Monthly Budget",
    "description": "Primary monthly budget",
    "is_default": true
  }'
```

**Expected Result**:
- Status: 201
- Budget created with correct user_id
- `is_default` set to true

**Save**: `BUDGET_ID` for subsequent tests

### 2.2 Verify User State Initialization
**Test**: Check that user_state record was created

```bash
curl -H "Authorization: Bearer ${ACCESS_TOKEN}" \
     -H "apikey: ${SUPABASE_ANON_KEY}" \
     "${DB_API_URL}/user_state"
```

**Expected Result**:
- Status: 200
- Single record with `available_amount: 0.00`
- Correct user_id

### 2.3 Create Income Sources
**Test**: Create income sources for the budget

```bash
# Primary salary
curl -X POST "${DB_API_URL}/income_sources" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "name": "Primary Salary",
    "description": "Monthly salary from employer",
    "expected_monthly_amount": 5000.00,
    "frequency": "monthly"
  }'
```

```bash
# Side income
curl -X POST "${DB_API_URL}/income_sources" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "name": "Freelance Work",
    "description": "Side consulting income",
    "expected_monthly_amount": 1000.00,
    "frequency": "irregular"
  }'
```

**Expected Result**:
- Status: 201 for both
- Income sources created with correct budget_id

**Save**: `SALARY_ID` and `FREELANCE_ID`

### 2.4 Create Categories
**Test**: Create expense categories

```bash
# Groceries
curl -X POST "${DB_API_URL}/categories" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "name": "Groceries",
    "description": "Food and household items",
    "color": "#4CAF50",
    "icon": "🛒"
  }'
```

```bash
# Transportation
curl -X POST "${DB_API_URL}/categories" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "name": "Transportation",
    "description": "Gas, maintenance, public transit",
    "color": "#2196F3",
    "icon": "🚗"
  }'
```

```bash
# Entertainment
curl -X POST "${DB_API_URL}/categories" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "name": "Entertainment",
    "description": "Movies, dining, hobbies",
    "color": "#FF9800",
    "icon": "🎬"
  }'
```

**Expected Result**:
- Status: 201 for all
- Categories created with correct budget_id

**Save**: `GROCERY_CATEGORY_ID`, `TRANSPORT_CATEGORY_ID`, `ENTERTAINMENT_CATEGORY_ID`

### 2.5 Create Envelopes
**Test**: Create budget envelopes with auto-fill settings

```bash
# Grocery envelope
curl -X POST "${DB_API_URL}/envelopes" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "category_id": "'${GROCERY_CATEGORY_ID}'",
    "name": "Monthly Groceries",
    "description": "Monthly grocery budget",
    "target_amount": 500.00,
    "current_balance": 0.00,
    "fill_frequency": "monthly",
    "fill_amount": 500.00,
    "auto_fill_enabled": true,
    "overspend_allowed": false,
    "notification_limit": 50.00
  }'
```

```bash
# Transportation envelope
curl -X POST "${DB_API_URL}/envelopes" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "category_id": "'${TRANSPORT_CATEGORY_ID}'",
    "name": "Transportation",
    "description": "Gas and car expenses",
    "target_amount": 300.00,
    "current_balance": 0.00,
    "fill_frequency": "monthly",
    "fill_amount": 300.00,
    "auto_fill_enabled": true,
    "overspend_allowed": false,
    "notification_limit": 30.00
  }'
```

```bash
# Entertainment envelope
curl -X POST "${DB_API_URL}/envelopes" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "category_id": "'${ENTERTAINMENT_CATEGORY_ID}'",
    "name": "Entertainment Fund",
    "description": "Fun money for entertainment",
    "target_amount": 200.00,
    "current_balance": 0.00,
    "fill_frequency": "monthly",
    "fill_amount": 200.00,
    "auto_fill_enabled": true,
    "overspend_allowed": true,
    "notification_limit": 20.00
  }'
```

**Expected Result**:
- Status: 201 for all
- Envelopes created with correct budget_id and category_id
- All balances start at 0.00

**Save**: `GROCERY_ENVELOPE_ID`, `TRANSPORT_ENVELOPE_ID`, `ENTERTAINMENT_ENVELOPE_ID`

### 2.6 Create Payees
**Test**: Create payees for transactions

```bash
# Walmart
curl -X POST "${DB_API_URL}/payees" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "name": "Walmart",
    "description": "Local grocery store",
    "default_category": "'${GROCERY_CATEGORY_ID}'"
  }'
```

```bash
# Shell Gas Station
curl -X POST "${DB_API_URL}/payees" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "name": "Shell Gas Station",
    "description": "Gas station",
    "default_category": "'${TRANSPORT_CATEGORY_ID}'"
  }'
```

```bash
# Netflix
curl -X POST "${DB_API_URL}/payees" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "name": "Netflix",
    "description": "Streaming service",
    "default_category": "'${ENTERTAINMENT_CATEGORY_ID}'"
  }'
```

**Expected Result**:
- Status: 201 for all
- Payees created with correct budget_id and default categories

**Save**: `WALMART_PAYEE_ID`, `SHELL_PAYEE_ID`, `NETFLIX_PAYEE_ID`

---

## Phase 3: Transaction Testing & Auto-Calculations

### 3.1 Income Transaction (Test Auto-Calculation)
**Test**: Add income and verify it increases available_amount

```bash
curl -X POST "${EDGE_API_URL}/transactions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "type": "income",
    "amount": 5000.00,
    "description": "Monthly salary payment",
    "date": "2025-01-01",
    "income_source_id": "'${SALARY_ID}'"
  }'
```

**Expected Result**:
- Status: 200
- Transaction created successfully
- **Auto-calculation**: `user_state.available_amount` should increase by 5000.00

**Verify Auto-Calculation**:
```bash
curl -H "Authorization: Bearer ${ACCESS_TOKEN}" \
     -H "apikey: ${SUPABASE_ANON_KEY}" \
     "${DB_API_URL}/user_state"
```

**Expected**: `available_amount: 5000.00`

### 3.2 Allocation Transactions (Test Envelope Filling)
**Test**: Allocate money from available amount to envelopes

```bash
# Allocate to groceries
curl -X POST "${EDGE_API_URL}/transactions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "type": "allocation",
    "amount": 500.00,
    "description": "Monthly grocery allocation",
    "date": "2025-01-01",
    "to_envelope_id": "'${GROCERY_ENVELOPE_ID}'"
  }'
```

```bash
# Allocate to transportation
curl -X POST "${EDGE_API_URL}/transactions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "type": "allocation",
    "amount": 300.00,
    "description": "Monthly transportation allocation",
    "date": "2025-01-01",
    "to_envelope_id": "'${TRANSPORT_ENVELOPE_ID}'"
  }'
```

```bash
# Allocate to entertainment
curl -X POST "${EDGE_API_URL}/transactions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "type": "allocation",
    "amount": 200.00,
    "description": "Monthly entertainment allocation",
    "date": "2025-01-01",
    "to_envelope_id": "'${ENTERTAINMENT_ENVELOPE_ID}'"
  }'
```

**Expected Result**:
- Status: 200 for all
- Transactions created successfully

**Verify Auto-Calculations**:
```bash
# Check available amount decreased
curl -H "Authorization: Bearer ${ACCESS_TOKEN}" \
     -H "apikey: ${SUPABASE_ANON_KEY}" \
     "${DB_API_URL}/user_state"
```
**Expected**: `available_amount: 4000.00` (5000 - 500 - 300 - 200)

```bash
# Check envelope balances increased
curl -H "Authorization: Bearer ${ACCESS_TOKEN}" \
     -H "apikey: ${SUPABASE_ANON_KEY}" \
     "${DB_API_URL}/envelopes?budget_id=eq.${BUDGET_ID}"
```
**Expected**: 
- Grocery envelope: `current_balance: 500.00`
- Transport envelope: `current_balance: 300.00`
- Entertainment envelope: `current_balance: 200.00`

### 3.3 Expense Transactions (Test Envelope Spending)
**Test**: Spend from envelopes and verify balance decreases

```bash
# Grocery expense
curl -X POST "${EDGE_API_URL}/transactions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "type": "expense",
    "amount": 45.67,
    "description": "Weekly grocery shopping",
    "date": "2025-01-02",
    "from_envelope_id": "'${GROCERY_ENVELOPE_ID}'",
    "payee_id": "'${WALMART_PAYEE_ID}'",
    "category_id": "'${GROCERY_CATEGORY_ID}'"
  }'
```

```bash
# Gas expense
curl -X POST "${EDGE_API_URL}/transactions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "type": "expense",
    "amount": 35.00,
    "description": "Gas fill-up",
    "date": "2025-01-03",
    "from_envelope_id": "'${TRANSPORT_ENVELOPE_ID}'",
    "payee_id": "'${SHELL_PAYEE_ID}'",
    "category_id": "'${TRANSPORT_CATEGORY_ID}'"
  }'
```

```bash
# Entertainment expense
curl -X POST "${EDGE_API_URL}/transactions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "type": "expense",
    "amount": 15.99,
    "description": "Netflix subscription",
    "date": "2025-01-04",
    "from_envelope_id": "'${ENTERTAINMENT_ENVELOPE_ID}'",
    "payee_id": "'${NETFLIX_PAYEE_ID}'",
    "category_id": "'${ENTERTAINMENT_CATEGORY_ID}'"
  }'
```

**Expected Result**:
- Status: 200 for all
- Transactions created successfully

**Verify Auto-Calculations**:
```bash
# Check envelope balances decreased
curl -H "Authorization: Bearer ${ACCESS_TOKEN}" \
     -H "apikey: ${SUPABASE_ANON_KEY}" \
     "${DB_API_URL}/envelopes?budget_id=eq.${BUDGET_ID}"
```
**Expected**: 
- Grocery envelope: `current_balance: 454.33` (500.00 - 45.67)
- Transport envelope: `current_balance: 265.00` (300.00 - 35.00)
- Entertainment envelope: `current_balance: 184.01` (200.00 - 15.99)

```bash
# Check user_state.available_amount unchanged
curl -H "Authorization: Bearer ${ACCESS_TOKEN}" \
     -H "apikey: ${SUPABASE_ANON_KEY}" \
     "${DB_API_URL}/user_state"
```
**Expected**: `available_amount: 4000.00` (unchanged)

### 3.4 Transfer Transaction (Test Envelope-to-Envelope)
**Test**: Transfer money between envelopes

```bash
curl -X POST "${EDGE_API_URL}/transactions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "type": "transfer",
    "amount": 50.00,
    "description": "Transfer from groceries to entertainment",
    "date": "2025-01-05",
    "from_envelope_id": "'${GROCERY_ENVELOPE_ID}'",
    "to_envelope_id": "'${ENTERTAINMENT_ENVELOPE_ID}'"
  }'
```

**Expected Result**:
- Status: 200
- Transaction created successfully

**Verify Auto-Calculations**:
```bash
curl -H "Authorization: Bearer ${ACCESS_TOKEN}" \
     -H "apikey: ${SUPABASE_ANON_KEY}" \
     "${DB_API_URL}/envelopes?budget_id=eq.${BUDGET_ID}"
```
**Expected**: 
- Grocery envelope: `current_balance: 404.33` (454.33 - 50.00)
- Entertainment envelope: `current_balance: 234.01` (184.01 + 50.00)
- Transport envelope: `current_balance: 265.00` (unchanged)

### 3.5 Additional Income (Test Running Balance)
**Test**: Add more income and verify cumulative calculations

```bash
curl -X POST "${EDGE_API_URL}/transactions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "type": "income",
    "amount": 1000.00,
    "description": "Freelance project payment",
    "date": "2025-01-06",
    "income_source_id": "'${FREELANCE_ID}'"
  }'
```

**Verify Auto-Calculations**:
```bash
curl -H "Authorization: Bearer ${ACCESS_TOKEN}" \
     -H "apikey: ${SUPABASE_ANON_KEY}" \
     "${DB_API_URL}/user_state"
```
**Expected**: `available_amount: 5000.00` (4000.00 + 1000.00)

---

## Phase 4: Advanced Features Testing

### 4.1 Dashboard Data
**Test**: Get comprehensive dashboard data

```bash
curl -H "Authorization: Bearer ${ACCESS_TOKEN}" \
     "${EDGE_API_URL}/dashboard?budget_id=${BUDGET_ID}&days=30"
```

**Expected Result**:
- Status: 200
- `budget_overview` with correct totals
- `envelope_summary` with current balances
- `recent_transactions` list
- `spending_analysis` with category breakdowns

### 4.2 Transaction Report
**Test**: Generate transaction report

```bash
curl -X POST "${EDGE_API_URL}/reports" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "transactions",
    "budget_id": "'${BUDGET_ID}'",
    "start_date": "2025-01-01",
    "end_date": "2025-01-31"
  }'
```

**Expected Result**:
- Status: 200
- Report with all transactions
- Proper date filtering
- Correct totals

### 4.3 Category Trends Report
**Test**: Generate category spending trends

```bash
curl -X POST "${EDGE_API_URL}/reports" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "category-trends",
    "budget_id": "'${BUDGET_ID}'",
    "months": 3
  }'
```

### 4.4 Data Export
**Test**: Export transaction data

```bash
curl -X POST "${EDGE_API_URL}/export" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "export_type": "transactions",
    "budget_id": "'${BUDGET_ID}'",
    "format": "csv",
    "start_date": "2025-01-01",
    "end_date": "2025-01-31"
  }'
```

**Expected Result**:
- Status: 200
- Export data in CSV format
- All transactions included

### 4.5 Audit Trail
**Test**: Check audit events

```bash
curl -X POST "${EDGE_API_URL}/audit" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "event_types": ["transaction_created", "transaction_updated"],
    "limit": 50
  }'
```

**Expected Result**:
- Status: 200
- Audit events for all transactions created
- Proper event details and timestamps

---

## Phase 5: Error Handling & Edge Cases

### 5.1 Invalid Budget Access
**Test**: Try to access another user's budget

```bash
curl -H "Authorization: Bearer ${ACCESS_TOKEN}" \
     -H "apikey: ${SUPABASE_ANON_KEY}" \
     "${DB_API_URL}/budgets?id=eq.fake-budget-id"
```

**Expected Result**:
- Status: 200
- Empty array (RLS blocks access)

### 5.2 Insufficient Funds
**Test**: Try to spend more than envelope balance

```bash
curl -X POST "${EDGE_API_URL}/transactions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "type": "expense",
    "amount": 999999.00,
    "description": "Overspend test",
    "date": "2025-01-07",
    "from_envelope_id": "'${GROCERY_ENVELOPE_ID}'",
    "payee_id": "'${WALMART_PAYEE_ID}'",
    "category_id": "'${GROCERY_CATEGORY_ID}'"
  }'
```

**Expected Result**:
- Status: 400
- Error message about insufficient funds

### 5.3 Invalid Transaction Type
**Test**: Try to create invalid transaction

```bash
curl -X POST "${EDGE_API_URL}/transactions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "type": "invalid_type",
    "amount": 100.00,
    "description": "Invalid transaction",
    "date": "2025-01-07"
  }'
```

**Expected Result**:
- Status: 400
- Validation error message

### 5.4 Missing Required Fields
**Test**: Try to create transaction without required fields

```bash
curl -X POST "${EDGE_API_URL}/transactions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'${BUDGET_ID}'",
    "type": "expense",
    "description": "Missing amount"
  }'
```

**Expected Result**:
- Status: 400
- Validation error for missing amount

---

## Phase 6: Final Verification

### 6.1 Complete Data Summary
**Test**: Get all data and verify consistency

```bash
# Get all transactions
curl -X POST "${EDGE_API_URL}/transactions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "list",
    "budget_id": "'${BUDGET_ID}'"
  }'

# Get final envelope balances
curl -H "Authorization: Bearer ${ACCESS_TOKEN}" \
     -H "apikey: ${SUPABASE_ANON_KEY}" \
     "${DB_API_URL}/envelopes?budget_id=eq.${BUDGET_ID}"

# Get final available amount
curl -H "Authorization: Bearer ${ACCESS_TOKEN}" \
     -H "apikey: ${SUPABASE_ANON_KEY}" \
     "${DB_API_URL}/user_state"
```

### 6.2 Manual Calculation Verification
**Calculate expected values manually**:

- **Total Income**: 5000.00 + 1000.00 = 6000.00
- **Total Allocations**: 500.00 + 300.00 + 200.00 = 1000.00
- **Total Expenses**: 45.67 + 35.00 + 15.99 = 96.66
- **Transfers**: 50.00 (neutral to total)
- **Expected Available**: 6000.00 - 1000.00 = 5000.00
- **Expected Envelope Balances**:
  - Grocery: 500.00 - 45.67 - 50.00 = 404.33
  - Transport: 300.00 - 35.00 = 265.00
  - Entertainment: 200.00 - 15.99 + 50.00 = 234.01

### 6.3 Cleanup (Optional)
**Test**: Clean up test data

```bash
# Delete test budget (cascading deletes should remove all related data)
curl -X DELETE "${DB_API_URL}/budgets?id=eq.${BUDGET_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}"
```

---

## Success Criteria

### ✅ Authentication
- [ ] User registration works
- [ ] User login works
- [ ] User logout works
- [ ] User profile auto-created
- [ ] Tokens validate correctly

### ✅ Core Data
- [ ] Budget creation works
- [ ] Income sources creation works
- [ ] Categories creation works
- [ ] Envelopes creation works
- [ ] Payees creation works

### ✅ Transactions & Auto-Calculations
- [ ] Income transactions increase available_amount
- [ ] Allocation transactions move money to envelopes
- [ ] Expense transactions decrease envelope balances
- [ ] Transfer transactions move money between envelopes
- [ ] All calculations are mathematically correct

### ✅ Advanced Features
- [ ] Dashboard returns comprehensive data
- [ ] Reports generate correctly
- [ ] Export functionality works
- [ ] Audit trail captures all events

### ✅ Security & Validation
- [ ] RLS prevents unauthorized access
- [ ] Validation prevents invalid transactions
- [ ] Error handling works correctly
- [ ] Data integrity maintained

### ✅ Data Consistency
- [ ] Manual calculations match system calculations
- [ ] No orphaned records
- [ ] All foreign keys valid
- [ ] Triggers working correctly

---

## Troubleshooting

### Common Issues
1. **Token Expiration**: Re-login if getting 401 errors
2. **Missing IDs**: Make sure to extract and save IDs from responses
3. **RLS Blocking**: Ensure using correct user token
4. **Validation Errors**: Check required fields and data types

### Debug Commands
```bash
# Check current token validity
curl -H "Authorization: Bearer ${ACCESS_TOKEN}" \
     -H "apikey: ${SUPABASE_ANON_KEY}" \
     "${DB_API_URL}/user_profiles"

# Check current user state
curl -H "Authorization: Bearer ${ACCESS_TOKEN}" \
     -H "apikey: ${SUPABASE_ANON_KEY}" \
     "${DB_API_URL}/user_state"
```

This comprehensive test plan should validate all aspects of your NVLP API, including the critical auto-calculation features and data integrity!