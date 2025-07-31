-- This file contains all migrations to be applied via Supabase Dashboard SQL Editor
-- Go to: https://supabase.com/dashboard/project/idmvyzmjcbxqusvjvzna/sql/new
-- Copy and paste this content, then click "Run"

-- Migration: Auth Schema Extensions
-- Creates user_profiles table and auth trigger
-- Adds metadata fields to auth.users for display_name and avatar_url

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user_profiles (users can only access their own profile)
CREATE POLICY "Users can view their own profile" 
  ON public.user_profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.user_profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.user_profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update user profile when auth.users metadata changes
CREATE OR REPLACE FUNCTION public.handle_user_metadata_update() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles 
  SET 
    display_name = COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    avatar_url = NEW.raw_user_meta_data->>'avatar_url',
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync metadata changes
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION public.handle_user_metadata_update();

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at on user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();-- Migration: Add default budget support
-- Adds default_budget_id to user_profiles table

-- Add default_budget_id column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN default_budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_user_profiles_default_budget_id ON public.user_profiles(default_budget_id);

-- Add a function to verify budget ownership when setting default
CREATE OR REPLACE FUNCTION public.verify_budget_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL (no default budget)
  IF NEW.default_budget_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Verify the budget belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE id = NEW.default_budget_id 
    AND user_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Budget does not belong to user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to verify budget ownership
CREATE TRIGGER verify_default_budget_ownership
  BEFORE INSERT OR UPDATE OF default_budget_id ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.verify_budget_ownership();

-- Add RLS policy for updating default_budget_id
-- (The existing update policy already allows users to update their own profile)

-- Add convenience view for budgets with is_default flag
CREATE OR REPLACE VIEW public.budgets_with_default AS
SELECT 
  b.*,
  CASE 
    WHEN b.id = up.default_budget_id THEN true 
    ELSE false 
  END AS is_default
FROM public.budgets b
LEFT JOIN public.user_profiles up ON up.id = b.user_id;

-- Grant appropriate permissions on the view
GRANT SELECT ON public.budgets_with_default TO authenticated;

-- Add RLS to the view (inherits from underlying tables)
ALTER VIEW public.budgets_with_default SET (security_invoker = true);

-- Add function to set default budget (for edge functions)
CREATE OR REPLACE FUNCTION public.set_default_budget(budget_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update user's default budget
  UPDATE public.user_profiles
  SET default_budget_id = budget_id
  WHERE id = auth.uid();
  
  -- Verify the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_default_budget(UUID) TO authenticated;

-- Add function to get user's default budget
CREATE OR REPLACE FUNCTION public.get_default_budget()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  description TEXT,
  available_amount DECIMAL(12, 2),
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.*
  FROM public.budgets b
  JOIN public.user_profiles up ON up.default_budget_id = b.id
  WHERE up.id = auth.uid()
  AND b.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_default_budget() TO authenticated;

-- Migration: Add icon and color columns to envelopes table
-- Adds UI customization fields to envelopes table

-- Add icon and color columns to envelopes table
ALTER TABLE public.envelopes 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '💰',
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#10B981';
-- Migration: Add default budget support
-- Adds default_budget_id to user_profiles table and auto-populate user_id trigger

-- Add function to auto-populate user_id on budgets
CREATE OR REPLACE FUNCTION public.populate_user_id_budgets()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate user_id from JWT if not provided
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  
  -- Error if no valid user
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-populate user_id on budgets
CREATE TRIGGER populate_budgets_user_id
  BEFORE INSERT ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_user_id_budgets();

-- Add default_budget_id column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN default_budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_user_profiles_default_budget_id ON public.user_profiles(default_budget_id);

-- Add a function to verify budget ownership when setting default
CREATE OR REPLACE FUNCTION public.verify_budget_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL (no default budget)
  IF NEW.default_budget_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Verify the budget belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE id = NEW.default_budget_id 
    AND user_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Budget does not belong to user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to verify budget ownership
CREATE TRIGGER verify_default_budget_ownership
  BEFORE INSERT OR UPDATE OF default_budget_id ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.verify_budget_ownership();

-- Add RLS policy for updating default_budget_id
-- (The existing update policy already allows users to update their own profile)

-- Add convenience view for budgets with is_default flag
CREATE OR REPLACE VIEW public.budgets_with_default AS
SELECT 
  b.*,
  CASE 
    WHEN b.id = up.default_budget_id THEN true 
    ELSE false 
  END AS is_default
FROM public.budgets b
LEFT JOIN public.user_profiles up ON up.id = b.user_id;

-- Grant appropriate permissions on the view
GRANT SELECT ON public.budgets_with_default TO authenticated;

-- Add RLS to the view (inherits from underlying tables)
ALTER VIEW public.budgets_with_default SET (security_invoker = true);

-- Add function to set default budget (for edge functions)
CREATE OR REPLACE FUNCTION public.set_default_budget(budget_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update user's default budget
  UPDATE public.user_profiles
  SET default_budget_id = budget_id
  WHERE id = auth.uid();
  
  -- Verify the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_default_budget(UUID) TO authenticated;

-- Add function to get user's default budget
CREATE OR REPLACE FUNCTION public.get_default_budget()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  description TEXT,
  available_amount DECIMAL(12, 2),
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.*
  FROM public.budgets b
  JOIN public.user_profiles up ON up.default_budget_id = b.id
  WHERE up.id = auth.uid()
  AND b.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_default_budget() TO authenticated;

-- Migration: Add icon and color columns to envelopes table
-- Adds UI customization fields to envelopes table

-- Add icon and color columns to envelopes table
ALTER TABLE public.envelopes 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '💰',
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#10B981';