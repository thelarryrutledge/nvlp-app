-- Migration: Add unique budget name constraint per user
-- Purpose: Prevent users from creating multiple budgets with the same name
-- Date: 2025-07-08
-- Issue: Currently allows duplicate budget names for the same user

-- Add unique constraint on (user_id, name) to ensure each user has unique budget names
ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_unique_name_per_user 
UNIQUE (user_id, name);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT budgets_unique_name_per_user ON public.budgets IS 'Ensures each user cannot have duplicate budget names';

-- Note: This migration will fail if there are existing duplicate budget names
-- In that case, you would need to:
-- 1. Identify duplicates: SELECT user_id, name, COUNT(*) FROM budgets GROUP BY user_id, name HAVING COUNT(*) > 1;
-- 2. Rename or delete duplicates before applying this migration