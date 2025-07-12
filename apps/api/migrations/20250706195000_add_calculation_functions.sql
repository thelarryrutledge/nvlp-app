-- Migration: 018_add_calculation_functions.sql
-- Purpose: Add database functions for budget calculations and reporting
-- Date: 2025-07-06

-- Function to get budget summary with all key metrics
CREATE OR REPLACE FUNCTION public.get_budget_summary(p_budget_id UUID)
RETURNS TABLE (
    budget_id UUID,
    total_income DECIMAL(12,2),
    total_allocated DECIMAL(12,2),
    total_expenses DECIMAL(12,2),
    total_debt_payments DECIMAL(12,2),
    available_amount DECIMAL(12,2),
    total_envelope_balance DECIMAL(12,2),
    net_worth DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p_budget_id,
        COALESCE((
            SELECT SUM(amount) 
            FROM public.transactions 
            WHERE budget_id = p_budget_id 
            AND transaction_type = 'income' 
            AND is_deleted = false
        ), 0) as total_income,
        COALESCE((
            SELECT SUM(amount) 
            FROM public.transactions 
            WHERE budget_id = p_budget_id 
            AND transaction_type = 'allocation' 
            AND is_deleted = false
        ), 0) as total_allocated,
        COALESCE((
            SELECT SUM(amount) 
            FROM public.transactions 
            WHERE budget_id = p_budget_id 
            AND transaction_type = 'expense' 
            AND is_deleted = false
        ), 0) as total_expenses,
        COALESCE((
            SELECT SUM(amount) 
            FROM public.transactions 
            WHERE budget_id = p_budget_id 
            AND transaction_type = 'debt_payment' 
            AND is_deleted = false
        ), 0) as total_debt_payments,
        COALESCE((
            SELECT available_amount 
            FROM public.user_state 
            WHERE budget_id = p_budget_id
        ), 0) as available_amount,
        COALESCE((
            SELECT SUM(current_balance) 
            FROM public.envelopes 
            WHERE budget_id = p_budget_id
        ), 0) as total_envelope_balance,
        COALESCE((
            SELECT available_amount 
            FROM public.user_state 
            WHERE budget_id = p_budget_id
        ), 0) + COALESCE((
            SELECT SUM(current_balance) 
            FROM public.envelopes 
            WHERE budget_id = p_budget_id
        ), 0) as net_worth;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get envelope spending analysis
CREATE OR REPLACE FUNCTION public.get_envelope_spending_analysis(
    p_budget_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    envelope_id UUID,
    envelope_name TEXT,
    current_balance DECIMAL(12,2),
    total_allocated DECIMAL(12,2),
    total_spent DECIMAL(12,2),
    spending_rate DECIMAL(5,2),
    days_remaining_at_current_rate INTEGER
) AS $$
DECLARE
    start_date DATE := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE)::DATE);
    end_date DATE := COALESCE(p_end_date, CURRENT_DATE);
    days_in_period INTEGER := end_date - start_date + 1;
BEGIN
    RETURN QUERY
    SELECT 
        e.id as envelope_id,
        e.name as envelope_name,
        e.current_balance,
        COALESCE(allocations.total_allocated, 0) as total_allocated,
        COALESCE(expenses.total_spent, 0) as total_spent,
        CASE 
            WHEN COALESCE(allocations.total_allocated, 0) > 0 
            THEN ROUND((COALESCE(expenses.total_spent, 0) / allocations.total_allocated * 100), 2)
            ELSE 0
        END as spending_rate,
        CASE 
            WHEN COALESCE(expenses.total_spent, 0) > 0 AND days_in_period > 0
            THEN FLOOR(e.current_balance / (expenses.total_spent / days_in_period))::INTEGER
            ELSE NULL
        END as days_remaining_at_current_rate
    FROM public.envelopes e
    LEFT JOIN (
        SELECT 
            to_envelope_id,
            SUM(amount) as total_allocated
        FROM public.transactions
        WHERE budget_id = p_budget_id
        AND transaction_type = 'allocation'
        AND is_deleted = false
        AND transaction_date BETWEEN start_date AND end_date
        GROUP BY to_envelope_id
    ) allocations ON e.id = allocations.to_envelope_id
    LEFT JOIN (
        SELECT 
            from_envelope_id,
            SUM(amount) as total_spent
        FROM public.transactions
        WHERE budget_id = p_budget_id
        AND transaction_type IN ('expense', 'debt_payment')
        AND is_deleted = false
        AND transaction_date BETWEEN start_date AND end_date
        GROUP BY from_envelope_id
    ) expenses ON e.id = expenses.from_envelope_id
    WHERE e.budget_id = p_budget_id
    ORDER BY e.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get monthly spending trends
CREATE OR REPLACE FUNCTION public.get_monthly_spending_trends(
    p_budget_id UUID,
    p_months_back INTEGER DEFAULT 12
)
RETURNS TABLE (
    month_year TEXT,
    month_start DATE,
    total_income DECIMAL(12,2),
    total_expenses DECIMAL(12,2),
    total_debt_payments DECIMAL(12,2),
    net_cash_flow DECIMAL(12,2),
    envelope_allocations DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH monthly_data AS (
        SELECT 
            date_trunc('month', transaction_date)::DATE as month_start,
            SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as expenses,
            SUM(CASE WHEN transaction_type = 'debt_payment' THEN amount ELSE 0 END) as debt_payments,
            SUM(CASE WHEN transaction_type = 'allocation' THEN amount ELSE 0 END) as allocations
        FROM public.transactions
        WHERE budget_id = p_budget_id
        AND is_deleted = false
        AND transaction_date >= (CURRENT_DATE - INTERVAL '1 month' * p_months_back)
        GROUP BY date_trunc('month', transaction_date)::DATE
    )
    SELECT 
        TO_CHAR(md.month_start, 'YYYY-MM') as month_year,
        md.month_start,
        md.income as total_income,
        md.expenses as total_expenses,
        md.debt_payments as total_debt_payments,
        (md.income - md.expenses - md.debt_payments) as net_cash_flow,
        md.allocations as envelope_allocations
    FROM monthly_data md
    ORDER BY md.month_start DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get payee spending summary
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
        COALESCE(expenses.expense_count, 0) + COALESCE(debt_payments.debt_count, 0) as transaction_count,
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
            payee_id,
            SUM(amount) as expense_amount,
            COUNT(*) as expense_count,
            MAX(transaction_date) as last_expense_date
        FROM public.transactions
        WHERE budget_id = p_budget_id
        AND transaction_type = 'expense'
        AND is_deleted = false
        AND transaction_date BETWEEN start_date AND end_date
        GROUP BY payee_id
    ) expenses ON p.id = expenses.payee_id
    LEFT JOIN (
        SELECT 
            payee_id,
            SUM(amount) as debt_payment_amount,
            COUNT(*) as debt_count,
            MAX(transaction_date) as last_debt_date
        FROM public.transactions
        WHERE budget_id = p_budget_id
        AND transaction_type = 'debt_payment'
        AND is_deleted = false
        AND transaction_date BETWEEN start_date AND end_date
        GROUP BY payee_id
    ) debt_payments ON p.id = debt_payments.payee_id
    WHERE p.budget_id = p_budget_id
    AND (expenses.payee_id IS NOT NULL OR debt_payments.payee_id IS NOT NULL)
    ORDER BY (COALESCE(expenses.expense_amount, 0) + COALESCE(debt_payments.debt_payment_amount, 0)) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get category spending breakdown
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
    SELECT COALESCE(SUM(amount), 0) INTO total_spending
    FROM public.transactions
    WHERE budget_id = p_budget_id
    AND transaction_type IN ('expense', 'debt_payment')
    AND is_deleted = false
    AND transaction_date BETWEEN start_date AND end_date;

    RETURN QUERY
    SELECT 
        c.id as category_id,
        c.name as category_name,
        c.category_type,
        COALESCE(spending.total_amount, 0) as total_amount,
        COALESCE(spending.transaction_count, 0) as transaction_count,
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
            category_id,
            SUM(amount) as total_amount,
            COUNT(*) as transaction_count
        FROM public.transactions
        WHERE budget_id = p_budget_id
        AND transaction_type IN ('expense', 'debt_payment')
        AND is_deleted = false
        AND transaction_date BETWEEN start_date AND end_date
        GROUP BY category_id
    ) spending ON c.id = spending.category_id
    WHERE c.budget_id = p_budget_id
    ORDER BY COALESCE(spending.total_amount, 0) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate envelope health score
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
        EXTRACT(DAY FROM (CURRENT_DATE - MAX(transaction_date)))::INTEGER
    INTO days_since_activity
    FROM public.transactions
    WHERE (from_envelope_id = p_envelope_id OR to_envelope_id = p_envelope_id)
    AND is_deleted = false
    AND transaction_date >= CURRENT_DATE - INTERVAL '90 days';

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
            WHEN to_envelope_id = p_envelope_id THEN amount
            WHEN from_envelope_id = p_envelope_id THEN -amount
            ELSE 0
        END)
    INTO recent_trend
    FROM public.transactions
    WHERE (from_envelope_id = p_envelope_id OR to_envelope_id = p_envelope_id)
    AND is_deleted = false
    AND transaction_date >= CURRENT_DATE - INTERVAL '30 days';

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

-- Function to validate transaction before insert/update
CREATE OR REPLACE FUNCTION public.validate_transaction_business_rules(
    p_budget_id UUID,
    p_transaction_type public.transaction_type,
    p_amount DECIMAL(12,2),
    p_from_envelope_id UUID DEFAULT NULL,
    p_to_envelope_id UUID DEFAULT NULL,
    p_payee_id UUID DEFAULT NULL
)
RETURNS TABLE (
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    available_amount DECIMAL(12,2);
    envelope_balance DECIMAL(12,2);
    allow_negative BOOLEAN;
BEGIN
    -- Check available amount for allocations
    IF p_transaction_type = 'allocation' THEN
        SELECT us.available_amount, us.allow_negative_envelopes
        INTO available_amount, allow_negative
        FROM public.user_state us
        WHERE us.budget_id = p_budget_id;

        IF available_amount < p_amount AND NOT allow_negative THEN
            RETURN QUERY SELECT false, 'Insufficient available amount for allocation';
            RETURN;
        END IF;
    END IF;

    -- Check envelope balance for expenses/transfers/debt payments
    IF p_transaction_type IN ('expense', 'transfer', 'debt_payment') AND p_from_envelope_id IS NOT NULL THEN
        SELECT e.current_balance INTO envelope_balance
        FROM public.envelopes e
        WHERE e.id = p_from_envelope_id;

        SELECT us.allow_negative_envelopes INTO allow_negative
        FROM public.user_state us
        WHERE us.budget_id = p_budget_id;

        IF envelope_balance < p_amount AND NOT allow_negative THEN
            RETURN QUERY SELECT false, 'Insufficient envelope balance for transaction';
            RETURN;
        END IF;
    END IF;

    -- All validations passed
    RETURN QUERY SELECT true, ''::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON FUNCTION public.get_budget_summary IS 'Returns comprehensive budget summary with all key financial metrics';
COMMENT ON FUNCTION public.get_envelope_spending_analysis IS 'Analyzes envelope spending patterns and calculates remaining days at current rate';
COMMENT ON FUNCTION public.get_monthly_spending_trends IS 'Returns monthly spending trends for trend analysis';
COMMENT ON FUNCTION public.get_payee_spending_summary IS 'Summarizes spending by payee with totals and averages';
COMMENT ON FUNCTION public.get_category_spending_breakdown IS 'Breaks down spending by category with percentages';
COMMENT ON FUNCTION public.calculate_envelope_health_score IS 'Calculates a health score (0-100) for envelope based on balance, activity, and trends';
COMMENT ON FUNCTION public.validate_transaction_business_rules IS 'Validates transaction against business rules before processing';