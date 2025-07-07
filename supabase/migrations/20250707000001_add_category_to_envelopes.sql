-- Migration: Add category relationship to envelopes table
-- Purpose: Link envelopes to categories for proper grouping and organization
-- Date: 2025-07-07

-- Add category_id column to envelopes table
ALTER TABLE public.envelopes 
ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_envelopes_category_id ON public.envelopes(category_id);

-- Add comment for documentation
COMMENT ON COLUMN public.envelopes.category_id IS 'Foreign key to categories.id for grouping envelopes';

-- Update the RLS policy validation function to include category ownership check
CREATE OR REPLACE FUNCTION public.validate_envelope_category_ownership()
RETURNS TRIGGER AS $$
BEGIN
    -- If category_id is provided, ensure it belongs to the same budget
    IF NEW.category_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.categories 
            WHERE id = NEW.category_id 
            AND budget_id = NEW.budget_id
        ) THEN
            RAISE EXCEPTION 'Category does not belong to this budget';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate category ownership
CREATE TRIGGER validate_envelope_category_ownership_trigger
    BEFORE INSERT OR UPDATE ON public.envelopes
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_envelope_category_ownership();

-- Optional: Create a default "General" category for existing envelopes without categories
-- This ensures existing envelopes can be assigned to a category if needed

-- Note: Category-budget consistency is enforced by the trigger function above
-- CHECK constraints cannot use subqueries in PostgreSQL