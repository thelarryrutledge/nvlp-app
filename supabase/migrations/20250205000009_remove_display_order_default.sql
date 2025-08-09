-- Check and remove any default value on display_order that might be interfering
ALTER TABLE public.categories 
ALTER COLUMN display_order DROP DEFAULT;

-- Also ensure the column allows NULL so our trigger can detect when it's not provided
ALTER TABLE public.categories 
ALTER COLUMN display_order DROP NOT NULL;

-- Let's also check what the current state is and create a simpler trigger
-- that always assigns the next value when display_order is NULL
CREATE OR REPLACE FUNCTION public.handle_category_display_order_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  max_order INTEGER;
  category_count INTEGER;
BEGIN
  -- Debug: Check what we're getting
  RAISE NOTICE 'Trigger fired: display_order=%, name=%', NEW.display_order, NEW.name;
  
  -- If display_order is NULL, calculate next value
  IF NEW.display_order IS NULL THEN
    -- Count existing categories in this scope
    SELECT COUNT(*) INTO category_count
    FROM public.categories
    WHERE budget_id = NEW.budget_id
      AND parent_id IS NOT DISTINCT FROM NEW.parent_id;
    
    -- Get max display_order
    SELECT COALESCE(MAX(display_order), -1) INTO max_order
    FROM public.categories
    WHERE budget_id = NEW.budget_id
      AND parent_id IS NOT DISTINCT FROM NEW.parent_id;
    
    NEW.display_order := max_order + 1;
    
    RAISE NOTICE 'Auto-assigned: count=%, max=%, assigned=%', category_count, max_order, NEW.display_order;
  ELSE
    RAISE NOTICE 'Using provided display_order: %', NEW.display_order;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;