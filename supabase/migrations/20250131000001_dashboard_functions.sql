-- Dashboard calculation functions for complex analytics
-- These functions provide optimized SQL-based calculations for dashboard metrics

-- Function: Get comprehensive dashboard summary
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_budget_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  current_month_start DATE;
  current_month_end DATE;
BEGIN
  -- Get current month boundaries
  current_month_start := DATE_TRUNC('month', CURRENT_DATE);
  current_month_end := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day';

  WITH envelope_stats AS (
    SELECT 
      COUNT(*) as total_envelopes,
      COUNT(CASE WHEN is_active THEN 1 END) as active_envelopes,
      COUNT(CASE WHEN current_balance < 0 AND is_active THEN 1 END) as negative_envelopes,
      COALESCE(SUM(CASE WHEN is_active THEN current_balance ELSE 0 END), 0) as total_balance,
      COALESCE(SUM(CASE WHEN is_active THEN target_amount ELSE 0 END), 0) as total_targets
    FROM envelopes 
    WHERE budget_id = p_budget_id
  ),
  monthly_transactions AS (
    SELECT 
      COUNT(CASE WHEN transaction_type = 'income' THEN 1 END) as income_count,
      COUNT(CASE WHEN transaction_type IN ('expense', 'debt_payment') THEN 1 END) as expense_count,
      COUNT(CASE WHEN NOT is_cleared THEN 1 END) as uncleared_count,
      COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) as monthly_income,
      COALESCE(SUM(CASE WHEN transaction_type IN ('expense', 'debt_payment') THEN amount ELSE 0 END), 0) as monthly_spending
    FROM transactions 
    WHERE budget_id = p_budget_id 
      AND is_deleted = false
      AND transaction_date >= current_month_start
      AND transaction_date <= current_month_end
  ),
  recent_activity AS (
    SELECT JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', id,
        'transaction_type', transaction_type,
        'amount', amount,
        'transaction_date', transaction_date,
        'description', description,
        'is_cleared', is_cleared
      ) ORDER BY created_at DESC
    ) as recent_transactions
    FROM (
      SELECT * FROM transactions 
      WHERE budget_id = p_budget_id 
        AND is_deleted = false
      ORDER BY created_at DESC 
      LIMIT 10
    ) t
  ),
  budget_info AS (
    SELECT available_amount
    FROM budgets
    WHERE id = p_budget_id
  )
  SELECT JSON_BUILD_OBJECT(
    'available_amount', b.available_amount,
    'total_envelope_balance', e.total_balance,
    'total_envelope_targets', e.total_targets,
    'budget_utilization_percentage', 
      CASE 
        WHEN e.total_targets > 0 THEN ROUND((e.total_balance / e.total_targets * 100)::numeric, 2)
        ELSE 0 
      END,
    'envelope_stats', JSON_BUILD_OBJECT(
      'total_envelopes', e.total_envelopes,
      'active_envelopes', e.active_envelopes,
      'negative_envelopes', e.negative_envelopes,
      'allocation_percentage', 
        CASE 
          WHEN b.available_amount + e.total_balance > 0 
          THEN ROUND((e.total_balance / (b.available_amount + e.total_balance) * 100)::numeric, 2)
          ELSE 0 
        END
    ),
    'monthly_summary', JSON_BUILD_OBJECT(
      'income', m.monthly_income,
      'spending', m.monthly_spending,
      'net_flow', m.monthly_income - m.monthly_spending,
      'income_transactions', m.income_count,
      'expense_transactions', m.expense_count,
      'uncleared_transactions', m.uncleared_count
    ),
    'recent_activity', COALESCE(r.recent_transactions, '[]'::json)
  ) INTO result
  FROM budget_info b, envelope_stats e, monthly_transactions m, recent_activity r;

  RETURN result;
END;
$$;

-- Function: Get envelope performance analysis
CREATE OR REPLACE FUNCTION get_envelope_performance(p_budget_id UUID, p_months INTEGER DEFAULT 6)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  analysis_start DATE;
BEGIN
  analysis_start := CURRENT_DATE - (p_months || ' months')::INTERVAL;

  WITH envelope_performance AS (
    SELECT 
      e.id,
      e.name,
      e.envelope_type,
      e.target_amount,
      e.current_balance,
      c.name as category_name,
      -- Calculate spending velocity (average per month)
      COALESCE(
        ABS(SUM(CASE WHEN t.transaction_type IN ('expense', 'debt_payment') THEN t.amount ELSE 0 END)) / GREATEST(p_months, 1), 
        0
      ) as avg_monthly_spending,
      -- Calculate allocation frequency
      COUNT(CASE WHEN t.transaction_type = 'allocation' THEN 1 END) as allocation_count,
      COALESCE(SUM(CASE WHEN t.transaction_type = 'allocation' THEN t.amount ELSE 0 END), 0) as total_allocations,
      -- Calculate expense frequency  
      COUNT(CASE WHEN t.transaction_type IN ('expense', 'debt_payment') THEN 1 END) as expense_count,
      COALESCE(SUM(CASE WHEN t.transaction_type IN ('expense', 'debt_payment') THEN t.amount ELSE 0 END), 0) as total_expenses,
      -- Days since last activity
      EXTRACT(DAY FROM (CURRENT_DATE - MAX(t.transaction_date))) as days_since_activity
    FROM envelopes e
    LEFT JOIN categories c ON e.category_id = c.id
    LEFT JOIN transactions t ON (e.id = t.from_envelope_id OR e.id = t.to_envelope_id)
      AND t.budget_id = p_budget_id 
      AND t.is_deleted = false
      AND t.transaction_date >= analysis_start
    WHERE e.budget_id = p_budget_id AND e.is_active = true
    GROUP BY e.id, e.name, e.envelope_type, e.target_amount, e.current_balance, c.name
  ),
  performance_metrics AS (
    SELECT 
      *,
      -- Performance score calculation
      CASE 
        WHEN target_amount = 0 THEN 50  -- No target set
        WHEN current_balance >= target_amount THEN 100  -- Meeting or exceeding target
        WHEN current_balance >= target_amount * 0.8 THEN 80  -- 80%+ of target
        WHEN current_balance >= target_amount * 0.5 THEN 60  -- 50%+ of target
        WHEN current_balance >= 0 THEN 40  -- Positive balance but below 50%
        ELSE 20  -- Negative balance
      END as performance_score,
      -- Risk assessment
      CASE 
        WHEN current_balance < 0 THEN 'high'
        WHEN avg_monthly_spending > 0 AND current_balance / GREATEST(avg_monthly_spending, 1) < 1 THEN 'medium'
        WHEN avg_monthly_spending > 0 AND current_balance / GREATEST(avg_monthly_spending, 1) < 2 THEN 'low'
        ELSE 'very_low'
      END as risk_level,
      -- Recommended action
      CASE 
        WHEN current_balance < 0 THEN 'immediate_funding_needed'
        WHEN target_amount > 0 AND current_balance < target_amount * 0.5 THEN 'increase_allocations'
        WHEN days_since_activity > 90 THEN 'review_necessity'
        WHEN avg_monthly_spending = 0 AND current_balance > target_amount * 1.5 THEN 'consider_reallocation'
        ELSE 'on_track'
      END as recommended_action
    FROM envelope_performance
  )
  SELECT JSON_BUILD_OBJECT(
    'analysis_period', JSON_BUILD_OBJECT(
      'start_date', analysis_start,
      'end_date', CURRENT_DATE,
      'months', p_months
    ),
    'summary', JSON_BUILD_OBJECT(
      'total_envelopes', COUNT(*),
      'avg_performance_score', ROUND(AVG(performance_score), 1),
      'high_risk_envelopes', COUNT(CASE WHEN risk_level = 'high' THEN 1 END),
      'top_performers', COUNT(CASE WHEN performance_score >= 80 THEN 1 END)
    ),
    'envelopes', JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', id,
        'name', name,
        'envelope_type', envelope_type,
        'category_name', category_name,
        'current_balance', current_balance,
        'target_amount', target_amount,
        'performance_score', performance_score,
        'risk_level', risk_level,
        'recommended_action', recommended_action,
        'metrics', JSON_BUILD_OBJECT(
          'avg_monthly_spending', ROUND(avg_monthly_spending, 2),
          'total_allocations', total_allocations,
          'total_expenses', total_expenses,
          'allocation_count', allocation_count,
          'expense_count', expense_count,
          'days_since_activity', COALESCE(days_since_activity, 0),
          'months_of_runway', 
            CASE 
              WHEN avg_monthly_spending > 0 THEN ROUND(current_balance / avg_monthly_spending, 1)
              ELSE NULL
            END
        )
      ) ORDER BY performance_score DESC, current_balance DESC
    )
  ) INTO result
  FROM performance_metrics;

  RETURN result;
END;
$$;

-- Function: Get advanced spending insights
CREATE OR REPLACE FUNCTION get_spending_insights(p_budget_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  days_in_period INTEGER;
BEGIN
  days_in_period := p_end_date - p_start_date + 1;

  WITH spending_patterns AS (
    SELECT 
      c.name as category_name,
      c.id as category_id,
      COUNT(*) as transaction_count,
      SUM(t.amount) as total_amount,
      AVG(t.amount) as avg_transaction_amount,
      MIN(t.amount) as min_amount,
      MAX(t.amount) as max_amount,
      -- Calculate frequency patterns
      COUNT(DISTINCT DATE_TRUNC('week', t.transaction_date)) as active_weeks,
      COUNT(DISTINCT EXTRACT(DOW FROM t.transaction_date)) as unique_days_of_week,
      -- Most common day of week (0=Sunday, 6=Saturday)
      MODE() WITHIN GROUP (ORDER BY EXTRACT(DOW FROM t.transaction_date)) as most_common_dow,
      -- Spending velocity
      SUM(t.amount) / GREATEST(days_in_period, 1) as daily_avg_spending
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.budget_id = p_budget_id
      AND t.transaction_type IN ('expense', 'debt_payment')
      AND t.is_deleted = false
      AND t.transaction_date >= p_start_date
      AND t.transaction_date <= p_end_date
    GROUP BY c.id, c.name
  ),
  spending_anomalies AS (
    SELECT 
      t.id,
      t.amount,
      t.transaction_date,
      t.description,
      c.name as category_name,
      -- Z-score for anomaly detection
      ABS((t.amount - AVG(t.amount) OVER (PARTITION BY t.category_id)) / 
          NULLIF(STDDEV(t.amount) OVER (PARTITION BY t.category_id), 0)) as z_score
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.budget_id = p_budget_id
      AND t.transaction_type IN ('expense', 'debt_payment')
      AND t.is_deleted = false
      AND t.transaction_date >= p_start_date
      AND t.transaction_date <= p_end_date
  ),
  weekly_trends AS (
    SELECT 
      DATE_TRUNC('week', transaction_date)::DATE as week_start,
      SUM(amount) as weekly_spending,
      COUNT(*) as weekly_transactions
    FROM transactions
    WHERE budget_id = p_budget_id
      AND transaction_type IN ('expense', 'debt_payment')
      AND is_deleted = false
      AND transaction_date >= p_start_date
      AND transaction_date <= p_end_date
    GROUP BY DATE_TRUNC('week', transaction_date)
    ORDER BY week_start
  )
  SELECT JSON_BUILD_OBJECT(
    'period', JSON_BUILD_OBJECT(
      'start_date', p_start_date,
      'end_date', p_end_date,
      'days', days_in_period
    ),
    'spending_summary', JSON_BUILD_OBJECT(
      'total_spending', COALESCE(SUM(sp.total_amount), 0),
      'avg_daily_spending', COALESCE(SUM(sp.total_amount) / GREATEST(days_in_period, 1), 0),
      'total_transactions', COALESCE(SUM(sp.transaction_count), 0),
      'avg_transaction_amount', COALESCE(AVG(sp.avg_transaction_amount), 0),
      'categories_with_spending', COUNT(*)
    ),
    'category_insights', JSON_AGG(
      JSON_BUILD_OBJECT(
        'category_id', sp.category_id,
        'category_name', COALESCE(sp.category_name, 'Uncategorized'),
        'total_amount', sp.total_amount,
        'transaction_count', sp.transaction_count,
        'avg_amount', ROUND(sp.avg_transaction_amount, 2),
        'spending_frequency', JSON_BUILD_OBJECT(
          'active_weeks', sp.active_weeks,
          'unique_days_of_week', sp.unique_days_of_week,
          'most_common_day', sp.most_common_dow,
          'daily_average', ROUND(sp.daily_avg_spending, 2)
        ),
        'amount_range', JSON_BUILD_OBJECT(
          'min', sp.min_amount,
          'max', sp.max_amount,
          'variance', ROUND(sp.max_amount - sp.min_amount, 2)
        )
      ) ORDER BY sp.total_amount DESC
    ) FILTER (WHERE sp.category_id IS NOT NULL OR sp.category_name IS NOT NULL),
    'anomalies', (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'transaction_id', id,
          'amount', amount,
          'date', transaction_date,
          'description', description,
          'category_name', COALESCE(category_name, 'Uncategorized'),
          'z_score', ROUND(z_score, 2)
        ) ORDER BY z_score DESC
      )
      FROM spending_anomalies 
      WHERE z_score > 2.0  -- Transactions more than 2 standard deviations from mean
      LIMIT 10
    ),
    'weekly_trends', (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'week_start', week_start,
          'spending', weekly_spending,
          'transactions', weekly_transactions
        ) ORDER BY week_start
      )
      FROM weekly_trends
    )
  ) INTO result
  FROM spending_patterns sp;

  RETURN result;
END;
$$;

-- Function: Calculate budget health metrics
CREATE OR REPLACE FUNCTION get_budget_health_metrics(p_budget_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  
AS $$
DECLARE
  result JSON;
BEGIN
  WITH health_metrics AS (
    SELECT 
      b.available_amount,
      -- Envelope health
      COUNT(e.id) as total_envelopes,
      COUNT(CASE WHEN e.is_active THEN 1 END) as active_envelopes,
      COUNT(CASE WHEN e.current_balance < 0 AND e.is_active THEN 1 END) as negative_envelopes,
      COUNT(CASE WHEN e.current_balance >= e.target_amount AND e.target_amount > 0 AND e.is_active THEN 1 END) as funded_envelopes,
      SUM(CASE WHEN e.is_active THEN e.current_balance ELSE 0 END) as total_envelope_balance,
      SUM(CASE WHEN e.is_active THEN e.target_amount ELSE 0 END) as total_target_amount,
      -- Recent activity (last 30 days)
      COUNT(CASE WHEN t.transaction_date >= CURRENT_DATE - INTERVAL '30 days' AND t.is_deleted = false THEN 1 END) as recent_transactions,
      COUNT(CASE WHEN t.transaction_date >= CURRENT_DATE - INTERVAL '30 days' AND t.is_cleared = false AND t.is_deleted = false THEN 1 END) as uncleared_transactions
    FROM budgets b
    LEFT JOIN envelopes e ON b.id = e.budget_id
    LEFT JOIN transactions t ON b.id = t.budget_id
    WHERE b.id = p_budget_id
    GROUP BY b.id, b.available_amount
  )
  SELECT JSON_BUILD_OBJECT(
    'overall_score', 
      CASE 
        WHEN hm.total_envelopes = 0 THEN 50  -- New budget
        ELSE LEAST(100, GREATEST(0, 
          -- Base score from envelope funding
          (CASE WHEN hm.total_target_amount > 0 
           THEN (hm.total_envelope_balance / hm.total_target_amount * 60)::INTEGER
           ELSE 30 END) +
          -- Penalty for negative envelopes
          GREATEST(-20, -5 * hm.negative_envelopes) +
          -- Bonus for having available funds
          (CASE WHEN hm.available_amount > 0 THEN 10 ELSE 0 END) +
          -- Bonus for recent activity
          (CASE WHEN hm.recent_transactions > 0 THEN 10 ELSE -10 END) +
          -- Penalty for uncleared transactions
          GREATEST(-10, -2 * hm.uncleared_transactions)
        ))
      END,
    'health_indicators', JSON_BUILD_OBJECT(
      'envelope_funding_ratio', 
        CASE 
          WHEN hm.total_target_amount > 0 
          THEN ROUND((hm.total_envelope_balance / hm.total_target_amount * 100)::numeric, 1)
          ELSE NULL 
        END,
      'available_funds_status', 
        CASE 
          WHEN hm.available_amount > 0 THEN 'positive'
          WHEN hm.available_amount = 0 THEN 'zero'
          ELSE 'negative'
        END,
      'envelope_health', JSON_BUILD_OBJECT(
        'total_envelopes', hm.total_envelopes,
        'active_envelopes', hm.active_envelopes,
        'negative_envelopes', hm.negative_envelopes,
        'fully_funded_envelopes', hm.funded_envelopes,
        'funding_percentage', 
          CASE 
            WHEN hm.active_envelopes > 0 
            THEN ROUND((hm.funded_envelopes::numeric / hm.active_envelopes * 100), 1)
            ELSE 0 
          END
      ),
      'activity_health', JSON_BUILD_OBJECT(
        'recent_transactions_30d', hm.recent_transactions,
        'uncleared_transactions', hm.uncleared_transactions,
        'activity_status', 
          CASE 
            WHEN hm.recent_transactions = 0 THEN 'inactive'
            WHEN hm.recent_transactions < 5 THEN 'low'
            WHEN hm.recent_transactions < 20 THEN 'moderate'
            ELSE 'high'
          END
      )
    ),
    'recommendations', (
      SELECT JSON_AGG(rec ORDER BY priority)
      FROM (
        SELECT 1 as priority, 'Fund negative envelopes immediately' as rec
        WHERE hm.negative_envelopes > 0
        
        UNION ALL
        
        SELECT 2, 'Clear pending transactions to improve accuracy'
        WHERE hm.uncleared_transactions > 5
        
        UNION ALL
        
        SELECT 3, 'Allocate available funds to envelopes'
        WHERE hm.available_amount > 100
        
        UNION ALL
        
        SELECT 4, 'Review and update envelope targets'
        WHERE hm.funded_envelopes = hm.active_envelopes AND hm.active_envelopes > 0
        
        UNION ALL
        
        SELECT 5, 'Add regular income transactions to maintain budget'
        WHERE hm.recent_transactions < 3
        
        UNION ALL
        
        SELECT 6, 'Consider creating more envelopes for better categorization'
        WHERE hm.total_envelopes < 5
      ) recommendations
    )
  ) INTO result
  FROM health_metrics hm;

  RETURN result;
END;
$$;

-- Function: Generate cash flow forecast
CREATE OR REPLACE FUNCTION get_cash_flow_forecast(p_budget_id UUID, p_forecast_months INTEGER DEFAULT 3)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  WITH historical_patterns AS (
    -- Analyze last 6 months for pattern recognition
    SELECT 
      EXTRACT(MONTH FROM transaction_date) as month_num,
      EXTRACT(DAY FROM transaction_date) as day_num,
      transaction_type,
      AVG(amount) as avg_amount,
      COUNT(*) as frequency,
      STDDEV(amount) as amount_stddev
    FROM transactions
    WHERE budget_id = p_budget_id
      AND is_deleted = false
      AND transaction_date >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY EXTRACT(MONTH FROM transaction_date), EXTRACT(DAY FROM transaction_date), transaction_type
  ),
  monthly_averages AS (
    SELECT 
      transaction_type,
      AVG(amount) as avg_monthly_amount,
      COUNT(*) / 6.0 as avg_monthly_frequency  -- 6 months of history
    FROM transactions
    WHERE budget_id = p_budget_id
      AND is_deleted = false
      AND transaction_date >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY transaction_type
  ),
  current_state AS (
    SELECT 
      b.available_amount,
      SUM(e.current_balance) as total_envelope_balance
    FROM budgets b
    LEFT JOIN envelopes e ON b.id = e.budget_id AND e.is_active = true
    WHERE b.id = p_budget_id
    GROUP BY b.id, b.available_amount
  )
  SELECT JSON_BUILD_OBJECT(
    'forecast_period', JSON_BUILD_OBJECT(
      'start_date', CURRENT_DATE,
      'months', p_forecast_months,
      'end_date', CURRENT_DATE + (p_forecast_months || ' months')::INTERVAL
    ),
    'current_position', JSON_BUILD_OBJECT(
      'available_amount', cs.available_amount,
      'total_envelope_balance', cs.total_envelope_balance,
      'total_liquid_funds', cs.available_amount + cs.total_envelope_balance
    ),
    'monthly_projections', (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'month', generate_series,
          'month_date', (CURRENT_DATE + (generate_series || ' months')::INTERVAL)::DATE,
          'projected_income', COALESCE(income_avg.avg_monthly_amount * income_avg.avg_monthly_frequency, 0),
          'projected_expenses', COALESCE(expense_avg.avg_monthly_amount * expense_avg.avg_monthly_frequency, 0),
          'net_flow', 
            COALESCE(income_avg.avg_monthly_amount * income_avg.avg_monthly_frequency, 0) - 
            COALESCE(expense_avg.avg_monthly_amount * expense_avg.avg_monthly_frequency, 0),
          'projected_balance', 
            cs.available_amount + cs.total_envelope_balance +
            generate_series * (
              COALESCE(income_avg.avg_monthly_amount * income_avg.avg_monthly_frequency, 0) - 
              COALESCE(expense_avg.avg_monthly_amount * expense_avg.avg_monthly_frequency, 0)
            )
        ) ORDER BY generate_series
      )
      FROM generate_series(1, p_forecast_months) 
      CROSS JOIN current_state cs
      LEFT JOIN monthly_averages income_avg ON income_avg.transaction_type = 'income'
      LEFT JOIN monthly_averages expense_avg ON expense_avg.transaction_type IN ('expense', 'debt_payment')
    ),
    'risk_analysis', JSON_BUILD_OBJECT(
      'cash_depletion_risk', 
        CASE 
          WHEN (
            SELECT MIN(
              cs.available_amount + cs.total_envelope_balance +
              generate_series * (
                COALESCE(income_avg.avg_monthly_amount * income_avg.avg_monthly_frequency, 0) - 
                COALESCE(expense_avg.avg_monthly_amount * expense_avg.avg_monthly_frequency, 0)
              )
            )
            FROM generate_series(1, p_forecast_months)
            CROSS JOIN current_state cs
            LEFT JOIN monthly_averages income_avg ON income_avg.transaction_type = 'income'
            LEFT JOIN monthly_averages expense_avg ON expense_avg.transaction_type IN ('expense', 'debt_payment')
          ) < 0 THEN 'high'
          WHEN (
            SELECT MIN(
              cs.available_amount + cs.total_envelope_balance +
              generate_series * (
                COALESCE(income_avg.avg_monthly_amount * income_avg.avg_monthly_frequency, 0) - 
                COALESCE(expense_avg.avg_monthly_amount * expense_avg.avg_monthly_frequency, 0)
              )
            )
            FROM generate_series(1, p_forecast_months)
            CROSS JOIN current_state cs
            LEFT JOIN monthly_averages income_avg ON income_avg.transaction_type = 'income'
            LEFT JOIN monthly_averages expense_avg ON expense_avg.transaction_type IN ('expense', 'debt_payment')
          ) < 500 THEN 'medium'
          ELSE 'low'
        END,
      'income_stability', 
        CASE 
          WHEN (SELECT COUNT(*) FROM monthly_averages WHERE transaction_type = 'income') = 0 THEN 'none'
          WHEN (SELECT avg_monthly_frequency FROM monthly_averages WHERE transaction_type = 'income') < 1 THEN 'irregular'
          WHEN (SELECT avg_monthly_frequency FROM monthly_averages WHERE transaction_type = 'income') < 4 THEN 'moderate'
          ELSE 'stable'
        END
    )
  ) INTO result
  FROM current_state cs;

  RETURN result;
END;
$$;

-- Function: Analyze category variance
CREATE OR REPLACE FUNCTION get_category_variance_analysis(p_budget_id UUID, p_analysis_months INTEGER DEFAULT 3)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  analysis_start DATE;
BEGIN
  analysis_start := CURRENT_DATE - (p_analysis_months || ' months')::INTERVAL;

  WITH category_analysis AS (
    SELECT 
      c.id as category_id,
      c.name as category_name,
      c.is_income,
      -- Envelope targets for this category
      COUNT(e.id) as envelope_count,
      SUM(e.target_amount) as total_target,
      SUM(e.current_balance) as total_current_balance,
      -- Actual spending/income in period
      COALESCE(SUM(CASE 
        WHEN t.transaction_type IN ('expense', 'debt_payment') THEN t.amount 
        WHEN t.transaction_type = 'income' THEN t.amount
        ELSE 0 
      END), 0) as actual_amount,
      COUNT(t.id) as transaction_count,
      -- Calculate expected monthly rate
      CASE 
        WHEN c.is_income THEN 
          COALESCE(SUM(e.target_amount) / GREATEST(p_analysis_months, 1), 0)
        ELSE 
          COALESCE(SUM(e.target_amount) / GREATEST(p_analysis_months, 1), 0)
      END as expected_monthly_rate
    FROM categories c
    LEFT JOIN envelopes e ON c.id = e.category_id AND e.budget_id = p_budget_id AND e.is_active = true
    LEFT JOIN transactions t ON c.id = t.category_id 
      AND t.budget_id = p_budget_id 
      AND t.is_deleted = false
      AND t.transaction_date >= analysis_start
    WHERE c.budget_id = p_budget_id
    GROUP BY c.id, c.name, c.is_income
  ),
  variance_calculations AS (
    SELECT 
      *,
      -- Variance calculations
      actual_amount - (expected_monthly_rate * p_analysis_months) as variance_amount,
      CASE 
        WHEN expected_monthly_rate * p_analysis_months > 0 THEN
          ((actual_amount - (expected_monthly_rate * p_analysis_months)) / 
           (expected_monthly_rate * p_analysis_months) * 100)
        ELSE 0 
      END as variance_percentage,
      -- Performance rating
      CASE 
        WHEN is_income THEN
          CASE 
            WHEN actual_amount >= expected_monthly_rate * p_analysis_months * 1.1 THEN 'exceeding'
            WHEN actual_amount >= expected_monthly_rate * p_analysis_months * 0.9 THEN 'on_track'
            WHEN actual_amount >= expected_monthly_rate * p_analysis_months * 0.7 THEN 'below_target'
            ELSE 'significantly_below'
          END
        ELSE  -- Expense categories
          CASE 
            WHEN actual_amount <= expected_monthly_rate * p_analysis_months * 0.9 THEN 'under_budget'
            WHEN actual_amount <= expected_monthly_rate * p_analysis_months * 1.1 THEN 'on_budget'
            WHEN actual_amount <= expected_monthly_rate * p_analysis_months * 1.3 THEN 'over_budget'
            ELSE 'significantly_over'
          END
      END as performance_rating
    FROM category_analysis
    WHERE envelope_count > 0  -- Only include categories with envelopes
  )
  SELECT JSON_BUILD_OBJECT(
    'analysis_period', JSON_BUILD_OBJECT(
      'start_date', analysis_start,
      'end_date', CURRENT_DATE,
      'months', p_analysis_months
    ),
    'summary', JSON_BUILD_OBJECT(
      'total_categories', COUNT(*),
      'income_categories', COUNT(CASE WHEN is_income THEN 1 END),
      'expense_categories', COUNT(CASE WHEN NOT is_income THEN 1 END),
      'categories_on_track', COUNT(CASE WHEN performance_rating IN ('on_track', 'on_budget') THEN 1 END),
      'categories_needing_attention', COUNT(CASE WHEN performance_rating IN ('significantly_below', 'significantly_over') THEN 1 END)
    ),
    'category_analysis', JSON_AGG(
      JSON_BUILD_OBJECT(
        'category_id', category_id,
        'category_name', category_name,
        'is_income', is_income,
        'envelope_count', envelope_count,
        'targets', JSON_BUILD_OBJECT(
          'total_target', total_target,
          'expected_period_amount', expected_monthly_rate * p_analysis_months,
          'monthly_rate', expected_monthly_rate
        ),
        'actuals', JSON_BUILD_OBJECT(
          'actual_amount', actual_amount,
          'transaction_count', transaction_count,
          'monthly_average', actual_amount / GREATEST(p_analysis_months, 1)
        ),
        'variance', JSON_BUILD_OBJECT(
          'amount', ROUND(variance_amount, 2),
          'percentage', ROUND(variance_percentage, 1),
          'performance_rating', performance_rating
        ),
        'current_balance', total_current_balance
      ) ORDER BY ABS(variance_percentage) DESC
    )
  ) INTO result
  FROM variance_calculations;

  RETURN result;
END;
$$;