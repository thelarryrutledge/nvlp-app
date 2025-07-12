-- Migration: 014_fix_transaction_rls_v2.sql
-- Purpose: Properly fix transaction RLS policies for soft delete functionality
-- Date: 2025-07-06

-- Drop ALL existing update policies
DROP POLICY IF EXISTS "Users can update transactions in own budgets" ON public.transactions;
DROP POLICY IF EXISTS "Users can soft delete transactions in own budgets" ON public.transactions;

-- Create a single comprehensive update policy that handles all cases
CREATE POLICY "Users can update/delete transactions in own budgets" 
    ON public.transactions 
    FOR UPDATE 
    USING (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    );