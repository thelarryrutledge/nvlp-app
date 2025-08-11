-- Migration to auto-create Uncategorized category for new budgets

-- Function to create the Uncategorized category for a budget
CREATE OR REPLACE FUNCTION public.create_uncategorized_category()
RETURNS TRIGGER AS $$
BEGIN
  -- Create the Uncategorized category for the new budget
  INSERT INTO public.categories (
    budget_id,
    name,
    description,
    is_income,
    is_system,
    display_order
  ) VALUES (
    NEW.id,
    'Uncategorized',
    'Default category for uncategorized items',
    false,
    true,
    999  -- High display order to appear last
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create Uncategorized category when a new budget is created
CREATE TRIGGER create_uncategorized_on_budget_insert
  AFTER INSERT ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.create_uncategorized_category();

-- Add Uncategorized category to existing budgets that don't have one
INSERT INTO public.categories (
  budget_id,
  name,
  description,
  is_income,
  is_system,
  display_order
)
SELECT 
  b.id,
  'Uncategorized',
  'Default category for uncategorized items',
  false,
  true,
  999
FROM public.budgets b
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.categories c 
  WHERE c.budget_id = b.id 
  AND c.name = 'Uncategorized'
  AND c.is_system = true
);

-- Add a policy to prevent deletion of system categories
CREATE POLICY "Users cannot delete system categories" 
  ON public.categories 
  FOR DELETE USING (is_system = false);