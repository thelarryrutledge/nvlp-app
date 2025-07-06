-- Migration: 013_fix_transaction_rls.sql
-- Purpose: Fix transaction RLS policies for soft delete functionality
-- Date: 2025-07-06

-- Drop the conflicting soft delete policy
DROP POLICY IF EXISTS "Users can soft delete transactions in own budgets" ON public.transactions;

-- Update the general update policy to allow soft delete
DROP POLICY IF EXISTS "Users can update transactions in own budgets" ON public.transactions;

CREATE POLICY "Users can update transactions in own budgets" 
    ON public.transactions 
    FOR UPDATE 
    USING (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
        -- Remove restriction on is_deleted to allow soft delete operations
    )
    WITH CHECK (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
        -- Allow updating to any state including soft delete
    );