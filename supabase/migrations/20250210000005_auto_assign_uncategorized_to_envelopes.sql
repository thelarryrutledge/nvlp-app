-- Auto-assign Uncategorized category to envelopes when category is null or deleted

-- Function to get or create the Uncategorized category for a budget
CREATE OR REPLACE FUNCTION public.get_uncategorized_category_id(p_budget_id UUID)
RETURNS UUID AS $$
DECLARE
  v_category_id UUID;
BEGIN
  -- Try to find existing Uncategorized category
  SELECT id INTO v_category_id
  FROM public.categories
  WHERE budget_id = p_budget_id
    AND name = 'Uncategorized'
    AND is_system = true
  LIMIT 1;
  
  -- If not found, create it (shouldn't happen with our trigger, but just in case)
  IF v_category_id IS NULL THEN
    INSERT INTO public.categories (
      budget_id,
      name,
      description,
      is_income,
      is_system,
      display_order
    ) VALUES (
      p_budget_id,
      'Uncategorized',
      'Default category for uncategorized items',
      false,
      true,
      999
    )
    RETURNING id INTO v_category_id;
  END IF;
  
  RETURN v_category_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-assign Uncategorized category to envelopes
CREATE OR REPLACE FUNCTION public.auto_assign_envelope_category()
RETURNS TRIGGER AS $$
DECLARE
  v_uncategorized_id UUID;
BEGIN
  -- Only process if category_id is null
  IF NEW.category_id IS NULL THEN
    -- Get the Uncategorized category for this budget
    v_uncategorized_id := get_uncategorized_category_id(NEW.budget_id);
    
    -- Assign it to the envelope
    NEW.category_id := v_uncategorized_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT operations
DROP TRIGGER IF EXISTS auto_assign_envelope_category_on_insert ON public.envelopes;
CREATE TRIGGER auto_assign_envelope_category_on_insert
  BEFORE INSERT ON public.envelopes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_envelope_category();

-- Create trigger for UPDATE operations (when category is set to null)
DROP TRIGGER IF EXISTS auto_assign_envelope_category_on_update ON public.envelopes;
CREATE TRIGGER auto_assign_envelope_category_on_update
  BEFORE UPDATE ON public.envelopes
  FOR EACH ROW
  WHEN (NEW.category_id IS NULL AND OLD.category_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_assign_envelope_category();

-- Update the categories table foreign key for envelopes to handle cascade differently
-- When a category is deleted, set envelope's category_id to NULL, which will trigger reassignment
ALTER TABLE public.envelopes 
  DROP CONSTRAINT IF EXISTS envelopes_category_id_fkey;

ALTER TABLE public.envelopes
  ADD CONSTRAINT envelopes_category_id_fkey 
  FOREIGN KEY (category_id) 
  REFERENCES public.categories(id) 
  ON DELETE SET NULL;

-- Fix any existing envelopes that might have null category_id
UPDATE public.envelopes
SET category_id = get_uncategorized_category_id(budget_id)
WHERE category_id IS NULL;

-- Note: Income sources and payees keep their ON DELETE SET NULL behavior
-- without auto-assignment, as requested