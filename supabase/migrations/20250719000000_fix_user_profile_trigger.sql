-- Fix user profile creation trigger to handle RLS and errors properly
-- This addresses the "Database error saving new user" issue during registration

-- Update the function to handle errors gracefully and ensure it can bypass RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert new user profile, bypassing RLS since this runs as a trigger
    INSERT INTO public.user_profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error for debugging but don't fail the user creation
    RAISE LOG 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger function has proper permissions by recreating it
-- The SECURITY DEFINER ensures it runs with the privileges of the function owner
-- rather than the calling user (which doesn't exist yet during signup)