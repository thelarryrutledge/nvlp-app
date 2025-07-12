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
  
  console.error(`[EXPORT ERROR] ${code}: ${error}`, details ? details : '')
  
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

// Helper function for CSV response
function createCsvResponse(data: string, filename: string) {
  return new Response(
    data,
    { 
      status: 200, 
      headers: { 
        ...corsHeaders, 
        ...securityHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      } 
    }
  )
}

// Helper function for JSON response
function createJsonResponse(data: any, filename: string) {
  return new Response(
    JSON.stringify(data, null, 2),
    { 
      status: 200, 
      headers: { 
        ...corsHeaders, 
        ...securityHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
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

// Helper function to convert array of objects to CSV
function arrayToCsv(data: any[], headers?: string[]): string {
  if (!data || data.length === 0) {
    return ''
  }
  
  const csvHeaders = headers || Object.keys(data[0])
  const csvRows = data.map(row => 
    csvHeaders.map(header => {
      const value = row[header]
      if (value === null || value === undefined) {
        return ''
      }
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }).join(',')
  )
  
  return [csvHeaders.join(','), ...csvRows].join('\n')
}

// Helper function to parse date range parameters
function parseDateRange(startDate?: string, endDate?: string) {
  const end = endDate ? new Date(endDate) : new Date()
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000) // Default to 1 year ago
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}

// Export query functions
const ExportQueries = {
  // Export transactions
  async exportTransactions(supabase: any, budgetId: string, options: any = {}) {
    const { start, end } = parseDateRange(options.start_date, options.end_date)
    
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
        from_envelope:envelopes!from_envelope_id(name),
        to_envelope:envelopes!to_envelope_id(name),
        payee:payees!payee_id(name),
        income_source:income_sources!income_source_id(name),
        created_at,
        updated_at
      `)
      .eq('budget_id', budgetId)
      .eq('is_deleted', false)
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .order('transaction_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (options.transaction_type) {
      query = query.eq('transaction_type', options.transaction_type)
    }

    const { data, error } = await query
    if (error) throw error

    // Flatten the data for export
    return data?.map(txn => ({
      id: txn.id,
      type: txn.transaction_type,
      amount: txn.amount,
      description: txn.description,
      date: txn.transaction_date,
      reference_number: txn.reference_number,
      notes: txn.notes,
      is_cleared: txn.is_cleared,
      is_reconciled: txn.is_reconciled,
      from_envelope: txn.from_envelope?.name || '',
      to_envelope: txn.to_envelope?.name || '',
      payee: txn.payee?.name || '',
      income_source: txn.income_source?.name || '',
      created_at: txn.created_at,
      updated_at: txn.updated_at
    })) || []
  },

  // Export budget data (complete budget snapshot)
  async exportBudgetData(supabase: any, budgetId: string) {
    // Get budget info
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select(`
        id,
        name,
        description,
        is_default,
        created_at,
        updated_at,
        user_state!inner(available_amount)
      `)
      .eq('id', budgetId)
      .single()

    if (budgetError) throw budgetError

    // Get categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('budget_id', budgetId)
      .order('name')

    if (categoriesError) throw categoriesError

    // Get envelopes
    const { data: envelopes, error: envelopesError } = await supabase
      .from('envelopes')
      .select(`
        *,
        categories!category_id(name)
      `)
      .eq('budget_id', budgetId)
      .order('name')

    if (envelopesError) throw envelopesError

    // Get payees
    const { data: payees, error: payeesError } = await supabase
      .from('payees')
      .select('*')
      .eq('budget_id', budgetId)
      .order('name')

    if (payeesError) throw payeesError

    // Get income sources
    const { data: incomeSources, error: incomeSourcesError } = await supabase
      .from('income_sources')
      .select('*')
      .eq('budget_id', budgetId)
      .order('name')

    if (incomeSourcesError) throw incomeSourcesError

    return {
      budget: {
        ...budget,
        available_amount: budget.user_state[0]?.available_amount || 0
      },
      categories: categories || [],
      envelopes: envelopes?.map(env => ({
        ...env,
        category_name: env.categories?.name || null
      })) || [],
      payees: payees || [],
      income_sources: incomeSources || []
    }
  },

  // Export envelopes
  async exportEnvelopes(supabase: any, budgetId: string) {
    const { data, error } = await supabase
      .from('envelopes')
      .select(`
        id,
        name,
        description,
        current_balance,
        notify_above_amount,
        is_active,
        created_at,
        updated_at,
        categories!category_id(name)
      `)
      .eq('budget_id', budgetId)
      .order('name')

    if (error) throw error

    return data?.map(env => ({
      id: env.id,
      name: env.name,
      description: env.description,
      current_balance: env.current_balance,
      notify_above_amount: env.notify_above_amount,
      is_active: env.is_active,
      category: env.categories?.name || '',
      created_at: env.created_at,
      updated_at: env.updated_at
    })) || []
  },

  // Export payees
  async exportPayees(supabase: any, budgetId: string) {
    const { data, error } = await supabase
      .from('payees')
      .select('*')
      .eq('budget_id', budgetId)
      .order('name')

    if (error) throw error

    return data || []
  },

  // Export categories
  async exportCategories(supabase: any, budgetId: string) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('budget_id', budgetId)
      .order('name')

    if (error) throw error

    return data || []
  },

  // Export income sources
  async exportIncomeSources(supabase: any, budgetId: string) {
    const { data, error } = await supabase
      .from('income_sources')
      .select('*')
      .eq('budget_id', budgetId)
      .order('name')

    if (error) throw error

    return data || []
  }
}

console.log("Export function started")

serve(async (req) => {
  const startTime = Date.now()
  const method = req.method
  const url = new URL(req.url)
  const path = url.pathname
  
  console.log(`[EXPORT REQUEST] ${method} ${path}`)

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    console.log(`[EXPORT CORS] Preflight request handled for ${path}`)
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // All export endpoints require authentication
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
    const format = urlParams.get('format') || 'csv' // csv or json
    
    if (!budgetId) {
      return createErrorResponse('budget_id parameter is required', 'MISSING_BUDGET_ID', 400)
    }

    // Get budget name for filename
    const { data: budgetInfo, error: budgetError } = await authenticatedSupabase
      .from('budgets')
      .select('name')
      .eq('id', budgetId)
      .single()

    if (budgetError) {
      return createErrorResponse('Budget not found or access denied', 'BUDGET_NOT_FOUND', 404)
    }

    const budgetName = budgetInfo.name.replace(/[^a-zA-Z0-9]/g, '_')
    const timestamp = new Date().toISOString().split('T')[0]

    // Route handling
    if ((path === '/export/transactions' || path === '/transactions') && method === 'GET') {
      try {
        console.log(`[EXPORT] Exporting transactions for budget: ${budgetId}, user: ${user.email}`)
        
        const options = {
          start_date: urlParams.get('start_date') || undefined,
          end_date: urlParams.get('end_date') || undefined,
          transaction_type: urlParams.get('transaction_type') || undefined
        }

        const data = await ExportQueries.exportTransactions(authenticatedSupabase, budgetId, options)
        const filename = `${budgetName}_transactions_${timestamp}.${format}`

        if (format === 'json') {
          return createJsonResponse(data, filename)
        } else {
          const csvData = arrayToCsv(data)
          return createCsvResponse(csvData, filename)
        }

      } catch (error: any) {
        console.error('[EXPORT ERROR] Transaction export failed:', error)
        return createErrorResponse(error.message, 'TRANSACTION_EXPORT_FAILED', 500)
      }
    }

    else if ((path === '/export/budget' || path === '/budget') && method === 'GET') {
      try {
        console.log(`[EXPORT] Exporting complete budget for: ${budgetId}, user: ${user.email}`)
        
        const data = await ExportQueries.exportBudgetData(authenticatedSupabase, budgetId)
        const filename = `${budgetName}_complete_budget_${timestamp}.${format}`

        if (format === 'json') {
          return createJsonResponse(data, filename)
        } else {
          // For CSV, export each section separately and combine
          const sections = [
            { name: 'Budget Info', data: [data.budget] },
            { name: 'Categories', data: data.categories },
            { name: 'Envelopes', data: data.envelopes },
            { name: 'Payees', data: data.payees },
            { name: 'Income Sources', data: data.income_sources }
          ]

          const csvSections = sections.map(section => {
            if (section.data.length === 0) return `${section.name}:\n(No data)\n`
            return `${section.name}:\n${arrayToCsv(section.data)}\n`
          })

          const csvData = csvSections.join('\n')
          return createCsvResponse(csvData, filename)
        }

      } catch (error: any) {
        console.error('[EXPORT ERROR] Budget export failed:', error)
        return createErrorResponse(error.message, 'BUDGET_EXPORT_FAILED', 500)
      }
    }

    else if ((path === '/export/envelopes' || path === '/envelopes') && method === 'GET') {
      try {
        console.log(`[EXPORT] Exporting envelopes for budget: ${budgetId}, user: ${user.email}`)
        
        const data = await ExportQueries.exportEnvelopes(authenticatedSupabase, budgetId)
        const filename = `${budgetName}_envelopes_${timestamp}.${format}`

        if (format === 'json') {
          return createJsonResponse(data, filename)
        } else {
          const csvData = arrayToCsv(data)
          return createCsvResponse(csvData, filename)
        }

      } catch (error: any) {
        console.error('[EXPORT ERROR] Envelope export failed:', error)
        return createErrorResponse(error.message, 'ENVELOPE_EXPORT_FAILED', 500)
      }
    }

    else if ((path === '/export/payees' || path === '/payees') && method === 'GET') {
      try {
        console.log(`[EXPORT] Exporting payees for budget: ${budgetId}, user: ${user.email}`)
        
        const data = await ExportQueries.exportPayees(authenticatedSupabase, budgetId)
        const filename = `${budgetName}_payees_${timestamp}.${format}`

        if (format === 'json') {
          return createJsonResponse(data, filename)
        } else {
          const csvData = arrayToCsv(data)
          return createCsvResponse(csvData, filename)
        }

      } catch (error: any) {
        console.error('[EXPORT ERROR] Payee export failed:', error)
        return createErrorResponse(error.message, 'PAYEE_EXPORT_FAILED', 500)
      }
    }

    else if ((path === '/export/categories' || path === '/categories') && method === 'GET') {
      try {
        console.log(`[EXPORT] Exporting categories for budget: ${budgetId}, user: ${user.email}`)
        
        const data = await ExportQueries.exportCategories(authenticatedSupabase, budgetId)
        const filename = `${budgetName}_categories_${timestamp}.${format}`

        if (format === 'json') {
          return createJsonResponse(data, filename)
        } else {
          const csvData = arrayToCsv(data)
          return createCsvResponse(csvData, filename)
        }

      } catch (error: any) {
        console.error('[EXPORT ERROR] Category export failed:', error)
        return createErrorResponse(error.message, 'CATEGORY_EXPORT_FAILED', 500)
      }
    }

    else if ((path === '/export/income-sources' || path === '/income-sources') && method === 'GET') {
      try {
        console.log(`[EXPORT] Exporting income sources for budget: ${budgetId}, user: ${user.email}`)
        
        const data = await ExportQueries.exportIncomeSources(authenticatedSupabase, budgetId)
        const filename = `${budgetName}_income_sources_${timestamp}.${format}`

        if (format === 'json') {
          return createJsonResponse(data, filename)
        } else {
          const csvData = arrayToCsv(data)
          return createCsvResponse(csvData, filename)
        }

      } catch (error: any) {
        console.error('[EXPORT ERROR] Income source export failed:', error)
        return createErrorResponse(error.message, 'INCOME_SOURCE_EXPORT_FAILED', 500)
      }
    }

    // Handle unsupported routes
    console.log(`[EXPORT ERROR] Route not found: ${method} ${path}`)
    return createErrorResponse(
      `Route not found: ${method} ${path}`,
      'ROUTE_NOT_FOUND',
      404,
      {
        available_routes: [
          'GET /export/transactions?budget_id={id}&format={csv|json} - Export transactions',
          'GET /export/budget?budget_id={id}&format={csv|json} - Export complete budget',
          'GET /export/envelopes?budget_id={id}&format={csv|json} - Export envelopes',
          'GET /export/payees?budget_id={id}&format={csv|json} - Export payees',
          'GET /export/categories?budget_id={id}&format={csv|json} - Export categories',
          'GET /export/income-sources?budget_id={id}&format={csv|json} - Export income sources'
        ]
      }
    )

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[EXPORT FATAL ERROR] Request failed after ${duration}ms:`, error)
    
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
    console.log(`[EXPORT REQUEST COMPLETE] ${method} ${path} - ${duration}ms`)
  }
})