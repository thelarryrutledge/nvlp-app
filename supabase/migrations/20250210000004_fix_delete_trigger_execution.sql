-- Fix DELETE trigger execution by allowing it to reach the trigger

-- Drop the restrictive RLS policy that's blocking before the trigger
DROP POLICY IF EXISTS "Users can only delete non-system categories" ON public.categories;

-- Create a more permissive DELETE policy that allows the request to reach the trigger
-- The trigger will then handle the actual validation
CREATE POLICY "Users can attempt to delete their categories" 
  ON public.categories 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.budgets 
      WHERE budgets.id = categories.budget_id 
      AND budgets.user_id = auth.uid()
    )
  );

-- The trigger prevent_system_category_deletion_trigger will handle the actual protection
-- and provide the error message