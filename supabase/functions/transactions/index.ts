import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { invalidateBudgetCache } from "../_shared/cache.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
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
  
  console.error(`[TRANSACTIONS ERROR] ${code}: ${error}`, details ? details : '')
  
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

// Transaction validation functions
const TransactionValidations = {
  // Validate transaction type-specific requirements
  validateTransactionType(transactionType: string, data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    switch (transactionType) {
      case 'income':
        if (!data.income_source_id) errors.push('Income transactions require income_source_id')
        if (data.from_envelope_id) errors.push('Income transactions cannot have from_envelope_id')
        if (data.to_envelope_id) errors.push('Income transactions cannot have to_envelope_id')
        if (data.payee_id) errors.push('Income transactions cannot have payee_id')
        break
        
      case 'allocation':
        if (!data.to_envelope_id) errors.push('Allocation transactions require to_envelope_id')
        if (data.from_envelope_id) errors.push('Allocation transactions cannot have from_envelope_id')
        if (data.payee_id) errors.push('Allocation transactions cannot have payee_id')
        if (data.income_source_id) errors.push('Allocation transactions cannot have income_source_id')
        break
        
      case 'expense':
        if (!data.from_envelope_id) errors.push('Expense transactions require from_envelope_id')
        if (!data.payee_id) errors.push('Expense transactions require payee_id')
        if (data.to_envelope_id) errors.push('Expense transactions cannot have to_envelope_id')
        if (data.income_source_id) errors.push('Expense transactions cannot have income_source_id')
        break
        
      case 'transfer':
        if (!data.from_envelope_id) errors.push('Transfer transactions require from_envelope_id')
        if (!data.to_envelope_id) errors.push('Transfer transactions require to_envelope_id')
        if (data.from_envelope_id === data.to_envelope_id) errors.push('Transfer transactions cannot have same from and to envelope')
        if (data.payee_id) errors.push('Transfer transactions cannot have payee_id')
        if (data.income_source_id) errors.push('Transfer transactions cannot have income_source_id')
        break
        
      case 'debt_payment':
        if (!data.from_envelope_id) errors.push('Debt payment transactions require from_envelope_id')
        if (!data.payee_id) errors.push('Debt payment transactions require payee_id')
        if (data.to_envelope_id) errors.push('Debt payment transactions cannot have to_envelope_id')
        if (data.income_source_id) errors.push('Debt payment transactions cannot have income_source_id')
        break
        
      default:
        errors.push(`Invalid transaction type: ${transactionType}`)
    }
    
    return { valid: errors.length === 0, errors }
  },
  
  // Validate basic transaction data
  validateBasicData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!data.budget_id) errors.push('budget_id is required')
    if (!data.transaction_type) errors.push('transaction_type is required')
    if (!data.amount) errors.push('amount is required')
    // Description is optional
  // if (!data.description) errors.push('description is required')
    
    if (data.amount && (typeof data.amount !== 'number' || data.amount <= 0)) {
      errors.push('amount must be a positive number')
    }
    
    if (data.transaction_date) {
      const date = new Date(data.transaction_date)
      if (isNaN(date.getTime())) {
        errors.push('transaction_date must be a valid date')
      }
      if (date > new Date(Date.now() + 24 * 60 * 60 * 1000)) {
        errors.push('transaction_date cannot be more than 1 day in the future')
      }
    }
    
    return { valid: errors.length === 0, errors }
  },
  
  // Validate envelope ownership and budget consistency
  async validateResourceOwnership(supabase: any, userId: string, data: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []
    
    try {
      // Validate budget ownership
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .select('id')
        .eq('id', data.budget_id)
        .eq('user_id', userId)
        .single()
      
      if (budgetError || !budget) {
        errors.push('Budget not found or access denied')
        return { valid: false, errors }
      }
      
      // Validate envelope ownership if specified
      if (data.from_envelope_id) {
        const { data: fromEnvelope, error: fromError } = await supabase
          .from('envelopes')
          .select('id')
          .eq('id', data.from_envelope_id)
          .eq('budget_id', data.budget_id)
          .single()
        
        if (fromError || !fromEnvelope) {
          errors.push('From envelope not found or does not belong to this budget')
        }
      }
      
      if (data.to_envelope_id) {
        const { data: toEnvelope, error: toError } = await supabase
          .from('envelopes')
          .select('id')
          .eq('id', data.to_envelope_id)
          .eq('budget_id', data.budget_id)
          .single()
        
        if (toError || !toEnvelope) {
          errors.push('To envelope not found or does not belong to this budget')
        }
      }
      
      // Validate payee ownership if specified
      if (data.payee_id) {
        const { data: payee, error: payeeError } = await supabase
          .from('payees')
          .select('id')
          .eq('id', data.payee_id)
          .eq('budget_id', data.budget_id)
          .single()
        
        if (payeeError || !payee) {
          errors.push('Payee not found or does not belong to this budget')
        }
      }
      
      // Validate income source ownership if specified
      if (data.income_source_id) {
        const { data: incomeSource, error: incomeError } = await supabase
          .from('income_sources')
          .select('id')
          .eq('id', data.income_source_id)
          .eq('budget_id', data.budget_id)
          .single()
        
        if (incomeError || !incomeSource) {
          errors.push('Income source not found or does not belong to this budget')
        }
      }
      
      // Validate category ownership if specified
      if (data.category_id) {
        const { data: category, error: categoryError } = await supabase
          .from('categories')
          .select('id')
          .eq('id', data.category_id)
          .eq('budget_id', data.budget_id)
          .single()
        
        if (categoryError || !category) {
          errors.push('Category not found or does not belong to this budget')
        }
      }
      
    } catch (error) {
      console.error('[TRANSACTIONS] Resource validation error:', error)
      errors.push('Failed to validate resource ownership')
    }
    
    return { valid: errors.length === 0, errors }
  },
  
  // Validate envelope balance for outgoing transactions
  async validateEnvelopeBalance(supabase: any, data: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []
    
    if (!data.from_envelope_id) {
      return { valid: true, errors } // No validation needed
    }
    
    try {
      const { data: envelope, error } = await supabase
        .from('envelopes')
        .select('current_balance')
        .eq('id', data.from_envelope_id)
        .single()
      
      if (error || !envelope) {
        errors.push('Could not verify envelope balance')
        return { valid: false, errors }
      }
      
      if (envelope.current_balance < data.amount) {
        errors.push(`Insufficient funds in envelope. Available: ${envelope.current_balance}, Required: ${data.amount}`)
      }
      
    } catch (error) {
      console.error('[TRANSACTIONS] Balance validation error:', error)
      errors.push('Failed to validate envelope balance')
    }
    
    return { valid: errors.length === 0, errors }
  }
}

// Safe JSON parsing with size limit
async function parseJsonBody(req: Request): Promise<any> {
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 50 * 1024) { // 50KB limit
    throw new Error('Request body too large')
  }
  
  try {
    return await req.json()
  } catch (error) {
    throw new Error('Invalid JSON in request body')
  }
}

console.log("Transactions function started")

serve(async (req) => {
  const startTime = Date.now()
  const method = req.method
  const url = new URL(req.url)
  const path = url.pathname
  
  console.log(`[TRANSACTIONS REQUEST] ${method} ${path}`)
  console.log(`[TRANSACTIONS DEBUG] Full URL: ${req.url}`)
  console.log(`[TRANSACTIONS DEBUG] URL pathname: ${url.pathname}`)

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    console.log(`[TRANSACTIONS CORS] Preflight request handled for ${path}`)
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // All transaction endpoints require authentication
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
    console.log(`[TRANSACTIONS DEBUG] Checking route: ${path} (${method})`)
    
    if (path === '/transactions/validate' && method === 'POST') {
      try {
        const body = await parseJsonBody(req)
        
        console.log(`[TRANSACTIONS VALIDATE] Validating transaction for user: ${user.email}`)
        
        // Run all validations
        const basicValidation = TransactionValidations.validateBasicData(body)
        if (!basicValidation.valid) {
          return createErrorResponse(
            'Invalid transaction data',
            'VALIDATION_ERROR',
            400,
            { errors: basicValidation.errors }
          )
        }
        
        const typeValidation = TransactionValidations.validateTransactionType(body.transaction_type, body)
        if (!typeValidation.valid) {
          return createErrorResponse(
            'Invalid transaction type configuration',
            'VALIDATION_ERROR',
            400,
            { errors: typeValidation.errors }
          )
        }
        
        const ownershipValidation = await TransactionValidations.validateResourceOwnership(authenticatedSupabase, user.id, body)
        if (!ownershipValidation.valid) {
          return createErrorResponse(
            'Resource ownership validation failed',
            'VALIDATION_ERROR',
            400,
            { errors: ownershipValidation.errors }
          )
        }
        
        const balanceValidation = await TransactionValidations.validateEnvelopeBalance(authenticatedSupabase, body)
        if (!balanceValidation.valid) {
          return createErrorResponse(
            'Insufficient envelope balance',
            'INSUFFICIENT_FUNDS',
            400,
            { errors: balanceValidation.errors }
          )
        }
        
        console.log(`[TRANSACTIONS SUCCESS] Validation passed for user: ${user.email}`)
        
        return createSuccessResponse({
          success: true,
          message: 'Transaction validation passed',
          valid: true
        })
        
      } catch (parseError: any) {
        console.error('[TRANSACTIONS ERROR] Failed to validate transaction:', parseError)
        return createErrorResponse(
          parseError.message || 'Invalid request',
          'INVALID_REQUEST',
          400
        )
      }
    }
    
    else if (path === '/transactions' && method === 'POST') {
      try {
        const body = await parseJsonBody(req)
        
        console.log(`[TRANSACTIONS CREATE] Creating transaction for user: ${user.email}`)
        
        // Validate transaction first using direct function calls
        const basicValidation = TransactionValidations.validateBasicData(body)
        if (!basicValidation.valid) {
          return createErrorResponse(
            'Invalid transaction data',
            'VALIDATION_ERROR',
            400,
            { errors: basicValidation.errors }
          )
        }
        
        const typeValidation = TransactionValidations.validateTransactionType(body.transaction_type, body)
        if (!typeValidation.valid) {
          return createErrorResponse(
            'Invalid transaction type configuration',
            'VALIDATION_ERROR',
            400,
            { errors: typeValidation.errors }
          )
        }
        
        const ownershipValidation = await TransactionValidations.validateResourceOwnership(authenticatedSupabase, user.id, body)
        if (!ownershipValidation.valid) {
          return createErrorResponse(
            'Resource ownership validation failed',
            'VALIDATION_ERROR',
            400,
            { errors: ownershipValidation.errors }
          )
        }
        
        // Skip balance validation for CREATE endpoint - UI handles user confirmation
        // const balanceValidation = await TransactionValidations.validateEnvelopeBalance(authenticatedSupabase, body)
        // if (!balanceValidation.valid) {
        //   return createErrorResponse(
        //     'Insufficient envelope balance',
        //     'INSUFFICIENT_FUNDS',
        //     400,
        //     { errors: balanceValidation.errors }
        //   )
        // }
        
        // Add user tracking fields
        const transactionData = {
          ...body,
          created_by: user.id,
          modified_by: user.id
        }
        
        // Create transaction
        const { data: transaction, error } = await authenticatedSupabase
          .from('transactions')
          .insert(transactionData)
          .select('*')
          .single()
        
        if (error) {
          console.error(`[TRANSACTIONS CREATE ERROR] ${error.code}: ${error.message}`)
          return createErrorResponse(
            error.message,
            error.code || 'CREATE_FAILED',
            400
          )
        }
        
        console.log(`[TRANSACTIONS SUCCESS] Transaction created: ${transaction.id}`)
        
        // Invalidate cache for this budget since data has changed
        invalidateBudgetCache(body.budget_id)
        
        return createSuccessResponse({
          success: true,
          message: 'Transaction created successfully',
          transaction
        }, 201)
        
      } catch (parseError: any) {
        console.error('[TRANSACTIONS ERROR] Failed to create transaction:', parseError)
        return createErrorResponse(
          parseError.message || 'Invalid request',
          'INVALID_REQUEST',
          400
        )
      }
    }
    
    else if (path.startsWith('/transactions/') && method === 'GET') {
      try {
        const transactionId = path.split('/')[2]
        
        if (!transactionId) {
          return createErrorResponse('Transaction ID is required', 'MISSING_ID', 400)
        }
        
        console.log(`[TRANSACTIONS GET] Fetching transaction ${transactionId} for user: ${user.email}`)
        
        const { data: transaction, error } = await authenticatedSupabase
          .from('transactions')
          .select(`
            *,
            budgets!inner(id, user_id),
            from_envelope:envelopes!from_envelope_id(id, name),
            to_envelope:envelopes!to_envelope_id(id, name),
            payee:payees!payee_id(id, name),
            income_source:income_sources!income_source_id(id, name),
            category:categories!category_id(id, name)
          `)
          .eq('id', transactionId)
          .eq('budgets.user_id', user.id)
          .single()
        
        if (error || !transaction) {
          return createErrorResponse('Transaction not found', 'NOT_FOUND', 404)
        }
        
        console.log(`[TRANSACTIONS SUCCESS] Transaction fetched: ${transactionId}`)
        
        return createSuccessResponse({
          success: true,
          transaction
        })
        
      } catch (error: any) {
        console.error('[TRANSACTIONS ERROR] Failed to fetch transaction:', error)
        return createErrorResponse('Failed to fetch transaction', 'FETCH_FAILED', 500)
      }
    }
    
    else if (path === '/transactions' && method === 'GET') {
      try {
        const urlParams = new URLSearchParams(url.search)
        const budgetId = urlParams.get('budget_id')
        const limit = Math.min(parseInt(urlParams.get('limit') || '50'), 100)
        const offset = parseInt(urlParams.get('offset') || '0')
        const transactionType = urlParams.get('transaction_type')
        
        console.log(`[TRANSACTIONS LIST] Fetching transactions for user: ${user.email}`)
        
        let query = authenticatedSupabase
          .from('transactions')
          .select(`
            *,
            budgets!inner(id, user_id),
            from_envelope:envelopes!from_envelope_id(id, name),
            to_envelope:envelopes!to_envelope_id(id, name),
            payee:payees!payee_id(id, name),
            income_source:income_sources!income_source_id(id, name),
            category:categories!category_id(id, name)
          `)
          .eq('budgets.user_id', user.id)
          .eq('is_deleted', false)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        if (budgetId) {
          query = query.eq('budget_id', budgetId)
        }
        
        if (transactionType) {
          query = query.eq('transaction_type', transactionType)
        }
        
        const { data: transactions, error } = await query
        
        if (error) {
          console.error(`[TRANSACTIONS LIST ERROR] ${error.message}`)
          return createErrorResponse(error.message, 'LIST_FAILED', 400)
        }
        
        console.log(`[TRANSACTIONS SUCCESS] Listed ${transactions?.length || 0} transactions`)
        
        return createSuccessResponse({
          success: true,
          transactions: transactions || [],
          pagination: {
            limit,
            offset,
            count: transactions?.length || 0
          }
        })
        
      } catch (error: any) {
        console.error('[TRANSACTIONS ERROR] Failed to list transactions:', error)
        return createErrorResponse('Failed to list transactions', 'LIST_FAILED', 500)
      }
    }

    // Handle unsupported routes
    console.log(`[TRANSACTIONS ERROR] Route not found: ${method} ${path}`)
    return createErrorResponse(
      `Route not found: ${method} ${path}`,
      'ROUTE_NOT_FOUND',
      404,
      {
        available_routes: [
          'POST /transactions/validate - Validate transaction data',
          'POST /transactions - Create new transaction',
          'GET /transactions - List transactions (with pagination)',
          'GET /transactions/{id} - Get specific transaction'
        ]
      }
    )

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[TRANSACTIONS FATAL ERROR] Request failed after ${duration}ms:`, error)
    
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
    console.log(`[TRANSACTIONS REQUEST COMPLETE] ${method} ${path} - ${duration}ms`)
  }
})