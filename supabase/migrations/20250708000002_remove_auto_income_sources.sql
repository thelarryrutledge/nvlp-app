-- Migration: Remove automatic income source creation
-- Purpose: Remove trigger that auto-creates default income sources for new budgets
-- Date: 2025-07-08
-- Reason: Income sources should be user-defined, not auto-generated

-- Drop the trigger that creates default income sources
DROP TRIGGER IF EXISTS create_default_income_sources_on_budget_creation ON public.budgets;

-- Drop the function that creates default income sources
DROP FUNCTION IF EXISTS public.create_default_income_sources();

-- Add comment explaining the change
COMMENT ON TABLE public.income_sources IS 'Income sources for budget planning and tracking - manually created by users';