-- Add expected_amount column to store the original frequency amount
-- This prevents rounding errors when editing income sources

-- Add new column for frequency-specific amount
ALTER TABLE public.income_sources 
ADD COLUMN expected_amount DECIMAL(12,2);

-- Add constraint for positive amounts
ALTER TABLE public.income_sources 
ADD CONSTRAINT income_sources_expected_amount_positive 
    CHECK (expected_amount IS NULL OR expected_amount >= 0);

-- Create function to calculate monthly amount from frequency amount
CREATE OR REPLACE FUNCTION public.calculate_monthly_amount(
    amount DECIMAL(12,2),
    freq public.income_frequency
) RETURNS DECIMAL(12,2) AS $$
BEGIN
    CASE freq
        WHEN 'weekly' THEN
            RETURN ROUND(amount * 52.0 / 12.0, 2);
        WHEN 'bi_weekly' THEN
            RETURN ROUND(amount * 26.0 / 12.0, 2);
        WHEN 'twice_monthly' THEN
            RETURN amount * 2.0;
        WHEN 'monthly' THEN
            RETURN amount;
        WHEN 'annually' THEN
            RETURN ROUND(amount / 12.0, 2);
        WHEN 'custom', 'one_time' THEN
            RETURN amount; -- Use as-is
        ELSE
            RETURN amount;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate frequency amount from monthly amount (for migration)
CREATE OR REPLACE FUNCTION public.calculate_frequency_amount(
    monthly_amount DECIMAL(12,2),
    freq public.income_frequency
) RETURNS DECIMAL(12,2) AS $$
BEGIN
    CASE freq
        WHEN 'weekly' THEN
            RETURN ROUND(monthly_amount * 12.0 / 52.0, 2);
        WHEN 'bi_weekly' THEN
            RETURN ROUND(monthly_amount * 12.0 / 26.0, 2);
        WHEN 'twice_monthly' THEN
            RETURN ROUND(monthly_amount / 2.0, 2);
        WHEN 'monthly' THEN
            RETURN monthly_amount;
        WHEN 'annually' THEN
            RETURN monthly_amount * 12.0;
        WHEN 'custom', 'one_time' THEN
            RETURN monthly_amount; -- Use as-is
        ELSE
            RETURN monthly_amount;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Migrate existing data: convert monthly amounts to frequency amounts
UPDATE public.income_sources 
SET expected_amount = public.calculate_frequency_amount(expected_monthly_amount, frequency)
WHERE expected_monthly_amount IS NOT NULL;

-- Create trigger to auto-update monthly amount when frequency amount changes
CREATE OR REPLACE FUNCTION public.sync_income_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- If expected_amount is set, calculate and update monthly amount
    IF NEW.expected_amount IS NOT NULL THEN
        NEW.expected_monthly_amount := public.calculate_monthly_amount(NEW.expected_amount, NEW.frequency);
    -- If only monthly amount is set (legacy), calculate frequency amount
    ELSIF NEW.expected_monthly_amount IS NOT NULL AND NEW.expected_amount IS NULL THEN
        NEW.expected_amount := public.calculate_frequency_amount(NEW.expected_monthly_amount, NEW.frequency);
        NEW.expected_monthly_amount := public.calculate_monthly_amount(NEW.expected_amount, NEW.frequency);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER sync_income_amounts_trigger
    BEFORE INSERT OR UPDATE ON public.income_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_income_amounts();

-- Add comment explaining the new approach
COMMENT ON COLUMN public.income_sources.expected_amount IS 'Original amount for the specified frequency (e.g., $500 for weekly). This is the source of truth to avoid rounding errors.';
COMMENT ON COLUMN public.income_sources.expected_monthly_amount IS 'Auto-calculated monthly equivalent of expected_amount. Used for reporting and backwards compatibility.';