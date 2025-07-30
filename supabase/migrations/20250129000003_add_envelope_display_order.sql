-- Migration: Add Display Order to Envelopes
-- Adds display_order field to envelopes for manual UI sorting

-- Add display_order to envelopes table
ALTER TABLE public.envelopes 
ADD COLUMN display_order INTEGER DEFAULT 0 NOT NULL;

-- Create index for efficient sorting queries
CREATE INDEX idx_envelopes_category_display_order ON public.envelopes(category_id, display_order);

-- Create index for efficient sorting on categories
CREATE INDEX idx_categories_parent_display_order ON public.categories(parent_id, display_order);
CREATE INDEX idx_categories_budget_display_order ON public.categories(budget_id, display_order) WHERE parent_id IS NULL;

-- Initialize display_order for existing envelopes (ordered by creation date)
WITH envelope_numbering AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at) - 1 as new_order
  FROM public.envelopes
)
UPDATE public.envelopes 
SET display_order = envelope_numbering.new_order
FROM envelope_numbering
WHERE envelopes.id = envelope_numbering.id;

-- Initialize display_order for existing categories (ordered by creation date)
WITH category_numbering AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY budget_id, parent_id ORDER BY created_at) - 1 as new_order
  FROM public.categories
)
UPDATE public.categories 
SET display_order = category_numbering.new_order
FROM category_numbering
WHERE categories.id = category_numbering.id;

-- Function to get next display_order for envelopes in a category
CREATE OR REPLACE FUNCTION public.get_next_envelope_display_order(category_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  next_order INTEGER;
BEGIN
  SELECT COALESCE(MAX(display_order), -1) + 1 INTO next_order
  FROM public.envelopes
  WHERE category_id = category_id_param
  AND is_active = true;
  
  RETURN next_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next display_order for categories in a budget/parent
CREATE OR REPLACE FUNCTION public.get_next_category_display_order(budget_id_param UUID, parent_id_param UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  next_order INTEGER;
BEGIN
  SELECT COALESCE(MAX(display_order), -1) + 1 INTO next_order
  FROM public.categories
  WHERE budget_id = budget_id_param
  AND parent_id IS NOT DISTINCT FROM parent_id_param;
  
  RETURN next_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reorder items after a move (fills gaps, ensures sequential ordering)
CREATE OR REPLACE FUNCTION public.reorder_envelopes_in_category(category_id_param UUID)
RETURNS VOID AS $$
BEGIN
  WITH envelope_reordering AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY display_order, created_at) - 1 as new_order
    FROM public.envelopes
    WHERE category_id = category_id_param
    AND is_active = true
  )
  UPDATE public.envelopes 
  SET display_order = envelope_reordering.new_order
  FROM envelope_reordering
  WHERE envelopes.id = envelope_reordering.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reorder categories after a move
CREATE OR REPLACE FUNCTION public.reorder_categories_in_scope(budget_id_param UUID, parent_id_param UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  WITH category_reordering AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY display_order, created_at) - 1 as new_order
    FROM public.categories
    WHERE budget_id = budget_id_param
    AND parent_id IS NOT DISTINCT FROM parent_id_param
  )
  UPDATE public.categories 
  SET display_order = category_reordering.new_order
  FROM category_reordering
  WHERE categories.id = category_reordering.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON COLUMN public.envelopes.display_order IS 'Manual sort order within category (0-based, lower = earlier in list)';
COMMENT ON FUNCTION public.get_next_envelope_display_order(UUID) IS 'Gets the next available display_order for a new envelope in the specified category';
COMMENT ON FUNCTION public.get_next_category_display_order(UUID, UUID) IS 'Gets the next available display_order for a new category in the specified budget/parent';
COMMENT ON FUNCTION public.reorder_envelopes_in_category(UUID) IS 'Reorders all envelopes in a category to eliminate gaps in display_order';
COMMENT ON FUNCTION public.reorder_categories_in_scope(UUID, UUID) IS 'Reorders all categories in a budget/parent scope to eliminate gaps in display_order';