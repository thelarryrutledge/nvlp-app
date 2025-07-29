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

Allocation transactions move money from the budget's available pool to specific envelopes. This is how you "allocate" or "budget" your available money into spending categories.

### How It Works

1. **Transaction Creation**: When a transaction with `transaction_type = 'allocation'` is created:
   - Must include `to_envelope_id` (required)
   - Must NOT include envelope or payee references
   - Amount must be positive
   - Budget must have sufficient available funds

2. **Automatic Balance Updates**: Database triggers automatically:
   - **Decrease** `budgets.available_amount` by the transaction amount
   - **Increase** `envelopes.current_balance` by the transaction amount
   - This happens instantly upon transaction insert

3. **Soft Delete Handling**: If an allocation transaction is soft deleted:
   - The triggers reverse the balance changes
   - `available_amount` increases by the transaction amount
   - `envelope.current_balance` decreases by the transaction amount
   - Restoring the transaction re-applies the allocation

### Example Flow

```typescript
// 1. Initial state (after income)
budget.available_amount = 1000.00
envelope.current_balance = 0.00

// 2. Create allocation transaction
transaction = {
  transaction_type: 'allocation',
  amount: 300.00,
  to_envelope_id: 'groceries-envelope-id',
  transaction_date: '2025-01-29',
  description: 'Allocate to groceries'
}

// 3. After insert (automatic via triggers)
budget.available_amount = 700.00   // 1000 - 300
envelope.current_balance = 300.00  // 0 + 300

// 4. If soft deleted
transaction.is_deleted = true
budget.available_amount = 1000.00  // Reverted
envelope.current_balance = 0.00    // Reverted

// 5. If restored
transaction.is_deleted = false
budget.available_amount = 700.00   // Re-applied
envelope.current_balance = 300.00  // Re-applied
```

### Database Implementation

The allocation flow is implemented via PostgreSQL triggers:

```sql
-- Budget trigger (update_budget_available)
ELSIF NEW.transaction_type = 'allocation' THEN
  UPDATE public.budgets 
  SET available_amount = available_amount - NEW.amount
  WHERE id = NEW.budget_id;

-- Envelope trigger (update_envelope_balance)  
IF NEW.to_envelope_id IS NOT NULL THEN
  UPDATE public.envelopes 
  SET current_balance = current_balance + NEW.amount
  WHERE id = NEW.to_envelope_id;
```

### Money Flow Summary

**Available Pool → Envelope**
- Available money decreases by allocation amount
- Envelope balance increases by allocation amount
- Zero-sum: total money in system remains constant

## Expense Transaction Flow

Expense transactions move money from envelopes to payees, representing actual spending. This is where money leaves the budget system entirely.

### How It Works

1. **Transaction Creation**: When a transaction with `transaction_type = 'expense'` is created:
   - Must include `from_envelope_id` (source envelope)
   - Must include `payee_id` (who receives the money)
   - Must NOT include `to_envelope_id` or `income_source_id`
   - Amount must be positive
   - Envelope can go negative (overdraft allowed)

2. **Automatic Balance Updates**: Database trigger automatically:
   - **Decrease** `envelopes.current_balance` by the transaction amount
   - Money leaves the system (paid to payee)
   - Budget available_amount is NOT affected (money already allocated)

3. **Soft Delete Handling**: If an expense transaction is soft deleted:
   - The trigger reverses the balance change
   - `envelope.current_balance` increases by the transaction amount
   - Money is "returned" to the envelope
   - Restoring the transaction re-applies the expense

### Example Flow

```typescript
// 1. Initial state (after allocation)
budget.available_amount = 600.00
envelope.current_balance = 400.00  // Groceries envelope

// 2. Create expense transaction
transaction = {
  transaction_type: 'expense',
  amount: 125.50,
  from_envelope_id: 'groceries-envelope-id',
  payee_id: 'grocery-store-payee-id',
  transaction_date: '2025-01-29',
  description: 'Weekly grocery shopping'
}

// 3. After insert (automatic via trigger)
budget.available_amount = 600.00   // Unchanged
envelope.current_balance = 274.50  // 400 - 125.50

// Money has left the system → paid to grocery store

// 4. If soft deleted
transaction.is_deleted = true
envelope.current_balance = 400.00  // Money "returned"

// 5. If restored
transaction.is_deleted = false
envelope.current_balance = 274.50  // Expense re-applied
```

### Overdraft Handling

Unlike budgets (which cannot go negative), envelopes CAN have negative balances:

```typescript
// Envelope with low balance
envelope.current_balance = 50.00

// Large expense
expense.amount = 200.00

// Result: Negative balance allowed
envelope.current_balance = -150.00  // Overdraft of $150
```

This allows for real-world scenarios where you overspend an envelope category.

### Database Implementation

The expense flow is implemented via PostgreSQL trigger:

```sql
-- Envelope trigger (update_envelope_balance)
-- For transfers and expenses, decrease from_envelope balance
IF NEW.from_envelope_id IS NOT NULL THEN
  UPDATE public.envelopes 
  SET current_balance = current_balance - NEW.amount
  WHERE id = NEW.from_envelope_id;
END IF;
```

### Money Flow Summary

**Envelope → Payee (Money Leaves System)**
- Envelope balance decreases by expense amount
- Budget available_amount unchanged (already allocated)
- Total money in system decreases (money spent)
- Overdrafts allowed (negative envelope balances)

## Transfer Transaction Flow

Transfer transactions move money between envelopes within the same budget. This allows you to reallocate money from one spending category to another without affecting your overall budget.

### How It Works

1. **Transaction Creation**: When a transaction with `transaction_type = 'transfer'` is created:
   - Must include `from_envelope_id` (source envelope)
   - Must include `to_envelope_id` (destination envelope)
   - Must NOT include `payee_id` or `income_source_id`
   - Amount must be positive
   - Source and destination envelopes must be different
   - Both envelopes can go negative (overdraft allowed)

2. **Automatic Balance Updates**: Database trigger automatically:
   - **Decrease** `from_envelope.current_balance` by the transaction amount
   - **Increase** `to_envelope.current_balance` by the transaction amount
   - Budget available_amount is NOT affected (money stays within system)

3. **Soft Delete Handling**: If a transfer transaction is soft deleted:
   - The trigger reverses both balance changes
   - Source envelope balance increases by transaction amount
   - Destination envelope balance decreases by transaction amount
   - Restoring the transaction re-applies the transfer

### Example Flow

```typescript
// 1. Initial state
entertainment_envelope.current_balance = 300.00
emergency_envelope.current_balance = 0.00
budget.available_amount = 700.00

// 2. Create transfer transaction
transaction = {
  transaction_type: 'transfer',
  amount: 150.00,
  from_envelope_id: 'entertainment-envelope-id',
  to_envelope_id: 'emergency-envelope-id',
  transaction_date: '2025-01-29',
  description: 'Move unused entertainment money to emergency fund'
}

// 3. After insert (automatic via trigger)
entertainment_envelope.current_balance = 150.00  // 300 - 150
emergency_envelope.current_balance = 150.00      // 0 + 150
budget.available_amount = 700.00                 // Unchanged

// Total envelope money: 150 + 150 = 300 (same as before)

// 4. If soft deleted
transaction.is_deleted = true
entertainment_envelope.current_balance = 300.00  // Restored
emergency_envelope.current_balance = 0.00        // Restored

// 5. If restored
transaction.is_deleted = false
entertainment_envelope.current_balance = 150.00  // Re-applied
emergency_envelope.current_balance = 150.00      // Re-applied
```

### Transfer Validation

The system enforces important transfer rules:

```typescript
// ✅ Valid transfer
{
  from_envelope_id: 'envelope-a',
  to_envelope_id: 'envelope-b',
  amount: 100.00
}

// ❌ Invalid: Same envelope transfer
{
  from_envelope_id: 'envelope-a',
  to_envelope_id: 'envelope-a',  // Same as source!
  amount: 100.00
}
// Error: "Cannot transfer to the same envelope"

// ❌ Invalid: Missing required fields
{
  from_envelope_id: 'envelope-a',
  // Missing to_envelope_id
  amount: 100.00
}
// Error: "Transfer transactions require from_envelope_id and to_envelope_id"
```

### Overdraft Handling

Both source and destination envelopes can have negative balances:

```typescript
// Source envelope with low balance
entertainment_envelope.current_balance = 50.00

// Large transfer
transfer.amount = 200.00

// Result: Source goes negative, destination increases
entertainment_envelope.current_balance = -150.00  // Overdraft
emergency_envelope.current_balance = 200.00       // Increased
```

This allows flexible reallocation even when envelopes are underfunded.

### Database Implementation

The transfer flow is implemented via PostgreSQL trigger:

```sql
-- Envelope trigger (update_envelope_balance)
-- For transfers and expenses, decrease from_envelope balance
IF NEW.from_envelope_id IS NOT NULL THEN
  UPDATE public.envelopes 
  SET current_balance = current_balance - NEW.amount
  WHERE id = NEW.from_envelope_id;
END IF;

-- For transfers and allocations, increase to_envelope balance
IF NEW.to_envelope_id IS NOT NULL THEN
  UPDATE public.envelopes 
  SET current_balance = current_balance + NEW.amount
  WHERE id = NEW.to_envelope_id;
END IF;
```

### Money Flow Summary

**Envelope → Envelope (Money Stays in System)**
- Source envelope decreases by transfer amount
- Destination envelope increases by transfer amount
- Budget available_amount unchanged
- Zero-sum operation (total money constant)
- Useful for reallocating between spending categories

## Debt Payment Transaction Flow

*To be implemented in next phase*

Debt payment transactions are similar to expenses but tracked separately for reporting.