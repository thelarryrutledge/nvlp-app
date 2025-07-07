# Categories API (PostgREST)

Direct PostgREST API endpoints for categories management in the NVLP envelope budgeting system.

## Authentication

All endpoints require:
- `Authorization: Bearer <JWT_TOKEN>`
- `apikey: <SUPABASE_ANON_KEY>`

For POST operations that need to return the created record:
- `Prefer: return=representation`

## Base URL
```
https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/categories
```

## Table Schema

```sql
categories {
  id: UUID (Primary Key, auto-generated)
  budget_id: UUID (Foreign Key to budgets.id, CASCADE DELETE)
  name: TEXT (Required, unique per budget, max 300 chars)
  description: TEXT (Optional, max 300 chars)
  color: TEXT (Optional, hex format #RRGGBB)
  icon: TEXT (Optional, icon identifier)
  is_active: BOOLEAN (Default: true)
  sort_order: INTEGER (Default: 0, must be >= 0)
  category_type: TEXT (Default: 'expense', options: 'income'|'expense'|'transfer')
  created_at: TIMESTAMPTZ (Auto-generated)
  updated_at: TIMESTAMPTZ (Auto-updated)
}
```

### Category Types
- `expense` - For expense transactions (default)
- `income` - For income transactions
- `transfer` - For transfer transactions between envelopes

### Default Categories

When a budget is created, 10 default categories are automatically added:

**Expense Categories (8):**
1. Groceries (#4CAF50)
2. Transportation (#2196F3)
3. Utilities (#FF9800)
4. Entertainment (#9C27B0)
5. Healthcare (#F44336)
6. Housing (#795548)
7. Personal Care (#E91E63)
8. Other Expenses (#607D8B)

**Income Categories (2):**
1. Salary Income (#8BC34A)
2. Other Income (#CDDC39)

## CRUD Operations

### 1. GET - List Categories

**Get all categories for user's budgets:**
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/categories?select=*"
```

**Get categories for specific budget:**
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/categories?budget_id=eq.$BUDGET_ID&select=*"
```

**Get categories by type:**
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/categories?category_type=eq.expense&select=*"
```

**Get active categories only:**
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/categories?is_active=eq.true&select=*"
```

**Response (200):**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "budget_id": "456e7890-e89b-12d3-a456-426614174001",
    "name": "Groceries",
    "description": "Food and grocery expenses",
    "color": "#4CAF50",
    "icon": "grocery",
    "is_active": true,
    "sort_order": 0,
    "category_type": "expense",
    "created_at": "2025-07-07T10:00:00Z",
    "updated_at": "2025-07-07T10:00:00Z"
  }
]
```

### 2. GET - Single Category

```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/categories?id=eq.$CATEGORY_ID&select=*"
```

### 3. POST - Create Category

**Required fields:** `budget_id`, `name`

```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     "$BASE_URL/categories" \
     -d '{
       "budget_id": "456e7890-e89b-12d3-a456-426614174001",
       "name": "Home Office",
       "description": "Office supplies and equipment",
       "color": "#795548",
       "icon": "office",
       "category_type": "expense",
       "sort_order": 10
     }'
```

**Response (201):**
```json
[{
  "id": "789e0123-e89b-12d3-a456-426614174002",
  "budget_id": "456e7890-e89b-12d3-a456-426614174001",
  "name": "Home Office",
  "description": "Office supplies and equipment", 
  "color": "#795548",
  "icon": "office",
  "is_active": true,
  "sort_order": 10,
  "category_type": "expense",
  "created_at": "2025-07-07T10:05:00Z",
  "updated_at": "2025-07-07T10:05:00Z"
}]
```

**Income Category Example:**
```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     "$BASE_URL/categories" \
     -d '{
       "budget_id": "456e7890-e89b-12d3-a456-426614174001",
       "name": "Freelance Income",
       "description": "Income from freelance work",
       "color": "#8BC34A",
       "category_type": "income"
     }'
```

### 4. PATCH - Update Category

```bash
curl -X PATCH \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/categories?id=eq.$CATEGORY_ID" \
     -d '{
       "description": "Updated description",
       "color": "#FF5722",
       "sort_order": 5
     }'
```

**Response (204):** No content

**Deactivate Category:**
```bash
curl -X PATCH \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/categories?id=eq.$CATEGORY_ID" \
     -d '{"is_active": false}'
```

### 5. DELETE - Remove Category

**Note:** Categories cannot be deleted if they have associated transactions.

```bash
curl -X DELETE \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/categories?id=eq.$CATEGORY_ID"
```

**Response (204):** No content

## Data Validation

### Automatic Constraints

- **Name uniqueness:** Each category name must be unique within a budget
- **Name validation:** Category name cannot be empty after trimming
- **Description length:** Maximum 300 characters
- **Color format:** Must be valid hex format (#RRGGBB) or null
- **Sort order:** Must be >= 0
- **Budget ownership:** Users can only access categories in their own budgets (RLS)
- **Transaction protection:** Categories with transactions cannot be deleted

### Color Validation

Valid color formats:
- `#FF0000` - Red
- `#00FF00` - Green  
- `#0000FF` - Blue
- `#FFFFFF` - White
- `#000000` - Black
- `null` - No color

Invalid formats will return 400 Bad Request.

## Filtering & Querying

### Common Filters

**Active categories:**
```
?is_active=eq.true
```

**By category type:**
```
?category_type=eq.expense
?category_type=eq.income
?category_type=eq.transfer
```

**By budget:**
```
?budget_id=eq.$BUDGET_ID
```

**Custom sort order:**
```
?order=sort_order.asc
?order=category_type.asc,sort_order.asc
```

**Search by name:**
```
?name=ilike.*office*
```

### Select Specific Fields

```
?select=id,name,color,category_type
```

### Join with Budget Information

```
?select=*,budget:budget_id(name,currency_code)
```

### Pagination

```
?limit=10&offset=0
```

## Error Responses

### 400 Bad Request - Validation Error
```json
{
  "code": "PGRST203",
  "details": "Failing row contains...",
  "hint": null,
  "message": "new row for relation \"categories\" violates check constraint \"categories_name_not_empty\""
}
```

### 409 Conflict - Unique Constraint
```json
{
  "code": "23505",
  "details": "Key (budget_id, name)=(456e7890..., Groceries) already exists.",
  "hint": null,
  "message": "duplicate key value violates unique constraint \"categories_unique_name_per_budget\""
}
```

### 409 Conflict - Cannot Delete (Has Transactions)
```json
{
  "code": "23503",
  "details": "Key (id)=(123e4567...) is still referenced from table \"transactions\".",
  "hint": null,
  "message": "update or delete on table \"categories\" violates foreign key constraint"
}
```

### 403 Forbidden (RLS Violation)
Returns empty array `[]` for unauthorized access attempts.

## Usage Examples

### Create Expense Category with Custom Color
```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     "$BASE_URL/categories" \
     -d '{
       "budget_id": "'$BUDGET_ID'",
       "name": "Pet Expenses",
       "description": "Food, vet bills, and pet supplies",
       "color": "#FF9800",
       "icon": "pet",
       "category_type": "expense",
       "sort_order": 15
     }'
```

### Create Income Category
```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     "$BASE_URL/categories" \
     -d '{
       "budget_id": "'$BUDGET_ID'",
       "name": "Investment Returns",
       "description": "Dividends and capital gains",
       "color": "#4CAF50",
       "category_type": "income"
     }'
```

### Get Categories Sorted by Type and Order
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/categories?budget_id=eq.$BUDGET_ID&order=category_type.asc,sort_order.asc&select=*"
```

### Get Only Expense Categories
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/categories?budget_id=eq.$BUDGET_ID&category_type=eq.expense&is_active=eq.true&select=id,name,color,icon"
```

### Update Category Color and Sort Order
```bash
curl -X PATCH \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/categories?id=eq.$CATEGORY_ID" \
     -d '{
       "color": "#E91E63",
       "sort_order": 3,
       "description": "Updated category description"
     }'
```

### Search Categories by Name
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/categories?budget_id=eq.$BUDGET_ID&name=ilike.*food*&select=*"
```

## Security Notes

- All operations are protected by Row Level Security (RLS)
- Users can only access categories in budgets they own
- Budget ownership is verified through the budgets table relationship
- Unauthorized access returns empty results rather than error messages
- Input validation prevents SQL injection and constraint violations
- Categories with existing transactions cannot be deleted (referential integrity)

## Performance Considerations

- Indexes exist on budget_id, is_active, category_type, and sort_order
- Use specific budget_id filters when possible for optimal performance
- Consider pagination for large result sets using `limit` and `offset`
- The sort_order field enables efficient custom sorting without complex queries
- RLS policies are optimized with proper indexing on budget ownership

## Integration Notes

- Categories are automatically created when new budgets are established
- Default categories provide immediate usability for new users
- Category types (income/expense/transfer) align with transaction types
- Color and icon fields support rich UI experiences
- Sort order enables custom category arrangement per user preference
- Categories integrate with the transaction system for complete budget tracking