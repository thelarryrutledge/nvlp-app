-- Migration: 007_create_envelopes.sql
-- Purpose: Create envelopes table (budget-scoped) for envelope budgeting system
-- Date: 2025-07-06

-- Create envelopes table
CREATE TABLE public.envelopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Budget relationship (all envelopes are scoped to a specific budget)
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    
    -- Envelope details
    name TEXT NOT NULL,
    description TEXT,
    color TEXT, -- Hex color code for UI (e.g., "#FF5733")
    icon TEXT,  -- Icon identifier for UI
    
    -- Envelope configuration
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0, -- For custom ordering in UI
    
    -- Current balance (calculated from transactions, but stored for performance)
    current_balance DECIMAL(12,2) DEFAULT 0 NOT NULL,
    
    -- Target/goal amount for this envelope (optional)
    target_amount DECIMAL(12,2), -- Goal amount to reach
    
    -- Notification features
    should_notify BOOLEAN DEFAULT false NOT NULL,
    notify_date DATE, -- Optional: notify when this date is reached
    notify_amount DECIMAL(12,2), -- Optional: notify when balance reaches this amount
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT envelopes_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT envelopes_unique_name_per_budget UNIQUE (budget_id, name),
    CONSTRAINT envelopes_color_format CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT envelopes_sort_order_positive CHECK (sort_order >= 0),
    CONSTRAINT envelopes_target_amount_positive CHECK (target_amount IS NULL OR target_amount >= 0),
    CONSTRAINT envelopes_notify_amount_positive CHECK (notify_amount IS NULL OR notify_amount >= 0),
    CONSTRAINT envelopes_notification_logic CHECK (
        -- If should_notify is true, at least one notification type must be set
        (should_notify = false) OR 
        (should_notify = true AND (notify_date IS NOT NULL OR notify_amount IS NOT NULL))
    )
);

-- Create updated_at trigger for envelopes
CREATE TRIGGER update_envelopes_updated_at 
    BEFORE UPDATE ON public.envelopes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.envelopes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access envelopes in their own budgets
CREATE POLICY "Users can view envelopes in own budgets" 
    ON public.envelopes 
    FOR SELECT 
    USING (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert envelopes in own budgets" 
    ON public.envelopes 
    FOR INSERT 
    WITH CHECK (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update envelopes in own budgets" 
    ON public.envelopes 
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

CREATE POLICY "Users can delete envelopes in own budgets" 
    ON public.envelopes 
    FOR DELETE 
    USING (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    );

-- Create function to auto-create default envelopes for new budgets
CREATE OR REPLACE FUNCTION public.create_default_envelopes()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default envelopes for new budgets
    INSERT INTO public.envelopes (budget_id, name, description, color, target_amount, sort_order)
    VALUES 
        (NEW.id, 'Emergency Fund', 'Emergency fund for unexpected expenses', '#F44336', 1000.00, 1),
        (NEW.id, 'Groceries', 'Monthly grocery budget', '#4CAF50', 400.00, 2),
        (NEW.id, 'Transportation', 'Gas, public transit, car expenses', '#2196F3', 200.00, 3),
        (NEW.id, 'Entertainment', 'Movies, dining out, fun activities', '#9C27B0', 150.00, 4),
        (NEW.id, 'Utilities', 'Electricity, water, internet, phone bills', '#FF9800', 300.00, 5),
        (NEW.id, 'Personal Care', 'Clothing, haircuts, personal items', '#E91E63', 100.00, 6),
        (NEW.id, 'Savings Goals', 'Long-term savings and goals', '#8BC34A', 500.00, 7),
        (NEW.id, 'Miscellaneous', 'Other expenses and flexible spending', '#607D8B', 200.00, 8);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create default envelopes when budget is created
CREATE TRIGGER create_default_envelopes_on_budget_creation
    AFTER INSERT ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_envelopes();

-- Add helpful comments
COMMENT ON TABLE public.envelopes IS 'Envelopes for budget allocation and expense tracking';
COMMENT ON COLUMN public.envelopes.id IS 'Primary key for envelope';
COMMENT ON COLUMN public.envelopes.budget_id IS 'Foreign key to budgets.id (budget-scoped)';
COMMENT ON COLUMN public.envelopes.name IS 'Envelope name (unique per budget)';
COMMENT ON COLUMN public.envelopes.description IS 'Optional envelope description';
COMMENT ON COLUMN public.envelopes.color IS 'Hex color code for UI display (#RRGGBB)';
COMMENT ON COLUMN public.envelopes.icon IS 'Icon identifier for UI display';
COMMENT ON COLUMN public.envelopes.is_active IS 'Whether envelope is currently active';
COMMENT ON COLUMN public.envelopes.sort_order IS 'Display order in UI (lower = first)';
COMMENT ON COLUMN public.envelopes.current_balance IS 'Current amount in envelope (updated by transactions)';
COMMENT ON COLUMN public.envelopes.target_amount IS 'Goal amount for this envelope';
COMMENT ON COLUMN public.envelopes.should_notify IS 'Whether to send notifications for this envelope';
COMMENT ON COLUMN public.envelopes.notify_date IS 'Optional: notify when this date is reached';
COMMENT ON COLUMN public.envelopes.notify_amount IS 'Optional: notify when balance reaches this amount';

-- Create indexes for performance
CREATE INDEX idx_envelopes_budget_id ON public.envelopes(budget_id);
CREATE INDEX idx_envelopes_is_active ON public.envelopes(budget_id, is_active) WHERE is_active = true;
CREATE INDEX idx_envelopes_sort_order ON public.envelopes(budget_id, sort_order);
CREATE INDEX idx_envelopes_created_at ON public.envelopes(created_at);

-- Add index for unique constraint performance
CREATE INDEX idx_envelopes_budget_name ON public.envelopes(budget_id, name);

-- Create indexes for notification queries
CREATE INDEX idx_envelopes_date_notifications ON public.envelopes(should_notify, notify_date) 
WHERE should_notify = true AND notify_date IS NOT NULL;

CREATE INDEX idx_envelopes_amount_notifications ON public.envelopes(should_notify, notify_amount, current_balance) 
WHERE should_notify = true AND notify_amount IS NOT NULL;

-- Create index for balance queries
CREATE INDEX idx_envelopes_balance ON public.envelopes(budget_id, current_balance);