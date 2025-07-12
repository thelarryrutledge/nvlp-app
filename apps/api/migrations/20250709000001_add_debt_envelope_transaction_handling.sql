-- Migration: Add debt envelope transaction handling
-- Purpose: Update debt_balance when debt_payment transactions occur on debt envelopes
-- Date: 2025-07-09

-- Create function to handle debt envelope updates after transactions
CREATE OR REPLACE FUNCTION public.update_debt_envelope_balance()
RETURNS TRIGGER AS $$
DECLARE
    envelope_type TEXT;
BEGIN
    -- Only process debt_payment transactions
    IF NEW.transaction_type = 'debt_payment' AND NEW.from_envelope_id IS NOT NULL THEN
        -- Get the envelope type
        SELECT e.envelope_type INTO envelope_type
        FROM public.envelopes e
        WHERE e.id = NEW.from_envelope_id;
        
        -- If it's a debt envelope, reduce the debt_balance by the payment amount
        IF envelope_type = 'debt' THEN
            UPDATE public.envelopes
            SET debt_balance = GREATEST(0, debt_balance - NEW.amount)
            WHERE id = NEW.from_envelope_id;
        END IF;
    END IF;
    
    -- Handle soft deletes (reverse the debt reduction)
    IF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true 
       AND NEW.transaction_type = 'debt_payment' AND NEW.from_envelope_id IS NOT NULL THEN
        -- Get the envelope type
        SELECT e.envelope_type INTO envelope_type
        FROM public.envelopes e
        WHERE e.id = NEW.from_envelope_id;
        
        -- If it's a debt envelope, add back the payment amount to debt_balance
        IF envelope_type = 'debt' THEN
            UPDATE public.envelopes
            SET debt_balance = debt_balance + NEW.amount
            WHERE id = NEW.from_envelope_id;
        END IF;
    END IF;
    
    -- Handle restores (re-apply the debt reduction)
    IF TG_OP = 'UPDATE' AND OLD.is_deleted = true AND NEW.is_deleted = false 
       AND NEW.transaction_type = 'debt_payment' AND NEW.from_envelope_id IS NOT NULL THEN
        -- Get the envelope type
        SELECT e.envelope_type INTO envelope_type
        FROM public.envelopes e
        WHERE e.id = NEW.from_envelope_id;
        
        -- If it's a debt envelope, reduce the debt_balance by the payment amount
        IF envelope_type = 'debt' THEN
            UPDATE public.envelopes
            SET debt_balance = GREATEST(0, debt_balance - NEW.amount)
            WHERE id = NEW.from_envelope_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update debt envelope balances after transactions
CREATE TRIGGER update_debt_envelope_balance_trigger
    AFTER INSERT OR UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_debt_envelope_balance();

-- Update the validate envelope type function to ensure debt fields are properly set
CREATE OR REPLACE FUNCTION public.validate_envelope_type_category()
RETURNS TRIGGER AS $$
DECLARE
    category_name TEXT;
BEGIN
    -- If category_id is provided, get the category name
    IF NEW.category_id IS NOT NULL THEN
        SELECT name INTO category_name 
        FROM public.categories 
        WHERE id = NEW.category_id;
        
        -- Validate envelope type and category compatibility
        IF NEW.envelope_type = 'savings' AND category_name != 'Savings' THEN
            RAISE EXCEPTION 'Savings envelopes must be in the Savings category';
        END IF;
        
        IF NEW.envelope_type = 'debt' AND category_name != 'Debt' THEN
            RAISE EXCEPTION 'Debt envelopes must be in the Debt category';
        END IF;
    END IF;
    
    -- Ensure debt envelopes have required fields
    IF NEW.envelope_type = 'debt' THEN
        IF NEW.debt_balance IS NULL OR NEW.debt_balance < 0 THEN
            RAISE EXCEPTION 'Debt envelopes must have a non-negative debt_balance';
        END IF;
    END IF;
    
    -- Clear debt-specific fields for non-debt envelopes
    IF NEW.envelope_type != 'debt' THEN
        NEW.debt_balance := 0;
        NEW.minimum_payment := NULL;
        NEW.due_date := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger to use the updated function
DROP TRIGGER IF EXISTS validate_envelope_type_category_trigger ON public.envelopes;
CREATE TRIGGER validate_envelope_type_category_trigger
    BEFORE INSERT OR UPDATE ON public.envelopes
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_envelope_type_category();

-- Update the envelope balance update logic to handle envelope types
CREATE OR REPLACE FUNCTION public.refresh_budget_cache(p_budget_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Refresh all cached totals for the specified budget
    PERFORM public.recalculate_user_state_totals(p_budget_id);
    
    -- Update payee totals
    UPDATE public.payees
    SET 
        total_paid = COALESCE((
            SELECT SUM(t.amount)
            FROM public.transactions t
            WHERE t.payee_id = payees.id
            AND t.transaction_type IN ('expense', 'debt_payment')
            AND t.is_deleted = false
        ), 0),
        last_payment_date = (
            SELECT MAX(t.transaction_date)
            FROM public.transactions t
            WHERE t.payee_id = payees.id
            AND t.transaction_type IN ('expense', 'debt_payment')
            AND t.is_deleted = false
        ),
        last_payment_amount = (
            SELECT t.amount
            FROM public.transactions t
            WHERE t.payee_id = payees.id
            AND t.transaction_type IN ('expense', 'debt_payment')
            AND t.is_deleted = false
            ORDER BY t.transaction_date DESC
            LIMIT 1
        )
    WHERE budget_id = p_budget_id;
    
    -- Update envelope balances based on transactions
    UPDATE public.envelopes
    SET current_balance = (
        SELECT COALESCE(
            SUM(CASE 
                WHEN t.to_envelope_id = envelopes.id THEN t.amount
                WHEN t.from_envelope_id = envelopes.id THEN -t.amount
                ELSE 0
            END), 
            0
        )
        FROM public.transactions t
        WHERE (t.to_envelope_id = envelopes.id OR t.from_envelope_id = envelopes.id)
        AND t.is_deleted = false
    )
    WHERE budget_id = p_budget_id;
    
    -- Recalculate debt balances for debt envelopes
    -- This ensures consistency after bulk operations
    UPDATE public.envelopes e
    SET debt_balance = GREATEST(0, 
        e.debt_balance - COALESCE((
            SELECT SUM(t.amount)
            FROM public.transactions t
            WHERE t.from_envelope_id = e.id
            AND t.transaction_type = 'debt_payment'
            AND t.is_deleted = false
        ), 0)
    )
    WHERE e.budget_id = p_budget_id
    AND e.envelope_type = 'debt';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON FUNCTION public.update_debt_envelope_balance IS 'Updates debt_balance for debt envelopes when debt_payment transactions occur';
COMMENT ON TRIGGER update_debt_envelope_balance_trigger ON public.transactions IS 'Automatically updates debt envelope balances for debt payments';