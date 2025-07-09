-- Migration: Split debt category into multiple system categories
-- Purpose: Create Loans and Credit Cards as additional system categories for better debt organization
-- Date: 2025-07-09

-- First, update the validation function to accept multiple debt categories
CREATE OR REPLACE FUNCTION public.validate_envelope_type_category()
RETURNS TRIGGER AS $$
DECLARE
    category_name TEXT;
    is_system_cat BOOLEAN;
BEGIN
    -- If category_id is provided, get the category details
    IF NEW.category_id IS NOT NULL THEN
        SELECT name, is_system_category INTO category_name, is_system_cat
        FROM public.categories 
        WHERE id = NEW.category_id;
        
        -- Validate envelope type and category compatibility
        IF NEW.envelope_type = 'savings' AND category_name != 'Savings' THEN
            RAISE EXCEPTION 'Savings envelopes must be in the Savings category';
        END IF;
        
        -- Debt envelopes can be in any of the debt-related system categories
        IF NEW.envelope_type = 'debt' AND NOT (category_name IN ('Debt', 'Loans', 'Credit Cards') AND is_system_cat = true) THEN
            RAISE EXCEPTION 'Debt envelopes must be in a debt-related system category (Debt, Loans, or Credit Cards)';
        END IF;
        
        -- Regular envelopes cannot be in system categories
        IF NEW.envelope_type = 'regular' AND is_system_cat = true THEN
            RAISE EXCEPTION 'Regular envelopes cannot be placed in system categories';
        END IF;
    END IF;
    
    -- Ensure debt envelopes have required fields
    IF NEW.envelope_type = 'debt' THEN
        IF NEW.debt_balance IS NULL OR NEW.debt_balance < 0 THEN
            RAISE EXCEPTION 'Debt envelopes must have a non-negative debt_balance';
        END IF;
    END IF;
    
    -- Clear debt-specific fields for non-debt envelopes
    IF NEW.envelope_type != 'debt' THEN
        NEW.debt_balance := 0;
        NEW.minimum_payment := NULL;
        NEW.due_date := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the function to create additional debt categories
CREATE OR REPLACE FUNCTION public.create_system_categories_for_budget(p_budget_id UUID)
RETURNS void AS $$
BEGIN
    -- Create Savings system category if it doesn't exist
    INSERT INTO public.categories (budget_id, name, description, color, category_type, is_system_category, sort_order)
    SELECT p_budget_id, 'Savings', 'Savings goals and long-term funds', '#4CAF50', 'expense', true, 997
    WHERE NOT EXISTS (
        SELECT 1 FROM public.categories 
        WHERE budget_id = p_budget_id 
        AND name = 'Savings' 
        AND is_system_category = true
    );

    -- Create Loans system category if it doesn't exist
    INSERT INTO public.categories (budget_id, name, description, color, category_type, is_system_category, sort_order)
    SELECT p_budget_id, 'Loans', 'Personal loans, auto loans, and other term loans', '#FF5722', 'expense', true, 998
    WHERE NOT EXISTS (
        SELECT 1 FROM public.categories 
        WHERE budget_id = p_budget_id 
        AND name = 'Loans' 
        AND is_system_category = true
    );

    -- Create Credit Cards system category if it doesn't exist
    INSERT INTO public.categories (budget_id, name, description, color, category_type, is_system_category, sort_order)
    SELECT p_budget_id, 'Credit Cards', 'Credit card balances and payments', '#F44336', 'expense', true, 999
    WHERE NOT EXISTS (
        SELECT 1 FROM public.categories 
        WHERE budget_id = p_budget_id 
        AND name = 'Credit Cards' 
        AND is_system_category = true
    );

    -- Create general Debt system category if it doesn't exist (for other types of debt)
    INSERT INTO public.categories (budget_id, name, description, color, category_type, is_system_category, sort_order)
    SELECT p_budget_id, 'Debt', 'Other debt payments and obligations', '#D32F2F', 'expense', true, 1000
    WHERE NOT EXISTS (
        SELECT 1 FROM public.categories 
        WHERE budget_id = p_budget_id 
        AND name = 'Debt' 
        AND is_system_category = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the new categories for all existing budgets
DO $$ 
DECLARE
    budget_record RECORD;
BEGIN
    FOR budget_record IN SELECT id FROM public.budgets LOOP
        -- First remove the old broad "Debt" category if it exists
        DELETE FROM public.categories 
        WHERE budget_id = budget_record.id 
        AND name = 'Debt' 
        AND is_system_category = true;
        
        -- Then create all system categories including the new ones
        PERFORM public.create_system_categories_for_budget(budget_record.id);
    END LOOP;
END $$;

-- Add helpful comment
COMMENT ON FUNCTION public.validate_envelope_type_category IS 'Validates envelope type and category compatibility: savings->Savings, debt->Loans/Credit Cards/Debt, regular->non-system categories';