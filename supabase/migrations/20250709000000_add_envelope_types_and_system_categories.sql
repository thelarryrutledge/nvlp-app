-- Migration: Add envelope types (regular, savings, debt) and system categories
-- Purpose: Implement envelope type system with special savings and debt categories
-- Date: 2025-07-09
-- Changes:
--   - Add envelope_type column to envelopes (regular, savings, debt)
--   - Add debt-specific fields (debt_balance, minimum_payment, due_date)
--   - Add is_system_category flag to categories
--   - Create system categories (Savings, Debt)
--   - Add appropriate constraints and validation

-- Step 1: Add envelope_type column to envelopes table
ALTER TABLE public.envelopes 
ADD COLUMN envelope_type TEXT DEFAULT 'regular' NOT NULL
CHECK (envelope_type IN ('regular', 'savings', 'debt'));

-- Step 2: Add debt-specific fields to envelopes table
ALTER TABLE public.envelopes 
ADD COLUMN debt_balance DECIMAL(12,2) DEFAULT 0 NOT NULL,
ADD COLUMN minimum_payment DECIMAL(12,2),
ADD COLUMN due_date DATE;

-- Step 3: Add system category protection to categories table
ALTER TABLE public.categories 
ADD COLUMN is_system_category BOOLEAN DEFAULT false NOT NULL;

-- Step 4: Add constraints for envelope types
ALTER TABLE public.envelopes 
ADD CONSTRAINT envelopes_debt_balance_non_negative 
    CHECK (debt_balance >= 0);

ALTER TABLE public.envelopes 
ADD CONSTRAINT envelopes_minimum_payment_positive 
    CHECK (minimum_payment IS NULL OR minimum_payment > 0);

-- Step 5: Add type-specific validation constraints
ALTER TABLE public.envelopes 
ADD CONSTRAINT envelopes_debt_type_fields 
    CHECK (
        (envelope_type != 'debt') OR 
        (envelope_type = 'debt' AND debt_balance IS NOT NULL)
    );

-- Step 6: Create function to create system categories for existing budgets
CREATE OR REPLACE FUNCTION public.create_system_categories_for_budget(p_budget_id UUID)
RETURNS void AS $$
BEGIN
    -- Create Savings system category if it doesn't exist
    INSERT INTO public.categories (budget_id, name, description, color, category_type, is_system_category, sort_order)
    SELECT p_budget_id, 'Savings', 'Savings goals and long-term funds', '#4CAF50', 'expense', true, 999
    WHERE NOT EXISTS (
        SELECT 1 FROM public.categories 
        WHERE budget_id = p_budget_id 
        AND name = 'Savings' 
        AND is_system_category = true
    );

    -- Create Debt system category if it doesn't exist
    INSERT INTO public.categories (budget_id, name, description, color, category_type, is_system_category, sort_order)
    SELECT p_budget_id, 'Debt', 'Debt payments and loan management', '#F44336', 'expense', true, 1000
    WHERE NOT EXISTS (
        SELECT 1 FROM public.categories 
        WHERE budget_id = p_budget_id 
        AND name = 'Debt' 
        AND is_system_category = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create system categories for all existing budgets
DO $$ 
DECLARE
    budget_record RECORD;
BEGIN
    FOR budget_record IN SELECT id FROM public.budgets LOOP
        PERFORM public.create_system_categories_for_budget(budget_record.id);
    END LOOP;
END $$;

-- Step 8: Update the default category creation function to include system categories
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default expense categories for new budgets
    INSERT INTO public.categories (budget_id, name, description, color, category_type, sort_order)
    VALUES 
        (NEW.id, 'Groceries', 'Food and grocery expenses', '#4CAF50', 'expense', 1),
        (NEW.id, 'Transportation', 'Gas, public transit, car expenses', '#2196F3', 'expense', 2),
        (NEW.id, 'Utilities', 'Electricity, water, internet, phone', '#FF9800', 'expense', 3),
        (NEW.id, 'Entertainment', 'Movies, dining out, hobbies', '#9C27B0', 'expense', 4),
        (NEW.id, 'Healthcare', 'Medical, dental, insurance', '#F44336', 'expense', 5),
        (NEW.id, 'Housing', 'Rent, mortgage, maintenance', '#795548', 'expense', 6),
        (NEW.id, 'Personal Care', 'Clothing, haircuts, personal items', '#E91E63', 'expense', 7),
        (NEW.id, 'Other Expenses', 'Miscellaneous expenses', '#607D8B', 'expense', 8),
        -- Default income categories
        (NEW.id, 'Salary Income', 'Regular salary and wages', '#8BC34A', 'income', 1),
        (NEW.id, 'Other Income', 'Bonus, gifts, miscellaneous income', '#CDDC39', 'income', 2);
    
    -- Create system categories
    PERFORM public.create_system_categories_for_budget(NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Add RLS policies to prevent modification of system categories
CREATE POLICY "Users cannot update system categories" 
    ON public.categories 
    FOR UPDATE 
    USING (is_system_category = false)
    WITH CHECK (is_system_category = false);

CREATE POLICY "Users cannot delete system categories" 
    ON public.categories 
    FOR DELETE 
    USING (is_system_category = false);

-- Step 10: Create validation function for envelope type and category compatibility
CREATE OR REPLACE FUNCTION public.validate_envelope_type_category()
RETURNS TRIGGER AS $$
DECLARE
    category_name TEXT;
BEGIN
    -- If category_id is provided, get the category name
    IF NEW.category_id IS NOT NULL THEN
        SELECT name INTO category_name 
        FROM public.categories 
        WHERE id = NEW.category_id;
        
        -- Validate envelope type and category compatibility
        IF NEW.envelope_type = 'savings' AND category_name != 'Savings' THEN
            RAISE EXCEPTION 'Savings envelopes must be in the Savings category';
        END IF;
        
        IF NEW.envelope_type = 'debt' AND category_name != 'Debt' THEN
            RAISE EXCEPTION 'Debt envelopes must be in the Debt category';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create trigger for envelope type validation
CREATE TRIGGER validate_envelope_type_category_trigger
    BEFORE INSERT OR UPDATE ON public.envelopes
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_envelope_type_category();

-- Step 12: Add indexes for performance
CREATE INDEX idx_envelopes_envelope_type ON public.envelopes(envelope_type);
CREATE INDEX idx_envelopes_debt_balance ON public.envelopes(debt_balance) WHERE envelope_type = 'debt';
CREATE INDEX idx_envelopes_due_date ON public.envelopes(due_date) WHERE envelope_type = 'debt' AND due_date IS NOT NULL;
CREATE INDEX idx_categories_is_system ON public.categories(is_system_category);

-- Step 13: Add helpful comments
COMMENT ON COLUMN public.envelopes.envelope_type IS 'Type of envelope: regular, savings, or debt';
COMMENT ON COLUMN public.envelopes.debt_balance IS 'Current debt balance (for debt envelopes)';
COMMENT ON COLUMN public.envelopes.minimum_payment IS 'Minimum payment amount (for debt envelopes, display only)';
COMMENT ON COLUMN public.envelopes.due_date IS 'Payment due date (for debt envelopes, display only)';
COMMENT ON COLUMN public.categories.is_system_category IS 'Whether this is a system-created category that cannot be modified';

-- Step 14: Update table comments
COMMENT ON TABLE public.envelopes IS 'Envelopes for budget allocation with support for regular, savings, and debt types';
COMMENT ON TABLE public.categories IS 'Transaction categories including system categories for savings and debt';