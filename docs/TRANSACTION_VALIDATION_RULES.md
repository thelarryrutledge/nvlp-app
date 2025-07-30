# Transaction Validation Rules

This document outlines all validation rules applied to transactions in the NVLP system.

## General Validation Rules

### Amount Validation
- **Positive Amount**: Transaction amount must be greater than 0
- **Decimal Places**: Amount can have at most 2 decimal places (representing cents)
- **Example**: 
  - ✅ Valid: 10.00, 10.50, 10.99
  - ❌ Invalid: -10.00, 0, 10.999

### Date Validation
- **No Future Dates**: Transaction date cannot be in the future
- **Format**: Must be a valid ISO date string

### Text Field Validation
- **Description**: Maximum 500 characters (optional)

## Transaction Type-Specific Rules

### Income Transactions
**Required Fields**: `income_source_id`  
**Prohibited Fields**: `from_envelope_id`, `to_envelope_id`, `payee_id`

**Validation**:
- Income source must exist and belong to the same budget
- Income source must be active (checked at database level)

### Allocation Transactions
**Required Fields**: `to_envelope_id`  
**Prohibited Fields**: `from_envelope_id`, `payee_id`, `income_source_id`

**Validation**:
- Target envelope must exist and belong to the same budget
- Target envelope must be active
- Cannot allocate to inactive envelopes

### Expense Transactions
**Required Fields**: `from_envelope_id`, `payee_id`  
**Prohibited Fields**: `to_envelope_id`, `income_source_id`

**Validation**:
- Source envelope must exist and belong to the same budget
- Source envelope must be active
- Payee must exist and belong to the same budget
- Payee must be active
- Can overdraft envelopes (no balance check)

### Debt Payment Transactions
**Required Fields**: `from_envelope_id`, `payee_id`  
**Prohibited Fields**: `to_envelope_id`, `income_source_id`

**Additional Validation**:
- All expense transaction rules apply
- Source envelope must be of type 'debt'
- Updates both `current_balance` and `target_amount` on debt envelope

### Transfer Transactions
**Required Fields**: `from_envelope_id`, `to_envelope_id`  
**Prohibited Fields**: `payee_id`, `income_source_id`

**Validation**:
- Both envelopes must exist and belong to the same budget
- Both envelopes must be active
- Cannot transfer to the same envelope (`from_envelope_id` ≠ `to_envelope_id`)
- Can transfer between any envelope types

## Entity Ownership Validation

All referenced entities must belong to the same budget:
- Income sources
- Envelopes
- Payees
- Categories (if specified)

## Update Transaction Validation

When updating a transaction:
- Cannot change the transaction type
- If changing entity references (envelopes, payees, income sources), all validation rules are re-applied
- Amount and date changes follow the same validation rules as creation

## Soft Delete Rules

- Only the user who created the transaction can soft delete it
- Soft deleted transactions are excluded from balance calculations
- Can be restored by the same user who deleted them

## Database-Level Constraints

Additional validation happens at the database level:
- Foreign key constraints ensure entity references are valid
- Check constraints on enum values (transaction types)
- Triggers automatically update balances based on transaction type
- Row-level security ensures users can only access their own data

## Error Codes

- `VALIDATION_ERROR`: General validation failure
- `NOT_FOUND`: Referenced entity doesn't exist or doesn't belong to budget
- `INVALID_TRANSACTION_TYPE`: Unknown transaction type
- `INVALID_ENVELOPE_TRANSFER`: Attempting to transfer to same envelope