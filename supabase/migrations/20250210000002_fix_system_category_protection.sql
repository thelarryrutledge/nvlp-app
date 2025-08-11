-- Fix system category protection

-- First, drop the existing delete policy that might be allowing all deletes
DROP POLICY IF EXISTS "Users can delete categories in their budgets" ON public.categories;
DROP POLICY IF EXISTS "Users cannot delete system categories" ON public.categories;

-- Create a new policy that only allows deletion of non-system categories
CREATE POLICY "Users can only delete non-system categories" 
  ON public.categories 
  FOR DELETE 
  USING (
    is_system = false 
    AND EXISTS (
      SELECT 1 FROM public.budgets 
      WHERE budgets.id = categories.budget_id 
      AND budgets.user_id = auth.uid()
    )
  );

-- Add a check constraint to prevent changing is_system from true to false
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_system_flag_immutable;

-- We can't directly prevent updates to is_system with a check constraint,
-- so we'll use a trigger instead
CREATE OR REPLACE FUNCTION public.protect_system_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a system category, prevent certain changes
  IF OLD.is_system = true THEN
    -- Prevent changing is_system flag from true to false
    IF NEW.is_system = false THEN
      RAISE EXCEPTION 'Cannot remove system flag from system categories';
    END IF;
    
    -- Allow other updates (like name changes) to go through
    -- but keep is_system as true
    NEW.is_system = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to protect system categories
DROP TRIGGER IF EXISTS protect_system_categories_trigger ON public.categories;
CREATE TRIGGER protect_system_categories_trigger
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_system_categories();

-- Also update the existing update policy to be more explicit
DROP POLICY IF EXISTS "Users can update categories in their budgets" ON public.categories;

CREATE POLICY "Users can update categories in their budgets" 
  ON public.categories 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.budgets 
      WHERE budgets.id = categories.budget_id 
      AND budgets.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budgets 
      WHERE budgets.id = categories.budget_id 
      AND budgets.user_id = auth.uid()
    )
    -- This WITH CHECK ensures the update doesn't violate ownership
  );