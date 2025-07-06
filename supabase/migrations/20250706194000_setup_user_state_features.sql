-- Migration: 017_setup_user_state_features.sql
-- Purpose: Add triggers and functions to existing user_state table
-- Date: 2025-07-06

-- Create function to automatically create user_state when budget is created
CREATE OR REPLACE FUNCTION public.create_default_user_state()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default user_state for the new budget
    INSERT INTO public.user_state (
        budget_id,
        available_amount,
        default_currency_code,
        date_format,
        timezone
    ) VALUES (
        NEW.id,
        0.00,
        'USD',
        'MM/DD/YYYY',
        'UTC'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create user_state when budget is created (if not exists)
DROP TRIGGER IF EXISTS create_default_user_state_trigger ON public.budgets;
CREATE TRIGGER create_default_user_state_trigger
    AFTER INSERT ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_user_state();

-- Create function to update available_amount when income transactions are created
CREATE OR REPLACE FUNCTION public.update_available_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT of income transactions
    IF TG_OP = 'INSERT' AND NEW.transaction_type = 'income' AND NEW.is_deleted = false THEN
        UPDATE public.user_state 
        SET available_amount = available_amount + NEW.amount,
            last_transaction_date = NEW.transaction_date
        WHERE budget_id = NEW.budget_id;
    END IF;
    
    -- Handle INSERT of allocation transactions (decrease available)
    IF TG_OP = 'INSERT' AND NEW.transaction_type = 'allocation' AND NEW.is_deleted = false THEN
        UPDATE public.user_state 
        SET available_amount = available_amount - NEW.amount,
            last_envelope_allocation_date = NEW.transaction_date,
            last_transaction_date = NEW.transaction_date
        WHERE budget_id = NEW.budget_id;
    END IF;
    
    -- Handle UPDATE (soft delete/restore of income)
    IF TG_OP = 'UPDATE' AND NEW.transaction_type = 'income' THEN
        -- Soft delete: reduce available amount
        IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
            UPDATE public.user_state 
            SET available_amount = available_amount - NEW.amount
            WHERE budget_id = NEW.budget_id;
        END IF;
        
        -- Restore: increase available amount
        IF OLD.is_deleted = true AND NEW.is_deleted = false THEN
            UPDATE public.user_state 
            SET available_amount = available_amount + NEW.amount,
                last_transaction_date = NEW.transaction_date
            WHERE budget_id = NEW.budget_id;
        END IF;
        
        -- Amount change on active income transaction
        IF OLD.is_deleted = false AND NEW.is_deleted = false AND OLD.amount != NEW.amount THEN
            UPDATE public.user_state 
            SET available_amount = available_amount - OLD.amount + NEW.amount,
                last_transaction_date = NEW.transaction_date
            WHERE budget_id = NEW.budget_id;
        END IF;
    END IF;
    
    -- Handle UPDATE (soft delete/restore of allocation)
    IF TG_OP = 'UPDATE' AND NEW.transaction_type = 'allocation' THEN
        -- Soft delete: increase available amount (return allocated money)
        IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
            UPDATE public.user_state 
            SET available_amount = available_amount + NEW.amount
            WHERE budget_id = NEW.budget_id;
        END IF;
        
        -- Restore: decrease available amount
        IF OLD.is_deleted = true AND NEW.is_deleted = false THEN
            UPDATE public.user_state 
            SET available_amount = available_amount - NEW.amount,
                last_envelope_allocation_date = NEW.transaction_date,
                last_transaction_date = NEW.transaction_date
            WHERE budget_id = NEW.budget_id;
        END IF;
        
        -- Amount change on active allocation transaction
        IF OLD.is_deleted = false AND NEW.is_deleted = false AND OLD.amount != NEW.amount THEN
            UPDATE public.user_state 
            SET available_amount = available_amount + OLD.amount - NEW.amount,
                last_envelope_allocation_date = NEW.transaction_date,
                last_transaction_date = NEW.transaction_date
            WHERE budget_id = NEW.budget_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update available_amount (if not exists)
DROP TRIGGER IF EXISTS update_available_amount_trigger ON public.transactions;
CREATE TRIGGER update_available_amount_trigger
    AFTER INSERT OR UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_available_amount();

-- Create function to recalculate cached totals
CREATE OR REPLACE FUNCTION public.recalculate_user_state_totals(p_budget_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_state 
    SET 
        total_envelope_balance = (
            SELECT COALESCE(SUM(current_balance), 0) 
            FROM public.envelopes 
            WHERE budget_id = p_budget_id
        ),
        total_income_this_month = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM public.transactions 
            WHERE budget_id = p_budget_id 
            AND transaction_type = 'income' 
            AND is_deleted = false
            AND transaction_date >= date_trunc('month', CURRENT_DATE)
            AND transaction_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
        ),
        total_expenses_this_month = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM public.transactions 
            WHERE budget_id = p_budget_id 
            AND transaction_type IN ('expense', 'debt_payment')
            AND is_deleted = false
            AND transaction_date >= date_trunc('month', CURRENT_DATE)
            AND transaction_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
        )
    WHERE budget_id = p_budget_id;
END;
$$ LANGUAGE plpgsql;

-- Create user_state records for existing budgets that don't have them
INSERT INTO public.user_state (budget_id, available_amount, default_currency_code, date_format, timezone)
SELECT 
    b.id,
    0.00,
    'USD',
    'MM/DD/YYYY',
    'UTC'
FROM public.budgets b
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_state us WHERE us.budget_id = b.id
);

-- Add helpful comments
COMMENT ON FUNCTION public.create_default_user_state IS 'Auto-creates user_state when budget is created';
COMMENT ON FUNCTION public.update_available_amount IS 'Updates available_amount based on income/allocation transactions';
COMMENT ON FUNCTION public.recalculate_user_state_totals IS 'Recalculates cached totals for a budget';