-- Let's create a debug version that logs what's happening
CREATE OR REPLACE FUNCTION public.handle_category_display_order_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  max_order INTEGER;
  category_count INTEGER;
BEGIN
  -- If display_order is not provided, calculate the next available
  IF NEW.display_order IS NULL THEN
    -- First check how many categories exist in this scope
    SELECT COUNT(*) INTO category_count
    FROM public.categories
    WHERE budget_id = NEW.budget_id
      AND parent_id IS NOT DISTINCT FROM NEW.parent_id;
    
    -- Get the max display_order
    SELECT COALESCE(MAX(display_order), -1) INTO max_order
    FROM public.categories
    WHERE budget_id = NEW.budget_id
      AND parent_id IS NOT DISTINCT FROM NEW.parent_id;
    
    -- Log what we found (this will appear in Supabase logs)
    RAISE NOTICE 'Category count: %, Max order: %, Next order will be: %', 
      category_count, max_order, max_order + 1;
    
    NEW.display_order := max_order + 1;
  ELSE
    RAISE NOTICE 'Display order explicitly provided: %', NEW.display_order;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;