-- Migration: 004_add_income_source_notifications_and_frequency.sql
-- Purpose: Add notification flag and frequency tracking to income_sources table
-- Date: 2025-07-06

-- Create enum type for income frequency
CREATE TYPE public.income_frequency AS ENUM (
    'weekly',
    'bi_weekly',        -- every other week
    'twice_monthly',    -- 15th and end of month
    'monthly',
    'annually',
    'custom',           -- specify custom day
    'one_time'          -- non-recurring
);

-- Add notification and frequency columns to income_sources table
ALTER TABLE public.income_sources 
ADD COLUMN should_notify BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN frequency public.income_frequency DEFAULT 'monthly' NOT NULL,
ADD COLUMN custom_day INTEGER, -- For custom frequency: day of month (1-31)
ADD COLUMN next_expected_date DATE; -- Calculated next expected income date

-- Add constraints
ALTER TABLE public.income_sources 
ADD CONSTRAINT income_sources_custom_day_valid 
    CHECK (custom_day IS NULL OR (custom_day >= 1 AND custom_day <= 31));

-- Add constraint that custom_day is required when frequency is 'custom'
ALTER TABLE public.income_sources 
ADD CONSTRAINT income_sources_custom_day_required 
    CHECK (
        (frequency = 'custom' AND custom_day IS NOT NULL) OR 
        (frequency != 'custom' AND custom_day IS NULL)
    );

-- Add helpful comments
COMMENT ON COLUMN public.income_sources.should_notify IS 'Whether to send notifications for this income source';
COMMENT ON COLUMN public.income_sources.frequency IS 'How often this income occurs';
COMMENT ON COLUMN public.income_sources.custom_day IS 'Day of month for custom frequency (1-31)';
COMMENT ON COLUMN public.income_sources.next_expected_date IS 'Next expected date for this income';

-- Create function to calculate next expected income date
CREATE OR REPLACE FUNCTION public.calculate_next_income_date(
    freq public.income_frequency,
    custom_day_param INTEGER DEFAULT NULL,
    last_date DATE DEFAULT CURRENT_DATE
) RETURNS DATE AS $$
DECLARE
    next_date DATE;
BEGIN
    CASE freq
        WHEN 'weekly' THEN
            next_date := last_date + INTERVAL '1 week';
        WHEN 'bi_weekly' THEN
            next_date := last_date + INTERVAL '2 weeks';
        WHEN 'twice_monthly' THEN
            -- For twice monthly, alternate between 15th and last day of month
            IF EXTRACT(DAY FROM last_date) < 15 THEN
                next_date := DATE_TRUNC('month', last_date) + INTERVAL '14 days'; -- 15th
            ELSE
                next_date := (DATE_TRUNC('month', last_date) + INTERVAL '1 month - 1 day'); -- Last day of month
            END IF;
        WHEN 'monthly' THEN
            next_date := last_date + INTERVAL '1 month';
        WHEN 'annually' THEN
            next_date := last_date + INTERVAL '1 year';
        WHEN 'custom' THEN
            IF custom_day_param IS NULL THEN
                RAISE EXCEPTION 'custom_day is required for custom frequency';
            END IF;
            -- Set to the custom day of next month
            next_date := DATE_TRUNC('month', last_date) + INTERVAL '1 month' + (custom_day_param - 1) * INTERVAL '1 day';
            -- Handle end of month edge cases
            IF EXTRACT(DAY FROM next_date) != custom_day_param THEN
                next_date := (DATE_TRUNC('month', next_date) + INTERVAL '1 month - 1 day');
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

-- Create function to update next_expected_date when frequency or custom_day changes
CREATE OR REPLACE FUNCTION public.update_income_next_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if frequency or custom_day changed
    IF (OLD.frequency IS DISTINCT FROM NEW.frequency) OR 
       (OLD.custom_day IS DISTINCT FROM NEW.custom_day) THEN
        NEW.next_expected_date := public.calculate_next_income_date(
            NEW.frequency, 
            NEW.custom_day, 
            COALESCE(NEW.next_expected_date, CURRENT_DATE)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update next_expected_date
CREATE TRIGGER update_income_next_date_trigger
    BEFORE UPDATE ON public.income_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.update_income_next_date();

-- Update existing records to have default next_expected_date
UPDATE public.income_sources 
SET next_expected_date = public.calculate_next_income_date(frequency, custom_day, CURRENT_DATE)
WHERE next_expected_date IS NULL;

-- Create index for notification queries
CREATE INDEX idx_income_sources_notifications ON public.income_sources(should_notify, next_expected_date) 
WHERE should_notify = true;

-- Create index for frequency queries
CREATE INDEX idx_income_sources_frequency ON public.income_sources(frequency);