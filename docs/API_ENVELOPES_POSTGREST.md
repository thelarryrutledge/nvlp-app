# Envelopes API (PostgREST)

Direct PostgREST API endpoints for envelopes management in the NVLP envelope budgeting system.

## Authentication

All endpoints require:
- `Authorization: Bearer <JWT_TOKEN>`
- `apikey: <SUPABASE_ANON_KEY>`

For POST operations that need to return the created record:
- `Prefer: return=representation`

## Base URL
```
https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/envelopes
```

## Table Schema

```sql
envelopes {
  id: UUID (Primary Key, auto-generated)
  budget_id: UUID (Foreign Key to budgets.id, CASCADE DELETE)
  name: TEXT (Required, unique per budget, max 300 chars)
  description: TEXT (Optional, max 300 chars)
  color: TEXT (Optional, hex format #RRGGBB)
  icon: TEXT (Optional, icon identifier)
  is_active: BOOLEAN (Default: true)
  sort_order: INTEGER (Default: 0, must be >= 0)
  current_balance: DECIMAL(12,2) (Default: 0, range: -99999.99 to 999999.99)
  target_amount: DECIMAL(12,2) (Optional, must be >= 0)
  should_notify: BOOLEAN (Default: false)
  notify_date: DATE (Optional, requires should_notify=true)
  notify_amount: DECIMAL(12,2) (Optional, must be >= 0, requires should_notify=true)
  created_at: TIMESTAMPTZ (Auto-generated)
  updated_at: TIMESTAMPTZ (Auto-updated)
}
```

### Envelope Balance Management

- **Current Balance**: Automatically updated by transaction triggers
- **Target Amount**: Optional goal for the envelope
- **Balance Range**: -$99,999.99 to $999,999.99 (negative allowed based on user preferences)

### Notification Features

Envelopes support two types of notifications:
- **Date Notifications**: Alert when a specific date is reached
- **Amount Notifications**: Alert when balance reaches a target amount

**Notification Rules:**
- If `should_notify=true`, at least one of `notify_date` or `notify_amount` must be set
- Both notification types can be active simultaneously

### Default Envelopes

When a budget is created, 8 default envelopes are automatically added:
1. **Emergency Fund** ($1,000 target)
2. **Groceries** ($400 target)
3. **Transportation** ($200 target)
4. **Entertainment** ($150 target)
5. **Utilities** ($300 target)
6. **Personal Care** ($100 target)
7. **Savings Goals** ($500 target)
8. **Miscellaneous** ($200 target)

## CRUD Operations

### 1. GET - List Envelopes

**Get all envelopes for user's budgets:**
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/envelopes?select=*"
```

**Get envelopes for specific budget:**
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/envelopes?budget_id=eq.$BUDGET_ID&select=*"
```

**Get active envelopes only:**
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/envelopes?is_active=eq.true&select=*"
```

**Get envelopes with balances:**
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/envelopes?current_balance=gt.0&select=*"
```

**Response (200):**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "budget_id": "456e7890-e89b-12d3-a456-426614174001",
    "name": "Emergency Fund",
    "description": "Emergency savings for unexpected expenses",
    "color": "#F44336",
    "icon": "emergency",
    "is_active": true,
    "sort_order": 0,
    "current_balance": "750.00",
    "target_amount": "1000.00",
    "should_notify": true,
    "notify_date": null,
    "notify_amount": "1000.00",
    "created_at": "2025-07-07T10:00:00Z",
    "updated_at": "2025-07-07T10:00:00Z"
  }
]
```

### 2. GET - Single Envelope

```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/envelopes?id=eq.$ENVELOPE_ID&select=*"
```

### 3. POST - Create Envelope

**Required fields:** `budget_id`, `name`

```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     "$BASE_URL/envelopes" \
     -d '{
       "budget_id": "456e7890-e89b-12d3-a456-426614174001",
       "name": "Vacation Fund",
       "description": "Saving for annual vacation",
       "color": "#2196F3",
       "icon": "vacation",
       "target_amount": 2500.00,
       "sort_order": 10
     }'
```

**Response (201):**
```json
[{
  "id": "789e0123-e89b-12d3-a456-426614174002",
  "budget_id": "456e7890-e89b-12d3-a456-426614174001",
  "name": "Vacation Fund",
  "description": "Saving for annual vacation",
  "color": "#2196F3",
  "icon": "vacation",
  "is_active": true,
  "sort_order": 10,
  "current_balance": "0.00",
  "target_amount": "2500.00",
  "should_notify": false,
  "notify_date": null,
  "notify_amount": null,
  "created_at": "2025-07-07T10:05:00Z",
  "updated_at": "2025-07-07T10:05:00Z"
}]
```

**Create Envelope with Date Notification:**
```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     "$BASE_URL/envelopes" \
     -d '{
       "budget_id": "456e7890-e89b-12d3-a456-426614174001",
       "name": "Holiday Gifts",
       "description": "Christmas gift budget",
       "target_amount": 800.00,
       "should_notify": true,
       "notify_date": "2025-12-01"
     }'
```

**Create Envelope with Amount Notification:**
```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     "$BASE_URL/envelopes" \
     -d '{
       "budget_id": "456e7890-e89b-12d3-a456-426614174001",
       "name": "Car Maintenance",
       "target_amount": 500.00,
       "should_notify": true,
       "notify_amount": 400.00
     }'
```

### 4. PATCH - Update Envelope

**Note:** `current_balance` is automatically managed by transaction triggers and should not be updated manually.

```bash
curl -X PATCH \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/envelopes?id=eq.$ENVELOPE_ID" \
     -d '{
       "description": "Updated description",
       "target_amount": 3000.00,
       "color": "#FF5722",
       "sort_order": 5
     }'
```

**Response (204):** No content

**Update Notification Settings:**
```bash
curl -X PATCH \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/envelopes?id=eq.$ENVELOPE_ID" \
     -d '{
       "should_notify": true,
       "notify_amount": 1000.00,
       "notify_date": "2025-12-31"
     }'
```

**Disable Notifications:**
```bash
curl -X PATCH \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/envelopes?id=eq.$ENVELOPE_ID" \
     -d '{
       "should_notify": false,
       "notify_amount": null,
       "notify_date": null
     }'
```

### 5. DELETE - Remove Envelope

**Note:** Envelopes with transaction history cannot be deleted due to referential integrity.

```bash
curl -X DELETE \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/envelopes?id=eq.$ENVELOPE_ID"
```

**Response (204):** No content

## Data Validation

### Automatic Constraints

- **Name uniqueness:** Each envelope name must be unique within a budget
- **Name validation:** Envelope name cannot be empty after trimming
- **Description length:** Maximum 300 characters
- **Color format:** Must be valid hex format (#RRGGBB) or null
- **Sort order:** Must be >= 0
- **Target amount:** Must be >= 0 or null
- **Notify amount:** Must be >= 0 or null
- **Current balance:** Must be between -$99,999.99 and $999,999.99
- **Notification logic:** If `should_notify=true`, at least one of `notify_date` or `notify_amount` must be set
- **Budget ownership:** Users can only access envelopes in their own budgets (RLS)

### Balance Management

**Important:** The `current_balance` field is automatically managed by the system:
- **DO NOT** manually update `current_balance` 
- Balances are updated automatically by transaction triggers
- Manual balance changes can cause data inconsistency

**Balance Updates Occur When:**
- Allocation transactions add money to an envelope
- Expense transactions subtract money from an envelope  
- Transfer transactions move money between envelopes
- Debt payment transactions subtract money from an envelope

## Filtering & Querying

### Common Filters

**Active envelopes:**
```
?is_active=eq.true
```

**Envelopes with balances:**
```
?current_balance=gt.0
```

**Envelopes needing funding:**
```
?current_balance=lt.target_amount
```

**Envelopes with notifications:**
```
?should_notify=eq.true
```

**By budget:**
```
?budget_id=eq.$BUDGET_ID
```

**Custom sort order:**
```
?order=sort_order.asc
```

**Search by name:**
```
?name=ilike.*vacation*
```

### Advanced Queries

**Envelopes approaching target:**
```
?current_balance=gte.target_amount&target_amount=not.is.null
```

**Envelopes with date notifications this month:**
```
?notify_date=gte.2025-07-01&notify_date=lt.2025-08-01
```

**Low balance envelopes:**
```
?current_balance=lt.100&is_active=eq.true
```

### Select Specific Fields

```
?select=id,name,current_balance,target_amount
```

### Join with Budget Information

```
?select=*,budget:budget_id(name,currency_code)
```

### Calculated Fields

**Progress percentage:**
```
?select=*,progress_percent:current_balance.divide(target_amount).multiply(100)
```

## Error Responses

### 400 Bad Request - Validation Error
```json
{
  "code": "PGRST203",
  "details": "Failing row contains...",
  "hint": null,
  "message": "new row for relation \"envelopes\" violates check constraint \"envelopes_notification_logic\""
}
```

### 409 Conflict - Unique Constraint
```json
{
  "code": "23505",
  "details": "Key (budget_id, name)=(456e7890..., Emergency Fund) already exists.",
  "hint": null,
  "message": "duplicate key value violates unique constraint \"envelopes_unique_name_per_budget\""
}
```

### 409 Conflict - Cannot Delete (Has Transactions)
```json
{
  "code": "23503",
  "details": "Key (id)=(123e4567...) is still referenced from table \"transactions\".",
  "hint": null,
  "message": "update or delete on table \"envelopes\" violates foreign key constraint"
}
```

### 403 Forbidden (RLS Violation)
Returns empty array `[]` for unauthorized access attempts.

## Usage Examples

### Create Savings Goal with Target
```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     "$BASE_URL/envelopes" \
     -d '{
       "budget_id": "'$BUDGET_ID'",
       "name": "House Down Payment",
       "description": "Saving for house down payment",
       "color": "#4CAF50",
       "icon": "home",
       "target_amount": 50000.00,
       "should_notify": true,
       "notify_amount": 45000.00
     }'
```

### Create Monthly Expense Envelope
```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     "$BASE_URL/envelopes" \
     -d '{
       "budget_id": "'$BUDGET_ID'",
       "name": "Dining Out",
       "description": "Restaurant and takeout budget",
       "color": "#FF9800",
       "icon": "restaurant",
       "target_amount": 300.00
     }'
```

### Get Envelopes Sorted by Balance (Highest First)
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/envelopes?budget_id=eq.$BUDGET_ID&order=current_balance.desc&select=name,current_balance,target_amount"
```

### Get Envelopes That Need Funding
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/envelopes?budget_id=eq.$BUDGET_ID&current_balance=lt.target_amount&target_amount=not.is.null&select=*"
```

### Update Envelope Target and Add Notification
```bash
curl -X PATCH \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/envelopes?id=eq.$ENVELOPE_ID" \
     -d '{
       "target_amount": 1500.00,
       "should_notify": true,
       "notify_amount": 1400.00,
       "description": "Updated savings goal"
     }'
```

### Get Envelopes with Upcoming Notifications
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/envelopes?should_notify=eq.true&notify_date=gte.$(date +%Y-%m-%d)&select=name,notify_date,notify_amount,current_balance"
```

### Deactivate Envelope
```bash
curl -X PATCH \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/envelopes?id=eq.$ENVELOPE_ID" \
     -d '{"is_active": false}'
```

## Security Notes

- All operations are protected by Row Level Security (RLS)
- Users can only access envelopes in budgets they own
- Budget ownership is verified through the budgets table relationship
- Unauthorized access returns empty results rather than error messages
- Input validation prevents SQL injection and constraint violations
- Envelopes with transaction history cannot be deleted (referential integrity)
- Current balance cannot be manually modified to prevent data corruption

## Performance Considerations

- Indexes exist on budget_id, is_active, sort_order, and notification fields
- Use specific budget_id filters when possible for optimal performance
- Consider pagination for large result sets using `limit` and `offset`
- The sort_order field enables efficient custom sorting without complex queries
- Balance queries are optimized with dedicated indexing
- Notification queries use specialized indexes for date and amount filtering

## Integration Notes

- Envelopes are automatically created when new budgets are established
- Current balances are maintained automatically by transaction triggers
- Envelope balances integrate with the user_state table for budget summaries
- Notification features support rich user experience for goal tracking
- Color and icon fields enable rich UI representation
- Target amounts enable progress tracking and goal-based budgeting
- Sort order enables custom envelope arrangement per user preference

## Balance Calculation Flow

1. **Transaction Created**: System identifies affected envelopes
2. **Trigger Execution**: `update_envelope_balances()` function runs
3. **Balance Update**: Envelope `current_balance` is automatically adjusted
4. **Cache Update**: User state totals are refreshed
5. **Notification Check**: System evaluates if notification thresholds are met

This ensures envelope balances are always accurate and reflect the true state of the user's budget allocation.