# NVLP API cURL Test Examples

## Overview

This document provides comprehensive cURL examples for testing all NVLP API endpoints. Each example includes authentication, proper headers, and expected responses.

## Environment Setup

```bash
# Set environment variables for easier testing
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export USER_ACCESS_TOKEN="your-jwt-token"  # Obtained after authentication
export BUDGET_ID="your-budget-uuid"         # Your test budget ID
```

## Authentication Endpoints

### 1. Send Magic Link

```bash
# Request magic link email
curl -X POST "$SUPABASE_URL/functions/v1/auth-magic-link" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "email": "test@example.com",
    "redirectTo": "https://yourapp.com/auth/callback"
  }'

# Expected Response (200 OK):
{
  "success": true,
  "message": "Magic link sent to your email"
}

# Test validation error
curl -X POST "$SUPABASE_URL/functions/v1/auth-magic-link" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"email": "invalid-email"}'

# Expected Response (400 Bad Request):
{
  "error": "Validation failed",
  "message": "The request contains invalid data",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "INVALID_FORMAT"
    }
  ]
}
```

### 2. Get Current User

```bash
# Get authenticated user profile
curl -X GET "$SUPABASE_URL/functions/v1/auth-user" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN"

# Expected Response (200 OK):
{
  "user": {
    "id": "user-uuid",
    "email": "test@example.com",
    "display_name": "Test User",
    "avatar_url": null,
    "created_at": "2025-08-02T10:00:00Z",
    "updated_at": "2025-08-02T10:00:00Z"
  }
}

# Test without token
curl -X GET "$SUPABASE_URL/functions/v1/auth-user"

# Expected Response (401 Unauthorized):
{
  "error": "Missing or invalid authorization header"
}
```

### 3. Logout

```bash
# Sign out user
curl -X POST "$SUPABASE_URL/functions/v1/auth-logout" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN"

# Expected Response (200 OK):
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Budget Management

### 1. List Budgets

```bash
# Get all user's budgets
curl -X GET "$SUPABASE_URL/rest/v1/budgets" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"

# Expected Response (200 OK):
[
  {
    "id": "budget-uuid",
    "user_id": "user-uuid",
    "name": "Monthly Budget",
    "description": "Main household budget",
    "available_amount": "1500.00",
    "is_active": true,
    "created_at": "2025-08-01T10:00:00Z",
    "updated_at": "2025-08-02T10:00:00Z"
  }
]
```

### 2. Create Budget

```bash
# Create new budget
curl -X POST "$SUPABASE_URL/rest/v1/budgets" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "Vacation Budget",
    "description": "Summer vacation savings"
  }'

# Expected Response (201 Created):
{
  "id": "new-budget-uuid",
  "user_id": "user-uuid",
  "name": "Vacation Budget",
  "description": "Summer vacation savings",
  "available_amount": "0.00",
  "is_active": true,
  "created_at": "2025-08-02T12:00:00Z",
  "updated_at": "2025-08-02T12:00:00Z"
}
```

### 3. Update Budget

```bash
# Update budget details
curl -X PATCH "$SUPABASE_URL/rest/v1/budgets?id=eq.$BUDGET_ID" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "Updated Budget Name",
    "description": "Updated description"
  }'

# Expected Response (200 OK):
[
  {
    "id": "budget-uuid",
    "name": "Updated Budget Name",
    "description": "Updated description",
    ...
  }
]
```

## Categories

### 1. List Categories

```bash
# Get all categories for a budget
curl -X GET "$SUPABASE_URL/rest/v1/categories?budget_id=eq.$BUDGET_ID&order=display_order" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Expected Response (200 OK):
[
  {
    "id": "category-uuid",
    "budget_id": "budget-uuid",
    "parent_id": null,
    "name": "Housing",
    "description": "Housing expenses",
    "is_income": false,
    "is_system": false,
    "display_order": 1,
    "created_at": "2025-08-01T10:00:00Z",
    "updated_at": "2025-08-01T10:00:00Z"
  }
]
```

### 2. Create Category

```bash
# Create expense category
curl -X POST "$SUPABASE_URL/rest/v1/categories" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "name": "Groceries",
    "description": "Food and household items",
    "is_income": false,
    "display_order": 2
  }'

# Create income category
curl -X POST "$SUPABASE_URL/rest/v1/categories" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "name": "Salary",
    "description": "Monthly salary",
    "is_income": true,
    "display_order": 1
  }'
```

### 3. Create Subcategory

```bash
# First, create a parent category (e.g., "Transportation")
curl -X POST "$SUPABASE_URL/rest/v1/categories" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "name": "Transportation",
    "description": "All transportation expenses",
    "is_income": false,
    "display_order": 3
  }'

# Expected Response (201 Created):
{
  "id": "parent-category-uuid",
  "budget_id": "budget-uuid",
  "parent_id": null,
  "name": "Transportation",
  "description": "All transportation expenses",
  "is_income": false,
  "display_order": 3,
  "total": "0.00",
  ...
}

# Then create subcategories using the parent_id
export PARENT_CATEGORY_ID="parent-category-uuid"  # Use the ID from above response

# Create "Gas" subcategory
curl -X POST "$SUPABASE_URL/rest/v1/categories" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "parent_id": "'$PARENT_CATEGORY_ID'",
    "name": "Gas",
    "description": "Fuel for vehicles",
    "is_income": false,
    "display_order": 1
  }'

# Create "Car Maintenance" subcategory
curl -X POST "$SUPABASE_URL/rest/v1/categories" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "parent_id": "'$PARENT_CATEGORY_ID'",
    "name": "Car Maintenance",
    "description": "Oil changes, repairs, etc.",
    "is_income": false,
    "display_order": 2
  }'

# Create "Public Transit" subcategory
curl -X POST "$SUPABASE_URL/rest/v1/categories" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "parent_id": "'$PARENT_CATEGORY_ID'",
    "name": "Public Transit",
    "description": "Bus, train, subway fares",
    "is_income": false,
    "display_order": 3
  }'

# Expected Response for subcategories (201 Created):
{
  "id": "subcategory-uuid",
  "budget_id": "budget-uuid",
  "parent_id": "parent-category-uuid",
  "name": "Gas",
  "description": "Fuel for vehicles",
  "is_income": false,
  "display_order": 1,
  "total": "0.00",
  ...
}
```

### 4. Get Category Tree

```bash
# Get hierarchical category structure (parents with children)
curl -X GET "$SUPABASE_URL/rest/v1/categories?budget_id=eq.$BUDGET_ID&parent_id=is.null&select=*,children:categories(*)&order=display_order" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Expected Response (200 OK):
[
  {
    "id": "parent-category-uuid",
    "budget_id": "budget-uuid",
    "parent_id": null,
    "name": "Transportation",
    "description": "All transportation expenses",
    "is_income": false,
    "display_order": 3,
    "total": "450.00",
    "children": [
      {
        "id": "subcategory1-uuid",
        "budget_id": "budget-uuid", 
        "parent_id": "parent-category-uuid",
        "name": "Gas",
        "description": "Fuel for vehicles",
        "is_income": false,
        "display_order": 1,
        "total": "200.00"
      },
      {
        "id": "subcategory2-uuid",
        "budget_id": "budget-uuid",
        "parent_id": "parent-category-uuid", 
        "name": "Car Maintenance",
        "description": "Oil changes, repairs, etc.",
        "is_income": false,
        "display_order": 2,
        "total": "150.00"
      },
      {
        "id": "subcategory3-uuid",
        "budget_id": "budget-uuid",
        "parent_id": "parent-category-uuid",
        "name": "Public Transit", 
        "description": "Bus, train, subway fares",
        "is_income": false,
        "display_order": 3,
        "total": "100.00"
      }
    ]
  }
]

# Get only subcategories for a specific parent
curl -X GET "$SUPABASE_URL/rest/v1/categories?budget_id=eq.$BUDGET_ID&parent_id=eq.$PARENT_CATEGORY_ID&order=display_order" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

## Envelopes

### 1. List Envelopes

```bash
# Get all envelopes for a budget
curl -X GET "$SUPABASE_URL/rest/v1/envelopes?budget_id=eq.$BUDGET_ID&is_active=eq.true" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Expected Response (200 OK):
[
  {
    "id": "envelope-uuid",
    "budget_id": "budget-uuid",
    "category_id": "category-uuid",
    "name": "Rent",
    "description": "Monthly rent payment",
    "current_balance": "1200.00",
    "target_amount": "1200.00",
    "target_date": "2025-08-31",
    "fill_type": "fixed_amount",
    "fill_amount": "1200.00",
    "is_active": true,
    "created_at": "2025-08-01T10:00:00Z",
    "updated_at": "2025-08-02T10:00:00Z"
  }
]
```

### 2. Create Envelope 

```bash
# Create regular envelope via Edge Function (RECOMMENDED - with validation)
curl -X POST "$SUPABASE_URL/functions/v1/envelopes" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "name": "Emergency Fund",
    "description": "6 months of expenses",
    "target_amount": 10000.00,
    "envelope_type": "regular",
    "category_id": "'$CATEGORY_ID'",
    "notify_on_low_balance": false
  }'

# Create debt envelope
# For debt envelopes:
# - target_amount = total debt owed (e.g., credit card balance)
# - current_balance = funds allocated for payment (starts at 0, increased via allocations)
curl -X POST "$SUPABASE_URL/functions/v1/envelopes" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "name": "Credit Card",
    "description": "Chase Visa ending in 1234",
    "target_amount": 5000.00,
    "current_balance": 0.00,
    "envelope_type": "debt",
    "category_id": "'$DEBT_CATEGORY_ID'",
    "notify_on_low_balance": false
  }'

# Expected Response (201 Created):
{
  "envelope": {
    "id": "new-envelope-uuid",
    "budget_id": "budget-uuid",
    "name": "Emergency Fund",
    "description": "6 months of expenses",
    "current_balance": "0.00",
    "target_amount": "10000.00",
    "envelope_type": "regular",
    "category_id": "category-uuid",
    "notify_on_low_balance": false,
    "low_balance_threshold": null,
    "is_active": true,
    "created_at": "2025-08-02T12:00:00Z",
    "updated_at": "2025-08-02T12:00:00Z"
  }
}

# Alternative: Create envelope via PostgREST (direct database)
curl -X POST "$SUPABASE_URL/rest/v1/envelopes" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "name": "Vacation Fund",
    "description": "Summer vacation savings",
    "target_amount": 5000.00,
    "envelope_type": "regular",
    "category_id": "'$CATEGORY_ID'"
  }'
```

### 3. Get Envelopes with Negative Balance

```bash
# Get overdrawn envelopes via Edge Function
curl -X GET "$SUPABASE_URL/functions/v1/envelopes/negative?budget_id=$BUDGET_ID" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN"

# Expected Response (200 OK):
{
  "envelopes": [
    {
      "id": "envelope-uuid",
      "budget_id": "budget-uuid",
      "name": "Credit Card",
      "current_balance": "-125.50",
      ...
    }
  ]
}
```

### 4. Get Low Balance Envelopes

```bash
# Get envelopes with low balance notifications
curl -X GET "$SUPABASE_URL/functions/v1/envelopes/low-balance?budget_id=$BUDGET_ID" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN"

# Expected Response (200 OK):
{
  "envelopes": [
    {
      "id": "envelope-uuid",
      "budget_id": "budget-uuid",
      "name": "Emergency Fund",
      "current_balance": "450.00",
      "low_balance_threshold": "500.00",
      "notify_on_low_balance": true,
      ...
    }
  ]
}
```

### 5. Update Envelope

```bash
# Update envelope via Edge Function
curl -X PATCH "$SUPABASE_URL/functions/v1/envelopes/$ENVELOPE_ID" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Emergency Fund",
    "target_amount": 15000.00,
    "notify_on_low_balance": true,
    "low_balance_threshold": 1000.00
  }'

# Expected Response (200 OK):
{
  "envelope": {
    "id": "envelope-uuid",
    "name": "Updated Emergency Fund",
    "target_amount": "15000.00",
    "notify_on_low_balance": true,
    "low_balance_threshold": "1000.00",
    ...
  }
}
```

### 6. Delete Envelope

```bash
# Delete envelope via Edge Function (only if balance is zero)
curl -X DELETE "$SUPABASE_URL/functions/v1/envelopes/$ENVELOPE_ID" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN"

# Expected Response (200 OK):
{
  "success": true
}

# If envelope has non-zero balance (400 Bad Request):
{
  "error": "Cannot delete envelope with non-zero balance"
}
```

## Income Sources

### Schedule Types

The income source system supports the following schedule types:

- **`weekly`**: Every week on a specific day (0=Sunday, 6=Saturday)
  - Config: `{"day_of_week": 5}` (every Friday)
- **`biweekly`**: Every two weeks on a specific day
  - Config: `{"day_of_week": 1, "start_date": "2025-02-03"}` (every other Monday)
- **`monthly`**: Monthly on a specific date
  - Config: `{"day_of_month": 15}` (15th of each month)
  - Config: `{"day_of_month": -1}` (last day of each month)
- **`semi_monthly`**: Twice per month on specific dates
  - Config: `{"pay_dates": [1, 15]}` (1st and 15th)
  - Config: `{"pay_dates": [15, -1]}` (15th and last day)
- **`quarterly`**: Every 3 months
  - Config: `{"month_of_quarter": 1, "day_of_month": 15}` (Jan 15, Apr 15, Jul 15, Oct 15)
- **`yearly`**: Annually on a specific date
  - Config: `{"month": 4, "day_of_month": 15}` (April 15th each year)
- **`one_time`**: Single occurrence
  - Config: `{"date": "2025-03-15"}` (specific date)

### 1. Create Income Source

```bash
# Create semi-monthly salary (paid on 15th and last day of month)
curl -X POST "$SUPABASE_URL/rest/v1/income_sources" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "category_id": "'$INCOME_CATEGORY_ID'",
    "name": "Semi-monthly Salary",
    "description": "Full-time job - paid 15th and last day",
    "expected_amount": 2500.00,
    "schedule_type": "semi_monthly",
    "schedule_config": {"pay_dates": [15, -1]},
    "next_expected_date": "2025-02-15",
    "is_active": true
  }'

# Create weekly freelance income (paid every Friday)
curl -X POST "$SUPABASE_URL/rest/v1/income_sources" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "category_id": "'$INCOME_CATEGORY_ID'",
    "name": "Weekly Freelance",
    "description": "Freelance work - paid weekly on Fridays",
    "expected_amount": 800.00,
    "schedule_type": "weekly",
    "schedule_config": {"day_of_week": 5},
    "next_expected_date": "2025-02-14",
    "is_active": true
  }'

# Create monthly income (paid on 1st of each month)
curl -X POST "$SUPABASE_URL/rest/v1/income_sources" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "category_id": "'$INCOME_CATEGORY_ID'",
    "name": "Monthly Rental Income",
    "description": "Rental property income",
    "expected_amount": 1200.00,
    "schedule_type": "monthly",
    "schedule_config": {"day_of_month": 1},
    "next_expected_date": "2025-03-01",
    "is_active": true
  }'

# Create one-time income
curl -X POST "$SUPABASE_URL/rest/v1/income_sources" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "category_id": "'$INCOME_CATEGORY_ID'",
    "name": "Tax Refund",
    "description": "2024 tax refund",
    "expected_amount": 1500.00,
    "schedule_type": "one_time",
    "schedule_config": {"date": "2025-03-15"},
    "next_expected_date": "2025-03-15",
    "is_active": true
  }'

# Create biweekly income (every other Monday)
curl -X POST "$SUPABASE_URL/rest/v1/income_sources" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "category_id": "'$INCOME_CATEGORY_ID'",
    "name": "Biweekly Paycheck",
    "description": "Every other Monday",
    "expected_amount": 2300.00,
    "schedule_type": "biweekly",
    "schedule_config": {"day_of_week": 1, "start_date": "2025-02-03"},
    "next_expected_date": "2025-02-17",
    "is_active": true
  }'
```

### 2. Get Upcoming Income

```bash
# Get income expected in next 7 days
curl -X GET "$SUPABASE_URL/rest/v1/income_sources?budget_id=eq.$BUDGET_ID&next_expected_date=gte.$(date +%Y-%m-%d)&next_expected_date=lte.$(date -d '+7 days' +%Y-%m-%d)&is_active=eq.true" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

## Payees

### 1. Create Payee

```bash
# Create a payee
curl -X POST "$SUPABASE_URL/rest/v1/payees" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "name": "Walmart",
    "description": "Grocery store",
    "category_id": "'$GROCERY_CATEGORY_ID'"
  }'
```

### 2. Search Payees

```bash
# Search payees by name
curl -X GET "$SUPABASE_URL/rest/v1/payees?budget_id=eq.$BUDGET_ID&name=ilike.*mart*" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

## Transactions

### 1. Create Income Transaction

```bash
# Record income
curl -X POST "$SUPABASE_URL/functions/v1/transactions" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "income",
    "amount": 5000.00,
    "description": "Monthly salary",
    "transaction_date": "'$(date +%Y-%m-%d)'",
    "income_source_id": "'$INCOME_SOURCE_ID'",
    "category_id": "'$INCOME_CATEGORY_ID'"
  }'

# Expected Response (201 Created):
{
  "id": "transaction-uuid",
  "budget_id": "budget-uuid",
  "transaction_type": "income",
  "amount": "5000.00",
  "description": "Monthly salary",
  "transaction_date": "2025-08-02",
  "income_source_id": "income-source-uuid",
  "category_id": "income-category-uuid",
  "is_cleared": false,
  "is_reconciled": false,
  "created_at": "2025-08-02T12:00:00Z"
}
```

### 2. Create Allocation Transaction

```bash
# Allocate money to envelope
curl -X POST "$SUPABASE_URL/functions/v1/transactions" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "allocation",
    "amount": 1200.00,
    "description": "Allocate to rent",
    "transaction_date": "'$(date +%Y-%m-%d)'",
    "to_envelope_id": "'$RENT_ENVELOPE_ID'"
  }'
```

### 3. Create Expense Transaction

```bash
# Record expense
curl -X POST "$SUPABASE_URL/functions/v1/transactions" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "expense",
    "amount": 125.50,
    "description": "Weekly groceries",
    "transaction_date": "'$(date +%Y-%m-%d)'",
    "from_envelope_id": "'$GROCERY_ENVELOPE_ID'",
    "payee_id": "'$WALMART_PAYEE_ID'",
    "category_id": "'$GROCERY_CATEGORY_ID'"
  }'
```

### 4. Create Transfer Transaction

```bash
# Transfer between envelopes
curl -X POST "$SUPABASE_URL/functions/v1/transactions" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "transfer",
    "amount": 200.00,
    "description": "Move to savings",
    "transaction_date": "'$(date +%Y-%m-%d)'",
    "from_envelope_id": "'$CHECKING_ENVELOPE_ID'",
    "to_envelope_id": "'$SAVINGS_ENVELOPE_ID'"
  }'
```

### 5. Create Debt Payment Transaction

```bash
# Regular debt payment (reduces envelope balance and debt target amount)
curl -X POST "$SUPABASE_URL/functions/v1/transactions" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "debt_payment",
    "amount": 500.00,
    "description": "Monthly credit card payment",
    "transaction_date": "'$(date +%Y-%m-%d)'",
    "from_envelope_id": "'$CREDIT_CARD_ENVELOPE_ID'",
    "payee_id": "'$CREDIT_CARD_PAYEE_ID'",
    "category_id": "'$DEBT_CATEGORY_ID'"
  }'

# Expected Response (201 Created):
{
  "id": "transaction-uuid",
  "budget_id": "budget-uuid",
  "transaction_type": "debt_payment",
  "amount": "500.00",
  "description": "Monthly credit card payment",
  "transaction_date": "2025-08-02",
  "from_envelope_id": "credit-card-envelope-uuid",
  "payee_id": "credit-card-payee-uuid",
  "category_id": "debt-category-uuid",
  "is_cleared": false,
  "is_reconciled": false,
  "created_at": "2025-08-02T12:00:00Z"
}
```

### 6. Create Payoff Transaction

```bash
# Complete debt payoff (zeros out envelope balance and target amount)
# Note: The amount should be the payoff amount from the lender
# The envelope balance will be set to 0 and any remaining allocated funds
# will be available for reallocation

curl -X POST "$SUPABASE_URL/functions/v1/transactions" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "payoff",
    "amount": 2850.00,
    "description": "Final payoff - saved $150 in interest!",
    "transaction_date": "'$(date +%Y-%m-%d)'",
    "from_envelope_id": "'$CREDIT_CARD_ENVELOPE_ID'",
    "payee_id": "'$CREDIT_CARD_PAYEE_ID'",
    "category_id": "'$DEBT_CATEGORY_ID'"
  }'

# Expected Response (201 Created):
{
  "id": "transaction-uuid",
  "budget_id": "budget-uuid",
  "transaction_type": "payoff",
  "amount": "2850.00",
  "description": "Final payoff - saved $150 in interest!",
  "transaction_date": "2025-08-02",
  "from_envelope_id": "credit-card-envelope-uuid",
  "payee_id": "credit-card-payee-uuid",
  "category_id": "debt-category-uuid",
  "is_cleared": false,
  "is_reconciled": false,
  "created_at": "2025-08-02T12:00:00Z"
}

# After a payoff transaction on a debt envelope:
# - The envelope's target_amount becomes 0 (debt is fully paid off)
# - The envelope's current_balance becomes 0 (all allocated funds cleared)
# - Any excess allocated funds are automatically returned to budget available_amount
# - Example: If you allocated $3000 but only needed $2850 for payoff:
#   - $2850 is paid to the creditor
#   - $150 is automatically returned to available_amount
#   - Both envelope balances become 0
```

### 7. List Transactions with Filters

```bash
# Get recent transactions (last 30 days)
curl -X GET "$SUPABASE_URL/rest/v1/transactions?budget_id=eq.$BUDGET_ID&transaction_date=gte.$(date -d '-30 days' +%Y-%m-%d)&is_deleted=eq.false&order=transaction_date.desc,created_at.desc" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Get uncleared transactions
curl -X GET "$SUPABASE_URL/rest/v1/transactions?budget_id=eq.$BUDGET_ID&is_cleared=eq.false&is_deleted=eq.false" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Get transactions by envelope
curl -X GET "$SUPABASE_URL/rest/v1/transactions?or=(from_envelope_id.eq.$ENVELOPE_ID,to_envelope_id.eq.$ENVELOPE_ID)&is_deleted=eq.false&order=transaction_date.desc" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

### 8. Update Transaction

```bash
# Mark transaction as cleared
curl -X PATCH "$SUPABASE_URL/rest/v1/transactions?id=eq.$TRANSACTION_ID" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "is_cleared": true
  }'
```

### 9. Soft Delete Transaction

```bash
# Soft delete via Edge Function
curl -X DELETE "$SUPABASE_URL/functions/v1/transactions?id=$TRANSACTION_ID" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN"

# Expected Response (200 OK):
{
  "success": true,
  "message": "Transaction deleted"
}
```

## Dashboard & Analytics

### 1. Get Dashboard Summary

```bash
# Get dashboard data
curl -X GET "$SUPABASE_URL/functions/v1/dashboard?budget_id=$BUDGET_ID" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN"

# Expected Response (200 OK):
{
  "budget": {
    "id": "budget-uuid",
    "name": "Monthly Budget",
    "available_amount": "2500.00"
  },
  "envelopes": {
    "total_balance": "8500.00",
    "negative_count": 2,
    "top_envelopes": [
      {
        "id": "envelope-uuid",
        "name": "Emergency Fund",
        "current_balance": "3000.00",
        "target_amount": "10000.00",
        "percentage_filled": 30
      }
    ]
  },
  "recent_transactions": [
    {
      "id": "transaction-uuid",
      "transaction_type": "expense",
      "amount": "125.50",
      "description": "Weekly groceries",
      "transaction_date": "2025-08-02",
      "payee_name": "Walmart"
    }
  ],
  "spending_by_category": [
    {
      "category_id": "category-uuid",
      "category_name": "Groceries",
      "total_spent": "450.00",
      "transaction_count": 8
    }
  ]
}
```

### 2. Get Spending Statistics

```bash
# Get monthly spending by category
curl -X GET "$SUPABASE_URL/rest/v1/rpc/get_spending_by_category" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "start_date": "'$(date -d 'first day of this month' +%Y-%m-%d)'",
    "end_date": "'$(date -d 'last day of this month' +%Y-%m-%d)'"
  }'
```

## Bulk Operations

### 1. Bulk Create Transactions

```bash
# Create multiple transactions atomically
curl -X POST "$SUPABASE_URL/functions/v1/bulk-operations" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "bulk-transactions",
    "budget_id": "'$BUDGET_ID'",
    "transactions": [
      {
        "transaction_type": "expense",
        "amount": 45.00,
        "description": "Gas",
        "transaction_date": "'$(date +%Y-%m-%d)'",
        "from_envelope_id": "'$GAS_ENVELOPE_ID'",
        "payee_id": "'$GAS_STATION_ID'"
      },
      {
        "transaction_type": "expense",
        "amount": 15.00,
        "description": "Coffee",
        "transaction_date": "'$(date +%Y-%m-%d)'",
        "from_envelope_id": "'$DINING_ENVELOPE_ID'",
        "payee_id": "'$COFFEE_SHOP_ID'"
      }
    ]
  }'

# Expected Response (200 OK):
{
  "success": true,
  "created": 2,
  "transactions": [...]
}
```

### 2. Bulk Allocate to Envelopes

```bash
# Allocate to multiple envelopes
curl -X POST "$SUPABASE_URL/functions/v1/bulk-operations" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "bulk-allocations",
    "budget_id": "'$BUDGET_ID'",
    "allocations": [
      {
        "envelope_id": "'$RENT_ENVELOPE_ID'",
        "amount": 1200.00
      },
      {
        "envelope_id": "'$GROCERY_ENVELOPE_ID'",
        "amount": 500.00
      },
      {
        "envelope_id": "'$GAS_ENVELOPE_ID'",
        "amount": 200.00
      }
    ],
    "description": "Monthly budget allocation"
  }'
```

## Budget Setup

### 1. Create Default Categories and Envelopes

```bash
# Set up default budget structure
curl -X POST "$SUPABASE_URL/functions/v1/budget-setup/defaults" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'"
  }'

# Expected Response (200 OK):
{
  "success": true,
  "created": {
    "categories": 12,
    "envelopes": 15,
    "income_sources": 2,
    "payees": 10
  }
}
```

### 2. Create Demo Data

```bash
# Populate with demo transactions
curl -X POST "$SUPABASE_URL/functions/v1/budget-setup/demo" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "months_of_history": 3
  }'

# Expected Response (200 OK):
{
  "success": true,
  "created": {
    "transactions": 150,
    "starting_balance": 5000.00
  }
}
```

## Error Testing

### 1. Test Rate Limiting

```bash
# Send multiple requests rapidly to trigger rate limit
for i in {1..10}; do
  curl -X POST "$SUPABASE_URL/functions/v1/auth-magic-link" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -d '{"email": "test@example.com"}' &
done
wait

# Expected Response on rate limit (429 Too Many Requests):
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Try again in 60 seconds.",
  "retryAfter": 60
}
```

### 2. Test Validation Errors

```bash
# Invalid transaction type
curl -X POST "$SUPABASE_URL/functions/v1/transactions" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "invalid_type",
    "amount": 100.00,
    "transaction_date": "'$(date +%Y-%m-%d)'"
  }'

# Expected Response (400 Bad Request):
{
  "error": "Validation failed",
  "message": "The request contains invalid data",
  "details": [
    {
      "field": "transaction_type",
      "message": "Transaction type must be one of: income, expense, transfer, allocation, debt_payment, payoff",
      "code": "INVALID_VALUE"
    }
  ]
}
```

### 3. Test Authorization Errors

```bash
# Try to access another user's budget
curl -X GET "$SUPABASE_URL/rest/v1/budgets?user_id=eq.other-user-id" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Expected Response (200 OK with empty array due to RLS):
[]
```

## Testing Scripts

### Complete Test Suite Script

```bash
#!/bin/bash
# save as test-all-endpoints.sh

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Test function
test_endpoint() {
    local description=$1
    local command=$2
    local expected_status=$3
    
    echo -n "Testing: $description... "
    
    response=$(eval "$command -w '\n%{http_code}'" 2>/dev/null)
    status=$(echo "$response" | tail -n1)
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
    else
        echo -e "${RED}✗ FAIL (got $status, expected $expected_status)${NC}"
        echo "Response: $(echo "$response" | head -n-1)"
    fi
}

# Run tests
echo "=== NVLP API Test Suite ==="

test_endpoint "Auth: Magic Link" \
    'curl -s -X POST "$SUPABASE_URL/functions/v1/auth-magic-link" -H "Content-Type: application/json" -H "Authorization: Bearer $SUPABASE_ANON_KEY" -d "{\"email\":\"test@example.com\"}"' \
    "200"

test_endpoint "Auth: Get User (no token)" \
    'curl -s -X GET "$SUPABASE_URL/functions/v1/auth-user"' \
    "401"

test_endpoint "Budgets: List" \
    'curl -s -X GET "$SUPABASE_URL/rest/v1/budgets" -H "Authorization: Bearer $USER_ACCESS_TOKEN" -H "apikey: $SUPABASE_ANON_KEY"' \
    "200"

# Add more tests...

echo "=== Test Suite Complete ==="
```

### Transaction Flow Test

```bash
#!/bin/bash
# save as test-transaction-flow.sh

echo "=== Testing Complete Transaction Flow ==="

# 1. Create income
echo "1. Recording income..."
income_response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/transactions" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "income",
    "amount": 1000.00,
    "description": "Test income",
    "transaction_date": "'$(date +%Y-%m-%d)'",
    "income_source_id": "'$INCOME_SOURCE_ID'"
  }')

echo "Income created: $income_response"

# 2. Check available balance increased
echo "2. Checking available balance..."
budget_response=$(curl -s -X GET "$SUPABASE_URL/rest/v1/budgets?id=eq.$BUDGET_ID" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY")

echo "Budget balance: $budget_response"

# 3. Allocate to envelope
echo "3. Allocating to envelope..."
allocation_response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/transactions" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "allocation",
    "amount": 500.00,
    "description": "Allocate to groceries",
    "transaction_date": "'$(date +%Y-%m-%d)'",
    "to_envelope_id": "'$GROCERY_ENVELOPE_ID'"
  }')

echo "Allocation created: $allocation_response"

# 4. Create expense
echo "4. Recording expense..."
expense_response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/transactions" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "expense",
    "amount": 75.00,
    "description": "Grocery shopping",
    "transaction_date": "'$(date +%Y-%m-%d)'",
    "from_envelope_id": "'$GROCERY_ENVELOPE_ID'",
    "payee_id": "'$WALMART_PAYEE_ID'"
  }')

echo "Expense created: $expense_response"

echo "=== Transaction Flow Test Complete ==="
```

## Performance Testing

### Load Test Example

```bash
# Test concurrent requests
echo "Testing concurrent transaction creation..."

time {
  for i in {1..50}; do
    curl -s -X POST "$SUPABASE_URL/functions/v1/transactions" \
      -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "budget_id": "'$BUDGET_ID'",
        "transaction_type": "expense",
        "amount": '$((RANDOM % 100 + 1))',
        "description": "Load test transaction '$i'",
        "transaction_date": "'$(date +%Y-%m-%d)'",
        "from_envelope_id": "'$TEST_ENVELOPE_ID'",
        "payee_id": "'$TEST_PAYEE_ID'"
      }' > /dev/null &
    
    # Limit concurrent requests
    if (( i % 10 == 0 )); then
      wait
    fi
  done
  wait
}

echo "Load test complete"
```

## Monitoring & Debugging

### Check Response Headers

```bash
# View all response headers including rate limit info
curl -I -X GET "$SUPABASE_URL/functions/v1/auth-user" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN"

# Expected headers:
# X-RateLimit-Remaining: 95
# X-RateLimit-Reset: 1643723400
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Debug Request/Response

```bash
# Verbose output for debugging
curl -v -X POST "$SUPABASE_URL/functions/v1/transactions" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "income",
    "amount": 100.00,
    "description": "Debug test",
    "transaction_date": "'$(date +%Y-%m-%d)'",
    "income_source_id": "'$INCOME_SOURCE_ID'"
  }' 2>&1 | less
```

## Summary

This comprehensive cURL test suite covers:

✅ **Authentication Flow**: Magic link, user profile, logout  
✅ **CRUD Operations**: All entities (budgets, categories, envelopes, etc.)  
✅ **Transaction Types**: Income, expense, transfer, allocation  
✅ **Complex Queries**: Filtering, searching, date ranges  
✅ **Bulk Operations**: Atomic multi-record operations  
✅ **Error Scenarios**: Validation, authorization, rate limiting  
✅ **Performance Testing**: Concurrent requests, load testing  
✅ **Security Testing**: Headers, authentication, RLS  

Use these examples to:
- Manually test API functionality
- Create automated test scripts
- Debug issues in development
- Verify production deployment
- Generate API documentation

---
**Last Updated**: 2025-08-02  
**API Version**: 1.0.0