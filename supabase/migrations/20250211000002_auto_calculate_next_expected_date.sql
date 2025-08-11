-- Auto-calculate next_expected_date for income sources based on schedule configuration

BEGIN;

-- Function to calculate next expected date based on schedule type and config
CREATE OR REPLACE FUNCTION calculate_next_expected_date(
  schedule_type TEXT,
  schedule_config JSONB,
  reference_date DATE DEFAULT CURRENT_DATE
) RETURNS DATE AS $$
DECLARE
  day_of_week INT;
  day_of_month INT;
  pay_dates INT[];
  start_date DATE;
  weeks_diff INT;
  next_date DATE;
  date1 DATE;
  date2 DATE;
  month_num INT;
  year_num INT;
BEGIN
  IF schedule_type IS NULL OR schedule_config IS NULL THEN
    RETURN NULL;
  END IF;

  CASE schedule_type
    WHEN 'weekly' THEN
      -- Calculate next occurrence of the specified day of week
      day_of_week := (schedule_config->>'day_of_week')::INT;
      -- PostgreSQL: Sunday = 0, Monday = 1, etc.
      -- Find next occurrence of this day
      next_date := reference_date + ((day_of_week - EXTRACT(DOW FROM reference_date)::INT + 7) % 7)::INT;
      -- If it's today and we want the next occurrence, add a week
      IF next_date = reference_date THEN
        next_date := next_date + 7;
      END IF;
      RETURN next_date;

    WHEN 'biweekly' THEN
      -- Calculate based on start_date and day_of_week
      day_of_week := (schedule_config->>'day_of_week')::INT;
      start_date := (schedule_config->>'start_date')::DATE;
      
      -- Find the number of weeks since start date
      weeks_diff := FLOOR((reference_date - start_date)::NUMERIC / 7);
      
      -- If weeks_diff is even, we're in an "on" week, if odd, we're in an "off" week
      -- Find the next occurrence
      IF weeks_diff % 2 = 0 THEN
        -- We're in an "on" week, find this week's occurrence
        next_date := reference_date + ((day_of_week - EXTRACT(DOW FROM reference_date)::INT + 7) % 7)::INT;
        IF next_date <= reference_date THEN
          -- Already passed this week, skip to week after next
          next_date := next_date + 14;
        END IF;
      ELSE
        -- We're in an "off" week, find next week's occurrence
        next_date := reference_date + ((day_of_week - EXTRACT(DOW FROM reference_date)::INT + 7) % 7)::INT + 7;
      END IF;
      RETURN next_date;

    WHEN 'monthly' THEN
      -- Calculate next occurrence of the specified day of month
      day_of_month := (schedule_config->>'day_of_month')::INT;
      
      IF day_of_month = -1 THEN
        -- Last day of month
        -- Get last day of current month
        next_date := (DATE_TRUNC('month', reference_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        IF next_date <= reference_date THEN
          -- Move to last day of next month
          next_date := (DATE_TRUNC('month', reference_date) + INTERVAL '2 months' - INTERVAL '1 day')::DATE;
        END IF;
      ELSE
        -- Specific day of month
        -- Try current month first
        next_date := DATE_TRUNC('month', reference_date)::DATE + (day_of_month - 1);
        IF next_date <= reference_date THEN
          -- Move to next month
          next_date := (DATE_TRUNC('month', reference_date) + INTERVAL '1 month')::DATE + (day_of_month - 1);
        END IF;
        -- Handle months with fewer days (e.g., 31st in February)
        IF EXTRACT(DAY FROM next_date) != day_of_month THEN
          -- Use last day of month if day doesn't exist
          next_date := (DATE_TRUNC('month', next_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        END IF;
      END IF;
      RETURN next_date;

    WHEN 'semi_monthly' THEN
      -- Calculate next occurrence from two pay dates
      pay_dates := ARRAY(SELECT jsonb_array_elements_text(schedule_config->'pay_dates')::INT);
      
      -- Calculate both possible dates in current month
      IF pay_dates[1] = -1 THEN
        date1 := (DATE_TRUNC('month', reference_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
      ELSE
        date1 := DATE_TRUNC('month', reference_date)::DATE + (pay_dates[1] - 1);
      END IF;
      
      IF pay_dates[2] = -1 THEN
        date2 := (DATE_TRUNC('month', reference_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
      ELSE
        date2 := DATE_TRUNC('month', reference_date)::DATE + (pay_dates[2] - 1);
      END IF;
      
      -- Find the next date
      IF date1 > reference_date AND date1 <= date2 THEN
        next_date := date1;
      ELSIF date2 > reference_date THEN
        next_date := date2;
      ELSE
        -- Both dates passed, move to next month
        IF pay_dates[1] = -1 THEN
          date1 := (DATE_TRUNC('month', reference_date) + INTERVAL '2 months' - INTERVAL '1 day')::DATE;
        ELSE
          date1 := (DATE_TRUNC('month', reference_date) + INTERVAL '1 month')::DATE + (pay_dates[1] - 1);
        END IF;
        next_date := date1;
      END IF;
      RETURN next_date;

    WHEN 'quarterly' THEN
      -- Calculate next quarterly occurrence
      day_of_month := (schedule_config->>'day_of_month')::INT;
      month_num := (schedule_config->>'month_of_quarter')::INT;
      
      -- Determine current quarter and target month
      -- Quarter months: 1,4,7,10 (month_of_quarter=1), 2,5,8,11 (month_of_quarter=2), 3,6,9,12 (month_of_quarter=3)
      year_num := EXTRACT(YEAR FROM reference_date)::INT;
      
      -- Find next occurrence
      FOR i IN 0..3 LOOP
        month_num := ((EXTRACT(QUARTER FROM reference_date)::INT - 1 + i) * 3) + (schedule_config->>'month_of_quarter')::INT;
        IF month_num > 12 THEN
          month_num := month_num - 12;
          year_num := EXTRACT(YEAR FROM reference_date)::INT + 1;
        END IF;
        
        IF day_of_month = -1 THEN
          next_date := (DATE(year_num || '-' || month_num || '-01') + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        ELSE
          next_date := DATE(year_num || '-' || month_num || '-' || LEAST(day_of_month, 
            EXTRACT(DAY FROM (DATE(year_num || '-' || month_num || '-01') + INTERVAL '1 month' - INTERVAL '1 day'))::INT));
        END IF;
        
        IF next_date > reference_date THEN
          RETURN next_date;
        END IF;
      END LOOP;

    WHEN 'yearly' THEN
      -- Calculate next yearly occurrence
      month_num := (schedule_config->>'month')::INT;
      day_of_month := (schedule_config->>'day_of_month')::INT;
      year_num := EXTRACT(YEAR FROM reference_date)::INT;
      
      IF day_of_month = -1 THEN
        next_date := (DATE(year_num || '-' || month_num || '-01') + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
      ELSE
        next_date := DATE(year_num || '-' || month_num || '-' || LEAST(day_of_month,
          EXTRACT(DAY FROM (DATE(year_num || '-' || month_num || '-01') + INTERVAL '1 month' - INTERVAL '1 day'))::INT));
      END IF;
      
      IF next_date <= reference_date THEN
        -- Move to next year
        year_num := year_num + 1;
        IF day_of_month = -1 THEN
          next_date := (DATE(year_num || '-' || month_num || '-01') + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        ELSE
          next_date := DATE(year_num || '-' || month_num || '-' || LEAST(day_of_month,
            EXTRACT(DAY FROM (DATE(year_num || '-' || month_num || '-01') + INTERVAL '1 month' - INTERVAL '1 day'))::INT));
        END IF;
      END IF;
      RETURN next_date;

    WHEN 'one_time' THEN
      -- Return the specific date
      RETURN (schedule_config->>'date')::DATE;

    ELSE
      RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate next_expected_date on insert/update
CREATE OR REPLACE FUNCTION auto_calculate_income_next_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if next_expected_date is not provided and we have schedule info
  IF NEW.next_expected_date IS NULL AND NEW.schedule_type IS NOT NULL AND NEW.schedule_config IS NOT NULL THEN
    NEW.next_expected_date := calculate_next_expected_date(NEW.schedule_type, NEW.schedule_config);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-calculation
DROP TRIGGER IF EXISTS auto_calculate_income_next_date_trigger ON public.income_sources;
CREATE TRIGGER auto_calculate_income_next_date_trigger
  BEFORE INSERT OR UPDATE ON public.income_sources
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_income_next_date();

-- Add comment explaining the function
COMMENT ON FUNCTION calculate_next_expected_date IS 'Calculates the next expected date for an income source based on its schedule type and configuration';
COMMENT ON FUNCTION auto_calculate_income_next_date IS 'Trigger function to automatically calculate next_expected_date if not provided';

COMMIT;