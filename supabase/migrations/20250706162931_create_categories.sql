-- Migration: 006_create_categories.sql
-- Purpose: Create categories table (budget-scoped) for transaction categorization
-- Date: 2025-07-06

-- Create categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Budget relationship (all categories are scoped to a specific budget)
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    
    -- Category details
    name TEXT NOT NULL,
    description TEXT,
    color TEXT, -- Hex color code for UI (e.g., "#FF5733")
    icon TEXT,  -- Icon identifier for UI
    
    -- Category configuration
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0, -- For custom ordering in UI
    
    -- Category type (for future use - income vs expense categories)
    category_type TEXT DEFAULT 'expense' CHECK (category_type IN ('income', 'expense', 'transfer')),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT categories_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT categories_unique_name_per_budget UNIQUE (budget_id, name),
    CONSTRAINT categories_color_format CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT categories_sort_order_positive CHECK (sort_order >= 0)
);

-- Create updated_at trigger for categories
CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON public.categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access categories in their own budgets
CREATE POLICY "Users can view categories in own budgets" 
    ON public.categories 
    FOR SELECT 
    USING (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert categories in own budgets" 
    ON public.categories 
    FOR INSERT 
    WITH CHECK (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update categories in own budgets" 
    ON public.categories 
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

CREATE POLICY "Users can delete categories in own budgets" 
    ON public.categories 
    FOR DELETE 
    USING (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    );

-- Create function to auto-create default categories for new budgets
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default expense categories for new budgets
    INSERT INTO public.categories (budget_id, name, description, color, category_type, sort_order)
    VALUES 
        (NEW.id, 'Groceries', 'Food and grocery expenses', '#4CAF50', 'expense', 1),
        (NEW.id, 'Transportation', 'Gas, public transit, car expenses', '#2196F3', 'expense', 2),
        (NEW.id, 'Utilities', 'Electricity, water, internet, phone', '#FF9800', 'expense', 3),
        (NEW.id, 'Entertainment', 'Movies, dining out, hobbies', '#9C27B0', 'expense', 4),
        (NEW.id, 'Healthcare', 'Medical, dental, insurance', '#F44336', 'expense', 5),
        (NEW.id, 'Housing', 'Rent, mortgage, maintenance', '#795548', 'expense', 6),
        (NEW.id, 'Personal Care', 'Clothing, haircuts, personal items', '#E91E63', 'expense', 7),
        (NEW.id, 'Other Expenses', 'Miscellaneous expenses', '#607D8B', 'expense', 8),
        -- Default income categories
        (NEW.id, 'Salary Income', 'Regular salary and wages', '#8BC34A', 'income', 1),
        (NEW.id, 'Other Income', 'Bonus, gifts, miscellaneous income', '#CDDC39', 'income', 2);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create default categories when budget is created
CREATE TRIGGER create_default_categories_on_budget_creation
    AFTER INSERT ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_categories();

-- Add helpful comments
COMMENT ON TABLE public.categories IS 'Transaction categories for budget planning and tracking';
COMMENT ON COLUMN public.categories.id IS 'Primary key for category';
COMMENT ON COLUMN public.categories.budget_id IS 'Foreign key to budgets.id (budget-scoped)';
COMMENT ON COLUMN public.categories.name IS 'Category name (unique per budget)';
COMMENT ON COLUMN public.categories.description IS 'Optional category description';
COMMENT ON COLUMN public.categories.color IS 'Hex color code for UI display (#RRGGBB)';
COMMENT ON COLUMN public.categories.icon IS 'Icon identifier for UI display';
COMMENT ON COLUMN public.categories.is_active IS 'Whether category is currently active';
COMMENT ON COLUMN public.categories.sort_order IS 'Display order in UI (lower = first)';
COMMENT ON COLUMN public.categories.category_type IS 'Type: income, expense, or transfer';

-- Create indexes for performance
CREATE INDEX idx_categories_budget_id ON public.categories(budget_id);
CREATE INDEX idx_categories_is_active ON public.categories(budget_id, is_active) WHERE is_active = true;
CREATE INDEX idx_categories_type_sort ON public.categories(budget_id, category_type, sort_order);
CREATE INDEX idx_categories_created_at ON public.categories(created_at);

-- Add index for unique constraint performance
CREATE INDEX idx_categories_budget_name ON public.categories(budget_id, name);