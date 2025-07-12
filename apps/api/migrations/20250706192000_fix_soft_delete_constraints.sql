-- Migration: 015_fix_soft_delete_constraints.sql
-- Purpose: Fix constraints to allow soft delete operations
-- Date: 2025-07-06

-- Drop the existing flow constraint
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_valid_flow;

-- Recreate the constraint to allow deleted transactions to bypass validation
ALTER TABLE public.transactions ADD CONSTRAINT transactions_valid_flow CHECK (
    is_deleted = true OR (
        (transaction_type = 'income' AND from_envelope_id IS NULL AND to_envelope_id IS NULL AND payee_id IS NULL AND income_source_id IS NOT NULL) OR
        (transaction_type = 'allocation' AND from_envelope_id IS NULL AND to_envelope_id IS NOT NULL AND payee_id IS NULL) OR
        (transaction_type = 'expense' AND from_envelope_id IS NOT NULL AND to_envelope_id IS NULL AND payee_id IS NOT NULL) OR
        (transaction_type = 'transfer' AND from_envelope_id IS NOT NULL AND to_envelope_id IS NOT NULL AND from_envelope_id != to_envelope_id AND payee_id IS NULL) OR
        (transaction_type = 'debt_payment' AND from_envelope_id IS NOT NULL AND to_envelope_id IS NULL AND payee_id IS NOT NULL)
    )
);