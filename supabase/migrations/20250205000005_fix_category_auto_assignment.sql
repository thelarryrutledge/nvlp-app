-- Drop existing triggers to replace them
DROP TRIGGER IF EXISTS category_display_order_before_insert ON public.categories;
DROP TRIGGER IF EXISTS category_display_order_after_insert ON public.categories;
DROP FUNCTION IF EXISTS public.handle_category_display_order_before_insert();
DROP FUNCTION IF EXISTS public.handle_category_display_order_after_insert();

-- Create improved BEFORE INSERT trigger
CREATE OR REPLACE FUNCTION public.handle_category_display_order_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  max_order INTEGER;
  needs_shifting BOOLEAN := false;
BEGIN
  -- If display_order is not provided, calculate the next available
  IF NEW.display_order IS NULL THEN
    SELECT COALESCE(MAX(display_order), -1) + 1 INTO max_order
    FROM public.categories
    WHERE budget_id = NEW.budget_id
      AND parent_id IS NOT DISTINCT FROM NEW.parent_id;
    
    NEW.display_order := max_order;
    -- Set a flag to indicate no shifting is needed
    NEW.updated_at := NEW.created_at; -- Use matching timestamps as a signal
  ELSE
    -- Check if shifting is needed
    SELECT EXISTS (
      SELECT 1 FROM public.categories
      WHERE budget_id = NEW.budget_id
        AND parent_id IS NOT DISTINCT FROM NEW.parent_id
        AND display_order = NEW.display_order
    ) INTO needs_shifting;
    
    IF needs_shifting THEN
      -- Set a flag to indicate shifting is needed
      NEW.updated_at := NEW.created_at + interval '1 microsecond'; -- Slightly different timestamp as a signal
    ELSE
      NEW.updated_at := NEW.created_at;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create improved AFTER INSERT trigger
CREATE OR REPLACE FUNCTION public.handle_category_display_order_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only shift if the timestamps indicate shifting is needed
  -- (when updated_at is slightly after created_at, it means we need to shift)
  IF NEW.updated_at > NEW.created_at THEN
    -- Shift existing categories (exclude the just-inserted row)
    UPDATE public.categories
    SET display_order = display_order + 1
    WHERE budget_id = NEW.budget_id
      AND parent_id IS NOT DISTINCT FROM NEW.parent_id
      AND display_order >= NEW.display_order
      AND id != NEW.id;
    
    -- Reset the updated_at to match created_at
    UPDATE public.categories
    SET updated_at = created_at
    WHERE id = NEW.id;
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
COMMENT ON FUNCTION public.handle_category_display_order_before_insert() IS 'Sets display_order and determines if shifting is needed';
COMMENT ON FUNCTION public.handle_category_display_order_after_insert() IS 'Shifts existing categories only when needed';