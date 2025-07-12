import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import cache, { withCache, cleanupCache } from "../_shared/cache.ts"

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
  
  console.error(`[DASHBOARD ERROR] ${code}: ${error}`, details ? details : '')
  
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
function createSuccessResponse(data: any, status: number = 200, cacheInfo?: { hit: boolean; ttl?: number }) {
  const headers = { 
    ...corsHeaders, 
    ...securityHeaders,
    'Content-Type': 'application/json'
  }
  
  // Add cache headers if cache info is provided
  if (cacheInfo) {
    headers['X-Cache'] = cacheInfo.hit ? 'HIT' : 'MISS'
    if (cacheInfo.ttl) {
      headers['Cache-Control'] = `private, max-age=${cacheInfo.ttl}`
    }
  }
  
  return new Response(
    JSON.stringify(data),
    { status, headers }
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

// Dashboard data aggregation functions
const DashboardQueries = {
  // Get budget overview with available amount and totals
  async getBudgetOverview(supabase: any, budgetId: string) {
    // Get budget with user state (available amount)
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

    // Get envelope totals
    const { data: envelopeData, error: envelopeError } = await supabase
      .from('envelopes')
      .select('current_balance')
      .eq('budget_id', budgetId)
      .eq('is_active', true)

    if (envelopeError) throw envelopeError

    const totalAllocated = envelopeData?.reduce((sum, env) => sum + (env.current_balance || 0), 0) || 0
    const availableAmount = budgetData.user_state[0]?.available_amount || 0

    return {
      budget: {
        id: budgetData.id,
        name: budgetData.name,
        description: budgetData.description
      },
      available_amount: availableAmount,
      total_allocated: totalAllocated,
      total_budget: availableAmount + totalAllocated
    }
  },

  // Get envelope balances summary
  async getEnvelopesSummary(supabase: any, budgetId: string) {
    const { data, error } = await supabase
      .from('envelopes')
      .select(`
        id, 
        name, 
        current_balance, 
        category_id,
        categories!category_id(name)
      `)
      .eq('budget_id', budgetId)
      .eq('is_active', true)
      .order('current_balance', { ascending: false })

    if (error) throw error

    return data?.map(env => ({
      id: env.id,
      name: env.name,
      balance: env.current_balance,
      category: env.categories?.name || null
    })) || []
  },

  // Get recent transactions
  async getRecentTransactions(supabase: any, budgetId: string, limit: number = 10) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id,
        transaction_type,
        amount,
        description,
        transaction_date,
        from_envelope:envelopes!from_envelope_id(name),
        to_envelope:envelopes!to_envelope_id(name),
        payee:payees!payee_id(name),
        income_source:income_sources!income_source_id(name)
      `)
      .eq('budget_id', budgetId)
      .eq('is_deleted', false)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data?.map(txn => ({
      id: txn.id,
      type: txn.transaction_type,
      amount: txn.amount,
      description: txn.description,
      date: txn.transaction_date,
      from_envelope: txn.from_envelope?.name || null,
      to_envelope: txn.to_envelope?.name || null,
      payee: txn.payee?.name || null,
      income_source: txn.income_source?.name || null
    })) || []
  },

  // Get spending by category (last 30 days)
  async getSpendingByCategory(supabase: any, budgetId: string, days: number = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        amount,
        envelopes!from_envelope_id(
          category_id,
          categories!category_id(id, name)
        )
      `)
      .eq('budget_id', budgetId)
      .in('transaction_type', ['expense', 'debt_payment'])
      .gte('transaction_date', cutoffDate.toISOString().split('T')[0])
      .eq('is_deleted', false)

    if (error) throw error

    // Group by category
    const categorySpending: Record<string, { name: string; amount: number }> = {}
    
    data?.forEach(txn => {
      const categoryName = txn.envelopes?.categories?.name || 'Uncategorized'
      const categoryId = txn.envelopes?.categories?.id || 'uncategorized'
      
      if (!categorySpending[categoryId]) {
        categorySpending[categoryId] = { name: categoryName, amount: 0 }
      }
      categorySpending[categoryId].amount += txn.amount
    })

    return Object.entries(categorySpending)
      .map(([id, data]) => ({ category_id: id, category_name: data.name, amount: data.amount }))
      .sort((a, b) => b.amount - a.amount)
  },

  // Get income vs expenses summary (last 30 days)
  async getIncomeVsExpenses(supabase: any, budgetId: string, days: number = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_type, amount')
      .eq('budget_id', budgetId)
      .gte('transaction_date', cutoffDate.toISOString().split('T')[0])
      .eq('is_deleted', false)

    if (error) throw error

    let totalIncome = 0
    let totalExpenses = 0
    let totalDebtPayments = 0

    data?.forEach(txn => {
      switch (txn.transaction_type) {
        case 'income':
          totalIncome += txn.amount
          break
        case 'expense':
          totalExpenses += txn.amount
          break
        case 'debt_payment':
          totalDebtPayments += txn.amount
          break
      }
    })

    return {
      period_days: days,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      total_debt_payments: totalDebtPayments,
      net_flow: totalIncome - totalExpenses - totalDebtPayments
    }
  }
}

console.log("Dashboard function started")

// Clean up expired cache entries periodically
setInterval(() => {
  cleanupCache()
}, 300000) // Every 5 minutes

serve(async (req) => {
  const startTime = Date.now()
  const method = req.method
  const url = new URL(req.url)
  const path = url.pathname
  
  console.log(`[DASHBOARD REQUEST] ${method} ${path}`)

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    console.log(`[DASHBOARD CORS] Preflight request handled for ${path}`)
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // All dashboard endpoints require authentication
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

    // Route handling
    if ((path === '/dashboard' || path === '/') && method === 'GET') {
      try {
        const urlParams = new URLSearchParams(url.search)
        const budgetId = urlParams.get('budget_id')
        const days = parseInt(urlParams.get('days') || '30')
        
        if (!budgetId) {
          return createErrorResponse('budget_id parameter is required', 'MISSING_BUDGET_ID', 400)
        }

        console.log(`[DASHBOARD] Generating dashboard for budget: ${budgetId}, user: ${user.email}`)

        // Use cache for dashboard data (5 minutes TTL)
        const cacheKey = cache.createKey('dashboard', budgetId, days.toString())
        
        const dashboardData = await withCache(
          cacheKey,
          async () => {
            // Fetch all dashboard data in parallel
            const [
              budgetOverview,
              envelopesSummary,
              recentTransactions,
              spendingByCategory,
              incomeVsExpenses
            ] = await Promise.all([
              DashboardQueries.getBudgetOverview(authenticatedSupabase, budgetId),
              DashboardQueries.getEnvelopesSummary(authenticatedSupabase, budgetId),
              DashboardQueries.getRecentTransactions(authenticatedSupabase, budgetId, 10),
              DashboardQueries.getSpendingByCategory(authenticatedSupabase, budgetId, days),
              DashboardQueries.getIncomeVsExpenses(authenticatedSupabase, budgetId, days)
            ])

            return {
              budget_overview: budgetOverview,
              envelopes_summary: envelopesSummary,
              recent_transactions: recentTransactions,
              spending_by_category: spendingByCategory,
              income_vs_expenses: incomeVsExpenses,
              generated_at: new Date().toISOString()
            }
          },
          300 // 5 minutes cache
        )

        console.log(`[DASHBOARD SUCCESS] Dashboard generated for user: ${user.email}`)

        return createSuccessResponse({
          success: true,
          data: dashboardData
        })

      } catch (queryError: any) {
        console.error('[DASHBOARD ERROR] Failed to generate dashboard:', queryError)
        return createErrorResponse(
          queryError.message || 'Failed to generate dashboard data',
          'DASHBOARD_FAILED',
          500
        )
      }
    }

    // Handle individual dashboard components
    else if (path === '/dashboard/budget-overview' && method === 'GET') {
      try {
        const urlParams = new URLSearchParams(url.search)
        const budgetId = urlParams.get('budget_id')
        
        if (!budgetId) {
          return createErrorResponse('budget_id parameter is required', 'MISSING_BUDGET_ID', 400)
        }

        const data = await withCache(
          cache.createKey('budget-overview', budgetId),
          () => DashboardQueries.getBudgetOverview(authenticatedSupabase, budgetId),
          180 // 3 minutes cache
        )
        return createSuccessResponse({ success: true, data })

      } catch (error: any) {
        console.error('[DASHBOARD ERROR] Budget overview failed:', error)
        return createErrorResponse(error.message, 'BUDGET_OVERVIEW_FAILED', 500)
      }
    }

    else if (path === '/dashboard/envelopes-summary' && method === 'GET') {
      try {
        const urlParams = new URLSearchParams(url.search)
        const budgetId = urlParams.get('budget_id')
        
        if (!budgetId) {
          return createErrorResponse('budget_id parameter is required', 'MISSING_BUDGET_ID', 400)
        }

        const data = await withCache(
          cache.createKey('envelopes-summary', budgetId),
          () => DashboardQueries.getEnvelopesSummary(authenticatedSupabase, budgetId),
          120 // 2 minutes cache
        )
        return createSuccessResponse({ success: true, data })

      } catch (error: any) {
        console.error('[DASHBOARD ERROR] Envelopes summary failed:', error)
        return createErrorResponse(error.message, 'ENVELOPES_SUMMARY_FAILED', 500)
      }
    }

    // Handle unsupported routes
    console.log(`[DASHBOARD ERROR] Route not found: ${method} ${path}`)
    return createErrorResponse(
      `Route not found: ${method} ${path}`,
      'ROUTE_NOT_FOUND',
      404,
      {
        available_routes: [
          'GET /dashboard?budget_id={id}&days={days} - Complete dashboard data',
          'GET /dashboard/budget-overview?budget_id={id} - Budget overview only',
          'GET /dashboard/envelopes-summary?budget_id={id} - Envelopes summary only'
        ]
      }
    )

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[DASHBOARD FATAL ERROR] Request failed after ${duration}ms:`, error)
    
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
    console.log(`[DASHBOARD REQUEST COMPLETE] ${method} ${path} - ${duration}ms`)
  }
})