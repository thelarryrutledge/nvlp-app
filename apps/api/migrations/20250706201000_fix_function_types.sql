-- Migration: 020_fix_function_types.sql
-- Purpose: Fix integer casting and EXTRACT function issues
-- Date: 2025-07-06

-- Fix get_payee_spending_summary function - cast COUNT to INTEGER
CREATE OR REPLACE FUNCTION public.get_payee_spending_summary(
    p_budget_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    payee_id UUID,
    payee_name TEXT,
    payee_type TEXT,
    total_paid DECIMAL(12,2),
    expense_amount DECIMAL(12,2),
    debt_payment_amount DECIMAL(12,2),
    transaction_count INTEGER,
    last_payment_date DATE,
    avg_payment_amount DECIMAL(12,2)
) AS $$
DECLARE
    start_date DATE := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE)::DATE);
    end_date DATE := COALESCE(p_end_date, CURRENT_DATE);
BEGIN
    RETURN QUERY
    SELECT 
        p.id as payee_id,
        p.name as payee_name,
        p.payee_type,
        p.total_paid,
        COALESCE(expenses.expense_amount, 0) as expense_amount,
        COALESCE(debt_payments.debt_payment_amount, 0) as debt_payment_amount,
        (COALESCE(expenses.expense_count, 0) + COALESCE(debt_payments.debt_count, 0))::INTEGER as transaction_count,
        GREATEST(
            COALESCE(expenses.last_expense_date, '1900-01-01'::DATE),
            COALESCE(debt_payments.last_debt_date, '1900-01-01'::DATE)
        ) as last_payment_date,
        CASE 
            WHEN (COALESCE(expenses.expense_count, 0) + COALESCE(debt_payments.debt_count, 0)) > 0
            THEN ROUND(
                (COALESCE(expenses.expense_amount, 0) + COALESCE(debt_payments.debt_payment_amount, 0)) / 
                (COALESCE(expenses.expense_count, 0) + COALESCE(debt_payments.debt_count, 0)), 
                2
            )
            ELSE 0
        END as avg_payment_amount
    FROM public.payees p
    LEFT JOIN (
        SELECT 
            t.payee_id,
            SUM(t.amount) as expense_amount,
            COUNT(*)::INTEGER as expense_count,
            MAX(t.transaction_date) as last_expense_date
        FROM public.transactions t
        WHERE t.budget_id = p_budget_id
        AND t.transaction_type = 'expense'
        AND t.is_deleted = false
        AND t.transaction_date BETWEEN start_date AND end_date
        GROUP BY t.payee_id
    ) expenses ON p.id = expenses.payee_id
    LEFT JOIN (
        SELECT 
            t.payee_id,
            SUM(t.amount) as debt_payment_amount,
            COUNT(*)::INTEGER as debt_count,
            MAX(t.transaction_date) as last_debt_date
        FROM public.transactions t
        WHERE t.budget_id = p_budget_id
        AND t.transaction_type = 'debt_payment'
        AND t.is_deleted = false
        AND t.transaction_date BETWEEN start_date AND end_date
        GROUP BY t.payee_id
    ) debt_payments ON p.id = debt_payments.payee_id
    WHERE p.budget_id = p_budget_id
    AND (expenses.payee_id IS NOT NULL OR debt_payments.payee_id IS NOT NULL)
    ORDER BY (COALESCE(expenses.expense_amount, 0) + COALESCE(debt_payments.debt_payment_amount, 0)) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix get_category_spending_breakdown function - cast COUNT to INTEGER
CREATE OR REPLACE FUNCTION public.get_category_spending_breakdown(
    p_budget_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    category_id UUID,
    category_name TEXT,
    category_type TEXT,
    total_amount DECIMAL(12,2),
    transaction_count INTEGER,
    avg_transaction_amount DECIMAL(12,2),
    percentage_of_total DECIMAL(5,2)
) AS $$
DECLARE
    start_date DATE := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE)::DATE);
    end_date DATE := COALESCE(p_end_date, CURRENT_DATE);
    total_spending DECIMAL(12,2);
BEGIN
    -- Get total spending for percentage calculation
    SELECT COALESCE(SUM(t.amount), 0) INTO total_spending
    FROM public.transactions t
    WHERE t.budget_id = p_budget_id
    AND t.transaction_type IN ('expense', 'debt_payment')
    AND t.is_deleted = false
    AND t.transaction_date BETWEEN start_date AND end_date;

    RETURN QUERY
    SELECT 
        c.id as category_id,
        c.name as category_name,
        c.category_type,
        COALESCE(spending.total_amount, 0) as total_amount,
        COALESCE(spending.transaction_count, 0)::INTEGER as transaction_count,
        CASE 
            WHEN COALESCE(spending.transaction_count, 0) > 0
            THEN ROUND(spending.total_amount / spending.transaction_count, 2)
            ELSE 0
        END as avg_transaction_amount,
        CASE 
            WHEN total_spending > 0
            THEN ROUND((COALESCE(spending.total_amount, 0) / total_spending * 100), 2)
            ELSE 0
        END as percentage_of_total
    FROM public.categories c
    LEFT JOIN (
        SELECT 
            t.category_id,
            SUM(t.amount) as total_amount,
            COUNT(*)::INTEGER as transaction_count
        FROM public.transactions t
        WHERE t.budget_id = p_budget_id
        AND t.transaction_type IN ('expense', 'debt_payment')
        AND t.is_deleted = false
        AND t.transaction_date BETWEEN start_date AND end_date
        GROUP BY t.category_id
    ) spending ON c.id = spending.category_id
    WHERE c.budget_id = p_budget_id
    ORDER BY COALESCE(spending.total_amount, 0) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix calculate_envelope_health_score function - fix EXTRACT syntax
CREATE OR REPLACE FUNCTION public.calculate_envelope_health_score(p_envelope_id UUID)
RETURNS DECIMAL(3,1) AS $$
DECLARE
    envelope_data RECORD;
    health_score DECIMAL(3,1) := 0;
    balance_score DECIMAL(3,1) := 0;
    activity_score DECIMAL(3,1) := 0;
    trend_score DECIMAL(3,1) := 0;
    days_since_activity INTEGER;
    recent_trend DECIMAL(12,2);
BEGIN
    -- Get envelope data
    SELECT 
        e.current_balance,
        e.target_amount,
        e.created_at
    INTO envelope_data
    FROM public.envelopes e
    WHERE e.id = p_envelope_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Balance Score (40% of total) - How close to target amount
    IF envelope_data.target_amount > 0 THEN
        balance_score := LEAST(40, (envelope_data.current_balance / envelope_data.target_amount) * 40);
    ELSIF envelope_data.current_balance > 0 THEN
        balance_score := 30; -- Good balance but no target set
    ELSE
        balance_score := 0; -- No balance
    END IF;

    -- Activity Score (30% of total) - Recent transaction activity
    SELECT 
        (CURRENT_DATE - MAX(t.transaction_date))::INTEGER
    INTO days_since_activity
    FROM public.transactions t
    WHERE (t.from_envelope_id = p_envelope_id OR t.to_envelope_id = p_envelope_id)
    AND t.is_deleted = false
    AND t.transaction_date >= CURRENT_DATE - INTERVAL '90 days';

    IF days_since_activity IS NULL THEN
        activity_score := 0; -- No recent activity
    ELSIF days_since_activity <= 7 THEN
        activity_score := 30; -- Very recent activity
    ELSIF days_since_activity <= 30 THEN
        activity_score := 20; -- Recent activity
    ELSIF days_since_activity <= 60 THEN
        activity_score := 10; -- Some activity
    ELSE
        activity_score := 5; -- Old activity
    END IF;

    -- Trend Score (30% of total) - Is balance increasing or decreasing
    SELECT 
        SUM(CASE 
            WHEN t.to_envelope_id = p_envelope_id THEN t.amount
            WHEN t.from_envelope_id = p_envelope_id THEN -t.amount
            ELSE 0
        END)
    INTO recent_trend
    FROM public.transactions t
    WHERE (t.from_envelope_id = p_envelope_id OR t.to_envelope_id = p_envelope_id)
    AND t.is_deleted = false
    AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days';

    IF recent_trend IS NULL THEN
        trend_score := 15; -- Neutral
    ELSIF recent_trend > 0 THEN
        trend_score := 30; -- Positive trend
    ELSIF recent_trend = 0 THEN
        trend_score := 15; -- Stable
    ELSE
        trend_score := 0; -- Negative trend
    END IF;

    health_score := balance_score + activity_score + trend_score;
    
    RETURN LEAST(100, GREATEST(0, health_score));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;