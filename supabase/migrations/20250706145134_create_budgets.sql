-- Migration: 002_create_budgets.sql
-- Purpose: Create budgets table with user relationship
-- Date: 2025-07-06

-- Create budgets table
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key to user who owns this budget
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Budget details
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    
    -- Budget status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT budgets_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT budgets_user_default_unique UNIQUE (user_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Create updated_at trigger for budgets
CREATE TRIGGER update_budgets_updated_at 
    BEFORE UPDATE ON public.budgets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own budgets
CREATE POLICY "Users can view own budgets" 
    ON public.budgets 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" 
    ON public.budgets 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" 
    ON public.budgets 
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" 
    ON public.budgets 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Create function to ensure only one default budget per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_budget()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a budget as default, unset all other defaults for this user
    IF NEW.is_default = true THEN
        UPDATE public.budgets 
        SET is_default = false 
        WHERE user_id = NEW.user_id 
          AND id != NEW.id 
          AND is_default = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce single default budget
CREATE TRIGGER ensure_single_default_budget_trigger
    BEFORE INSERT OR UPDATE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_single_default_budget();

-- Create function to auto-create default budget for new users
CREATE OR REPLACE FUNCTION public.create_default_budget_for_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a default budget when a user profile is created
    INSERT INTO public.budgets (user_id, name, description, is_default, is_active)
    VALUES (
        NEW.id,
        'My Budget',
        'Default budget for envelope budgeting',
        true,
        true
    );
    
    -- Update the user profile with the new default budget ID
    UPDATE public.user_profiles 
    SET default_budget_id = (
        SELECT id FROM public.budgets 
        WHERE user_id = NEW.id AND is_default = true 
        LIMIT 1
    )
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create default budget when user profile is created
CREATE TRIGGER create_default_budget_on_profile_creation
    AFTER INSERT ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_budget_for_user();

-- Add helpful comments
COMMENT ON TABLE public.budgets IS 'User budgets for envelope budgeting system';
COMMENT ON COLUMN public.budgets.id IS 'Primary key for budget';
COMMENT ON COLUMN public.budgets.user_id IS 'Foreign key to auth.users.id';
COMMENT ON COLUMN public.budgets.name IS 'Budget name (required)';
COMMENT ON COLUMN public.budgets.description IS 'Optional budget description';
COMMENT ON COLUMN public.budgets.is_default IS 'Whether this is the user default budget (only one per user)';
COMMENT ON COLUMN public.budgets.is_active IS 'Whether budget is currently active';

-- Create indexes for performance
CREATE INDEX idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX idx_budgets_is_default ON public.budgets(user_id, is_default) WHERE is_default = true;
CREATE INDEX idx_budgets_created_at ON public.budgets(created_at);

-- Add foreign key constraint from user_profiles to budgets
ALTER TABLE public.user_profiles 
ADD CONSTRAINT fk_user_profiles_default_budget 
FOREIGN KEY (default_budget_id) REFERENCES public.budgets(id) ON DELETE SET NULL;