-- Migration: 008_create_payees.sql
-- Purpose: Create payees table (budget-scoped) for expense tracking system
-- Date: 2025-07-06

-- Create payees table
CREATE TABLE public.payees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Budget relationship (all payees are scoped to a specific budget)
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    
    -- Payee details
    name TEXT NOT NULL,
    description TEXT,
    color TEXT, -- Hex color code for UI (e.g., "#FF5733")
    icon TEXT,  -- Icon identifier for UI
    
    -- Payee configuration
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0, -- For custom ordering in UI
    
    -- Payee type (business, person, organization, etc.)
    payee_type TEXT DEFAULT 'business' CHECK (payee_type IN ('business', 'person', 'organization', 'utility', 'service', 'other')),
    
    -- Contact information (optional)
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    
    -- Payment preferences (optional)
    preferred_payment_method TEXT, -- cash, check, card, bank_transfer, etc.
    account_number TEXT, -- for bills/utilities
    
    -- Tracking fields
    total_paid DECIMAL(12,2) DEFAULT 0 NOT NULL, -- Total amount paid to this payee (updated by transactions)
    last_payment_date DATE, -- Date of last payment
    last_payment_amount DECIMAL(12,2), -- Amount of last payment
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT payees_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT payees_unique_name_per_budget UNIQUE (budget_id, name),
    CONSTRAINT payees_color_format CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT payees_sort_order_positive CHECK (sort_order >= 0),
    CONSTRAINT payees_total_paid_non_negative CHECK (total_paid >= 0),
    CONSTRAINT payees_last_payment_amount_positive CHECK (last_payment_amount IS NULL OR last_payment_amount > 0),
    CONSTRAINT payees_email_format CHECK (email IS NULL OR email ~ '^[^@]+@[^@]+\.[^@]+$')
);

-- Create updated_at trigger for payees
CREATE TRIGGER update_payees_updated_at 
    BEFORE UPDATE ON public.payees 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.payees ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access payees in their own budgets
CREATE POLICY "Users can view payees in own budgets" 
    ON public.payees 
    FOR SELECT 
    USING (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert payees in own budgets" 
    ON public.payees 
    FOR INSERT 
    WITH CHECK (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update payees in own budgets" 
    ON public.payees 
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

CREATE POLICY "Users can delete payees in own budgets" 
    ON public.payees 
    FOR DELETE 
    USING (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    );

-- Create function to auto-create default payees for new budgets
CREATE OR REPLACE FUNCTION public.create_default_payees()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default payees for new budgets
    INSERT INTO public.payees (budget_id, name, description, color, payee_type, sort_order)
    VALUES 
        (NEW.id, 'Grocery Store', 'Regular grocery shopping', '#4CAF50', 'business', 1),
        (NEW.id, 'Gas Station', 'Fuel and gas purchases', '#FF9800', 'business', 2),
        (NEW.id, 'Electric Company', 'Monthly electricity bills', '#FFC107', 'utility', 3),
        (NEW.id, 'Internet Provider', 'Monthly internet service', '#2196F3', 'service', 4),
        (NEW.id, 'Insurance Company', 'Insurance premiums', '#9C27B0', 'business', 5),
        (NEW.id, 'Bank', 'Loan payments and fees', '#607D8B', 'business', 6),
        (NEW.id, 'Landlord/Mortgage', 'Rent or mortgage payments', '#795548', 'person', 7),
        (NEW.id, 'Doctor/Healthcare', 'Medical expenses', '#F44336', 'service', 8),
        (NEW.id, 'Restaurant', 'Dining out expenses', '#E91E63', 'business', 9),
        (NEW.id, 'Online Store', 'Online purchases', '#3F51B5', 'business', 10),
        (NEW.id, 'Cash Withdrawal', 'ATM and cash transactions', '#009688', 'other', 11),
        (NEW.id, 'Other Payee', 'Miscellaneous payments', '#9E9E9E', 'other', 12);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create default payees when budget is created
CREATE TRIGGER create_default_payees_on_budget_creation
    AFTER INSERT ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_payees();

-- Add helpful comments
COMMENT ON TABLE public.payees IS 'Payees for expense tracking and payments';
COMMENT ON COLUMN public.payees.id IS 'Primary key for payee';
COMMENT ON COLUMN public.payees.budget_id IS 'Foreign key to budgets.id (budget-scoped)';
COMMENT ON COLUMN public.payees.name IS 'Payee name (unique per budget)';
COMMENT ON COLUMN public.payees.description IS 'Optional payee description';
COMMENT ON COLUMN public.payees.color IS 'Hex color code for UI display (#RRGGBB)';
COMMENT ON COLUMN public.payees.icon IS 'Icon identifier for UI display';
COMMENT ON COLUMN public.payees.is_active IS 'Whether payee is currently active';
COMMENT ON COLUMN public.payees.sort_order IS 'Display order in UI (lower = first)';
COMMENT ON COLUMN public.payees.payee_type IS 'Type of payee (business, person, organization, utility, service, other)';
COMMENT ON COLUMN public.payees.address IS 'Optional payee address';
COMMENT ON COLUMN public.payees.phone IS 'Optional payee phone number';
COMMENT ON COLUMN public.payees.email IS 'Optional payee email address';
COMMENT ON COLUMN public.payees.website IS 'Optional payee website URL';
COMMENT ON COLUMN public.payees.preferred_payment_method IS 'Preferred payment method';
COMMENT ON COLUMN public.payees.account_number IS 'Account number for bills/utilities';
COMMENT ON COLUMN public.payees.total_paid IS 'Total amount paid to this payee (updated by transactions)';
COMMENT ON COLUMN public.payees.last_payment_date IS 'Date of last payment';
COMMENT ON COLUMN public.payees.last_payment_amount IS 'Amount of last payment';

-- Create indexes for performance
CREATE INDEX idx_payees_budget_id ON public.payees(budget_id);
CREATE INDEX idx_payees_is_active ON public.payees(budget_id, is_active) WHERE is_active = true;
CREATE INDEX idx_payees_type_sort ON public.payees(budget_id, payee_type, sort_order);
CREATE INDEX idx_payees_created_at ON public.payees(created_at);
CREATE INDEX idx_payees_last_payment ON public.payees(budget_id, last_payment_date) WHERE last_payment_date IS NOT NULL;

-- Add index for unique constraint performance
CREATE INDEX idx_payees_budget_name ON public.payees(budget_id, name);

-- Create index for total payments tracking
CREATE INDEX idx_payees_total_paid ON public.payees(budget_id, total_paid) WHERE total_paid > 0;