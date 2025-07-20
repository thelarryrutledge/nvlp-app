-- Migration: Auto-manage default budget
-- Purpose: Automatically unset previous default when setting a new default budget
-- Date: 2025-07-20
-- Fix: Handle default budget switching automatically

-- Create function to manage default budget switching
CREATE OR REPLACE FUNCTION public.manage_default_budget()
RETURNS TRIGGER AS $$
BEGIN
    -- If the new/updated budget is being set as default
    IF NEW.is_default = true THEN
        -- First, set all other budgets for this user to non-default
        UPDATE public.budgets 
        SET is_default = false, updated_at = NOW()
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_default = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for INSERT operations (budget creation)
CREATE TRIGGER manage_default_budget_insert
    BEFORE INSERT ON public.budgets
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION public.manage_default_budget();

-- Create trigger for UPDATE operations (budget editing)
CREATE TRIGGER manage_default_budget_update
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW
    WHEN (NEW.is_default = true AND (OLD.is_default = false OR OLD.is_default IS NULL))
    EXECUTE FUNCTION public.manage_default_budget();

-- Add helpful comments
COMMENT ON FUNCTION public.manage_default_budget() IS 'Automatically manages default budget by unsetting previous default when a new one is set';
COMMENT ON TRIGGER manage_default_budget_insert ON public.budgets IS 'Handles default budget switching during budget creation';
COMMENT ON TRIGGER manage_default_budget_update ON public.budgets IS 'Handles default budget switching during budget updates';