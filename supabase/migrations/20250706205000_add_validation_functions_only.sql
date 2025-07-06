-- Migration: 024_add_validation_functions_only.sql
-- Purpose: Add validation functions without conflicting constraints
-- Date: 2025-07-06

-- Add only new validation constraints that don't already exist
DO $$
BEGIN
    -- Add user_profiles validation constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_display_name_length') THEN
        ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_display_name_length CHECK (length(display_name) >= 2 AND length(display_name) <= 100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_timezone_valid') THEN
        ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_timezone_valid CHECK (timezone ~ '^[A-Za-z_]+/[A-Za-z_]+$' OR timezone = 'UTC');
    END IF;
    
    -- Add budgets validation constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budgets_description_length') THEN
        ALTER TABLE public.budgets ADD CONSTRAINT budgets_description_length CHECK (description IS NULL OR length(description) <= 500);
    END IF;
    
    -- Add income_sources validation constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'income_sources_expected_monthly_amount_positive') THEN
        ALTER TABLE public.income_sources ADD CONSTRAINT income_sources_expected_monthly_amount_positive CHECK (expected_monthly_amount IS NULL OR expected_monthly_amount > 0);
    END IF;
    
    -- Add categories validation constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_description_length') THEN
        ALTER TABLE public.categories ADD CONSTRAINT categories_description_length CHECK (description IS NULL OR length(description) <= 300);
    END IF;
    
    -- Add envelopes validation constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'envelopes_target_amount_positive') THEN
        ALTER TABLE public.envelopes ADD CONSTRAINT envelopes_target_amount_positive CHECK (target_amount IS NULL OR target_amount > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'envelopes_current_balance_reasonable') THEN
        ALTER TABLE public.envelopes ADD CONSTRAINT envelopes_current_balance_reasonable CHECK (current_balance >= -99999.99 AND current_balance <= 999999.99);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'envelopes_description_length') THEN
        ALTER TABLE public.envelopes ADD CONSTRAINT envelopes_description_length CHECK (description IS NULL OR length(description) <= 300);
    END IF;
    
    -- Add payees validation constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payees_address_length') THEN
        ALTER TABLE public.payees ADD CONSTRAINT payees_address_length CHECK (address IS NULL OR length(address) <= 500);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payees_phone_length') THEN
        ALTER TABLE public.payees ADD CONSTRAINT payees_phone_length CHECK (phone IS NULL OR length(phone) <= 50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payees_last_payment_amount_positive') THEN
        ALTER TABLE public.payees ADD CONSTRAINT payees_last_payment_amount_positive CHECK (last_payment_amount IS NULL OR last_payment_amount > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payees_last_payment_consistency') THEN
        ALTER TABLE public.payees ADD CONSTRAINT payees_last_payment_consistency CHECK (
            (last_payment_date IS NULL AND last_payment_amount IS NULL) OR
            (last_payment_date IS NOT NULL AND last_payment_amount IS NOT NULL)
        );
    END IF;
    
    -- Add transactions validation constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_description_not_empty') THEN
        ALTER TABLE public.transactions ADD CONSTRAINT transactions_description_not_empty CHECK (description IS NULL OR trim(description) != '');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_reference_number_length') THEN
        ALTER TABLE public.transactions ADD CONSTRAINT transactions_reference_number_length CHECK (reference_number IS NULL OR length(reference_number) <= 50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_notes_length') THEN
        ALTER TABLE public.transactions ADD CONSTRAINT transactions_notes_length CHECK (notes IS NULL OR length(notes) <= 1000);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_amount_reasonable') THEN
        ALTER TABLE public.transactions ADD CONSTRAINT transactions_amount_reasonable CHECK (amount <= 999999.99);
    END IF;
    
    -- Add user_state validation constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_state_currency_code_valid') THEN
        ALTER TABLE public.user_state ADD CONSTRAINT user_state_currency_code_valid CHECK (default_currency_code ~ '^[A-Z]{3}$');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_state_cached_totals_non_negative') THEN
        ALTER TABLE public.user_state ADD CONSTRAINT user_state_cached_totals_non_negative CHECK (
            total_envelope_balance >= 0 AND 
            total_income_this_month >= 0 AND 
            total_expenses_this_month >= 0
        );
    END IF;
END $$;

-- Create comprehensive validation function for budget data integrity
CREATE OR REPLACE FUNCTION public.validate_budget_data_integrity(p_budget_id UUID)
RETURNS TABLE (
    validation_category TEXT,
    validation_rule TEXT,
    is_valid BOOLEAN,
    error_count INTEGER,
    details TEXT
) AS $$
BEGIN
    -- Validate envelope balance consistency
    RETURN QUERY
    SELECT 
        'Envelope Balances'::TEXT,
        'All envelope balances match transaction history'::TEXT,
        (COUNT(*) = 0) as is_valid,
        COUNT(*)::INTEGER as error_count,
        CASE WHEN COUNT(*) > 0 THEN 'Envelopes with inconsistent balances: ' || string_agg(envelope_name, ', ') ELSE 'All envelope balances are consistent' END as details
    FROM (
        SELECT 
            e.name as envelope_name,
            e.current_balance,
            COALESCE(calculated.balance, 0) as calculated_balance
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
        WHERE e.budget_id = p_budget_id
        AND e.current_balance != COALESCE(calculated.balance, 0)
    ) inconsistent_envelopes;

    -- Validate available amount consistency
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
        'Available Amount'::TEXT,
        'Available amount matches income minus allocations'::TEXT,
        (ea.expected = aa.actual) as is_valid,
        CASE WHEN ea.expected = aa.actual THEN 0 ELSE 1 END as error_count,
        'Expected: ' || ea.expected || ', Actual: ' || aa.actual as details
    FROM expected_available ea, actual_available aa;

    -- Validate payee totals consistency
    RETURN QUERY
    SELECT 
        'Payee Totals'::TEXT,
        'All payee totals match transaction history'::TEXT,
        (COUNT(*) = 0) as is_valid,
        COUNT(*)::INTEGER as error_count,
        CASE WHEN COUNT(*) > 0 THEN 'Payees with inconsistent totals: ' || string_agg(payee_name, ', ') ELSE 'All payee totals are consistent' END as details
    FROM (
        SELECT 
            p.name as payee_name,
            p.total_paid,
            COALESCE(calculated.total_paid, 0) as calculated_total
        FROM public.payees p
        LEFT JOIN (
            SELECT 
                payee_id,
                SUM(amount) as total_paid
            FROM public.transactions
            WHERE budget_id = p_budget_id 
            AND transaction_type IN ('expense', 'debt_payment')
            AND is_deleted = false
            GROUP BY payee_id
        ) calculated ON p.id = calculated.payee_id
        WHERE p.budget_id = p_budget_id
        AND p.total_paid != COALESCE(calculated.total_paid, 0)
    ) inconsistent_payees;

    -- Validate transaction flow constraints
    RETURN QUERY
    SELECT 
        'Transaction Flows'::TEXT,
        'All transactions follow proper flow constraints'::TEXT,
        (COUNT(*) = 0) as is_valid,
        COUNT(*)::INTEGER as error_count,
        CASE WHEN COUNT(*) > 0 THEN 'Invalid transactions found: ' || COUNT(*) ELSE 'All transactions follow proper flows' END as details
    FROM public.transactions t
    WHERE t.budget_id = p_budget_id 
    AND t.is_deleted = false
    AND NOT (
        (t.transaction_type = 'income' AND t.from_envelope_id IS NULL AND t.to_envelope_id IS NULL AND t.payee_id IS NULL AND t.income_source_id IS NOT NULL) OR
        (t.transaction_type = 'allocation' AND t.from_envelope_id IS NULL AND t.to_envelope_id IS NOT NULL AND t.payee_id IS NULL) OR
        (t.transaction_type = 'expense' AND t.from_envelope_id IS NOT NULL AND t.to_envelope_id IS NULL AND t.payee_id IS NOT NULL) OR
        (t.transaction_type = 'transfer' AND t.from_envelope_id IS NOT NULL AND t.to_envelope_id IS NOT NULL AND t.from_envelope_id != t.to_envelope_id AND t.payee_id IS NULL) OR
        (t.transaction_type = 'debt_payment' AND t.from_envelope_id IS NOT NULL AND t.to_envelope_id IS NULL AND t.payee_id IS NOT NULL)
    );

    -- Validate cached totals accuracy
    RETURN QUERY
    WITH calculated_totals AS (
        SELECT 
            COALESCE(SUM(e.current_balance), 0) as calc_envelope_total,
            COALESCE((SELECT SUM(amount) FROM public.transactions WHERE budget_id = p_budget_id AND transaction_type = 'income' AND is_deleted = false AND transaction_date >= date_trunc('month', CURRENT_DATE)), 0) as calc_income_month,
            COALESCE((SELECT SUM(amount) FROM public.transactions WHERE budget_id = p_budget_id AND transaction_type IN ('expense', 'debt_payment') AND is_deleted = false AND transaction_date >= date_trunc('month', CURRENT_DATE)), 0) as calc_expenses_month
        FROM public.envelopes e
        WHERE e.budget_id = p_budget_id
    ),
    cached_totals AS (
        SELECT 
            total_envelope_balance as cached_envelope_total,
            total_income_this_month as cached_income_month,
            total_expenses_this_month as cached_expenses_month
        FROM public.user_state
        WHERE budget_id = p_budget_id
    )
    SELECT 
        'Cached Totals'::TEXT,
        'All cached totals match calculated values'::TEXT,
        (calc.calc_envelope_total = cached.cached_envelope_total AND 
         calc.calc_income_month = cached.cached_income_month AND 
         calc.calc_expenses_month = cached.cached_expenses_month) as is_valid,
        CASE WHEN (calc.calc_envelope_total = cached.cached_envelope_total AND 
                   calc.calc_income_month = cached.cached_income_month AND 
                   calc.calc_expenses_month = cached.cached_expenses_month) THEN 0 ELSE 1 END as error_count,
        'Envelope: ' || calc.calc_envelope_total || '/' || cached.cached_envelope_total || 
        ', Income: ' || calc.calc_income_month || '/' || cached.cached_income_month ||
        ', Expenses: ' || calc.calc_expenses_month || '/' || cached.cached_expenses_month as details
    FROM calculated_totals calc, cached_totals cached;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate individual transaction before processing
CREATE OR REPLACE FUNCTION public.validate_transaction_constraints(
    p_budget_id UUID,
    p_transaction_type public.transaction_type,
    p_amount DECIMAL(12,2),
    p_from_envelope_id UUID DEFAULT NULL,
    p_to_envelope_id UUID DEFAULT NULL,
    p_payee_id UUID DEFAULT NULL,
    p_income_source_id UUID DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_transaction_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    constraint_name TEXT,
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    envelope_balance DECIMAL(12,2);
    available_amount DECIMAL(12,2);
    allow_negative BOOLEAN;
BEGIN
    -- Validate amount
    RETURN QUERY
    SELECT 
        'Amount Validation'::TEXT,
        (p_amount > 0 AND p_amount <= 999999.99) as is_valid,
        CASE WHEN p_amount <= 0 THEN 'Amount must be positive'
             WHEN p_amount > 999999.99 THEN 'Amount exceeds maximum allowed'
             ELSE '' END as error_message;

    -- Validate transaction date
    RETURN QUERY
    SELECT 
        'Date Validation'::TEXT,
        (p_transaction_date <= CURRENT_DATE + INTERVAL '1 day') as is_valid,
        CASE WHEN p_transaction_date > CURRENT_DATE + INTERVAL '1 day' THEN 'Transaction date cannot be more than 1 day in the future'
             ELSE '' END as error_message;

    -- Get user settings
    SELECT us.available_amount, us.allow_negative_envelopes INTO available_amount, allow_negative
    FROM public.user_state us WHERE us.budget_id = p_budget_id;

    -- Validate flow constraints based on transaction type
    IF p_transaction_type = 'income' THEN
        RETURN QUERY
        SELECT 
            'Income Flow Validation'::TEXT,
            (p_from_envelope_id IS NULL AND p_to_envelope_id IS NULL AND p_payee_id IS NULL AND p_income_source_id IS NOT NULL) as is_valid,
            CASE WHEN p_income_source_id IS NULL THEN 'Income transactions require an income source'
                 WHEN p_from_envelope_id IS NOT NULL OR p_to_envelope_id IS NOT NULL OR p_payee_id IS NOT NULL THEN 'Income transactions cannot have envelopes or payees'
                 ELSE '' END as error_message;
    END IF;

    IF p_transaction_type = 'allocation' THEN
        RETURN QUERY
        SELECT 
            'Allocation Flow Validation'::TEXT,
            (p_from_envelope_id IS NULL AND p_to_envelope_id IS NOT NULL AND p_payee_id IS NULL) as is_valid,
            CASE WHEN p_to_envelope_id IS NULL THEN 'Allocation transactions require a destination envelope'
                 WHEN p_from_envelope_id IS NOT NULL OR p_payee_id IS NOT NULL THEN 'Allocation transactions cannot have source envelopes or payees'
                 ELSE '' END as error_message;
        
        RETURN QUERY
        SELECT 
            'Available Amount Check'::TEXT,
            (available_amount >= p_amount OR allow_negative) as is_valid,
            CASE WHEN available_amount < p_amount AND NOT allow_negative THEN 'Insufficient available amount for allocation'
                 ELSE '' END as error_message;
    END IF;

    IF p_transaction_type IN ('expense', 'debt_payment') THEN
        -- Check envelope balance
        IF p_from_envelope_id IS NOT NULL THEN
            SELECT e.current_balance INTO envelope_balance
            FROM public.envelopes e WHERE e.id = p_from_envelope_id;
        END IF;
        
        RETURN QUERY
        SELECT 
            'Expense Flow Validation'::TEXT,
            (p_from_envelope_id IS NOT NULL AND p_to_envelope_id IS NULL AND p_payee_id IS NOT NULL) as is_valid,
            CASE WHEN p_from_envelope_id IS NULL THEN 'Expense transactions require a source envelope'
                 WHEN p_payee_id IS NULL THEN 'Expense transactions require a payee'
                 WHEN p_to_envelope_id IS NOT NULL THEN 'Expense transactions cannot have destination envelopes'
                 ELSE '' END as error_message;
        
        IF p_from_envelope_id IS NOT NULL THEN
            RETURN QUERY
            SELECT 
                'Envelope Balance Check'::TEXT,
                (envelope_balance >= p_amount OR allow_negative) as is_valid,
                CASE WHEN envelope_balance < p_amount AND NOT allow_negative THEN 'Insufficient envelope balance for transaction'
                     ELSE '' END as error_message;
        END IF;
    END IF;

    IF p_transaction_type = 'transfer' THEN
        -- Check envelope balance
        IF p_from_envelope_id IS NOT NULL THEN
            SELECT e.current_balance INTO envelope_balance
            FROM public.envelopes e WHERE e.id = p_from_envelope_id;
        END IF;
        
        RETURN QUERY
        SELECT 
            'Transfer Flow Validation'::TEXT,
            (p_from_envelope_id IS NOT NULL AND p_to_envelope_id IS NOT NULL AND p_from_envelope_id != p_to_envelope_id AND p_payee_id IS NULL) as is_valid,
            CASE WHEN p_from_envelope_id IS NULL THEN 'Transfer transactions require a source envelope'
                 WHEN p_to_envelope_id IS NULL THEN 'Transfer transactions require a destination envelope'
                 WHEN p_from_envelope_id = p_to_envelope_id THEN 'Transfer transactions cannot use the same envelope for source and destination'
                 WHEN p_payee_id IS NOT NULL THEN 'Transfer transactions cannot have payees'
                 ELSE '' END as error_message;
        
        IF p_from_envelope_id IS NOT NULL THEN
            RETURN QUERY
            SELECT 
                'Transfer Balance Check'::TEXT,
                (envelope_balance >= p_amount OR allow_negative) as is_valid,
                CASE WHEN envelope_balance < p_amount AND NOT allow_negative THEN 'Insufficient envelope balance for transfer'
                     ELSE '' END as error_message;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to fix common data inconsistencies
CREATE OR REPLACE FUNCTION public.fix_budget_data_inconsistencies(p_budget_id UUID)
RETURNS TABLE (
    fix_category TEXT,
    fixes_applied INTEGER,
    details TEXT
) AS $$
DECLARE
    fixes_count INTEGER;
BEGIN
    -- Fix envelope balances
    UPDATE public.envelopes
    SET current_balance = COALESCE((
        SELECT SUM(CASE 
            WHEN t.to_envelope_id = envelopes.id THEN t.amount
            WHEN t.from_envelope_id = envelopes.id THEN -t.amount
            ELSE 0
        END)
        FROM public.transactions t
        WHERE (t.to_envelope_id = envelopes.id OR t.from_envelope_id = envelopes.id)
        AND t.is_deleted = false
    ), 0)
    WHERE budget_id = p_budget_id;
    
    GET DIAGNOSTICS fixes_count = ROW_COUNT;
    
    RETURN QUERY
    SELECT 
        'Envelope Balances'::TEXT,
        fixes_count,
        'Recalculated ' || fixes_count || ' envelope balances' as details;

    -- Fix payee totals
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
    
    GET DIAGNOSTICS fixes_count = ROW_COUNT;
    
    RETURN QUERY
    SELECT 
        'Payee Totals'::TEXT,
        fixes_count,
        'Recalculated ' || fixes_count || ' payee totals' as details;

    -- Refresh cached totals
    PERFORM public.recalculate_user_state_totals(p_budget_id);
    
    RETURN QUERY
    SELECT 
        'Cached Totals'::TEXT,
        1,
        'Refreshed all cached totals' as details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON FUNCTION public.validate_budget_data_integrity IS 'Comprehensive validation of budget data integrity across all tables';
COMMENT ON FUNCTION public.validate_transaction_constraints IS 'Validates transaction constraints before processing';
COMMENT ON FUNCTION public.fix_budget_data_inconsistencies IS 'Fixes common data inconsistencies in budget data';