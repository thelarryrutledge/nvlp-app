-- Migration: 005_fix_income_date_calculation_trigger.sql
-- Purpose: Fix trigger to calculate next_expected_date on INSERT as well as UPDATE
-- Date: 2025-07-06

-- Drop the existing trigger
DROP TRIGGER IF EXISTS update_income_next_date_trigger ON public.income_sources;

-- Update the function to handle both INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.update_income_next_date()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT: always calculate the date
    -- For UPDATE: only update if frequency or custom_day changed
    IF TG_OP = 'INSERT' OR 
       (TG_OP = 'UPDATE' AND 
        ((OLD.frequency IS DISTINCT FROM NEW.frequency) OR 
         (OLD.custom_day IS DISTINCT FROM NEW.custom_day))) THEN
        
        NEW.next_expected_date := public.calculate_next_income_date(
            NEW.frequency, 
            NEW.custom_day, 
            COALESCE(NEW.next_expected_date, CURRENT_DATE)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for both INSERT and UPDATE
CREATE TRIGGER update_income_next_date_trigger
    BEFORE INSERT OR UPDATE ON public.income_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.update_income_next_date();

-- Update existing records that have null next_expected_date
UPDATE public.income_sources 
SET next_expected_date = public.calculate_next_income_date(frequency, custom_day, CURRENT_DATE)
WHERE next_expected_date IS NULL;