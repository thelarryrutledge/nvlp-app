-- Migration: 021_add_automatic_update_triggers.sql
-- Purpose: Add triggers for automatic cache updates and data maintenance
-- Date: 2025-07-06

-- Create function to automatically update user_state cached totals when envelope balances change
CREATE OR REPLACE FUNCTION public.update_user_state_cached_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update cached envelope totals when envelope balance changes
    UPDATE public.user_state
    SET total_envelope_balance = (
        SELECT COALESCE(SUM(current_balance), 0)
        FROM public.envelopes
        WHERE budget_id = COALESCE(NEW.budget_id, OLD.budget_id)
    )
    WHERE budget_id = COALESCE(NEW.budget_id, OLD.budget_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update cached totals when envelope balances change
CREATE TRIGGER update_user_state_envelope_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.envelopes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_state_cached_totals();

-- Create function to automatically update monthly cached totals when transactions change
CREATE OR REPLACE FUNCTION public.update_monthly_cached_totals()
RETURNS TRIGGER AS $$
DECLARE
    affected_budget_id UUID;
BEGIN
    -- Get the budget ID from the transaction
    affected_budget_id := COALESCE(NEW.budget_id, OLD.budget_id);
    
    -- Only update if the transaction affects current month totals
    IF (COALESCE(NEW.transaction_date, OLD.transaction_date) >= date_trunc('month', CURRENT_DATE)::DATE) THEN
        -- Update cached monthly totals
        UPDATE public.user_state
        SET 
            total_income_this_month = (
                SELECT COALESCE(SUM(amount), 0)
                FROM public.transactions
                WHERE budget_id = affected_budget_id
                AND transaction_type = 'income'
                AND is_deleted = false
                AND transaction_date >= date_trunc('month', CURRENT_DATE)
                AND transaction_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
            ),
            total_expenses_this_month = (
                SELECT COALESCE(SUM(amount), 0)
                FROM public.transactions
                WHERE budget_id = affected_budget_id
                AND transaction_type IN ('expense', 'debt_payment')
                AND is_deleted = false
                AND transaction_date >= date_trunc('month', CURRENT_DATE)
                AND transaction_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
            )
        WHERE budget_id = affected_budget_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update monthly cached totals when transactions change
CREATE TRIGGER update_monthly_cached_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_monthly_cached_totals();

-- Create function to automatically update payee last_payment info in real-time
CREATE OR REPLACE FUNCTION public.update_payee_last_payment_info()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process expense and debt_payment transactions
    IF TG_OP = 'INSERT' AND NEW.transaction_type IN ('expense', 'debt_payment') AND NEW.payee_id IS NOT NULL AND NEW.is_deleted = false THEN
        UPDATE public.payees
        SET 
            last_payment_date = NEW.transaction_date,
            last_payment_amount = NEW.amount
        WHERE id = NEW.payee_id
        AND (last_payment_date IS NULL OR NEW.transaction_date >= last_payment_date);
    END IF;
    
    -- Handle updates (like changing date or amount of existing transaction)
    IF TG_OP = 'UPDATE' AND NEW.transaction_type IN ('expense', 'debt_payment') AND NEW.payee_id IS NOT NULL THEN
        -- If transaction is being soft deleted, we might need to recalculate
        IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
            -- Check if this was the last payment, if so recalculate
            UPDATE public.payees
            SET 
                last_payment_date = (
                    SELECT MAX(t.transaction_date)
                    FROM public.transactions t
                    WHERE t.payee_id = NEW.payee_id
                    AND t.transaction_type IN ('expense', 'debt_payment')
                    AND t.is_deleted = false
                ),
                last_payment_amount = (
                    SELECT t.amount
                    FROM public.transactions t
                    WHERE t.payee_id = NEW.payee_id
                    AND t.transaction_type IN ('expense', 'debt_payment')
                    AND t.is_deleted = false
                    ORDER BY t.transaction_date DESC
                    LIMIT 1
                )
            WHERE id = NEW.payee_id;
        -- If transaction is being restored or updated
        ELSIF (OLD.is_deleted = true AND NEW.is_deleted = false) OR 
              (OLD.is_deleted = false AND NEW.is_deleted = false) THEN
            UPDATE public.payees
            SET 
                last_payment_date = NEW.transaction_date,
                last_payment_amount = NEW.amount
            WHERE id = NEW.payee_id
            AND (last_payment_date IS NULL OR NEW.transaction_date >= last_payment_date);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update payee last payment info in real-time
CREATE TRIGGER update_payee_last_payment_trigger
    AFTER INSERT OR UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_payee_last_payment_info();

-- Create function to automatically clean up old transaction events (optional maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_transaction_events()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete transaction events older than 2 years
    DELETE FROM public.transaction_events
    WHERE performed_at < (CURRENT_DATE - INTERVAL '2 years');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to refresh all cached data for a budget
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate data consistency
CREATE OR REPLACE FUNCTION public.validate_budget_consistency(p_budget_id UUID)
RETURNS TABLE (
    check_name TEXT,
    is_valid BOOLEAN,
    details TEXT
) AS $$
BEGIN
    -- Check if available amount matches income minus allocations
    RETURN QUERY
    WITH expected_available AS (
        SELECT 
            COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN transaction_type = 'allocation' THEN amount ELSE 0 END), 0) as expected
        FROM public.transactions
        WHERE budget_id = p_budget_id AND is_deleted = false
    ),
    actual_available AS (
        SELECT available_amount as actual
        FROM public.user_state
        WHERE budget_id = p_budget_id
    )
    SELECT 
        'Available Amount Consistency'::TEXT,
        (ea.expected = aa.actual) as is_valid,
        'Expected: ' || ea.expected || ', Actual: ' || aa.actual as details
    FROM expected_available ea, actual_available aa;
    
    -- Check if envelope balances match transaction history
    RETURN QUERY
    SELECT 
        'Envelope ' || e.name || ' Balance Consistency'::TEXT,
        (e.current_balance = COALESCE(calculated.balance, 0)) as is_valid,
        'Expected: ' || COALESCE(calculated.balance, 0) || ', Actual: ' || e.current_balance as details
    FROM public.envelopes e
    LEFT JOIN (
        SELECT 
            envelope_id,
            SUM(CASE 
                WHEN t.to_envelope_id = envelope_id THEN t.amount
                WHEN t.from_envelope_id = envelope_id THEN -t.amount
                ELSE 0
            END) as balance
        FROM (
            SELECT to_envelope_id as envelope_id, amount FROM public.transactions 
            WHERE budget_id = p_budget_id AND to_envelope_id IS NOT NULL AND is_deleted = false
            UNION ALL
            SELECT from_envelope_id as envelope_id, -amount FROM public.transactions 
            WHERE budget_id = p_budget_id AND from_envelope_id IS NOT NULL AND is_deleted = false
        ) t
        GROUP BY envelope_id
    ) calculated ON e.id = calculated.envelope_id
    WHERE e.budget_id = p_budget_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON FUNCTION public.update_user_state_cached_totals IS 'Updates cached envelope totals when envelope balances change';
COMMENT ON FUNCTION public.update_monthly_cached_totals IS 'Updates cached monthly income/expense totals when transactions change';
COMMENT ON FUNCTION public.update_payee_last_payment_info IS 'Updates payee last payment info in real-time';
COMMENT ON FUNCTION public.cleanup_old_transaction_events IS 'Maintenance function to clean up old audit events';
COMMENT ON FUNCTION public.refresh_budget_cache IS 'Refreshes all cached data for a budget';
COMMENT ON FUNCTION public.validate_budget_consistency IS 'Validates data consistency across budget tables';