-- Migration: Add flexible day selection for income frequencies
-- Purpose: Allow users to specify which day of week/month for recurring income
-- Date: 2025-07-08
-- Issue: Currently weekly/bi_weekly/monthly use creation date, not user preference

-- Add columns for flexible day selection
ALTER TABLE public.income_sources 
ADD COLUMN weekly_day INTEGER, -- Day of week (0-6, where 0=Sunday, 6=Saturday)
ADD COLUMN monthly_day INTEGER; -- Day of month (1-31) for monthly frequency

-- Add constraints for valid day values
ALTER TABLE public.income_sources 
ADD CONSTRAINT income_sources_weekly_day_valid 
    CHECK (weekly_day IS NULL OR (weekly_day >= 0 AND weekly_day <= 6)),
ADD CONSTRAINT income_sources_monthly_day_valid 
    CHECK (monthly_day IS NULL OR (monthly_day >= 1 AND monthly_day <= 31));

-- First, update existing records to have default values before adding required constraints
-- For existing weekly/bi_weekly income sources, set to current day of week
UPDATE public.income_sources 
SET weekly_day = EXTRACT(DOW FROM COALESCE(next_expected_date, created_at))::INTEGER
WHERE frequency IN ('weekly', 'bi_weekly') AND weekly_day IS NULL;

-- For existing monthly income sources, set to current day of month
UPDATE public.income_sources 
SET monthly_day = EXTRACT(DAY FROM COALESCE(next_expected_date, created_at))::INTEGER
WHERE frequency = 'monthly' AND monthly_day IS NULL;

-- Now add constraint that weekly_day is required for weekly/bi_weekly frequencies
ALTER TABLE public.income_sources 
ADD CONSTRAINT income_sources_weekly_day_required 
    CHECK (
        (frequency IN ('weekly', 'bi_weekly') AND weekly_day IS NOT NULL) OR 
        (frequency NOT IN ('weekly', 'bi_weekly'))
    );

-- Add constraint that monthly_day is required for monthly frequency
ALTER TABLE public.income_sources 
ADD CONSTRAINT income_sources_monthly_day_required 
    CHECK (
        (frequency = 'monthly' AND monthly_day IS NOT NULL) OR 
        (frequency != 'monthly')
    );

-- Update the calculation function to use the new day fields
CREATE OR REPLACE FUNCTION public.calculate_next_income_date(
    freq public.income_frequency,
    custom_day_param INTEGER DEFAULT NULL,
    last_date DATE DEFAULT CURRENT_DATE,
    weekly_day_param INTEGER DEFAULT NULL,
    monthly_day_param INTEGER DEFAULT NULL
) RETURNS DATE AS $$
DECLARE
    next_date DATE;
    temp_date DATE;
    days_until_target INTEGER;
BEGIN
    CASE freq
        WHEN 'weekly' THEN
            -- Calculate next occurrence of the specified day of week
            IF weekly_day_param IS NULL THEN
                RAISE EXCEPTION 'weekly_day is required for weekly frequency';
            END IF;
            -- Get the number of days until the target day
            days_until_target := (weekly_day_param - EXTRACT(DOW FROM last_date)::INTEGER + 7) % 7;
            -- If it's 0, we want next week's occurrence
            IF days_until_target = 0 THEN
                days_until_target := 7;
            END IF;
            next_date := last_date + days_until_target * INTERVAL '1 day';
            
        WHEN 'bi_weekly' THEN
            -- Calculate next occurrence of the specified day of week (2 weeks out)
            IF weekly_day_param IS NULL THEN
                RAISE EXCEPTION 'weekly_day is required for bi_weekly frequency';
            END IF;
            -- First get to the next occurrence of the day
            days_until_target := (weekly_day_param - EXTRACT(DOW FROM last_date)::INTEGER + 7) % 7;
            IF days_until_target = 0 THEN
                days_until_target := 7;
            END IF;
            -- Then add another week
            next_date := last_date + days_until_target * INTERVAL '1 day' + INTERVAL '1 week';
            
        WHEN 'twice_monthly' THEN
            -- For twice monthly, alternate between 15th and last day of month
            IF EXTRACT(DAY FROM last_date) < 15 THEN
                next_date := DATE_TRUNC('month', last_date) + INTERVAL '14 days'; -- 15th
            ELSE
                next_date := (DATE_TRUNC('month', last_date) + INTERVAL '1 month - 1 day'); -- Last day of month
            END IF;
            
        WHEN 'monthly' THEN
            -- Set to the specified day of next month
            IF monthly_day_param IS NULL THEN
                RAISE EXCEPTION 'monthly_day is required for monthly frequency';
            END IF;
            -- Get the first of next month
            temp_date := DATE_TRUNC('month', last_date) + INTERVAL '1 month';
            -- Add the days to get to the target day
            next_date := temp_date + (monthly_day_param - 1) * INTERVAL '1 day';
            -- Handle end of month edge cases (e.g., 31st in a 30-day month)
            IF EXTRACT(MONTH FROM next_date) != EXTRACT(MONTH FROM temp_date) THEN
                -- We've gone into the next month, so use last day of intended month
                next_date := temp_date + INTERVAL '1 month - 1 day' - INTERVAL '1 month';
            END IF;
            
        WHEN 'annually' THEN
            next_date := last_date + INTERVAL '1 year';
            
        WHEN 'custom' THEN
            IF custom_day_param IS NULL THEN
                RAISE EXCEPTION 'custom_day is required for custom frequency';
            END IF;
            -- Set to the custom day of next month
            temp_date := DATE_TRUNC('month', last_date) + INTERVAL '1 month';
            next_date := temp_date + (custom_day_param - 1) * INTERVAL '1 day';
            -- Handle end of month edge cases
            IF EXTRACT(MONTH FROM next_date) != EXTRACT(MONTH FROM temp_date) THEN
                next_date := temp_date + INTERVAL '1 month - 1 day' - INTERVAL '1 month';
            END IF;
            
        WHEN 'one_time' THEN
            -- One-time income doesn't have a next date
            next_date := NULL;
            
        ELSE
            RAISE EXCEPTION 'Unknown frequency: %', freq;
    END CASE;
    
    RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function to pass the new parameters
CREATE OR REPLACE FUNCTION public.update_income_next_date()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT: always calculate the date
    -- For UPDATE: only update if frequency, custom_day, weekly_day, or monthly_day changed
    IF TG_OP = 'INSERT' OR 
       (TG_OP = 'UPDATE' AND 
        ((OLD.frequency IS DISTINCT FROM NEW.frequency) OR 
         (OLD.custom_day IS DISTINCT FROM NEW.custom_day) OR
         (OLD.weekly_day IS DISTINCT FROM NEW.weekly_day) OR
         (OLD.monthly_day IS DISTINCT FROM NEW.monthly_day))) THEN
        
        NEW.next_expected_date := public.calculate_next_income_date(
            NEW.frequency, 
            NEW.custom_day,
            COALESCE(NEW.next_expected_date, CURRENT_DATE),
            NEW.weekly_day,
            NEW.monthly_day
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON COLUMN public.income_sources.weekly_day IS 'Day of week for weekly/bi_weekly frequency (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN public.income_sources.monthly_day IS 'Day of month for monthly frequency (1-31)';

-- Recalculate next_expected_date for all affected income sources
UPDATE public.income_sources 
SET next_expected_date = public.calculate_next_income_date(
    frequency, 
    custom_day,
    CURRENT_DATE,
    weekly_day,
    monthly_day
)
WHERE frequency IN ('weekly', 'bi_weekly', 'monthly');