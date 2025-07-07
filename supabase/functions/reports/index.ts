import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';",
}

// Helper function for consistent error responses
function createErrorResponse(error: string, code: string, status: number = 400, details?: any) {
  const errorObj: any = { error, code }
  if (details) errorObj.details = details
  
  console.error(`[REPORTS ERROR] ${code}: ${error}`, details ? details : '')
  
  return new Response(
    JSON.stringify(errorObj),
    { 
      status, 
      headers: { 
        ...corsHeaders, 
        ...securityHeaders,
        'Content-Type': 'application/json' 
      } 
    }
  )
}

// Helper function for consistent success responses
function createSuccessResponse(data: any, status: number = 200) {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { 
        ...corsHeaders, 
        ...securityHeaders,
        'Content-Type': 'application/json' 
      } 
    }
  )
}

// Helper function to validate JWT token and get user
async function validateTokenAndGetUser(supabase: any, authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { error: 'Missing or invalid authorization header', code: 'UNAUTHORIZED', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    throw { error: 'Invalid or expired token', code: 'INVALID_TOKEN', status: 401 }
  }

  return user
}

// Helper function to parse date range parameters
function parseDateRange(startDate?: string, endDate?: string, defaultDays: number = 30) {
  const end = endDate ? new Date(endDate) : new Date()
  let start: Date
  
  if (startDate) {
    start = new Date(startDate)
  } else {
    start = new Date()
    start.setDate(start.getDate() - defaultDays)
  }
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}

// Reporting query functions
const ReportQueries = {
  // Transaction history report with filtering and pagination
  async getTransactionReport(supabase: any, budgetId: string, options: any = {}) {
    const { start, end } = parseDateRange(options.start_date, options.end_date, 90)
    const limit = Math.min(parseInt(options.limit || '100'), 500)
    const offset = parseInt(options.offset || '0')
    
    let query = supabase
      .from('transactions')
      .select(`
        id,
        transaction_type,
        amount,
        description,
        transaction_date,
        reference_number,
        notes,
        is_cleared,
        is_reconciled,
        from_envelope:envelopes!from_envelope_id(name, categories!category_id(name)),
        to_envelope:envelopes!to_envelope_id(name, categories!category_id(name)),
        payee:payees!payee_id(name),
        income_source:income_sources!income_source_id(name),
        created_at
      `)
      .eq('budget_id', budgetId)
      .eq('is_deleted', false)
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (options.transaction_type) {
      query = query.eq('transaction_type', options.transaction_type)
    }
    
    if (options.envelope_id) {
      query = query.or(`from_envelope_id.eq.${options.envelope_id},to_envelope_id.eq.${options.envelope_id}`)
    }
    
    if (options.payee_id) {
      query = query.eq('payee_id', options.payee_id)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      transactions: data || [],
      pagination: {
        limit,
        offset,
        count: data?.length || 0
      },
      date_range: { start, end }
    }
  },

  // Spending trends by category over time
  async getCategorySpendingTrends(supabase: any, budgetId: string, options: any = {}) {
    const { start, end } = parseDateRange(options.start_date, options.end_date, 90)
    const groupBy = options.group_by || 'month' // month, week, day
    
    // Get all spending transactions with category information
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        amount,
        transaction_date,
        envelopes!from_envelope_id(
          name,
          categories!category_id(id, name, color)
        )
      `)
      .eq('budget_id', budgetId)
      .in('transaction_type', ['expense', 'debt_payment'])
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .eq('is_deleted', false)

    if (error) throw error

    // Group by time period and category
    const trends: Record<string, Record<string, { name: string; amount: number; color?: string }>> = {}
    
    data?.forEach(txn => {
      const date = new Date(txn.transaction_date)
      let period: string
      
      switch (groupBy) {
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          period = weekStart.toISOString().split('T')[0]
          break
        case 'day':
          period = txn.transaction_date
          break
        default: // month
          period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }
      
      const categoryId = txn.envelopes?.categories?.id || 'uncategorized'
      const categoryName = txn.envelopes?.categories?.name || 'Uncategorized'
      const categoryColor = txn.envelopes?.categories?.color
      
      if (!trends[period]) {
        trends[period] = {}
      }
      
      if (!trends[period][categoryId]) {
        trends[period][categoryId] = { name: categoryName, amount: 0, color: categoryColor }
      }
      
      trends[period][categoryId].amount += txn.amount
    })

    return {
      trends,
      date_range: { start, end },
      group_by: groupBy
    }
  },

  // Income vs expenses over time
  async getIncomeExpenseReport(supabase: any, budgetId: string, options: any = {}) {
    const { start, end } = parseDateRange(options.start_date, options.end_date, 90)
    const groupBy = options.group_by || 'month'
    
    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_type, amount, transaction_date')
      .eq('budget_id', budgetId)
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .eq('is_deleted', false)

    if (error) throw error

    // Group by time period
    const report: Record<string, { income: number; expenses: number; debt_payments: number; net: number }> = {}
    
    data?.forEach(txn => {
      const date = new Date(txn.transaction_date)
      let period: string
      
      switch (groupBy) {
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          period = weekStart.toISOString().split('T')[0]
          break
        case 'day':
          period = txn.transaction_date
          break
        default: // month
          period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }
      
      if (!report[period]) {
        report[period] = { income: 0, expenses: 0, debt_payments: 0, net: 0 }
      }
      
      switch (txn.transaction_type) {
        case 'income':
          report[period].income += txn.amount
          break
        case 'expense':
          report[period].expenses += txn.amount
          break
        case 'debt_payment':
          report[period].debt_payments += txn.amount
          break
      }
      
      report[period].net = report[period].income - report[period].expenses - report[period].debt_payments
    })

    return {
      periods: report,
      date_range: { start, end },
      group_by: groupBy
    }
  },

  // Envelope balance history
  async getEnvelopeBalanceHistory(supabase: any, budgetId: string, options: any = {}) {
    const { start, end } = parseDateRange(options.start_date, options.end_date, 30)
    const envelopeId = options.envelope_id
    
    // Get all transactions affecting the envelope(s)
    let query = supabase
      .from('transactions')
      .select(`
        id,
        transaction_type,
        amount,
        transaction_date,
        from_envelope_id,
        to_envelope_id,
        envelopes!from_envelope_id(name),
        to_envelope:envelopes!to_envelope_id(name)
      `)
      .eq('budget_id', budgetId)
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .eq('is_deleted', false)
      .order('transaction_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (envelopeId) {
      query = query.or(`from_envelope_id.eq.${envelopeId},to_envelope_id.eq.${envelopeId}`)
    }

    const { data: transactions, error } = await query
    if (error) throw error

    // Get current envelope balances as starting point
    let envelopeQuery = supabase
      .from('envelopes')
      .select('id, name, current_balance')
      .eq('budget_id', budgetId)
      .eq('is_active', true)

    if (envelopeId) {
      envelopeQuery = envelopeQuery.eq('id', envelopeId)
    }

    const { data: envelopes, error: envError } = await envelopeQuery
    if (envError) throw envError

    // Calculate balance history by working backwards from current balances
    const history: Record<string, Array<{ date: string; balance: number }>> = {}
    const currentBalances: Record<string, number> = {}
    
    envelopes?.forEach(env => {
      currentBalances[env.id] = env.current_balance
      history[env.id] = []
    })

    // Work through transactions chronologically to build history
    const balancesByDate: Record<string, Record<string, number>> = {}
    
    transactions?.forEach(txn => {
      const date = txn.transaction_date
      
      if (!balancesByDate[date]) {
        balancesByDate[date] = { ...currentBalances }
      }
      
      // Apply transaction effect
      if (txn.transaction_type === 'allocation' && txn.to_envelope_id) {
        balancesByDate[date][txn.to_envelope_id] = (balancesByDate[date][txn.to_envelope_id] || 0) + txn.amount
      }
      
      if ((txn.transaction_type === 'expense' || txn.transaction_type === 'debt_payment') && txn.from_envelope_id) {
        balancesByDate[date][txn.from_envelope_id] = (balancesByDate[date][txn.from_envelope_id] || 0) - txn.amount
      }
      
      if (txn.transaction_type === 'transfer') {
        if (txn.from_envelope_id) {
          balancesByDate[date][txn.from_envelope_id] = (balancesByDate[date][txn.from_envelope_id] || 0) - txn.amount
        }
        if (txn.to_envelope_id) {
          balancesByDate[date][txn.to_envelope_id] = (balancesByDate[date][txn.to_envelope_id] || 0) + txn.amount
        }
      }
    })

    // Convert to final format
    const envelopeHistory: Record<string, { name: string; history: Array<{ date: string; balance: number }> }> = {}
    
    envelopes?.forEach(env => {
      envelopeHistory[env.id] = {
        name: env.name,
        history: Object.entries(balancesByDate).map(([date, balances]) => ({
          date,
          balance: balances[env.id] || 0
        })).sort((a, b) => a.date.localeCompare(b.date))
      }
    })

    return {
      envelope_history: envelopeHistory,
      date_range: { start, end }
    }
  },

  // Budget performance summary
  async getBudgetPerformanceReport(supabase: any, budgetId: string, options: any = {}) {
    const { start, end } = parseDateRange(options.start_date, options.end_date, 30)
    
    // Get budget overview
    const { data: budgetData, error: budgetError } = await supabase
      .from('budgets')
      .select(`
        id,
        name,
        description,
        user_state!inner(available_amount)
      `)
      .eq('id', budgetId)
      .single()

    if (budgetError) throw budgetError

    // Get envelope performance (target vs actual)
    const { data: envelopes, error: envError } = await supabase
      .from('envelopes')
      .select('id, name, current_balance, target_amount')
      .eq('budget_id', budgetId)
      .eq('is_active', true)

    if (envError) throw envError

    // Get period transactions for analysis
    const { data: transactions, error: txnError } = await supabase
      .from('transactions')
      .select('transaction_type, amount, from_envelope_id')
      .eq('budget_id', budgetId)
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .eq('is_deleted', false)

    if (txnError) throw txnError

    // Calculate envelope spending in period
    const envelopeSpending: Record<string, number> = {}
    transactions?.forEach(txn => {
      if ((txn.transaction_type === 'expense' || txn.transaction_type === 'debt_payment') && txn.from_envelope_id) {
        envelopeSpending[txn.from_envelope_id] = (envelopeSpending[txn.from_envelope_id] || 0) + txn.amount
      }
    })

    // Calculate performance metrics
    const envelopePerformance = envelopes?.map(env => {
      const spent = envelopeSpending[env.id] || 0
      const target = env.target_amount || 0
      const current = env.current_balance || 0
      
      return {
        id: env.id,
        name: env.name,
        current_balance: current,
        target_amount: target,
        spent_in_period: spent,
        target_progress: target > 0 ? (current / target) * 100 : null,
        over_budget: target > 0 && current < 0,
        under_target: target > 0 && current < target
      }
    }) || []

    return {
      budget: {
        id: budgetData.id,
        name: budgetData.name,
        description: budgetData.description,
        available_amount: budgetData.user_state[0]?.available_amount || 0
      },
      envelope_performance: envelopePerformance,
      period_summary: {
        total_envelopes: envelopes?.length || 0,
        envelopes_with_targets: envelopes?.filter(e => e.target_amount && e.target_amount > 0).length || 0,
        over_budget_count: envelopePerformance.filter(e => e.over_budget).length,
        under_target_count: envelopePerformance.filter(e => e.under_target).length
      },
      date_range: { start, end }
    }
  }
}

console.log("Reports function started")

serve(async (req) => {
  const startTime = Date.now()
  const method = req.method
  const url = new URL(req.url)
  const path = url.pathname
  
  console.log(`[REPORTS REQUEST] ${method} ${path}`)

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    console.log(`[REPORTS CORS] Preflight request handled for ${path}`)
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // All report endpoints require authentication
    const user = await validateTokenAndGetUser(supabase, req.headers.get('authorization'))
    
    // Create authenticated Supabase client with the user's JWT token
    const authToken = req.headers.get('authorization')?.replace('Bearer ', '') || ''
    const authenticatedSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      }
    )

    const urlParams = new URLSearchParams(url.search)
    const budgetId = urlParams.get('budget_id')
    
    if (!budgetId) {
      return createErrorResponse('budget_id parameter is required', 'MISSING_BUDGET_ID', 400)
    }

    // Route handling
    if ((path === '/reports/transactions' || path === '/transactions') && method === 'GET') {
      try {
        console.log(`[REPORTS] Generating transaction report for budget: ${budgetId}, user: ${user.email}`)
        
        const options = {
          start_date: urlParams.get('start_date') || undefined,
          end_date: urlParams.get('end_date') || undefined,
          transaction_type: urlParams.get('transaction_type') || undefined,
          envelope_id: urlParams.get('envelope_id') || undefined,
          payee_id: urlParams.get('payee_id') || undefined,
          limit: urlParams.get('limit') || '100',
          offset: urlParams.get('offset') || '0'
        }

        const data = await ReportQueries.getTransactionReport(authenticatedSupabase, budgetId, options)
        return createSuccessResponse({ success: true, data })

      } catch (error: any) {
        console.error('[REPORTS ERROR] Transaction report failed:', error)
        return createErrorResponse(error.message, 'TRANSACTION_REPORT_FAILED', 500)
      }
    }

    else if ((path === '/reports/category-trends' || path === '/category-trends') && method === 'GET') {
      try {
        console.log(`[REPORTS] Generating category trends for budget: ${budgetId}, user: ${user.email}`)
        
        const options = {
          start_date: urlParams.get('start_date') || undefined,
          end_date: urlParams.get('end_date') || undefined,
          group_by: urlParams.get('group_by') || 'month'
        }

        const data = await ReportQueries.getCategorySpendingTrends(authenticatedSupabase, budgetId, options)
        return createSuccessResponse({ success: true, data })

      } catch (error: any) {
        console.error('[REPORTS ERROR] Category trends report failed:', error)
        return createErrorResponse(error.message, 'CATEGORY_TRENDS_FAILED', 500)
      }
    }

    else if ((path === '/reports/income-expense' || path === '/income-expense') && method === 'GET') {
      try {
        console.log(`[REPORTS] Generating income/expense report for budget: ${budgetId}, user: ${user.email}`)
        
        const options = {
          start_date: urlParams.get('start_date') || undefined,
          end_date: urlParams.get('end_date') || undefined,
          group_by: urlParams.get('group_by') || 'month'
        }

        const data = await ReportQueries.getIncomeExpenseReport(authenticatedSupabase, budgetId, options)
        return createSuccessResponse({ success: true, data })

      } catch (error: any) {
        console.error('[REPORTS ERROR] Income/expense report failed:', error)
        return createErrorResponse(error.message, 'INCOME_EXPENSE_FAILED', 500)
      }
    }

    else if ((path === '/reports/envelope-history' || path === '/envelope-history') && method === 'GET') {
      try {
        console.log(`[REPORTS] Generating envelope history for budget: ${budgetId}, user: ${user.email}`)
        
        const options = {
          start_date: urlParams.get('start_date') || undefined,
          end_date: urlParams.get('end_date') || undefined,
          envelope_id: urlParams.get('envelope_id') || undefined
        }

        const data = await ReportQueries.getEnvelopeBalanceHistory(authenticatedSupabase, budgetId, options)
        return createSuccessResponse({ success: true, data })

      } catch (error: any) {
        console.error('[REPORTS ERROR] Envelope history report failed:', error)
        return createErrorResponse(error.message, 'ENVELOPE_HISTORY_FAILED', 500)
      }
    }

    else if ((path === '/reports/budget-performance' || path === '/budget-performance') && method === 'GET') {
      try {
        console.log(`[REPORTS] Generating budget performance report for budget: ${budgetId}, user: ${user.email}`)
        
        const options = {
          start_date: urlParams.get('start_date') || undefined,
          end_date: urlParams.get('end_date') || undefined
        }

        const data = await ReportQueries.getBudgetPerformanceReport(authenticatedSupabase, budgetId, options)
        return createSuccessResponse({ success: true, data })

      } catch (error: any) {
        console.error('[REPORTS ERROR] Budget performance report failed:', error)
        return createErrorResponse(error.message, 'BUDGET_PERFORMANCE_FAILED', 500)
      }
    }

    // Handle unsupported routes
    console.log(`[REPORTS ERROR] Route not found: ${method} ${path}`)
    return createErrorResponse(
      `Route not found: ${method} ${path}`,
      'ROUTE_NOT_FOUND',
      404,
      {
        available_routes: [
          'GET /reports/transactions?budget_id={id} - Transaction history report',
          'GET /reports/category-trends?budget_id={id} - Category spending trends',
          'GET /reports/income-expense?budget_id={id} - Income vs expense analysis',
          'GET /reports/envelope-history?budget_id={id} - Envelope balance history',
          'GET /reports/budget-performance?budget_id={id} - Budget performance summary'
        ]
      }
    )

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[REPORTS FATAL ERROR] Request failed after ${duration}ms:`, error)
    
    return createErrorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500,
      {
        timestamp: new Date().toISOString(),
        request: `${method} ${path}`,
        duration: `${duration}ms`
      }
    )
  } finally {
    const duration = Date.now() - startTime
    console.log(`[REPORTS REQUEST COMPLETE] ${method} ${path} - ${duration}ms`)
  }
})