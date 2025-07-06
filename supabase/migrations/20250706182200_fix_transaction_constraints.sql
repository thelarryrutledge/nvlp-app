-- Migration: 010_fix_transaction_constraints.sql
-- Purpose: Remove individual transaction flow constraints that conflict with each other
-- Date: 2025-07-06

-- Drop the individual constraints that are causing conflicts
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_income_flow,
DROP CONSTRAINT IF EXISTS transactions_allocation_flow,
DROP CONSTRAINT IF EXISTS transactions_expense_flow,
DROP CONSTRAINT IF EXISTS transactions_transfer_flow,
DROP CONSTRAINT IF EXISTS transactions_debt_payment_flow;

-- The transactions_valid_flow constraint remains and handles all validation