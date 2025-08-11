-- Replace frequency system with comprehensive schedule system for income sources
-- This migration fixes the frequency/frequency_days mismatch and adds proper scheduling

BEGIN;

-- Remove the old frequency constraint
ALTER TABLE public.income_sources DROP CONSTRAINT IF EXISTS income_sources_frequency_check;

-- Drop the old frequency column (if it exists)
ALTER TABLE public.income_sources DROP COLUMN IF EXISTS frequency;

-- Add new schedule system columns
ALTER TABLE public.income_sources 
  ADD COLUMN IF NOT EXISTS schedule_type TEXT CHECK (schedule_type IN (
    'weekly', 'biweekly', 'monthly', 'semi_monthly', 'quarterly', 'yearly', 'one_time'
  )),
  ADD COLUMN IF NOT EXISTS schedule_config JSONB;

-- Remove frequency_days column (was causing schema mismatch)
ALTER TABLE public.income_sources DROP COLUMN IF EXISTS frequency_days;

-- Create index on schedule fields for efficient queries
CREATE INDEX IF NOT EXISTS idx_income_sources_schedule_type ON public.income_sources(schedule_type);
CREATE INDEX IF NOT EXISTS idx_income_sources_schedule_config ON public.income_sources USING GIN(schedule_config);

-- Add validation function for schedule_config based on schedule_type
CREATE OR REPLACE FUNCTION validate_income_schedule_config()
RETURNS TRIGGER AS $$
BEGIN
  -- If schedule_type is null, schedule_config should also be null
  IF NEW.schedule_type IS NULL THEN
    NEW.schedule_config := NULL;
    RETURN NEW;
  END IF;

  -- Validate schedule_config based on schedule_type
  CASE NEW.schedule_type
    WHEN 'weekly' THEN
      IF NOT (NEW.schedule_config ? 'day_of_week' AND 
              (NEW.schedule_config->>'day_of_week')::int BETWEEN 0 AND 6) THEN
        RAISE EXCEPTION 'Weekly schedule requires day_of_week (0-6)';
      END IF;
      
    WHEN 'biweekly' THEN
      IF NOT (NEW.schedule_config ? 'day_of_week' AND NEW.schedule_config ? 'start_date' AND
              (NEW.schedule_config->>'day_of_week')::int BETWEEN 0 AND 6) THEN
        RAISE EXCEPTION 'Biweekly schedule requires day_of_week (0-6) and start_date';
      END IF;
      
    WHEN 'monthly' THEN
      IF NOT (NEW.schedule_config ? 'day_of_month' AND
              ((NEW.schedule_config->>'day_of_month')::int BETWEEN 1 AND 31 OR 
               (NEW.schedule_config->>'day_of_month')::int = -1)) THEN
        RAISE EXCEPTION 'Monthly schedule requires day_of_month (1-31 or -1 for last day)';
      END IF;
      
    WHEN 'semi_monthly' THEN
      IF NOT (NEW.schedule_config ? 'pay_dates' AND 
              jsonb_array_length(NEW.schedule_config->'pay_dates') = 2) THEN
        RAISE EXCEPTION 'Semi-monthly schedule requires pay_dates array with 2 elements';
      END IF;
      
    WHEN 'quarterly' THEN
      IF NOT (NEW.schedule_config ? 'month_of_quarter' AND NEW.schedule_config ? 'day_of_month' AND
              (NEW.schedule_config->>'month_of_quarter')::int BETWEEN 1 AND 3 AND
              ((NEW.schedule_config->>'day_of_month')::int BETWEEN 1 AND 31 OR 
               (NEW.schedule_config->>'day_of_month')::int = -1)) THEN
        RAISE EXCEPTION 'Quarterly schedule requires month_of_quarter (1-3) and day_of_month (1-31 or -1)';
      END IF;
      
    WHEN 'yearly' THEN
      IF NOT (NEW.schedule_config ? 'month' AND NEW.schedule_config ? 'day_of_month' AND
              (NEW.schedule_config->>'month')::int BETWEEN 1 AND 12 AND
              ((NEW.schedule_config->>'day_of_month')::int BETWEEN 1 AND 31 OR 
               (NEW.schedule_config->>'day_of_month')::int = -1)) THEN
        RAISE EXCEPTION 'Yearly schedule requires month (1-12) and day_of_month (1-31 or -1)';
      END IF;
      
    WHEN 'one_time' THEN
      IF NOT (NEW.schedule_config ? 'date') THEN
        RAISE EXCEPTION 'One-time schedule requires date field';
      END IF;
      
    ELSE
      RAISE EXCEPTION 'Invalid schedule_type: %', NEW.schedule_type;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate schedule config
DROP TRIGGER IF EXISTS validate_schedule_config_trigger ON public.income_sources;
CREATE TRIGGER validate_schedule_config_trigger
  BEFORE INSERT OR UPDATE ON public.income_sources
  FOR EACH ROW
  EXECUTE FUNCTION validate_income_schedule_config();

-- Add comment explaining the new schedule system
COMMENT ON COLUMN public.income_sources.schedule_type IS 'Type of schedule: weekly, biweekly, monthly, semi_monthly, quarterly, yearly, one_time';
COMMENT ON COLUMN public.income_sources.schedule_config IS 'JSON configuration for the schedule type. Structure varies by schedule_type.';

COMMIT;