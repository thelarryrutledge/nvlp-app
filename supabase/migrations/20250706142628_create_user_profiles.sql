-- Migration: 001_create_user_profiles.sql
-- Purpose: Create user_profiles table that extends auth.users
-- Date: 2025-07-06

-- Create user_profiles table that extends Supabase auth.users
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- User preferences and settings
    display_name TEXT,
    timezone TEXT DEFAULT 'UTC',
    currency_code CHAR(3) DEFAULT 'USD',
    date_format TEXT DEFAULT 'YYYY-MM-DD',
    
    -- Account settings
    default_budget_id UUID, -- Will reference budgets table (created later)
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own profile
CREATE POLICY "Users can view own profile" 
    ON public.user_profiles 
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON public.user_profiles 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.user_profiles 
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Note: No DELETE policy - profiles should not be deleted directly
-- User deletion is handled by Supabase Auth cascade

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Add helpful comments
COMMENT ON TABLE public.user_profiles IS 'User profile data that extends Supabase auth.users';
COMMENT ON COLUMN public.user_profiles.id IS 'Foreign key to auth.users.id';
COMMENT ON COLUMN public.user_profiles.display_name IS 'User display name, defaults to email';
COMMENT ON COLUMN public.user_profiles.timezone IS 'User timezone for date/time display';
COMMENT ON COLUMN public.user_profiles.currency_code IS 'Default currency code (ISO 4217)';
COMMENT ON COLUMN public.user_profiles.date_format IS 'Preferred date format for UI';
COMMENT ON COLUMN public.user_profiles.default_budget_id IS 'Reference to user default budget';

-- Create indexes for performance
CREATE INDEX idx_user_profiles_default_budget ON public.user_profiles(default_budget_id);
CREATE INDEX idx_user_profiles_created_at ON public.user_profiles(created_at);