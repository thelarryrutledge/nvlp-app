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
  
  console.error(`[AUDIT ERROR] ${code}: ${error}`, details ? details : '')
  
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
  
  // Ensure we include the full end date
  const endPlusOne = new Date(end)
  endPlusOne.setDate(endPlusOne.getDate() + 1)
  
  return {
    start: start.toISOString(),
    end: endPlusOne.toISOString()
  }
}

// Helper function to get user email
async function getUserEmail(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('id', userId)
    .single()
  
  if (error || !data) {
    // Fallback to auth.users if profile doesn't exist
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
    if (authError || !authUser) return 'Unknown'
    return authUser.user?.email || 'Unknown'
  }
  
  return data.email || 'Unknown'
}

// Audit query functions
const AuditQueries = {
  // Get transaction audit trail
  async getTransactionAudit(supabase: any, budgetId: string, options: any = {}) {
    const { start, end } = parseDateRange(options.start_date, options.end_date, 90)
    const limit = Math.min(parseInt(options.limit || '100'), 500)
    const offset = parseInt(options.offset || '0')
    
    let query = supabase
      .from('transaction_events')
      .select(`
        id,
        transaction_id,
        event_type,
        event_description,
        changes_made,
        performed_at,
        performed_by,
        transactions!inner(
          budget_id,
          transaction_type,
          amount,
          description,
          transaction_date
        )
      `)
      .eq('transactions.budget_id', budgetId)
      .gte('performed_at', start)
      .lte('performed_at', end)
      .order('performed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (options.event_type) {
      query = query.eq('event_type', options.event_type)
    }
    
    if (options.transaction_id) {
      query = query.eq('transaction_id', options.transaction_id)
    }
    
    if (options.user_id) {
      query = query.eq('performed_by', options.user_id)
    }

    const { data, error } = await query

    if (error) throw error

    // Get user emails for all unique user IDs
    const userIds = [...new Set(data?.map(event => event.performed_by) || [])]
    const userEmails: Record<string, string> = {}
    
    for (const userId of userIds) {
      if (userId) {
        userEmails[userId] = await getUserEmail(supabase, userId)
      }
    }

    return {
      events: data?.map(event => ({
        id: event.id,
        transaction_id: event.transaction_id,
        event_type: event.event_type,
        event_description: event.event_description,
        event_data: event.changes_made,
        created_at: event.performed_at,
        created_by: userEmails[event.performed_by] || 'Unknown',
        transaction: {
          type: event.transactions.transaction_type,
          amount: event.transactions.amount,
          description: event.transactions.description,
          date: event.transactions.transaction_date
        }
      })) || [],
      pagination: {
        limit,
        offset,
        count: data?.length || 0
      },
      date_range: { 
        start: new Date(start).toISOString().split('T')[0], 
        end: new Date(end).toISOString().split('T')[0] 
      }
    }
  },

  // Get audit summary by event type
  async getAuditSummary(supabase: any, budgetId: string, options: any = {}) {
    const { start, end } = parseDateRange(options.start_date, options.end_date, 30)
    
    const { data, error } = await supabase
      .from('transaction_events')
      .select(`
        event_type,
        performed_at,
        transactions!inner(budget_id)
      `)
      .eq('transactions.budget_id', budgetId)
      .gte('performed_at', start)
      .lte('performed_at', end)

    if (error) throw error

    // Group by event type
    const summary: Record<string, number> = {}
    data?.forEach(event => {
      summary[event.event_type] = (summary[event.event_type] || 0) + 1
    })

    return {
      summary: Object.entries(summary).map(([type, count]) => ({
        event_type: type,
        count
      })).sort((a, b) => b.count - a.count),
      total_events: data?.length || 0,
      date_range: { 
        start: new Date(start).toISOString().split('T')[0], 
        end: new Date(end).toISOString().split('T')[0] 
      }
    }
  },

  // Get user activity audit
  async getUserActivity(supabase: any, budgetId: string, options: any = {}) {
    const { start, end } = parseDateRange(options.start_date, options.end_date, 30)
    const limit = Math.min(parseInt(options.limit || '50'), 200)
    
    // Get all events for the budget
    const { data, error } = await supabase
      .from('transaction_events')
      .select(`
        performed_by,
        event_type,
        performed_at,
        transactions!inner(budget_id)
      `)
      .eq('transactions.budget_id', budgetId)
      .gte('performed_at', start)
      .lte('performed_at', end)
      .order('performed_at', { ascending: false })

    if (error) throw error

    // Get unique user IDs
    const userIds = [...new Set(data?.map(event => event.performed_by).filter(id => id) || [])]
    const userEmails: Record<string, string> = {}
    
    for (const userId of userIds) {
      userEmails[userId] = await getUserEmail(supabase, userId)
    }

    // Group by user
    const userActivity: Record<string, { email: string; events: Record<string, number>; total: number; last_activity: string }> = {}
    
    data?.forEach(event => {
      const userId = event.performed_by
      if (!userId) return
      
      const email = userEmails[userId] || 'Unknown'
      
      if (!userActivity[userId]) {
        userActivity[userId] = {
          email,
          events: {},
          total: 0,
          last_activity: event.performed_at
        }
      }
      
      userActivity[userId].events[event.event_type] = (userActivity[userId].events[event.event_type] || 0) + 1
      userActivity[userId].total += 1
      
      // Update last activity if this event is more recent
      if (event.performed_at > userActivity[userId].last_activity) {
        userActivity[userId].last_activity = event.performed_at
      }
    })

    // Convert to array and sort by total events
    const users = Object.entries(userActivity)
      .map(([user_id, data]) => ({
        user_id,
        email: data.email,
        total_events: data.total,
        events_by_type: data.events,
        last_activity: data.last_activity
      }))
      .sort((a, b) => b.total_events - a.total_events)
      .slice(0, limit)

    return {
      users,
      date_range: { 
        start: new Date(start).toISOString().split('T')[0], 
        end: new Date(end).toISOString().split('T')[0] 
      }
    }
  },

  // Get specific transaction history
  async getTransactionHistory(supabase: any, budgetId: string, transactionId: string) {
    // First verify the transaction belongs to this budget
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .select('id, budget_id, transaction_type, amount, description')
      .eq('id', transactionId)
      .eq('budget_id', budgetId)
      .single()

    if (txnError || !transaction) {
      throw new Error('Transaction not found or access denied')
    }

    // Get all events for this transaction
    const { data: events, error: eventsError } = await supabase
      .from('transaction_events')
      .select(`
        id,
        event_type,
        event_description,
        changes_made,
        performed_at,
        performed_by
      `)
      .eq('transaction_id', transactionId)
      .order('performed_at', { ascending: true })

    if (eventsError) throw eventsError

    // Get user emails
    const userIds = [...new Set(events?.map(event => event.performed_by).filter(id => id) || [])]
    const userEmails: Record<string, string> = {}
    
    for (const userId of userIds) {
      userEmails[userId] = await getUserEmail(supabase, userId)
    }

    return {
      transaction: {
        id: transaction.id,
        type: transaction.transaction_type,
        amount: transaction.amount,
        description: transaction.description
      },
      history: events?.map(event => ({
        id: event.id,
        event_type: event.event_type,
        event_description: event.event_description,
        event_data: event.changes_made,
        created_at: event.performed_at,
        created_by: userEmails[event.performed_by] || 'Unknown'
      })) || [],
      total_events: events?.length || 0
    }
  },

  // Get recent audit events (real-time monitoring)
  async getRecentEvents(supabase: any, budgetId: string, options: any = {}) {
    const limit = Math.min(parseInt(options.limit || '20'), 100)
    const minutes = Math.min(parseInt(options.minutes || '60'), 1440) // Max 24 hours
    
    const cutoffTime = new Date()
    cutoffTime.setMinutes(cutoffTime.getMinutes() - minutes)
    
    const { data, error } = await supabase
      .from('transaction_events')
      .select(`
        id,
        transaction_id,
        event_type,
        event_description,
        changes_made,
        performed_at,
        performed_by,
        transactions!inner(
          budget_id,
          transaction_type,
          amount,
          description
        )
      `)
      .eq('transactions.budget_id', budgetId)
      .gte('performed_at', cutoffTime.toISOString())
      .order('performed_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Get user emails
    const userIds = [...new Set(data?.map(event => event.performed_by).filter(id => id) || [])]
    const userEmails: Record<string, string> = {}
    
    for (const userId of userIds) {
      userEmails[userId] = await getUserEmail(supabase, userId)
    }

    return {
      events: data?.map(event => ({
        id: event.id,
        transaction_id: event.transaction_id,
        event_type: event.event_type,
        event_description: event.event_description,
        event_data: event.changes_made,
        created_at: event.performed_at,
        created_by: userEmails[event.performed_by] || 'Unknown',
        transaction: {
          type: event.transactions.transaction_type,
          amount: event.transactions.amount,
          description: event.transactions.description
        },
        minutes_ago: Math.floor((new Date().getTime() - new Date(event.performed_at).getTime()) / 60000)
      })) || [],
      time_window: {
        minutes,
        from: cutoffTime.toISOString(),
        to: new Date().toISOString()
      }
    }
  }
}

console.log("Audit function started")

serve(async (req) => {
  const startTime = Date.now()
  const method = req.method
  const url = new URL(req.url)
  const path = url.pathname
  
  console.log(`[AUDIT REQUEST] ${method} ${path}`)

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    console.log(`[AUDIT CORS] Preflight request handled for ${path}`)
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // All audit endpoints require authentication
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
    if ((path === '/audit/events' || path === '/events') && method === 'GET') {
      try {
        console.log(`[AUDIT] Getting audit events for budget: ${budgetId}, user: ${user.email}`)
        
        const options = {
          start_date: urlParams.get('start_date') || undefined,
          end_date: urlParams.get('end_date') || undefined,
          event_type: urlParams.get('event_type') || undefined,
          transaction_id: urlParams.get('transaction_id') || undefined,
          user_id: urlParams.get('user_id') || undefined,
          limit: urlParams.get('limit') || '100',
          offset: urlParams.get('offset') || '0'
        }

        const data = await AuditQueries.getTransactionAudit(authenticatedSupabase, budgetId, options)
        return createSuccessResponse({ success: true, data })

      } catch (error: any) {
        console.error('[AUDIT ERROR] Events query failed:', error)
        return createErrorResponse(error.message, 'AUDIT_EVENTS_FAILED', 500)
      }
    }

    else if ((path === '/audit/summary' || path === '/summary') && method === 'GET') {
      try {
        console.log(`[AUDIT] Getting audit summary for budget: ${budgetId}, user: ${user.email}`)
        
        const options = {
          start_date: urlParams.get('start_date') || undefined,
          end_date: urlParams.get('end_date') || undefined
        }

        const data = await AuditQueries.getAuditSummary(authenticatedSupabase, budgetId, options)
        return createSuccessResponse({ success: true, data })

      } catch (error: any) {
        console.error('[AUDIT ERROR] Summary query failed:', error)
        return createErrorResponse(error.message, 'AUDIT_SUMMARY_FAILED', 500)
      }
    }

    else if ((path === '/audit/users' || path === '/users') && method === 'GET') {
      try {
        console.log(`[AUDIT] Getting user activity for budget: ${budgetId}, user: ${user.email}`)
        
        const options = {
          start_date: urlParams.get('start_date') || undefined,
          end_date: urlParams.get('end_date') || undefined,
          limit: urlParams.get('limit') || '50'
        }

        const data = await AuditQueries.getUserActivity(authenticatedSupabase, budgetId, options)
        return createSuccessResponse({ success: true, data })

      } catch (error: any) {
        console.error('[AUDIT ERROR] User activity query failed:', error)
        return createErrorResponse(error.message, 'USER_ACTIVITY_FAILED', 500)
      }
    }

    else if ((path === '/audit/transaction' || path === '/transaction') && method === 'GET') {
      try {
        const transactionId = urlParams.get('transaction_id')
        if (!transactionId) {
          return createErrorResponse('transaction_id parameter is required', 'MISSING_TRANSACTION_ID', 400)
        }

        console.log(`[AUDIT] Getting transaction history for: ${transactionId}, budget: ${budgetId}, user: ${user.email}`)
        
        const data = await AuditQueries.getTransactionHistory(authenticatedSupabase, budgetId, transactionId)
        return createSuccessResponse({ success: true, data })

      } catch (error: any) {
        console.error('[AUDIT ERROR] Transaction history failed:', error)
        return createErrorResponse(error.message, 'TRANSACTION_HISTORY_FAILED', 500)
      }
    }

    else if ((path === '/audit/recent' || path === '/recent') && method === 'GET') {
      try {
        console.log(`[AUDIT] Getting recent events for budget: ${budgetId}, user: ${user.email}`)
        
        const options = {
          limit: urlParams.get('limit') || '20',
          minutes: urlParams.get('minutes') || '60'
        }

        const data = await AuditQueries.getRecentEvents(authenticatedSupabase, budgetId, options)
        return createSuccessResponse({ success: true, data })

      } catch (error: any) {
        console.error('[AUDIT ERROR] Recent events query failed:', error)
        return createErrorResponse(error.message, 'RECENT_EVENTS_FAILED', 500)
      }
    }

    // Handle unsupported routes
    console.log(`[AUDIT ERROR] Route not found: ${method} ${path}`)
    return createErrorResponse(
      `Route not found: ${method} ${path}`,
      'ROUTE_NOT_FOUND',
      404,
      {
        available_routes: [
          'GET /audit/events?budget_id={id} - Get audit trail events',
          'GET /audit/summary?budget_id={id} - Get audit summary by event type',
          'GET /audit/users?budget_id={id} - Get user activity summary',
          'GET /audit/transaction?budget_id={id}&transaction_id={id} - Get specific transaction history',
          'GET /audit/recent?budget_id={id}&minutes={n} - Get recent events (real-time monitoring)'
        ]
      }
    )

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[AUDIT FATAL ERROR] Request failed after ${duration}ms:`, error)
    
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
    console.log(`[AUDIT REQUEST COMPLETE] ${method} ${path} - ${duration}ms`)
  }
})