-- Migration: Fix budget default constraint
-- Purpose: Allow multiple non-default budgets per user
-- Date: 2025-07-07
-- Issue: Current constraint UNIQUE (user_id, is_default) prevents multiple non-default budgets

-- Drop the existing constraint that's too restrictive
ALTER TABLE public.budgets 
DROP CONSTRAINT IF EXISTS budgets_user_default_unique;

-- Add new partial unique constraint that only enforces uniqueness for default budgets
-- This allows:
-- - Each user to have exactly ONE budget with is_default = true
-- - Each user to have UNLIMITED budgets with is_default = false
CREATE UNIQUE INDEX budgets_user_default_unique 
ON public.budgets (user_id) 
WHERE is_default = true;

-- Add comment explaining the constraint
COMMENT ON INDEX budgets_user_default_unique IS 'Ensures each user can have only one default budget while allowing multiple non-default budgets';

-- Note: This migration fixes the constraint to allow multiple non-default budgets per user
-- Testing should be done after migration using actual user accounts