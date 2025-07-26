-- Migration: Allow negative envelope totals
-- Purpose: Remove constraint that prevents negative total envelope balance to allow overspending
-- Date: 2025-07-26

-- Drop the constraint that prevents negative cached totals
-- This allows envelopes to go negative when users confirm overspending
ALTER TABLE public.user_state DROP CONSTRAINT IF EXISTS user_state_cached_totals_non_negative;

-- Add a more relaxed constraint that still prevents extremely negative values but allows reasonable overspending
ALTER TABLE public.user_state ADD CONSTRAINT user_state_cached_totals_reasonable CHECK (
    total_envelope_balance >= -99999.99 AND 
    total_income_this_month >= 0 AND 
    total_expenses_this_month >= 0 AND
    total_envelope_balance <= 999999.99
);

-- Add comment explaining the change
COMMENT ON CONSTRAINT user_state_cached_totals_reasonable ON public.user_state IS 'Allows negative envelope balances for overspending scenarios while preventing extreme values';