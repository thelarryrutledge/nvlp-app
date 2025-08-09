-- Migration: Create default budget on user signup
-- Modifies the user creation trigger to also create a default budget

-- First, let's create a function to ensure user has at least one budget
CREATE OR REPLACE FUNCTION public.ensure_user_has_budget(user_id UUID)
RETURNS UUID AS $$
DECLARE
  budget_id UUID;
BEGIN
  -- Check if user already has a budget
  SELECT id INTO budget_id
  FROM public.budgets
  WHERE budgets.user_id = ensure_user_has_budget.user_id
  LIMIT 1;

  -- If no budget exists, create one
  IF budget_id IS NULL THEN
    INSERT INTO public.budgets (user_id, name, description, available_amount)
    VALUES (
      ensure_user_has_budget.user_id,
      'My Budget',
      'Default budget',
      0.00
    )
    RETURNING id INTO budget_id;
  END IF;

  RETURN budget_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the handle_new_user function to also create a default budget
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  new_budget_id UUID;
BEGIN
  -- Create the default budget first
  INSERT INTO public.budgets (user_id, name, description, available_amount)
  VALUES (
    NEW.id,
    'My Budget',
    'Default budget',
    0.00
  )
  RETURNING id INTO new_budget_id;

  -- Create user profile with the default budget
  INSERT INTO public.user_profiles (id, display_name, avatar_url, default_budget_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    new_budget_id
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error (you might want to customize this based on your logging setup)
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    -- Re-raise the exception
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the function that ensures last budget cannot be deleted
CREATE OR REPLACE FUNCTION public.prevent_last_budget_deletion()
RETURNS TRIGGER AS $$
DECLARE
  budget_count INTEGER;
  new_budget_id UUID;
BEGIN
  -- Count remaining active budgets for this user
  SELECT COUNT(*) INTO budget_count
  FROM public.budgets
  WHERE user_id = OLD.user_id
    AND is_active = true
    AND id != OLD.id;

  -- If this is the last budget, create a new one instead of deleting
  IF budget_count = 0 THEN
    -- Create a new empty budget
    INSERT INTO public.budgets (user_id, name, description, available_amount)
    VALUES (
      OLD.user_id,
      'My Budget',
      'Default budget',
      0.00
    )
    RETURNING id INTO new_budget_id;

    -- Update user's default budget to the new one
    UPDATE public.user_profiles
    SET default_budget_id = new_budget_id
    WHERE id = OLD.user_id;

    -- Soft delete the old budget
    UPDATE public.budgets
    SET is_active = false
    WHERE id = OLD.id;

    -- Return NULL to prevent the actual deletion
    RETURN NULL;
  END IF;

  -- Allow deletion if there are other budgets
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the trigger for preventing last budget deletion
DROP TRIGGER IF EXISTS prevent_last_budget_deletion ON public.budgets;
CREATE TRIGGER prevent_last_budget_deletion
  BEFORE DELETE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_budget_deletion();