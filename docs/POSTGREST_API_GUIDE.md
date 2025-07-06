# PostgREST API Guide

## Overview
This guide documents the direct PostgREST API patterns for NVLP. These endpoints provide fast, reliable access to data without Edge Function cold starts.

## Authentication
All PostgREST requests require two headers:
- `Authorization: Bearer {jwt_token}` - User JWT from Supabase Auth
- `apikey: {anon_key}` - Supabase anonymous key

## Base Configuration
```typescript
const SUPABASE_URL = 'https://qnpatlosomopoimtsmsr.supabase.co'
const SUPABASE_ANON_KEY = 'your-anon-key'
const BASE_URL = `${SUPABASE_URL}/rest/v1`

const headers = {
  'Authorization': `Bearer ${jwt_token}`,
  'apikey': SUPABASE_ANON_KEY,
  'Content-Type': 'application/json'
}
```

## User Profiles API

### GET Profile
```http
GET /rest/v1/user_profiles?select=*
```

**Response:**
```json
{
  "id": "user-uuid",
  "display_name": "User Name",
  "timezone": "America/New_York",
  "currency_code": "USD",
  "date_format": "MM/DD/YYYY",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### PATCH Profile
```http
PATCH /rest/v1/user_profiles?id=eq.{user_id}
Content-Type: application/json

{
  "display_name": "Updated Name",
  "timezone": "America/Los_Angeles"
}
```

**Validation:**
- `display_name`: 2-100 characters
- `timezone`: Valid timezone identifier
- `currency_code`: Valid 3-letter currency code
- `date_format`: One of: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD

## Budgets API

### GET All Budgets
```http
GET /rest/v1/budgets?select=*&order=created_at.desc
```

**Response:**
```json
[
  {
    "id": "budget-uuid",
    "user_id": "user-uuid",
    "name": "My Budget",
    "description": "Budget description",
    "is_active": true,
    "is_default": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
]
```

### GET Specific Budget
```http
GET /rest/v1/budgets?id=eq.{budget_id}&select=*
```

### POST Create Budget
```http
POST /rest/v1/budgets
Content-Type: application/json

{
  "name": "New Budget",
  "description": "Optional description",
  "is_active": true
}
```

**Validation:**
- `name`: Required, 1-100 characters, unique per user
- `description`: Optional, max 500 characters
- `is_active`: Boolean, defaults to true

### PATCH Update Budget
```http
PATCH /rest/v1/budgets?id=eq.{budget_id}
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### DELETE Budget
```http
DELETE /rest/v1/budgets?id=eq.{budget_id}
```

**Constraints:**
- Cannot delete default budget
- Will cascade delete all related records

## Income Sources API

### GET All Income Sources
```http
GET /rest/v1/income_sources?select=*&order=created_at.desc
```

### GET Income Sources by Budget
```http
GET /rest/v1/income_sources?budget_id=eq.{budget_id}&select=*
```

### POST Create Income Source
```http
POST /rest/v1/income_sources
Content-Type: application/json

{
  "budget_id": "budget-uuid",
  "name": "Salary",
  "description": "Monthly salary",
  "expected_monthly_amount": 5000.00,
  "is_active": true
}
```

**Validation:**
- `budget_id`: Required, must be user's budget
- `name`: Required, 1-100 characters, unique per budget
- `description`: Optional, max 500 characters
- `expected_monthly_amount`: Optional, >= 0
- `is_active`: Boolean, defaults to true

### PATCH Update Income Source
```http
PATCH /rest/v1/income_sources?id=eq.{income_source_id}
Content-Type: application/json

{
  "name": "Updated Name",
  "expected_monthly_amount": 5500.00
}
```

### DELETE Income Source
```http
DELETE /rest/v1/income_sources?id=eq.{income_source_id}
```

## Categories API

### GET All Categories
```http
GET /rest/v1/categories?select=*&order=created_at.desc
```

### GET Categories by Budget
```http
GET /rest/v1/categories?budget_id=eq.{budget_id}&select=*
```

### POST Create Category
```http
POST /rest/v1/categories
Content-Type: application/json

{
  "budget_id": "budget-uuid",
  "name": "Groceries",
  "description": "Food shopping",
  "category_type": "expense",
  "is_active": true
}
```

**Validation:**
- `budget_id`: Required, must be user's budget
- `name`: Required, 1-100 characters, unique per budget
- `description`: Optional, max 500 characters
- `category_type`: Required, one of: expense, income
- `is_active`: Boolean, defaults to true

## Envelopes API

### GET All Envelopes
```http
GET /rest/v1/envelopes?select=*&order=created_at.desc
```

### GET Envelopes by Budget
```http
GET /rest/v1/envelopes?budget_id=eq.{budget_id}&select=*
```

### POST Create Envelope
```http
POST /rest/v1/envelopes
Content-Type: application/json

{
  "budget_id": "budget-uuid",
  "name": "Emergency Fund",
  "description": "Emergency savings",
  "target_amount": 1000.00,
  "current_amount": 0.00,
  "should_notify": true,
  "notify_amount": 900.00,
  "is_active": true
}
```

**Validation:**
- `budget_id`: Required, must be user's budget
- `name`: Required, 1-100 characters, unique per budget
- `description`: Optional, max 500 characters
- `target_amount`: Optional, >= 0
- `current_amount`: Defaults to 0.00, >= 0
- `should_notify`: Boolean, defaults to false
- `notify_amount`: Optional, >= 0
- `notify_date`: Optional, future date
- `is_active`: Boolean, defaults to true

## Payees API

### GET All Payees
```http
GET /rest/v1/payees?select=*&order=created_at.desc
```

### GET Payees by Budget
```http
GET /rest/v1/payees?budget_id=eq.{budget_id}&select=*
```

### POST Create Payee
```http
POST /rest/v1/payees
Content-Type: application/json

{
  "budget_id": "budget-uuid",
  "name": "Grocery Store",
  "description": "Local grocery store",
  "payee_type": "business",
  "is_active": true
}
```

**Validation:**
- `budget_id`: Required, must be user's budget
- `name`: Required, 1-100 characters, unique per budget
- `description`: Optional, max 500 characters
- `payee_type`: Required, one of: business, person, organization, utility, service, other
- `is_active`: Boolean, defaults to true

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "code": "PGRST102",
  "message": "constraint violation",
  "details": "duplicate key value violates unique constraint"
}
```

#### 401 Unauthorized
```json
{
  "code": "PGRST301",
  "message": "JWT expired"
}
```

#### 403 Forbidden
```json
{
  "code": "PGRST106",
  "message": "The result contains 0 rows"
}
```

#### 404 Not Found
```json
{
  "code": "PGRST116",
  "message": "The result contains 0 rows"
}
```

## Performance Tips

### Filtering
```http
GET /rest/v1/budgets?is_active=eq.true&select=id,name
```

### Ordering
```http
GET /rest/v1/income_sources?order=created_at.desc,name.asc
```

### Limiting
```http
GET /rest/v1/transactions?limit=50&offset=0
```

### Selecting Specific Fields
```http
GET /rest/v1/budgets?select=id,name,is_default
```

## Security Notes

1. **Row Level Security (RLS)**: All tables have RLS policies enforcing user data isolation
2. **API Key Required**: The `apikey` header is required for all requests
3. **JWT Validation**: The JWT token is validated on every request
4. **Budget Scoping**: Most resources are scoped to specific budgets owned by the user
5. **Constraint Validation**: Database constraints prevent invalid data