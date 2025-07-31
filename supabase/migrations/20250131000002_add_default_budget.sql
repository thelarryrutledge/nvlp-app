-- Migration: Add default budget support
-- Adds default_budget_id to user_profiles table and auto-populate user_id trigger

-- Add function to auto-populate user_id on budgets
CREATE OR REPLACE FUNCTION public.populate_user_id_budgets()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate user_id from JWT if not provided
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  
  -- Error if no valid user
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-populate user_id on budgets
CREATE TRIGGER populate_budgets_user_id
  BEFORE INSERT ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_user_id_budgets();

-- Add default_budget_id column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN default_budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_user_profiles_default_budget_id ON public.user_profiles(default_budget_id);

-- Add a function to verify budget ownership when setting default
CREATE OR REPLACE FUNCTION public.verify_budget_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL (no default budget)
  IF NEW.default_budget_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Verify the budget belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE id = NEW.default_budget_id 
    AND user_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Budget does not belong to user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to verify budget ownership
CREATE TRIGGER verify_default_budget_ownership
  BEFORE INSERT OR UPDATE OF default_budget_id ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.verify_budget_ownership();

-- Add RLS policy for updating default_budget_id
-- (The existing update policy already allows users to update their own profile)

-- Add convenience view for budgets with is_default flag
CREATE OR REPLACE VIEW public.budgets_with_default AS
SELECT 
  b.*,
  CASE 
    WHEN b.id = up.default_budget_id THEN true 
    ELSE false 
  END AS is_default
FROM public.budgets b
LEFT JOIN public.user_profiles up ON up.id = b.user_id;

-- Grant appropriate permissions on the view
GRANT SELECT ON public.budgets_with_default TO authenticated;

-- Add RLS to the view (inherits from underlying tables)
ALTER VIEW public.budgets_with_default SET (security_invoker = true);

-- Add function to set default budget (for edge functions)
CREATE OR REPLACE FUNCTION public.set_default_budget(budget_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update user's default budget
  UPDATE public.user_profiles
  SET default_budget_id = budget_id
  WHERE id = auth.uid();
  
  -- Verify the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_default_budget(UUID) TO authenticated;

-- Add function to get user's default budget
CREATE OR REPLACE FUNCTION public.get_default_budget()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  description TEXT,
  available_amount DECIMAL(12, 2),
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_default_budget() TO authenticated;