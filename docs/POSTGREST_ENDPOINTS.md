# PostgREST Endpoint Documentation

This document provides comprehensive documentation for all PostgREST endpoints available in the NVLP API. PostgREST automatically generates RESTful endpoints for all database tables with proper Row Level Security (RLS) policies.

## Base URL

All PostgREST endpoints are accessed through:
```
{SUPABASE_URL}/rest/v1/{table_name}
```

## Authentication

All requests require an `Authorization` header with a valid JWT token:
```
Authorization: Bearer {jwt_token}
```

The `apikey` header is also required:
```
apikey: {SUPABASE_ANON_KEY}
```

## Response Formats

PostgREST supports multiple response formats via the `Accept` header:
- `application/json` (default)
- `text/csv`
- `application/openapi+json` (schema)

## Common Query Parameters

### Filtering
- `column=eq.value` - Equals
- `column=neq.value` - Not equals
- `column=gt.value` - Greater than
- `column=gte.value` - Greater than or equal
- `column=lt.value` - Less than
- `column=lte.value` - Less than or equal
- `column=like.*pattern*` - Pattern matching
- `column=ilike.*pattern*` - Case-insensitive pattern matching
- `column=in.(value1,value2)` - In list
- `column=is.null` - Is null
- `column=not.is.null` - Is not null

### Ordering
- `order=column.asc` - Ascending order
- `order=column.desc` - Descending order
- `order=column1.asc,column2.desc` - Multiple columns

### Pagination
- `limit=10` - Limit results
- `offset=20` - Skip results
- `Range: 0-9` (header) - Range-based pagination

### Selection
- `select=column1,column2` - Select specific columns
- `select=*` - Select all columns (default)

## Entity Endpoints

### 1. User Profiles

**Table**: `user_profiles`

#### GET /user_profiles
Get user profiles (users can only access their own profile due to RLS)

**Example**:
```bash
curl -X GET "{SUPABASE_URL}/rest/v1/user_profiles" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}"
```

#### GET /user_profiles?id=eq.{user_id}
Get specific user profile

#### PATCH /user_profiles?id=eq.{user_id}
Update user profile

**Example**:
```bash
curl -X PATCH "{SUPABASE_URL}/rest/v1/user_profiles?id=eq.{user_id}" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"display_name": "New Display Name"}'
```

### 2. Budgets

**Table**: `budgets`

#### GET /budgets
List all budgets for the authenticated user

**Example**:
```bash
curl -X GET "{SUPABASE_URL}/rest/v1/budgets?is_active=eq.true&order=created_at.desc" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}"
```

#### GET /budgets?id=eq.{budget_id}
Get specific budget

#### POST /budgets
Create a new budget

**Example**:
```bash
curl -X POST "{SUPABASE_URL}/rest/v1/budgets" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Budget",
    "description": "Main household budget",
    "user_id": "{user_id}"
  }'
```

#### PATCH /budgets?id=eq.{budget_id}
Update budget

#### DELETE /budgets?id=eq.{budget_id}
Delete budget

### 3. Categories

**Table**: `categories`

#### GET /categories
List all categories across all user budgets

**Useful filters**:
- `budget_id=eq.{budget_id}` - Filter by budget
- `is_income=eq.true` - Income categories only
- `is_income=eq.false` - Expense categories only
- `parent_id=is.null` - Top-level categories only
- `parent_id=eq.{parent_id}` - Child categories of specific parent

**Example**:
```bash
curl -X GET "{SUPABASE_URL}/rest/v1/categories?budget_id=eq.{budget_id}&order=display_order.asc" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}"
```

#### GET /categories?id=eq.{category_id}
Get specific category

#### POST /categories
Create new category

**Example**:
```bash
curl -X POST "{SUPABASE_URL}/rest/v1/categories" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "{budget_id}",
    "name": "Groceries",
    "description": "Food and household items",
    "is_income": false,
    "display_order": 1
  }'
```

#### PATCH /categories?id=eq.{category_id}
Update category

#### DELETE /categories?id=eq.{category_id}
Delete category

### 4. Income Sources

**Table**: `income_sources`

#### GET /income_sources
List all income sources

**Useful filters**:
- `budget_id=eq.{budget_id}` - Filter by budget
- `is_active=eq.true` - Active sources only
- `frequency=eq.monthly` - Filter by frequency
- `next_expected_date=gte.{date}` - Upcoming income

**Example**:
```bash
curl -X GET "{SUPABASE_URL}/rest/v1/income_sources?budget_id=eq.{budget_id}&is_active=eq.true&order=next_expected_date.asc" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}"
```

#### GET /income_sources?id=eq.{income_source_id}
Get specific income source

#### POST /income_sources
Create new income source

**Example**:
```bash
curl -X POST "{SUPABASE_URL}/rest/v1/income_sources" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "{budget_id}",
    "category_id": "{category_id}",
    "name": "Salary",
    "expected_amount": 5000.00,
    "frequency": "monthly",
    "next_expected_date": "2025-02-01"
  }'
```

#### PATCH /income_sources?id=eq.{income_source_id}
Update income source

#### DELETE /income_sources?id=eq.{income_source_id}
Delete income source

### 5. Payees

**Table**: `payees`

#### GET /payees
List all payees

**Useful filters**:
- `budget_id=eq.{budget_id}` - Filter by budget
- `is_active=eq.true` - Active payees only
- `payee_type=eq.regular` - Regular payees only
- `payee_type=eq.debt` - Debt payees only
- `name=ilike.*{search}*` - Search by name

**Example**:
```bash
curl -X GET "{SUPABASE_URL}/rest/v1/payees?budget_id=eq.{budget_id}&is_active=eq.true&order=name.asc" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}"
```

#### GET /payees?id=eq.{payee_id}
Get specific payee

#### POST /payees
Create new payee

**Example (Regular Payee)**:
```bash
curl -X POST "{SUPABASE_URL}/rest/v1/payees" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "{budget_id}",
    "name": "Grocery Store",
    "description": "Local supermarket",
    "category_id": "{category_id}",
    "payee_type": "regular"
  }'
```

**Example (Debt Payee)**:
```bash
curl -X POST "{SUPABASE_URL}/rest/v1/payees" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "{budget_id}",
    "name": "Credit Card",
    "description": "Main credit card",
    "payee_type": "debt",
    "interest_rate": 18.99,
    "minimum_payment": 25.00,
    "due_date": 15
  }'
```

#### PATCH /payees?id=eq.{payee_id}
Update payee

#### DELETE /payees?id=eq.{payee_id}
Delete payee

### 6. Envelopes

**Table**: `envelopes`

#### GET /envelopes
List all envelopes

**Useful filters**:
- `budget_id=eq.{budget_id}` - Filter by budget
- `is_active=eq.true` - Active envelopes only
- `envelope_type=eq.regular` - Regular envelopes
- `envelope_type=eq.savings` - Savings envelopes
- `envelope_type=eq.debt` - Debt envelopes
- `current_balance=lt.0` - Negative balance envelopes
- `current_balance=gt.0` - Positive balance envelopes

**Example**:
```bash
curl -X GET "{SUPABASE_URL}/rest/v1/envelopes?budget_id=eq.{budget_id}&is_active=eq.true&order=display_order.asc" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}"
```

#### GET /envelopes?id=eq.{envelope_id}
Get specific envelope

#### POST /envelopes
Create new envelope

**Example (Regular Envelope)**:
```bash
curl -X POST "{SUPABASE_URL}/rest/v1/envelopes" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "{budget_id}",
    "category_id": "{category_id}",
    "name": "Groceries",
    "description": "Monthly grocery budget",
    "envelope_type": "regular",
    "target_amount": 500.00,
    "fill_type": "fixed_amount",
    "fill_amount": 500.00
  }'
```

**Example (Debt Envelope)**:
```bash
curl -X POST "{SUPABASE_URL}/rest/v1/envelopes" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "{budget_id}",
    "name": "Credit Card Debt",
    "envelope_type": "debt",
    "target_amount": 5000.00,
    "current_balance": -5000.00
  }'
```

#### PATCH /envelopes?id=eq.{envelope_id}
Update envelope

#### DELETE /envelopes?id=eq.{envelope_id}
Delete envelope (only if current_balance is 0)

### 7. Transactions

**Table**: `transactions`

#### GET /transactions
List all transactions

**Useful filters**:
- `budget_id=eq.{budget_id}` - Filter by budget
- `is_deleted=eq.false` - Non-deleted transactions only
- `transaction_type=eq.income` - Income transactions
- `transaction_type=eq.expense` - Expense transactions
- `transaction_type=eq.transfer` - Transfer transactions
- `transaction_type=eq.allocation` - Allocation transactions
- `transaction_type=eq.debt_payment` - Debt payment transactions
- `from_envelope_id=eq.{envelope_id}` - From specific envelope
- `to_envelope_id=eq.{envelope_id}` - To specific envelope
- `payee_id=eq.{payee_id}` - To specific payee
- `income_source_id=eq.{income_source_id}` - From specific income source
- `transaction_date=gte.{date}` - From specific date
- `transaction_date=lte.{date}` - Until specific date
- `is_cleared=eq.false` - Uncleared transactions
- `is_reconciled=eq.false` - Unreconciled transactions

**Example**:
```bash
curl -X GET "{SUPABASE_URL}/rest/v1/transactions?budget_id=eq.{budget_id}&is_deleted=eq.false&order=transaction_date.desc&limit=50" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}"
```

#### GET /transactions?id=eq.{transaction_id}
Get specific transaction

**Example with relationships**:
```bash
curl -X GET "{SUPABASE_URL}/rest/v1/transactions?id=eq.{transaction_id}&select=*,from_envelope:envelopes!from_envelope_id(*),to_envelope:envelopes!to_envelope_id(*),payee:payees(*),income_source:income_sources(*)" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}"
```

#### POST /transactions
Create new transaction

**Note**: Direct PostgREST transaction creation bypasses business logic validation. For production use, prefer the Edge Function endpoints that include proper validation and balance updates.

**Example (Income Transaction)**:
```bash
curl -X POST "{SUPABASE_URL}/rest/v1/transactions" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "{budget_id}",
    "transaction_type": "income",
    "amount": 3000.00,
    "description": "Salary payment",
    "transaction_date": "2025-01-30",
    "income_source_id": "{income_source_id}",
    "category_id": "{category_id}"
  }'
```

#### PATCH /transactions?id=eq.{transaction_id}
Update transaction

#### DELETE /transactions?id=eq.{transaction_id}
Hard delete transaction (use soft delete via PATCH with is_deleted=true instead)

### 8. Transaction Events (Audit Log)

**Table**: `transaction_events`

#### GET /transaction_events
List transaction events (audit log)

**Useful filters**:
- `transaction_id=eq.{transaction_id}` - Events for specific transaction
- `event_type=eq.created` - Creation events
- `event_type=eq.updated` - Update events
- `event_type=eq.deleted` - Deletion events
- `event_type=eq.restored` - Restore events
- `user_id=eq.{user_id}` - Events by specific user
- `event_timestamp=gte.{timestamp}` - Events from specific time

**Example**:
```bash
curl -X GET "{SUPABASE_URL}/rest/v1/transaction_events?transaction_id=eq.{transaction_id}&order=event_timestamp.desc" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}"
```

## Advanced Query Examples

### 1. Get Budget with All Related Data
```bash
curl -X GET "{SUPABASE_URL}/rest/v1/budgets?id=eq.{budget_id}&select=*,categories(*),envelopes(*),income_sources(*),payees(*)" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}"
```

### 2. Get Category Hierarchy
```bash
curl -X GET "{SUPABASE_URL}/rest/v1/categories?budget_id=eq.{budget_id}&select=*,children:categories(*)" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}"
```

### 3. Get Envelope Transactions
```bash
curl -X GET "{SUPABASE_URL}/rest/v1/transactions?or=(from_envelope_id.eq.{envelope_id},to_envelope_id.eq.{envelope_id})&is_deleted=eq.false&order=transaction_date.desc" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}"
```

### 4. Get Recent Transactions with Full Details
```bash
curl -X GET "{SUPABASE_URL}/rest/v1/transactions?budget_id=eq.{budget_id}&is_deleted=eq.false&transaction_date=gte.2025-01-01&select=*,from_envelope:envelopes!from_envelope_id(name),to_envelope:envelopes!to_envelope_id(name),payee:payees(name),income_source:income_sources(name),category:categories(name)&order=transaction_date.desc&limit=20" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}"
```

### 5. Get Negative Balance Envelopes
```bash
curl -X GET "{SUPABASE_URL}/rest/v1/envelopes?budget_id=eq.{budget_id}&current_balance=lt.0&is_active=eq.true&select=*,category:categories(name)" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}"
```

### 6. Search Payees
```bash
curl -X GET "{SUPABASE_URL}/rest/v1/payees?budget_id=eq.{budget_id}&name=ilike.*grocery*&is_active=eq.true" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "apikey: {SUPABASE_ANON_KEY}"
```

## Performance Considerations

### Indexes Available
All tables have optimized indexes for common query patterns:

- **budgets**: `user_id`, `user_id + is_active`
- **categories**: `budget_id`, `parent_id`, `budget_id + is_income`
- **income_sources**: `budget_id`, `category_id`, `next_expected_date`
- **payees**: `budget_id`, `category_id`, `budget_id + name`
- **envelopes**: `budget_id`, `category_id`, `budget_id + is_active`, negative balance
- **transactions**: `budget_id`, `transaction_date`, envelope IDs, `payee_id`, `income_source_id`, uncleared

### Query Optimization Tips

1. **Always filter by budget_id** when possible to leverage RLS and indexes
2. **Use is_deleted=eq.false** for transactions to use partial indexes
3. **Use is_active=eq.true** for envelopes, payees, and income sources when appropriate
4. **Limit result sets** with `limit` parameter for large datasets
5. **Use select parameter** to only fetch needed columns
6. **Combine filters** to leverage compound indexes

## Error Handling

### Common HTTP Status Codes
- **200**: Success
- **201**: Created (POST)
- **204**: No Content (successful DELETE/PATCH with no response body)
- **400**: Bad Request (invalid query parameters)
- **401**: Unauthorized (invalid/expired JWT)
- **403**: Forbidden (RLS policy violation)
- **404**: Not Found
- **406**: Not Acceptable (unsupported Accept header)
- **409**: Conflict (constraint violation)
- **416**: Range Not Satisfiable (invalid Range header)

### RLS Policy Violations
If you receive a 403 Forbidden error, check:
1. JWT token is valid and not expired
2. User has access to the requested budget
3. Request complies with entity ownership rules

## Security Notes

1. **Row Level Security**: All tables have RLS enabled, ensuring users can only access their own data
2. **JWT Required**: All requests must include a valid JWT token
3. **Budget Isolation**: All entities are isolated by budget ownership
4. **Soft Deletes**: Use `is_deleted=false` filters to exclude soft-deleted records
5. **Audit Trail**: All transaction changes are logged in `transaction_events`

## Limitations

### PostgREST vs Edge Functions

PostgREST is ideal for:
- Simple CRUD operations
- Filtering and querying data
- Bulk operations
- Direct data access with proper RLS

Use Edge Functions instead for:
- Complex transaction creation with validation
- Business logic enforcement
- Multi-table operations
- Balance calculations and updates
- Complex aggregations and reporting