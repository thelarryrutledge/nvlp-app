-- Fix category display_order issues
-- Ensures all existing categories have proper display_order values

-- First, update any NULL display_order values to sequential numbers
WITH category_ordering AS (
  SELECT 
    id,
    budget_id,
    parent_id,
    ROW_NUMBER() OVER (
      PARTITION BY budget_id, parent_id 
      ORDER BY created_at
    ) - 1 as new_order
  FROM public.categories
  WHERE display_order IS NULL
)
UPDATE public.categories
SET display_order = category_ordering.new_order
FROM category_ordering
WHERE categories.id = category_ordering.id;

-- Ensure display_order has a default value and is not null
ALTER TABLE public.categories 
ALTER COLUMN display_order SET DEFAULT 0,
ALTER COLUMN display_order SET NOT NULL;

-- Fix any duplicate display_orders within the same scope
DO $$
DECLARE
  scope RECORD;
BEGIN
  -- Get all unique budget/parent combinations
  FOR scope IN 
    SELECT DISTINCT budget_id, parent_id 
    FROM public.categories
  LOOP
    -- Reorder categories in each scope to ensure no duplicates
    WITH category_reordering AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY display_order, created_at) - 1 as new_order
      FROM public.categories
      WHERE budget_id = scope.budget_id
      AND parent_id IS NOT DISTINCT FROM scope.parent_id
    )
    UPDATE public.categories 
    SET display_order = category_reordering.new_order
    FROM category_reordering
    WHERE categories.id = category_reordering.id;
  END LOOP;
END $$;

-- Add a comment explaining the column
COMMENT ON COLUMN public.categories.display_order IS 'Display order within the same budget and parent scope (0-based, unique within scope)';