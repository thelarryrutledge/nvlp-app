-- Migration: 022_fix_trigger_issues.sql
-- Purpose: Fix issues with envelope cache trigger and data validation function
-- Date: 2025-07-06

-- Fix the data consistency validation function - fix column references
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
            envelope_transactions.envelope_id,
            SUM(envelope_transactions.net_amount) as balance
        FROM (
            SELECT to_envelope_id as envelope_id, amount as net_amount 
            FROM public.transactions 
            WHERE budget_id = p_budget_id AND to_envelope_id IS NOT NULL AND is_deleted = false
            UNION ALL
            SELECT from_envelope_id as envelope_id, -amount as net_amount 
            FROM public.transactions 
            WHERE budget_id = p_budget_id AND from_envelope_id IS NOT NULL AND is_deleted = false
        ) envelope_transactions
        GROUP BY envelope_transactions.envelope_id
    ) calculated ON e.id = calculated.envelope_id
    WHERE e.budget_id = p_budget_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simpler test function for envelope cache accuracy
CREATE OR REPLACE FUNCTION public.test_envelope_cache_accuracy(p_budget_id UUID)
RETURNS TABLE (
    total_from_envelopes DECIMAL(12,2),
    total_from_cache DECIMAL(12,2),
    difference DECIMAL(12,2),
    is_accurate BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH envelope_sum AS (
        SELECT COALESCE(SUM(current_balance), 0) as total_envelopes
        FROM public.envelopes
        WHERE budget_id = p_budget_id
    ),
    cache_total AS (
        SELECT total_envelope_balance as total_cache
        FROM public.user_state
        WHERE budget_id = p_budget_id
    )
    SELECT 
        es.total_envelopes,
        ct.total_cache,
        (es.total_envelopes - ct.total_cache) as difference,
        (es.total_envelopes = ct.total_cache) as is_accurate
    FROM envelope_sum es, cache_total ct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;