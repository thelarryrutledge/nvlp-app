import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Create Supabase client with the user's token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    // Get the current user from the JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    
    // Handle GET /budgets/{budgetId}/notifications/check
    if (req.method === 'GET' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'notifications' && pathParts[3] === 'check') {
      
      const budgetId = pathParts[1]
      
      // Verify budget access
      const { error: budgetError } = await supabaseClient
        .from('budgets')
        .select('id')
        .eq('id', budgetId)
        .eq('user_id', user.id)
        .single()

      if (budgetError) {
        if (budgetError.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Budget not found or access denied' }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        throw budgetError
      }

      // Check for all notification triggers
      const notifications = []

      // 1. Check for negative balance envelopes
      const { data: negativeEnvelopes, error: negativeError } = await supabaseClient
        .from('envelopes')
        .select('id, name, current_balance, category:categories(name)')
        .eq('budget_id', budgetId)
        .eq('is_active', true)
        .lt('current_balance', 0)

      if (negativeError) throw negativeError

      if (negativeEnvelopes && negativeEnvelopes.length > 0) {
        negativeEnvelopes.forEach(envelope => {
          notifications.push({
            type: 'negative_balance',
            severity: 'high',
            title: 'Envelope Overspent',
            message: `${envelope.name} is $${Math.abs(envelope.current_balance).toFixed(2)} over budget`,
            data: {
              envelope_id: envelope.id,
              envelope_name: envelope.name,
              current_balance: envelope.current_balance,
              category_name: envelope.category?.name
            },
            created_at: new Date().toISOString()
          })
        })
      }

      // 2. Check for low balance envelopes (less than 20% of target)
      const { data: lowBalanceEnvelopes, error: lowBalanceError } = await supabaseClient
        .from('envelopes')
        .select('id, name, current_balance, target_amount, category:categories(name)')
        .eq('budget_id', budgetId)
        .eq('is_active', true)
        .gt('target_amount', 0)
        .gte('current_balance', 0)

      if (lowBalanceError) throw lowBalanceError

      if (lowBalanceEnvelopes) {
        lowBalanceEnvelopes.forEach(envelope => {
          const threshold = envelope.target_amount * 0.2
          if (envelope.current_balance < threshold) {
            const percentage = Math.round((envelope.current_balance / envelope.target_amount) * 100)
            notifications.push({
              type: 'low_balance',
              severity: 'medium',
              title: 'Envelope Running Low',
              message: `${envelope.name} is at ${percentage}% of target ($${envelope.current_balance.toFixed(2)} of $${envelope.target_amount.toFixed(2)})`,
              data: {
                envelope_id: envelope.id,
                envelope_name: envelope.name,
                current_balance: envelope.current_balance,
                target_amount: envelope.target_amount,
                percentage,
                category_name: envelope.category?.name
              },
              created_at: new Date().toISOString()
            })
          }
        })
      }

      // 3. Check for overdue income sources
      const today = new Date().toISOString().split('T')[0]
      const { data: overdueIncome, error: overdueError } = await supabaseClient
        .from('income_sources')
        .select('id, name, expected_amount, next_expected_date')
        .eq('budget_id', budgetId)
        .eq('is_active', true)
        .not('next_expected_date', 'is', null)
        .lt('next_expected_date', today)

      if (overdueError) throw overdueError

      if (overdueIncome && overdueIncome.length > 0) {
        overdueIncome.forEach(income => {
          const daysOverdue = Math.floor((new Date(today).getTime() - new Date(income.next_expected_date).getTime()) / (1000 * 60 * 60 * 24))
          notifications.push({
            type: 'overdue_income',
            severity: 'medium',
            title: 'Income Overdue',
            message: `${income.name} was expected ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago ($${income.expected_amount?.toFixed(2) || '0.00'})`,
            data: {
              income_source_id: income.id,
              income_source_name: income.name,
              expected_amount: income.expected_amount,
              next_expected_date: income.next_expected_date,
              days_overdue: daysOverdue
            },
            created_at: new Date().toISOString()
          })
        })
      }

      // 4. Check for upcoming income (next 3 days)
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
      const threeDaysString = threeDaysFromNow.toISOString().split('T')[0]

      const { data: upcomingIncome, error: upcomingError } = await supabaseClient
        .from('income_sources')
        .select('id, name, expected_amount, next_expected_date')
        .eq('budget_id', budgetId)
        .eq('is_active', true)
        .not('next_expected_date', 'is', null)
        .gte('next_expected_date', today)
        .lte('next_expected_date', threeDaysString)

      if (upcomingError) throw upcomingError

      if (upcomingIncome && upcomingIncome.length > 0) {
        upcomingIncome.forEach(income => {
          const daysUntil = Math.ceil((new Date(income.next_expected_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
          notifications.push({
            type: 'upcoming_income',
            severity: 'low',
            title: 'Income Due Soon',
            message: `${income.name} is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} ($${income.expected_amount?.toFixed(2) || '0.00'})`,
            data: {
              income_source_id: income.id,
              income_source_name: income.name,
              expected_amount: income.expected_amount,
              next_expected_date: income.next_expected_date,
              days_until: daysUntil
            },
            created_at: new Date().toISOString()
          })
        })
      }

      // 5. Check for high uncleared transaction count
      const { data: unclearedTransactions, error: unclearedError } = await supabaseClient
        .from('transactions')
        .select('id')
        .eq('budget_id', budgetId)
        .eq('is_deleted', false)
        .eq('is_cleared', false)

      if (unclearedError) throw unclearedError

      if (unclearedTransactions && unclearedTransactions.length >= 10) {
        notifications.push({
          type: 'uncleared_transactions',
          severity: 'medium',
          title: 'Many Uncleared Transactions',
          message: `You have ${unclearedTransactions.length} uncleared transactions that may affect accuracy`,
          data: {
            uncleared_count: unclearedTransactions.length
          },
          created_at: new Date().toISOString()
        })
      }

      // 6. Check for budget inactivity (no transactions in last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysString = sevenDaysAgo.toISOString().split('T')[0]

      const { data: recentTransactions, error: recentError } = await supabaseClient
        .from('transactions')
        .select('id')
        .eq('budget_id', budgetId)
        .eq('is_deleted', false)
        .gte('transaction_date', sevenDaysString)
        .limit(1)

      if (recentError) throw recentError

      if (!recentTransactions || recentTransactions.length === 0) {
        notifications.push({
          type: 'budget_inactive',
          severity: 'low',
          title: 'Budget Inactive',
          message: 'No transactions recorded in the last 7 days. Consider updating your budget.',
          data: {},
          created_at: new Date().toISOString()
        })
      }

      // 7. Check for excessive available amount (more than 30% of total envelope targets)
      const { data: budgetInfo, error: budgetInfoError } = await supabaseClient
        .from('budgets')
        .select('available_amount')
        .eq('id', budgetId)
        .single()

      if (budgetInfoError) throw budgetInfoError

      const { data: envelopeTargets, error: targetsError } = await supabaseClient
        .from('envelopes')
        .select('target_amount')
        .eq('budget_id', budgetId)
        .eq('is_active', true)
        .gt('target_amount', 0)

      if (targetsError) throw targetsError

      if (budgetInfo && envelopeTargets && envelopeTargets.length > 0) {
        const totalTargets = envelopeTargets.reduce((sum, env) => sum + env.target_amount, 0)
        const threshold = totalTargets * 0.3

        if (budgetInfo.available_amount > threshold && budgetInfo.available_amount > 100) {
          notifications.push({
            type: 'high_available_amount',
            severity: 'low',
            title: 'Unallocated Funds Available',
            message: `You have $${budgetInfo.available_amount.toFixed(2)} available to allocate to envelopes`,
            data: {
              available_amount: budgetInfo.available_amount,
              total_targets: totalTargets,
              percentage: Math.round((budgetInfo.available_amount / totalTargets) * 100)
            },
            created_at: new Date().toISOString()
          })
        }
      }

      // Sort notifications by severity (high -> medium -> low)
      const severityOrder = { high: 3, medium: 2, low: 1 }
      notifications.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])

      return new Response(
        JSON.stringify({ 
          notifications,
          count: notifications.length,
          summary: {
            high_priority: notifications.filter(n => n.severity === 'high').length,
            medium_priority: notifications.filter(n => n.severity === 'medium').length,
            low_priority: notifications.filter(n => n.severity === 'low').length
          }
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle POST /budgets/{budgetId}/notifications/trigger
    if (req.method === 'POST' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'notifications' && pathParts[3] === 'trigger') {
      
      const budgetId = pathParts[1]
      
      // Verify budget access
      const { error: budgetError } = await supabaseClient
        .from('budgets')
        .select('id')
        .eq('id', budgetId)
        .eq('user_id', user.id)
        .single()

      if (budgetError) {
        if (budgetError.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Budget not found or access denied' }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        throw budgetError
      }

      // Parse request body for trigger event
      const body = await req.json()
      
      if (!body.event_type) {
        return new Response(
          JSON.stringify({ error: 'event_type is required' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const notifications = []

      // Handle specific trigger events
      switch (body.event_type) {
        case 'transaction_created':
          // Check if transaction caused any new alert conditions
          if (body.transaction_id) {
            const { data: transaction, error: transactionError } = await supabaseClient
              .from('transactions')
              .select(`
                *,
                from_envelope:envelopes!from_envelope_id(id, name, current_balance, target_amount),
                to_envelope:envelopes!to_envelope_id(id, name, current_balance, target_amount)
              `)
              .eq('id', body.transaction_id)
              .single()

            if (transactionError) throw transactionError

            // Check if expense caused envelope to go negative
            if (transaction.transaction_type === 'expense' && transaction.from_envelope?.current_balance < 0) {
              notifications.push({
                type: 'envelope_overspent',
                severity: 'high',
                title: 'Envelope Overspent',
                message: `${transaction.from_envelope.name} went $${Math.abs(transaction.from_envelope.current_balance).toFixed(2)} over budget`,
                data: {
                  envelope_id: transaction.from_envelope.id,
                  envelope_name: transaction.from_envelope.name,
                  current_balance: transaction.from_envelope.current_balance,
                  transaction_id: transaction.id,
                  transaction_amount: transaction.amount
                },
                created_at: new Date().toISOString()
              })
            }

            // Check if allocation filled envelope to target
            if (transaction.transaction_type === 'allocation' && 
                transaction.to_envelope?.target_amount > 0 &&
                transaction.to_envelope.current_balance >= transaction.to_envelope.target_amount) {
              notifications.push({
                type: 'envelope_funded',
                severity: 'low',
                title: 'Envelope Fully Funded',
                message: `${transaction.to_envelope.name} has reached its target of $${transaction.to_envelope.target_amount.toFixed(2)}`,
                data: {
                  envelope_id: transaction.to_envelope.id,
                  envelope_name: transaction.to_envelope.name,
                  current_balance: transaction.to_envelope.current_balance,
                  target_amount: transaction.to_envelope.target_amount,
                  transaction_id: transaction.id
                },
                created_at: new Date().toISOString()
              })
            }
          }
          break

        case 'envelope_updated':
          // Check if envelope target was changed significantly
          if (body.envelope_id && body.previous_target_amount && body.new_target_amount) {
            const change = body.new_target_amount - body.previous_target_amount
            const changePercentage = Math.abs(change / body.previous_target_amount * 100)

            if (changePercentage >= 25) { // 25% or more change
              notifications.push({
                type: 'envelope_target_changed',
                severity: 'low',
                title: 'Envelope Target Updated',
                message: `Envelope target ${change > 0 ? 'increased' : 'decreased'} by $${Math.abs(change).toFixed(2)} (${changePercentage.toFixed(0)}%)`,
                data: {
                  envelope_id: body.envelope_id,
                  previous_target: body.previous_target_amount,
                  new_target: body.new_target_amount,
                  change_amount: change,
                  change_percentage: changePercentage
                },
                created_at: new Date().toISOString()
              })
            }
          }
          break

        case 'budget_health_check':
          // Trigger comprehensive health analysis
          const { data: healthData, error: healthError } = await supabaseClient
            .rpc('get_budget_health_metrics', { p_budget_id: budgetId })

          if (healthError) throw healthError

          if (healthData && healthData.overall_score < 60) {
            notifications.push({
              type: 'budget_health_warning',
              severity: 'medium',
              title: 'Budget Health Needs Attention',
              message: `Your budget health score is ${healthData.overall_score}/100. Review recommendations to improve.`,
              data: {
                health_score: healthData.overall_score,
                recommendations: healthData.recommendations
              },
              created_at: new Date().toISOString()
            })
          }
          break

        default:
          return new Response(
            JSON.stringify({ error: 'Unknown event_type' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
      }

      return new Response(
        JSON.stringify({ 
          notifications,
          triggered_count: notifications.length,
          event_type: body.event_type
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Method/path not found
    return new Response(
      JSON.stringify({ error: 'Not Found' }),
      { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})