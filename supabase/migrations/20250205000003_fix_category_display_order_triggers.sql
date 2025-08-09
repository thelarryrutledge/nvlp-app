-- Create a trigger function to handle display_order conflicts when inserting categories
CREATE OR REPLACE FUNCTION public.handle_category_display_order_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if display_order is provided (not null)
  IF NEW.display_order IS NOT NULL THEN
    -- Shift existing categories at or after the new display_order
    UPDATE public.categories
    SET display_order = display_order + 1
    WHERE budget_id = NEW.budget_id
      AND (parent_id IS NOT DISTINCT FROM NEW.parent_id)
      AND display_order >= NEW.display_order
      AND id != NEW.id;  -- Exclude the newly inserted row
  ELSE
    -- If display_order is not provided, set it to the next available value
    SELECT COALESCE(MAX(display_order), -1) + 1 INTO NEW.display_order
    FROM public.categories
    WHERE budget_id = NEW.budget_id
      AND parent_id IS NOT DISTINCT FROM NEW.parent_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to handle display_order conflicts when updating categories
CREATE OR REPLACE FUNCTION public.handle_category_display_order_update()
RETURNS TRIGGER AS $$
DECLARE
  old_order INTEGER;
  new_order INTEGER;
BEGIN
  -- Only process if display_order is being changed
  IF OLD.display_order IS DISTINCT FROM NEW.display_order AND NEW.display_order IS NOT NULL THEN
    old_order := OLD.display_order;
    new_order := NEW.display_order;
    
    -- Check if parent_id is also changing
    IF OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
      -- Moving to a different parent scope - just shift in the new scope
      UPDATE public.categories
      SET display_order = display_order + 1
      WHERE budget_id = NEW.budget_id
        AND parent_id IS NOT DISTINCT FROM NEW.parent_id
        AND display_order >= new_order
        AND id != NEW.id;
        
      -- Clean up the old scope
      UPDATE public.categories
      SET display_order = display_order - 1
      WHERE budget_id = OLD.budget_id
        AND parent_id IS NOT DISTINCT FROM OLD.parent_id
        AND display_order > old_order
        AND id != NEW.id;
    ELSE
      -- Same parent scope - handle the shift
      IF new_order < old_order THEN
        -- Moving up: shift categories between new and old position down
        UPDATE public.categories
        SET display_order = display_order + 1
        WHERE budget_id = NEW.budget_id
          AND parent_id IS NOT DISTINCT FROM NEW.parent_id
          AND display_order >= new_order
          AND display_order < old_order
          AND id != NEW.id;
      ELSE
        -- Moving down: shift categories between old and new position up
        UPDATE public.categories
        SET display_order = display_order - 1
        WHERE budget_id = NEW.budget_id
          AND parent_id IS NOT DISTINCT FROM NEW.parent_id
          AND display_order > old_order
          AND display_order <= new_order
          AND id != NEW.id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS category_display_order_insert_trigger ON public.categories;
DROP TRIGGER IF EXISTS category_display_order_update_trigger ON public.categories;

-- Create the insert trigger (BEFORE INSERT to modify NEW values)
CREATE TRIGGER category_display_order_insert_trigger
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_category_display_order_insert();

-- Create the update trigger
CREATE TRIGGER category_display_order_update_trigger
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_category_display_order_update();

-- Add comments for documentation
COMMENT ON FUNCTION public.handle_category_display_order_insert() IS 'Automatically handles display_order conflicts when inserting categories by shifting existing categories';
COMMENT ON FUNCTION public.handle_category_display_order_update() IS 'Automatically handles display_order conflicts when updating categories by shifting affected categories';