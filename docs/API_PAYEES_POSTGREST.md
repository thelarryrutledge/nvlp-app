# Payees API (PostgREST)

Direct PostgREST API endpoints for payees management in the NVLP envelope budgeting system.

## Authentication

All endpoints require:
- `Authorization: Bearer <JWT_TOKEN>`
- `apikey: <SUPABASE_ANON_KEY>`

For POST operations that need to return the created record:
- `Prefer: return=representation`

## Base URL
```
https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/payees
```

## Table Schema

```sql
payees {
  id: UUID (Primary Key, auto-generated)
  budget_id: UUID (Foreign Key to budgets.id, CASCADE DELETE)
  name: TEXT (Required, unique per budget)
  description: TEXT (Optional)
  color: TEXT (Optional, hex format #RRGGBB)
  icon: TEXT (Optional, icon identifier)
  is_active: BOOLEAN (Default: true)
  sort_order: INTEGER (Default: 0, must be >= 0)
  payee_type: TEXT (Default: 'business', options: business|person|organization|utility|service|other)
  address: TEXT (Optional, max 500 chars)
  phone: TEXT (Optional, max 50 chars)
  email: TEXT (Optional, must be valid email format)
  website: TEXT (Optional)
  preferred_payment_method: TEXT (Optional)
  account_number: TEXT (Optional)
  total_paid: DECIMAL(12,2) (Default: 0, auto-calculated)
  last_payment_date: DATE (Auto-updated by transactions)
  last_payment_amount: DECIMAL(12,2) (Auto-updated by transactions)
  created_at: TIMESTAMPTZ (Auto-generated)
  updated_at: TIMESTAMPTZ (Auto-updated)
}
```

### Payee Types

- `business` - Commercial entities, stores, companies (default)
- `person` - Individual people (landlords, contractors, etc.)
- `organization` - Non-profit organizations, clubs, associations
- `utility` - Utility companies (electric, gas, water, etc.)
- `service` - Service providers (internet, phone, healthcare, etc.)
- `other` - Miscellaneous payees that don't fit other categories

### Payment Tracking

- **Total Paid**: Automatically calculated from expense/debt_payment transactions
- **Last Payment**: Date and amount of most recent payment (auto-updated)
- **DO NOT** manually update `total_paid`, `last_payment_date`, or `last_payment_amount`

### Default Payees

When a budget is created, 12 default payees are automatically added:
1. **Grocery Store** (business)
2. **Gas Station** (business)
3. **Electric Company** (utility)
4. **Internet Provider** (service)
5. **Insurance Company** (business)
6. **Bank** (business)
7. **Landlord/Mortgage** (person)
8. **Doctor/Healthcare** (service)
9. **Restaurant** (business)
10. **Online Store** (business)
11. **Cash Withdrawal** (other)
12. **Other Payee** (other)

## CRUD Operations

### 1. GET - List Payees

**Get all payees for user's budgets:**
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/payees?select=*"
```

**Get payees for specific budget:**
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/payees?budget_id=eq.$BUDGET_ID&select=*"
```

**Get payees by type:**
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/payees?payee_type=eq.utility&select=*"
```

**Get active payees only:**
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/payees?is_active=eq.true&select=*"
```

**Response (200):**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "budget_id": "456e7890-e89b-12d3-a456-426614174001",
    "name": "Electric Company",
    "description": "Monthly electricity bill",
    "color": "#FFC107",
    "icon": "electricity",
    "is_active": true,
    "sort_order": 0,
    "payee_type": "utility",
    "address": "123 Power St, Electric City, EC 12345",
    "phone": "(555) 123-4567",
    "email": "billing@electricco.com",
    "website": "https://electricco.com",
    "preferred_payment_method": "bank_transfer",
    "account_number": "ACC-123456789",
    "total_paid": "450.75",
    "last_payment_date": "2025-07-01",
    "last_payment_amount": "125.50",
    "created_at": "2025-07-07T10:00:00Z",
    "updated_at": "2025-07-07T10:00:00Z"
  }
]
```

### 2. GET - Single Payee

```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/payees?id=eq.$PAYEE_ID&select=*"
```

### 3. POST - Create Payee

**Required fields:** `budget_id`, `name`

```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     "$BASE_URL/payees" \
     -d '{
       "budget_id": "456e7890-e89b-12d3-a456-426614174001",
       "name": "Local Coffee Shop",
       "description": "Daily coffee expenses",
       "color": "#8D6E63",
       "icon": "coffee",
       "payee_type": "business",
       "address": "456 Main St, Coffee Town, CT 67890",
       "phone": "(555) 987-6543",
       "website": "https://localcoffee.com",
       "preferred_payment_method": "card"
     }'
```

**Response (201):**
```json
[{
  "id": "789e0123-e89b-12d3-a456-426614174002",
  "budget_id": "456e7890-e89b-12d3-a456-426614174001",
  "name": "Local Coffee Shop",
  "description": "Daily coffee expenses",
  "color": "#8D6E63",
  "icon": "coffee",
  "is_active": true,
  "sort_order": 0,
  "payee_type": "business",
  "address": "456 Main St, Coffee Town, CT 67890",
  "phone": "(555) 987-6543",
  "email": null,
  "website": "https://localcoffee.com",
  "preferred_payment_method": "card",
  "account_number": null,
  "total_paid": "0.00",
  "last_payment_date": null,
  "last_payment_amount": null,
  "created_at": "2025-07-07T10:05:00Z",
  "updated_at": "2025-07-07T10:05:00Z"
}]
```

**Create Utility Payee with Account Number:**
```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     "$BASE_URL/payees" \
     -d '{
       "budget_id": "456e7890-e89b-12d3-a456-426614174001",
       "name": "Water Department",
       "description": "Monthly water and sewer",
       "payee_type": "utility",
       "address": "789 Water Way, Utility City, UC 13579",
       "phone": "(555) 246-8135",
       "email": "billing@waterworks.gov",
       "account_number": "WTR-987654321",
       "preferred_payment_method": "bank_transfer"
     }'
```

**Create Service Provider:**
```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     "$BASE_URL/payees" \
     -d '{
       "budget_id": "456e7890-e89b-12d3-a456-426614174001",
       "name": "Dr. Smith Dental",
       "description": "Family dentist",
       "payee_type": "service",
       "address": "321 Health Plaza, Medical City, MC 24680",
       "phone": "(555) 369-2580",
       "email": "appointments@drsmithdental.com",
       "website": "https://drsmithdental.com"
     }'
```

### 4. PATCH - Update Payee

**Note:** `total_paid`, `last_payment_date`, and `last_payment_amount` are automatically managed by transaction triggers and should not be updated manually.

```bash
curl -X PATCH \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/payees?id=eq.$PAYEE_ID" \
     -d '{
       "description": "Updated description",
       "phone": "(555) 111-2222",
       "email": "newemail@example.com",
       "preferred_payment_method": "check"
     }'
```

**Response (204):** No content

**Update Address and Contact Info:**
```bash
curl -X PATCH \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/payees?id=eq.$PAYEE_ID" \
     -d '{
       "address": "789 New Address St, New City, NC 98765",
       "phone": "(555) 444-5555",
       "website": "https://newwebsite.com"
     }'
```

**Change Payee Type:**
```bash
curl -X PATCH \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/payees?id=eq.$PAYEE_ID" \
     -d '{
       "payee_type": "service",
       "color": "#2196F3"
     }'
```

### 5. DELETE - Remove Payee

**Note:** Payees with transaction history cannot be deleted due to referential integrity.

```bash
curl -X DELETE \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/payees?id=eq.$PAYEE_ID"
```

**Response (204):** No content

## Data Validation

### Automatic Constraints

- **Name uniqueness:** Each payee name must be unique within a budget
- **Name validation:** Payee name cannot be empty after trimming
- **Color format:** Must be valid hex format (#RRGGBB) or null
- **Sort order:** Must be >= 0
- **Email format:** Must be valid email format if provided
- **Address length:** Maximum 500 characters
- **Phone length:** Maximum 50 characters
- **Total paid:** Must be >= 0 (automatically maintained)
- **Last payment consistency:** Both last_payment_date and last_payment_amount must be null or both must have values
- **Budget ownership:** Users can only access payees in their own budgets (RLS)

### Payment Data Management

**Important:** The following fields are automatically managed by the system:
- **DO NOT** manually update `total_paid`
- **DO NOT** manually update `last_payment_date`
- **DO NOT** manually update `last_payment_amount`

**These fields are updated automatically when:**
- Expense transactions are created with this payee
- Debt payment transactions are created with this payee
- Related transactions are modified or deleted

## Filtering & Querying

### Common Filters

**Active payees:**
```
?is_active=eq.true
```

**By payee type:**
```
?payee_type=eq.utility
?payee_type=eq.business
?payee_type=eq.service
```

**Payees with payments:**
```
?total_paid=gt.0
```

**Recent payees:**
```
?last_payment_date=gte.2025-06-01
```

**By budget:**
```
?budget_id=eq.$BUDGET_ID
```

**Custom sort order:**
```
?order=payee_type.asc,sort_order.asc
```

**Search by name:**
```
?name=ilike.*coffee*
```

### Advanced Queries

**Top payees by amount:**
```
?order=total_paid.desc&limit=10
```

**Payees with contact info:**
```
?email=not.is.null&phone=not.is.null
```

**Utilities with account numbers:**
```
?payee_type=eq.utility&account_number=not.is.null
```

**Inactive payees:**
```
?is_active=eq.false
```

### Select Specific Fields

```
?select=id,name,payee_type,total_paid,last_payment_date
```

### Join with Budget Information

```
?select=*,budget:budget_id(name,currency_code)
```

### Calculated Fields

**Payment frequency (requires date range):**
```
?select=*,avg_monthly_payment:total_paid.divide(12)
```

## Error Responses

### 400 Bad Request - Validation Error
```json
{
  "code": "PGRST203",
  "details": "Failing row contains...",
  "hint": null,
  "message": "new row for relation \"payees\" violates check constraint \"payees_email_format\""
}
```

### 409 Conflict - Unique Constraint
```json
{
  "code": "23505",
  "details": "Key (budget_id, name)=(456e7890..., Electric Company) already exists.",
  "hint": null,
  "message": "duplicate key value violates unique constraint \"payees_unique_name_per_budget\""
}
```

### 409 Conflict - Cannot Delete (Has Transactions)
```json
{
  "code": "23503",
  "details": "Key (id)=(123e4567...) is still referenced from table \"transactions\".",
  "hint": null,
  "message": "update or delete on table \"payees\" violates foreign key constraint"
}
```

### 403 Forbidden (RLS Violation)
Returns empty array `[]` for unauthorized access attempts.

## Usage Examples

### Create Business Payee
```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     "$BASE_URL/payees" \
     -d '{
       "budget_id": "'$BUDGET_ID'",
       "name": "Target Store",
       "description": "General merchandise shopping",
       "color": "#E53935",
       "icon": "store",
       "payee_type": "business",
       "website": "https://target.com",
       "preferred_payment_method": "card"
     }'
```

### Create Person Payee (Landlord)
```bash
curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     "$BASE_URL/payees" \
     -d '{
       "budget_id": "'$BUDGET_ID'",
       "name": "John Smith - Landlord",
       "description": "Monthly rent payment",
       "payee_type": "person",
       "phone": "(555) 123-4567",
       "email": "johnsmith@email.com",
       "preferred_payment_method": "check"
     }'
```

### Get Payees by Type with Payment Info
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/payees?budget_id=eq.$BUDGET_ID&payee_type=eq.utility&select=name,total_paid,last_payment_date,account_number"
```

### Get Top 5 Payees by Total Paid
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/payees?budget_id=eq.$BUDGET_ID&order=total_paid.desc&limit=5&select=name,total_paid,last_payment_date"
```

### Update Payee Contact Information
```bash
curl -X PATCH \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/payees?id=eq.$PAYEE_ID" \
     -d '{
       "phone": "(555) 999-8888",
       "email": "updated@email.com",
       "address": "789 Updated St, New City, NC 12345",
       "preferred_payment_method": "bank_transfer"
     }'
```

### Get Payees with Recent Payments
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/payees?budget_id=eq.$BUDGET_ID&last_payment_date=gte.$(date -d '30 days ago' +%Y-%m-%d)&select=name,last_payment_date,last_payment_amount&order=last_payment_date.desc"
```

### Deactivate Payee
```bash
curl -X PATCH \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     "$BASE_URL/payees?id=eq.$PAYEE_ID" \
     -d '{"is_active": false}'
```

### Search Payees by Name
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     "$BASE_URL/payees?budget_id=eq.$BUDGET_ID&name=ilike.*electric*&select=*"
```

## Security Notes

- All operations are protected by Row Level Security (RLS)
- Users can only access payees in budgets they own
- Budget ownership is verified through the budgets table relationship
- Unauthorized access returns empty results rather than error messages
- Input validation prevents SQL injection and constraint violations
- Payees with transaction history cannot be deleted (referential integrity)
- Payment tracking fields cannot be manually modified to prevent data corruption

## Performance Considerations

- Indexes exist on budget_id, is_active, payee_type, sort_order, and payment fields
- Use specific budget_id filters when possible for optimal performance
- Consider pagination for large result sets using `limit` and `offset`
- Payment queries are optimized with specialized indexes
- The sort_order field enables efficient custom sorting without complex queries
- Type-based queries use composite indexes for optimal performance

## Integration Notes

- Payees are automatically created when new budgets are established
- Payment totals and dates are maintained automatically by transaction triggers
- Payee data integrates with transaction system for expense tracking
- Contact information supports rich payee management features
- Color and icon fields enable rich UI representation
- Sort order enables custom payee arrangement per user preference
- Account numbers support utility bill management and automated payments

## Payment Tracking Flow

1. **Transaction Created**: Expense/debt_payment transaction references payee
2. **Trigger Execution**: `update_payee_last_payment_info()` function runs
3. **Payment Update**: Payee's `total_paid`, `last_payment_date`, and `last_payment_amount` are automatically updated
4. **Data Consistency**: All payment history remains accurate and up-to-date

This ensures payee payment tracking is always accurate and reflects the true transaction history.