-- Migration: Add Currency Support
-- Adds currency columns to budgets and user_profiles tables

-- Add default_currency to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN default_currency TEXT DEFAULT 'USD' NOT NULL;

-- Add currency to budgets
ALTER TABLE public.budgets 
ADD COLUMN currency TEXT DEFAULT 'USD' NOT NULL;

-- Create index for currency lookups (useful for multi-currency reporting)
CREATE INDEX idx_budgets_currency ON public.budgets(currency);

-- Add check constraint for valid ISO 4217 currency codes (common ones)
ALTER TABLE public.budgets 
ADD CONSTRAINT budgets_currency_valid CHECK (
  currency IN (
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD',
    'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR',
    'DKK', 'PLN', 'THB', 'IDR', 'HUF', 'CZK', 'ILS', 'CLP', 'PHP', 'AED',
    'COP', 'SAR', 'MYR', 'RON', 'ARS', 'BGN', 'HRK', 'LTL', 'SKK', 'ISK',
    'EEK', 'JOD', 'KWD', 'OMR', 'QAR', 'BHD', 'LVL', 'GHS', 'KES', 'MAD',
    'NGN', 'PEN', 'UAH', 'VND', 'BOB', 'CRC', 'DOP', 'GTQ', 'HNL', 'NIO',
    'PAB', 'PYG', 'SVC', 'UYU', 'VEF', 'IRR', 'KZT', 'LBP', 'LKR', 'NPR',
    'PKR', 'TWD', 'UZS', 'BDT', 'FJD', 'GEL', 'MDL', 'MKD', 'MMK', 'MNT',
    'XAF', 'XCD', 'XOF', 'XPF', 'ALL', 'AMD', 'AOA', 'AWG', 'AZN', 'BAM',
    'BBD', 'BIF', 'BMD', 'BND', 'BSD', 'BTN', 'BWP', 'BYR', 'BZD', 'CDF'
  )
);

-- Same constraint for user_profiles
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_default_currency_valid CHECK (
  default_currency IN (
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD',
    'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR',
    'DKK', 'PLN', 'THB', 'IDR', 'HUF', 'CZK', 'ILS', 'CLP', 'PHP', 'AED',
    'COP', 'SAR', 'MYR', 'RON', 'ARS', 'BGN', 'HRK', 'LTL', 'SKK', 'ISK',
    'EEK', 'JOD', 'KWD', 'OMR', 'QAR', 'BHD', 'LVL', 'GHS', 'KES', 'MAD',
    'NGN', 'PEN', 'UAH', 'VND', 'BOB', 'CRC', 'DOP', 'GTQ', 'HNL', 'NIO',
    'PAB', 'PYG', 'SVC', 'UYU', 'VEF', 'IRR', 'KZT', 'LBP', 'LKR', 'NPR',
    'PKR', 'TWD', 'UZS', 'BDT', 'FJD', 'GEL', 'MDL', 'MKD', 'MMK', 'MNT',
    'XAF', 'XCD', 'XOF', 'XPF', 'ALL', 'AMD', 'AOA', 'AWG', 'AZN', 'BAM',
    'BBD', 'BIF', 'BMD', 'BND', 'BSD', 'BTN', 'BWP', 'BYR', 'BZD', 'CDF'
  )
);

-- Function to get user's default currency for new budget creation
CREATE OR REPLACE FUNCTION public.get_user_default_currency(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  default_curr TEXT;
BEGIN
  SELECT default_currency INTO default_curr
  FROM public.user_profiles
  WHERE user_profiles.id = user_id;
  
  -- Return USD if no profile found (shouldn't happen with triggers)
  RETURN COALESCE(default_curr, 'USD');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing budgets to use user's default currency if they have one set
UPDATE public.budgets b
SET currency = COALESCE(
  (SELECT default_currency FROM public.user_profiles up WHERE up.id = b.user_id),
  'USD'
);

-- Comment on columns
COMMENT ON COLUMN public.budgets.currency IS 'ISO 4217 currency code for this budget';
COMMENT ON COLUMN public.user_profiles.default_currency IS 'Default currency for new budgets created by this user';