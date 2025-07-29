# Transaction Flows

This document describes how different transaction types affect balances in the NVLP system.

## Income Transaction Flow

Income transactions represent money entering the budget system. They automatically increase the budget's `available_amount`.

### How It Works

1. **Transaction Creation**: When a transaction with `transaction_type = 'income'` is created:
   - Must include `income_source_id` (required)
   - Must NOT include envelope or payee references
   - Amount must be positive

2. **Automatic Balance Update**: Database trigger `update_budget_available()` automatically:
   - Increases `budgets.available_amount` by the transaction amount
   - This happens instantly upon transaction insert

3. **Soft Delete Handling**: If an income transaction is soft deleted:
   - The trigger reverses the balance change
   - `available_amount` decreases by the transaction amount
   - Restoring the transaction re-applies the income

### Example Flow

```typescript
// 1. Initial state
budget.available_amount = 100.00

// 2. Create income transaction
transaction = {
  transaction_type: 'income',
  amount: 500.00,
  income_source_id: 'salary-source-id',
  transaction_date: '2025-01-29',
  description: 'Monthly salary'
}

// 3. After insert (automatic via trigger)
budget.available_amount = 600.00  // 100 + 500

// 4. If soft deleted
transaction.is_deleted = true
budget.available_amount = 100.00  // Reverted to original

// 5. If restored
transaction.is_deleted = false
budget.available_amount = 600.00  // Re-applied
```

### Database Implementation

The income flow is implemented via PostgreSQL trigger:

```sql
-- From update_budget_available() function
IF NEW.transaction_type = 'income' THEN
  UPDATE public.budgets 
  SET available_amount = available_amount + NEW.amount
  WHERE id = NEW.budget_id;
END IF;
```

### Testing

Run the test script to verify income transaction flow:

```bash
pnpm tsx scripts/test-income-transaction.ts
```

## Allocation Transaction Flow

*To be implemented in next phase*

Allocation transactions move money from the budget's available pool to specific envelopes.

## Expense Transaction Flow

*To be implemented in next phase*

Expense transactions move money from envelopes to payees (money leaves the system).

## Transfer Transaction Flow

*To be implemented in next phase*

Transfer transactions move money between envelopes within the same budget.

## Debt Payment Transaction Flow

*To be implemented in next phase*

Debt payment transactions are similar to expenses but tracked separately for reporting.