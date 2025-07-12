-- Migration: 003_create_income_sources.sql
-- Purpose: Create income_sources table (budget-scoped)
-- Date: 2025-07-06

-- Create income_sources table
CREATE TABLE public.income_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Budget relationship (all income sources are scoped to a specific budget)
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    
    -- Income source details
    name TEXT NOT NULL,
    description TEXT,
    
    -- Income source configuration
    is_active BOOLEAN DEFAULT true,
    expected_monthly_amount DECIMAL(12,2), -- Optional: for budgeting planning
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT income_sources_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT income_sources_amount_positive CHECK (expected_monthly_amount IS NULL OR expected_monthly_amount >= 0),
    CONSTRAINT income_sources_unique_name_per_budget UNIQUE (budget_id, name)
);

-- Create updated_at trigger for income_sources
CREATE TRIGGER update_income_sources_updated_at 
    BEFORE UPDATE ON public.income_sources 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access income sources in their own budgets
CREATE POLICY "Users can view income sources in own budgets" 
    ON public.income_sources 
    FOR SELECT 
    USING (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert income sources in own budgets" 
    ON public.income_sources 
    FOR INSERT 
    WITH CHECK (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update income sources in own budgets" 
    ON public.income_sources 
    FOR UPDATE 
    USING (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete income sources in own budgets" 
    ON public.income_sources 
    FOR DELETE 
    USING (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    );

-- Create function to auto-create default income sources for new budgets
CREATE OR REPLACE FUNCTION public.create_default_income_sources()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default income sources for new budgets
    INSERT INTO public.income_sources (budget_id, name, description, is_active)
    VALUES 
        (NEW.id, 'Salary', 'Primary salary income', true),
        (NEW.id, 'Other Income', 'Miscellaneous income sources', true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create default income sources when budget is created
CREATE TRIGGER create_default_income_sources_on_budget_creation
    AFTER INSERT ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_income_sources();

-- Add helpful comments
COMMENT ON TABLE public.income_sources IS 'Income sources for budget planning and tracking';
COMMENT ON COLUMN public.income_sources.id IS 'Primary key for income source';
COMMENT ON COLUMN public.income_sources.budget_id IS 'Foreign key to budgets.id (budget-scoped)';
COMMENT ON COLUMN public.income_sources.name IS 'Income source name (unique per budget)';
COMMENT ON COLUMN public.income_sources.description IS 'Optional income source description';
COMMENT ON COLUMN public.income_sources.is_active IS 'Whether income source is currently active';
COMMENT ON COLUMN public.income_sources.expected_monthly_amount IS 'Expected monthly income for planning';

-- Create indexes for performance
CREATE INDEX idx_income_sources_budget_id ON public.income_sources(budget_id);
CREATE INDEX idx_income_sources_is_active ON public.income_sources(budget_id, is_active) WHERE is_active = true;
CREATE INDEX idx_income_sources_created_at ON public.income_sources(created_at);

-- Add index for unique constraint performance
CREATE INDEX idx_income_sources_budget_name ON public.income_sources(budget_id, name);