-- Improve error reporting for system category deletion attempts

-- Create a function to check before delete
CREATE OR REPLACE FUNCTION public.prevent_system_category_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_system = true THEN
    RAISE EXCEPTION 'Cannot delete system categories';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to prevent deletion with proper error message
DROP TRIGGER IF EXISTS prevent_system_category_deletion_trigger ON public.categories;
CREATE TRIGGER prevent_system_category_deletion_trigger
  BEFORE DELETE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_system_category_deletion();

-- Keep the RLS policy as a backup, but the trigger will fire first
-- and provide a better error message