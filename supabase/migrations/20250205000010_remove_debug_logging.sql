-- Remove debug logging from the trigger function
CREATE OR REPLACE FUNCTION public.handle_category_display_order_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  max_order INTEGER;
BEGIN
  -- If display_order is NULL, calculate next value
  IF NEW.display_order IS NULL THEN
    -- Get max display_order
    SELECT COALESCE(MAX(display_order), -1) INTO max_order
    FROM public.categories
    WHERE budget_id = NEW.budget_id
      AND parent_id IS NOT DISTINCT FROM NEW.parent_id;
    
    NEW.display_order := max_order + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;