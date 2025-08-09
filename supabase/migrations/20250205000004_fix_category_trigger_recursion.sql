-- Drop the problematic triggers that cause recursion
DROP TRIGGER IF EXISTS category_display_order_insert_trigger ON public.categories;
DROP TRIGGER IF EXISTS category_display_order_update_trigger ON public.categories;
DROP FUNCTION IF EXISTS public.handle_category_display_order_insert();
DROP FUNCTION IF EXISTS public.handle_category_display_order_update();

-- Create a new approach using BEFORE INSERT trigger that doesn't cause recursion
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

-- Create AFTER INSERT trigger to handle shifting (avoids recursion)
CREATE OR REPLACE FUNCTION public.handle_category_display_order_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Shift existing categories if needed (exclude the just-inserted row)
  UPDATE public.categories
  SET display_order = display_order + 1
  WHERE budget_id = NEW.budget_id
    AND parent_id IS NOT DISTINCT FROM NEW.parent_id
    AND display_order >= NEW.display_order
    AND id != NEW.id
    AND created_at < NEW.created_at;  -- Only shift older categories
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create BEFORE UPDATE trigger for handling display_order changes
CREATE OR REPLACE FUNCTION public.handle_category_display_order_before_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if display_order is actually changing
  IF OLD.display_order IS DISTINCT FROM NEW.display_order AND NEW.display_order IS NOT NULL THEN
    -- Prevent recursive updates by checking if this is already a system-triggered update
    IF current_setting('app.updating_display_order', true) = 'true' THEN
      RETURN NEW;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create AFTER UPDATE trigger for shifting
CREATE OR REPLACE FUNCTION public.handle_category_display_order_after_update()
RETURNS TRIGGER AS $$
DECLARE
  old_order INTEGER;
  new_order INTEGER;
BEGIN
  -- Only process if display_order changed
  IF OLD.display_order IS DISTINCT FROM NEW.display_order AND NEW.display_order IS NOT NULL THEN
    -- Set flag to prevent recursion
    PERFORM set_config('app.updating_display_order', 'true', true);
    
    old_order := OLD.display_order;
    new_order := NEW.display_order;
    
    IF OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
      -- Moving to different parent - shift in new scope
      UPDATE public.categories
      SET display_order = display_order + 1
      WHERE budget_id = NEW.budget_id
        AND parent_id IS NOT DISTINCT FROM NEW.parent_id
        AND display_order >= new_order
        AND id != NEW.id;
      
      -- Clean up old scope
      UPDATE public.categories
      SET display_order = display_order - 1
      WHERE budget_id = OLD.budget_id
        AND parent_id IS NOT DISTINCT FROM OLD.parent_id
        AND display_order > old_order
        AND id != NEW.id;
    ELSE
      -- Same parent scope
      IF new_order < old_order THEN
        -- Moving up
        UPDATE public.categories
        SET display_order = display_order + 1
        WHERE budget_id = NEW.budget_id
          AND parent_id IS NOT DISTINCT FROM NEW.parent_id
          AND display_order >= new_order
          AND display_order < old_order
          AND id != NEW.id;
      ELSE
        -- Moving down
        UPDATE public.categories
        SET display_order = display_order - 1
        WHERE budget_id = NEW.budget_id
          AND parent_id IS NOT DISTINCT FROM NEW.parent_id
          AND display_order > old_order
          AND display_order <= new_order
          AND id != NEW.id;
      END IF;
    END IF;
    
    -- Reset flag
    PERFORM set_config('app.updating_display_order', 'false', true);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the triggers
CREATE TRIGGER category_display_order_before_insert
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_category_display_order_before_insert();

CREATE TRIGGER category_display_order_after_insert
  AFTER INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_category_display_order_after_insert();

CREATE TRIGGER category_display_order_before_update
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_category_display_order_before_update();

CREATE TRIGGER category_display_order_after_update
  AFTER UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_category_display_order_after_update();

-- Add comments
COMMENT ON FUNCTION public.handle_category_display_order_before_insert() IS 'Sets default display_order if not provided';
COMMENT ON FUNCTION public.handle_category_display_order_after_insert() IS 'Shifts existing categories when inserting at an occupied position';
COMMENT ON FUNCTION public.handle_category_display_order_before_update() IS 'Prevents recursive updates';
COMMENT ON FUNCTION public.handle_category_display_order_after_update() IS 'Handles category reordering on display_order changes';