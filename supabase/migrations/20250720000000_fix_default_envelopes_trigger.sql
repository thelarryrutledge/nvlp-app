-- Migration: Fix default envelopes trigger to use correct column names
-- Purpose: Update trigger function to use notify_above_amount instead of target_amount
-- Date: 2025-07-20
-- Fix: Update create_default_envelopes function to use renamed columns

-- Drop the trigger first, then the function
DROP TRIGGER IF EXISTS create_default_envelopes_on_budget_creation ON public.budgets;
DROP FUNCTION IF EXISTS public.create_default_envelopes();

CREATE OR REPLACE FUNCTION public.create_default_envelopes()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default envelopes for new budgets using correct column names
    INSERT INTO public.envelopes (budget_id, name, description, color, notify_above_amount, sort_order)
    VALUES 
        (NEW.id, 'Emergency Fund', 'Emergency fund for unexpected expenses', '#F44336', 1000.00, 1),
        (NEW.id, 'Groceries', 'Monthly grocery budget', '#4CAF50', 400.00, 2),
        (NEW.id, 'Transportation', 'Gas, public transit, car expenses', '#2196F3', 200.00, 3),
        (NEW.id, 'Entertainment', 'Movies, dining out, fun activities', '#9C27B0', 150.00, 4),
        (NEW.id, 'Utilities', 'Electricity, water, internet, phone bills', '#FF9800', 300.00, 5),
        (NEW.id, 'Personal Care', 'Clothing, haircuts, personal items', '#E91E63', 100.00, 6),
        (NEW.id, 'Savings Goals', 'Long-term savings and goals', '#8BC34A', 500.00, 7),
        (NEW.id, 'Miscellaneous', 'Other expenses and flexible spending', '#607D8B', 200.00, 8);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger with the fixed function
CREATE TRIGGER create_default_envelopes_on_budget_creation
    AFTER INSERT ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_envelopes();

-- Update the comment to reflect the fix
COMMENT ON FUNCTION public.create_default_envelopes() IS 'Creates default envelopes for new budgets using correct column names';