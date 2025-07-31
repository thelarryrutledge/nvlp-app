-- Migration: Fix get_default_budget function and add missing category columns
-- Updates the function to match the current budgets table schema
-- Adds missing UI columns to categories table

-- Add missing columns to categories table
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'EXPENSE' NOT NULL,
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📁',
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6B7280';

-- Add constraint for valid category types
ALTER TABLE public.categories 
ADD CONSTRAINT categories_type_valid CHECK (
  type IN ('EXPENSE', 'INCOME')
);

-- Update existing categories based on is_income field
UPDATE public.categories 
SET type = CASE 
  WHEN is_income = true THEN 'INCOME' 
  ELSE 'EXPENSE' 
END;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(type);

-- Drop and recreate function to include currency column
DROP FUNCTION IF EXISTS public.get_default_budget();

CREATE OR REPLACE FUNCTION public.get_default_budget()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  description TEXT,
  available_amount DECIMAL(12, 2),
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  currency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.*
  FROM public.budgets b
  JOIN public.user_profiles up ON up.default_budget_id = b.id
  WHERE up.id = auth.uid()
  AND b.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;