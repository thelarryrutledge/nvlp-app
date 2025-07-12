-- Migration: Add automatic user_id to budgets table
-- Purpose: Automatically set user_id to auth.uid() when creating budgets
-- Date: 2025-07-08
-- Issue: Currently requires manual user_id in request body, breaking API design principles

-- Option 1: Add DEFAULT clause (simple but less flexible)
-- ALTER TABLE public.budgets ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Option 2: Create trigger to set user_id (more flexible, allows overrides)
CREATE OR REPLACE FUNCTION public.set_budget_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If user_id is not provided, set it to the authenticated user's ID
    IF NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    
    -- Ensure the user_id matches the authenticated user (security check)
    IF NEW.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot create budget for another user';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set user_id
CREATE TRIGGER set_budget_user_id_trigger
    BEFORE INSERT ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.set_budget_user_id();

-- Add comment explaining the behavior
COMMENT ON TRIGGER set_budget_user_id_trigger ON public.budgets IS 'Automatically sets user_id to auth.uid() if not provided, and ensures users cannot create budgets for other users';

-- Test the fix by creating a budget without user_id
-- This should now work: INSERT INTO budgets (name, description) VALUES ('Test', 'Test budget');