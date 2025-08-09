-- Drop existing triggers to replace them
DROP TRIGGER IF EXISTS category_display_order_before_insert ON public.categories;
DROP TRIGGER IF EXISTS category_display_order_after_insert ON public.categories;
DROP FUNCTION IF EXISTS public.handle_category_display_order_before_insert();
DROP FUNCTION IF EXISTS public.handle_category_display_order_after_insert();

-- Create simple BEFORE INSERT trigger
CREATE OR REPLACE FUNCTION public.handle_category_display_order_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  max_order INTEGER;
BEGIN
  -- If display_order is not provided, calculate the next available
  IF NEW.display_order IS NULL THEN
    SELECT COALESCE(MAX(display_order), -1) + 1 INTO max_order
    FROM public.categories
    WHERE budget_id = NEW.budget_id
      AND parent_id IS NOT DISTINCT FROM NEW.parent_id;
    
    NEW.display_order := max_order;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create simple AFTER INSERT trigger for shifting when display_order is explicitly provided
CREATE OR REPLACE FUNCTION public.handle_category_display_order_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only shift if display_order was explicitly provided (not auto-assigned)
  -- We can detect this by checking if there are any other categories with the same or higher display_order
  IF EXISTS (
    SELECT 1 FROM public.categories
    WHERE budget_id = NEW.budget_id
      AND parent_id IS NOT DISTINCT FROM NEW.parent_id
      AND display_order >= NEW.display_order
      AND id != NEW.id
      AND created_at < NEW.created_at
  ) THEN
    -- Shift existing categories
    UPDATE public.categories
    SET display_order = display_order + 1
    WHERE budget_id = NEW.budget_id
      AND parent_id IS NOT DISTINCT FROM NEW.parent_id
      AND display_order >= NEW.display_order
      AND id != NEW.id
      AND created_at < NEW.created_at;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers
CREATE TRIGGER category_display_order_before_insert
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_category_display_order_before_insert();

CREATE TRIGGER category_display_order_after_insert
  AFTER INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_category_display_order_after_insert();

-- Add comments
COMMENT ON FUNCTION public.handle_category_display_order_before_insert() IS 'Auto-assigns display_order when not provided';
COMMENT ON FUNCTION public.handle_category_display_order_after_insert() IS 'Shifts existing categories when inserting at an occupied position';