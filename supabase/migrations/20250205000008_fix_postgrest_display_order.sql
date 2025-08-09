-- The issue is that PostgREST might be setting display_order to NULL explicitly
-- Let's handle this by checking if the value is NULL OR if it's being auto-assigned

-- Drop the existing trigger and create a more robust one
DROP TRIGGER IF EXISTS category_display_order_before_insert ON public.categories;
DROP FUNCTION IF EXISTS public.handle_category_display_order_before_insert();

CREATE OR REPLACE FUNCTION public.handle_category_display_order_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  max_order INTEGER;
  next_order INTEGER;
BEGIN
  -- Always recalculate if display_order is NULL, 0, or not provided
  -- This handles PostgREST sending NULL or omitted fields
  IF NEW.display_order IS NULL THEN
    -- Get the maximum display_order in this scope
    SELECT COALESCE(MAX(display_order), -1) INTO max_order
    FROM public.categories
    WHERE budget_id = NEW.budget_id
      AND parent_id IS NOT DISTINCT FROM NEW.parent_id;
    
    next_order := max_order + 1;
    
    -- Log for debugging
    RAISE NOTICE 'Auto-assigning display_order: max=%, next=%', max_order, next_order;
    
    NEW.display_order := next_order;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also create a version that handles the case where PostgREST might be sending empty string or 0
CREATE OR REPLACE FUNCTION public.handle_category_display_order_before_insert_alt()
RETURNS TRIGGER AS $$
DECLARE
  max_order INTEGER;
  next_order INTEGER;
BEGIN
  -- Handle NULL, 0, or negative values as "not provided"
  IF NEW.display_order IS NULL OR NEW.display_order < 0 THEN
    -- Get the maximum display_order in this scope
    SELECT COALESCE(MAX(display_order), -1) INTO max_order
    FROM public.categories
    WHERE budget_id = NEW.budget_id
      AND parent_id IS NOT DISTINCT FROM NEW.parent_id;
    
    next_order := max_order + 1;
    NEW.display_order := next_order;
    
    RAISE NOTICE 'Auto-assigned display_order % (was %)', next_order, OLD.display_order;
  ELSE
    RAISE NOTICE 'Using provided display_order %', NEW.display_order;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Use the first version initially
CREATE TRIGGER category_display_order_before_insert
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_category_display_order_before_insert();