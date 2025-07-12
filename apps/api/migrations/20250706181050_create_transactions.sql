-- Migration: 009_create_transactions.sql
-- Purpose: Create transactions table (budget-scoped) for money flow tracking
-- Date: 2025-07-06

-- Create transaction type enum
CREATE TYPE public.transaction_type AS ENUM (
    'income',        -- Money enters system (NULL → NULL, increases available_amount)
    'allocation',    -- Money allocated from available to envelope (NULL → envelope)
    'expense',       -- Money leaves system to payee (envelope → NULL + payee)
    'transfer',      -- Money moves between envelopes (envelope → envelope)
    'debt_payment'   -- Debt payment to payee (envelope → NULL + payee) - tracked separately from expenses
);

-- Create transactions table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Budget relationship (all transactions are scoped to a specific budget)
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type public.transaction_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Money flow relationships (based on transaction type)
    from_envelope_id UUID REFERENCES public.envelopes(id) ON DELETE RESTRICT,
    to_envelope_id UUID REFERENCES public.envelopes(id) ON DELETE RESTRICT,
    payee_id UUID REFERENCES public.payees(id) ON DELETE RESTRICT,
    income_source_id UUID REFERENCES public.income_sources(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
    
    -- Transaction metadata
    reference_number TEXT, -- Check number, transaction ID, etc.
    notes TEXT, -- Additional notes
    is_cleared BOOLEAN DEFAULT false, -- Has cleared the bank
    is_reconciled BOOLEAN DEFAULT false, -- Has been reconciled
    
    -- Tracking fields
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Soft delete support
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT transactions_amount_positive CHECK (amount > 0),
    CONSTRAINT transactions_date_not_future CHECK (transaction_date <= CURRENT_DATE + INTERVAL '1 day'), -- Allow 1 day future for timezone issues
    
    -- Transaction type-specific constraints
    CONSTRAINT transactions_income_flow CHECK (
        (transaction_type = 'income' AND 
         from_envelope_id IS NULL AND 
         to_envelope_id IS NULL AND 
         payee_id IS NULL AND
         income_source_id IS NOT NULL)
    ),
    CONSTRAINT transactions_allocation_flow CHECK (
        (transaction_type = 'allocation' AND 
         from_envelope_id IS NULL AND 
         to_envelope_id IS NOT NULL AND 
         payee_id IS NULL)
    ),
    CONSTRAINT transactions_expense_flow CHECK (
        (transaction_type = 'expense' AND 
         from_envelope_id IS NOT NULL AND 
         to_envelope_id IS NULL AND 
         payee_id IS NOT NULL)
    ),
    CONSTRAINT transactions_transfer_flow CHECK (
        (transaction_type = 'transfer' AND 
         from_envelope_id IS NOT NULL AND 
         to_envelope_id IS NOT NULL AND 
         from_envelope_id != to_envelope_id AND
         payee_id IS NULL)
    ),
    CONSTRAINT transactions_debt_payment_flow CHECK (
        (transaction_type = 'debt_payment' AND 
         from_envelope_id IS NOT NULL AND 
         to_envelope_id IS NULL AND 
         payee_id IS NOT NULL)
    ),
    
    -- Ensure proper flow constraints are met
    CONSTRAINT transactions_valid_flow CHECK (
        (transaction_type = 'income' AND from_envelope_id IS NULL AND to_envelope_id IS NULL AND payee_id IS NULL AND income_source_id IS NOT NULL) OR
        (transaction_type = 'allocation' AND from_envelope_id IS NULL AND to_envelope_id IS NOT NULL AND payee_id IS NULL) OR
        (transaction_type = 'expense' AND from_envelope_id IS NOT NULL AND to_envelope_id IS NULL AND payee_id IS NOT NULL) OR
        (transaction_type = 'transfer' AND from_envelope_id IS NOT NULL AND to_envelope_id IS NOT NULL AND from_envelope_id != to_envelope_id AND payee_id IS NULL) OR
        (transaction_type = 'debt_payment' AND from_envelope_id IS NOT NULL AND to_envelope_id IS NULL AND payee_id IS NOT NULL)
    )
);

-- Create updated_at trigger for transactions
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON public.transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access transactions in their own budgets
CREATE POLICY "Users can view transactions in own budgets" 
    ON public.transactions 
    FOR SELECT 
    USING (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        ) AND
        (is_deleted = false OR deleted_by = auth.uid()) -- Can see own deleted transactions
    );

CREATE POLICY "Users can insert transactions in own budgets" 
    ON public.transactions 
    FOR INSERT 
    WITH CHECK (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        ) AND
        is_deleted = false -- Cannot insert already deleted
    );

CREATE POLICY "Users can update transactions in own budgets" 
    ON public.transactions 
    FOR UPDATE 
    USING (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        ) AND
        is_deleted = false -- Cannot update deleted transactions
    )
    WITH CHECK (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    );

-- Soft delete only (no hard delete)
CREATE POLICY "Users can soft delete transactions in own budgets" 
    ON public.transactions 
    FOR UPDATE
    USING (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        ) AND
        is_deleted = false -- Can only delete non-deleted transactions
    )
    WITH CHECK (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        ) AND
        is_deleted = true -- Can only set to deleted
    );

-- Create function to validate transaction envelope ownership
CREATE OR REPLACE FUNCTION public.validate_transaction_envelope_ownership()
RETURNS TRIGGER AS $$
BEGIN
    -- Check from_envelope belongs to same budget
    IF NEW.from_envelope_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.envelopes 
            WHERE id = NEW.from_envelope_id 
            AND budget_id = NEW.budget_id
        ) THEN
            RAISE EXCEPTION 'From envelope does not belong to this budget';
        END IF;
    END IF;
    
    -- Check to_envelope belongs to same budget
    IF NEW.to_envelope_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.envelopes 
            WHERE id = NEW.to_envelope_id 
            AND budget_id = NEW.budget_id
        ) THEN
            RAISE EXCEPTION 'To envelope does not belong to this budget';
        END IF;
    END IF;
    
    -- Check payee belongs to same budget
    IF NEW.payee_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.payees 
            WHERE id = NEW.payee_id 
            AND budget_id = NEW.budget_id
        ) THEN
            RAISE EXCEPTION 'Payee does not belong to this budget';
        END IF;
    END IF;
    
    -- Check income source belongs to same budget
    IF NEW.income_source_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.income_sources 
            WHERE id = NEW.income_source_id 
            AND budget_id = NEW.budget_id
        ) THEN
            RAISE EXCEPTION 'Income source does not belong to this budget';
        END IF;
    END IF;
    
    -- Check category belongs to same budget
    IF NEW.category_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.categories 
            WHERE id = NEW.category_id 
            AND budget_id = NEW.budget_id
        ) THEN
            RAISE EXCEPTION 'Category does not belong to this budget';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate envelope ownership
CREATE TRIGGER validate_transaction_envelope_ownership_trigger
    BEFORE INSERT OR UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_transaction_envelope_ownership();

-- Create function to update envelope balances after transaction
CREATE OR REPLACE FUNCTION public.update_envelope_balances()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        -- Allocation: increase to_envelope balance
        IF NEW.transaction_type = 'allocation' AND NEW.to_envelope_id IS NOT NULL THEN
            UPDATE public.envelopes 
            SET current_balance = current_balance + NEW.amount
            WHERE id = NEW.to_envelope_id;
        END IF;
        
        -- Expense: decrease from_envelope balance
        IF NEW.transaction_type = 'expense' AND NEW.from_envelope_id IS NOT NULL THEN
            UPDATE public.envelopes 
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.from_envelope_id;
        END IF;
        
        -- Debt Payment: decrease from_envelope balance (same as expense)
        IF NEW.transaction_type = 'debt_payment' AND NEW.from_envelope_id IS NOT NULL THEN
            UPDATE public.envelopes 
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.from_envelope_id;
        END IF;
        
        -- Transfer: decrease from, increase to
        IF NEW.transaction_type = 'transfer' THEN
            UPDATE public.envelopes 
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.from_envelope_id;
            
            UPDATE public.envelopes 
            SET current_balance = current_balance + NEW.amount
            WHERE id = NEW.to_envelope_id;
        END IF;
    END IF;
    
    -- Handle UPDATE (amount or envelope changes)
    IF TG_OP = 'UPDATE' THEN
        -- If transaction is being soft deleted
        IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
            -- Reverse the transaction effect
            IF NEW.transaction_type = 'allocation' AND NEW.to_envelope_id IS NOT NULL THEN
                UPDATE public.envelopes 
                SET current_balance = current_balance - NEW.amount
                WHERE id = NEW.to_envelope_id;
            END IF;
            
            IF NEW.transaction_type = 'expense' AND NEW.from_envelope_id IS NOT NULL THEN
                UPDATE public.envelopes 
                SET current_balance = current_balance + NEW.amount
                WHERE id = NEW.from_envelope_id;
            END IF;
            
            IF NEW.transaction_type = 'debt_payment' AND NEW.from_envelope_id IS NOT NULL THEN
                UPDATE public.envelopes 
                SET current_balance = current_balance + NEW.amount
                WHERE id = NEW.from_envelope_id;
            END IF;
            
            IF NEW.transaction_type = 'transfer' THEN
                UPDATE public.envelopes 
                SET current_balance = current_balance + NEW.amount
                WHERE id = NEW.from_envelope_id;
                
                UPDATE public.envelopes 
                SET current_balance = current_balance - NEW.amount
                WHERE id = NEW.to_envelope_id;
            END IF;
        END IF;
        
        -- If transaction is being restored from soft delete
        IF OLD.is_deleted = true AND NEW.is_deleted = false THEN
            -- Reapply the transaction effect
            IF NEW.transaction_type = 'allocation' AND NEW.to_envelope_id IS NOT NULL THEN
                UPDATE public.envelopes 
                SET current_balance = current_balance + NEW.amount
                WHERE id = NEW.to_envelope_id;
            END IF;
            
            IF NEW.transaction_type = 'expense' AND NEW.from_envelope_id IS NOT NULL THEN
                UPDATE public.envelopes 
                SET current_balance = current_balance - NEW.amount
                WHERE id = NEW.from_envelope_id;
            END IF;
            
            IF NEW.transaction_type = 'debt_payment' AND NEW.from_envelope_id IS NOT NULL THEN
                UPDATE public.envelopes 
                SET current_balance = current_balance - NEW.amount
                WHERE id = NEW.from_envelope_id;
            END IF;
            
            IF NEW.transaction_type = 'transfer' THEN
                UPDATE public.envelopes 
                SET current_balance = current_balance - NEW.amount
                WHERE id = NEW.from_envelope_id;
                
                UPDATE public.envelopes 
                SET current_balance = current_balance + NEW.amount
                WHERE id = NEW.to_envelope_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update envelope balances
CREATE TRIGGER update_envelope_balances_trigger
    AFTER INSERT OR UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_envelope_balances();

-- Create function to update payee payment tracking
CREATE OR REPLACE FUNCTION public.update_payee_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Process expense and debt_payment transactions with payees
    IF (NEW.transaction_type IN ('expense', 'debt_payment')) AND NEW.payee_id IS NOT NULL THEN
        -- Handle INSERT or restore from soft delete
        IF (TG_OP = 'INSERT' AND NEW.is_deleted = false) OR 
           (TG_OP = 'UPDATE' AND OLD.is_deleted = true AND NEW.is_deleted = false) THEN
            UPDATE public.payees
            SET total_paid = total_paid + NEW.amount,
                last_payment_date = NEW.transaction_date,
                last_payment_amount = NEW.amount
            WHERE id = NEW.payee_id;
        END IF;
        
        -- Handle soft delete
        IF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
            UPDATE public.payees
            SET total_paid = total_paid - NEW.amount
            WHERE id = NEW.payee_id;
            
            -- Update last payment info if this was the last payment
            -- This is a simplified approach - in production, you'd recalculate from remaining transactions
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update payee totals
CREATE TRIGGER update_payee_totals_trigger
    AFTER INSERT OR UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_payee_totals();

-- Add helpful comments
COMMENT ON TABLE public.transactions IS 'Financial transactions implementing the money flow model';
COMMENT ON COLUMN public.transactions.id IS 'Primary key for transaction';
COMMENT ON COLUMN public.transactions.budget_id IS 'Foreign key to budgets.id (budget-scoped)';
COMMENT ON COLUMN public.transactions.transaction_type IS 'Type of transaction (income, allocation, expense, transfer)';
COMMENT ON COLUMN public.transactions.amount IS 'Transaction amount (always positive)';
COMMENT ON COLUMN public.transactions.description IS 'Transaction description';
COMMENT ON COLUMN public.transactions.transaction_date IS 'Date of transaction';
COMMENT ON COLUMN public.transactions.from_envelope_id IS 'Source envelope (for expense/transfer)';
COMMENT ON COLUMN public.transactions.to_envelope_id IS 'Destination envelope (for allocation/transfer)';
COMMENT ON COLUMN public.transactions.payee_id IS 'Payee (for expense transactions)';
COMMENT ON COLUMN public.transactions.income_source_id IS 'Income source (for income transactions)';
COMMENT ON COLUMN public.transactions.category_id IS 'Transaction category for reporting';
COMMENT ON COLUMN public.transactions.reference_number IS 'Check number or external reference';
COMMENT ON COLUMN public.transactions.notes IS 'Additional notes';
COMMENT ON COLUMN public.transactions.is_cleared IS 'Has cleared the bank';
COMMENT ON COLUMN public.transactions.is_reconciled IS 'Has been reconciled';
COMMENT ON COLUMN public.transactions.is_deleted IS 'Soft delete flag';
COMMENT ON COLUMN public.transactions.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN public.transactions.deleted_by IS 'User who deleted';

-- Create indexes for performance
CREATE INDEX idx_transactions_budget_id ON public.transactions(budget_id);
CREATE INDEX idx_transactions_type ON public.transactions(budget_id, transaction_type);
CREATE INDEX idx_transactions_date ON public.transactions(budget_id, transaction_date DESC);
CREATE INDEX idx_transactions_from_envelope ON public.transactions(from_envelope_id) WHERE from_envelope_id IS NOT NULL;
CREATE INDEX idx_transactions_to_envelope ON public.transactions(to_envelope_id) WHERE to_envelope_id IS NOT NULL;
CREATE INDEX idx_transactions_payee ON public.transactions(payee_id) WHERE payee_id IS NOT NULL;
CREATE INDEX idx_transactions_income_source ON public.transactions(income_source_id) WHERE income_source_id IS NOT NULL;
CREATE INDEX idx_transactions_category ON public.transactions(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_transactions_is_deleted ON public.transactions(budget_id, is_deleted) WHERE is_deleted = false;
CREATE INDEX idx_transactions_cleared ON public.transactions(budget_id, is_cleared) WHERE is_cleared = false;
CREATE INDEX idx_transactions_reconciled ON public.transactions(budget_id, is_reconciled) WHERE is_reconciled = false;