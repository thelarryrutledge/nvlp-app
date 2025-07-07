# Income Sources API (PostgREST)

Direct PostgREST API endpoints for income sources management in the NVLP envelope budgeting system.

## Authentication

All endpoints require:
- `Authorization: Bearer <JWT_TOKEN>`
- `apikey: <SUPABASE_ANON_KEY>`

For POST operations that need to return the created record:
- `Prefer: return=representation`

## Base URL
```
https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/income_sources
```

## Table Schema

```sql
income_sources {
  id: UUID (Primary Key, auto-generated)
  budget_id: UUID (Foreign Key to budgets.id, CASCADE DELETE)
  name: TEXT (Required, unique per budget)
  description: TEXT (Optional)
  is_active: BOOLEAN (Default: true)
  expected_monthly_amount: DECIMAL(12,2) (Optional, must be positive)
  should_notify: BOOLEAN (Default: false)
  frequency: income_frequency (Default: 'monthly')
  custom_day: INTEGER (1-31, required if frequency='custom')
  next_expected_date: DATE (Auto-calculated)
  created_at: TIMESTAMPTZ (Auto-generated)
  updated_at: TIMESTAMPTZ (Auto-updated)
}
```

### Income Frequency Options
- `weekly` - Every week
- `bi_weekly` - Every other week  
- `twice_monthly` - 15th and end of month
- `monthly` - Every month (default)
- `annually` - Every year
- `custom` - Custom day of month (requires custom_day)
- `one_time` - Non-recurring

## CRUD Operations

### 1. GET - List Income Sources

**Get all income sources for user's budgets:**
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/income_sources?select=*"
```

**Get income sources for specific budget:**
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/income_sources?budget_id=eq.$BUDGET_ID&select=*"
```

**Get active income sources only:**
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/income_sources?is_active=eq.true&select=*"
```

**Response (200):**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "budget_id": "456e7890-e89b-12d3-a456-426614174001", 
    "name": "Salary",
    "description": "Primary salary income",
    "is_active": true,
    "expected_monthly_amount": "5000.00",
    "should_notify": true,
    "frequency": "bi_weekly",
    "custom_day": null,
    "next_expected_date": "2025-07-21",
    "created_at": "2025-07-07T10:00:00Z",
    "updated_at": "2025-07-07T10:00:00Z"
  }
]
```

### 2. GET - Single Income Source

```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/income_sources?id=eq.$INCOME_SOURCE_ID&select=*"
```

### 3. POST - Create Income Source

**Required fields:** `budget_id`, `name`

```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     "$BASE_URL/income_sources" \
     -d '{
       "budget_id": "456e7890-e89b-12d3-a456-426614174001",
       "name": "Freelance Work",
       "description": "Contract development work",
       "expected_monthly_amount": 2500.00,
       "should_notify": true,
       "frequency": "monthly"
     }'
```

**Response (201):**
```json
{
  "id": "789e0123-e89b-12d3-a456-426614174002",
  "budget_id": "456e7890-e89b-12d3-a456-426614174001",
  "name": "Freelance Work", 
  "description": "Contract development work",
  "is_active": true,
  "expected_monthly_amount": "2500.00",
  "should_notify": true,
  "frequency": "monthly",
  "custom_day": null,
  "next_expected_date": "2025-08-07",
  "created_at": "2025-07-07T10:05:00Z",
  "updated_at": "2025-07-07T10:05:00Z"
}
```

**Custom Frequency Example:**
```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/income_sources" \
     -d '{
       "budget_id": "456e7890-e89b-12d3-a456-426614174001",
       "name": "Pension Payment",
       "frequency": "custom",
       "custom_day": 15,
       "expected_monthly_amount": 1200.00
     }'
```

### 4. PATCH - Update Income Source

```bash
curl -X PATCH \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/income_sources?id=eq.$INCOME_SOURCE_ID" \
     -d '{
       "expected_monthly_amount": 3000.00,
       "should_notify": false,
       "description": "Updated contract rate"
     }'
```

**Response (204):** No content

**Frequency Update Example:**
```bash
curl -X PATCH \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/income_sources?id=eq.$INCOME_SOURCE_ID" \
     -d '{
       "frequency": "bi_weekly"
     }'
```
Note: `next_expected_date` is automatically recalculated when frequency changes.

### 5. DELETE - Remove Income Source

```bash
curl -X DELETE \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/income_sources?id=eq.$INCOME_SOURCE_ID"
```

**Response (204):** No content

## Data Validation

### Automatic Constraints

- **Name uniqueness:** Each income source name must be unique within a budget
- **Positive amounts:** `expected_monthly_amount` must be positive if specified  
- **Custom day validation:** `custom_day` required for 'custom' frequency (1-31)
- **Budget ownership:** Users can only access income sources in their own budgets (RLS)
- **Date calculation:** `next_expected_date` automatically calculated based on frequency

### Default Income Sources

When a budget is created, two default income sources are automatically added:
1. **"Salary"** - Primary salary income
2. **"Other Income"** - Miscellaneous income sources

## Filtering & Querying

### Common Filters

**Active income sources:**
```
?is_active=eq.true
```

**Income sources with notifications:**
```
?should_notify=eq.true
```

**By frequency:**
```
?frequency=eq.monthly
```

**Expected this month:**
```
?next_expected_date=gte.2025-07-01&next_expected_date=lt.2025-08-01
```

**Order by expected amount:**
```
?order=expected_monthly_amount.desc
```

### Select Specific Fields

```
?select=id,name,expected_monthly_amount,next_expected_date
```

### Join with Budget Information

```
?select=*,budget:budget_id(name,currency_code)
```

## Error Responses

### 400 Bad Request
```json
{
  "code": "PGRST203",
  "details": "Failing row contains...",
  "hint": null,
  "message": "new row for relation \"income_sources\" violates check constraint \"income_sources_name_not_empty\""
}
```

### 409 Conflict (Unique Constraint)
```json
{
  "code": "23505", 
  "details": "Key (budget_id, name)=(456e7890..., Salary) already exists.",
  "hint": null,
  "message": "duplicate key value violates unique constraint \"income_sources_unique_name_per_budget\""
}
```

### 403 Forbidden (RLS Violation)
Returns empty array `[]` for unauthorized access attempts.

## Usage Examples

### Create Monthly Salary Income
```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/income_sources" \
     -d '{
       "budget_id": "'$BUDGET_ID'",
       "name": "Software Engineer Salary",
       "description": "Full-time salary",
       "expected_monthly_amount": 6500.00,
       "frequency": "monthly",
       "should_notify": true
     }'
```

### Create Bi-Weekly Paycheck  
```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/income_sources" \
     -d '{
       "budget_id": "'$BUDGET_ID'",
       "name": "Hourly Wages",
       "expected_monthly_amount": 3200.00,
       "frequency": "bi_weekly",
       "should_notify": true
     }'
```

### Create Custom Day Income (15th of month)
```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/income_sources" \
     -d '{
       "budget_id": "'$BUDGET_ID'",
       "name": "Investment Dividends",
       "frequency": "custom",
       "custom_day": 15,
       "expected_monthly_amount": 450.00
     }'
```

### Deactivate Income Source
```bash
curl -X PATCH \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/income_sources?id=eq.$INCOME_SOURCE_ID" \
     -d '{"is_active": false}'
```

## Security Notes

- All operations are protected by Row Level Security (RLS)
- Users can only access income sources in budgets they own
- Budget ownership is verified through the budgets table relationship
- Unauthorized access returns empty results rather than error messages
- Input validation prevents SQL injection and constraint violations

## Performance Considerations

- Indexes exist on budget_id, is_active, and notification fields
- Use specific budget_id filters when possible for optimal performance
- The next_expected_date calculation happens automatically via database triggers
- Consider pagination for large result sets using `limit` and `offset`