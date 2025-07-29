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
    
    // Handle GET /budgets/{budgetId}/transactions
    if (req.method === 'GET' && pathParts.length === 3 && pathParts[0] === 'budgets' && pathParts[2] === 'transactions') {
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

      // Parse query parameters for filtering
      const params = url.searchParams
      let query = supabaseClient
        .from('transactions')
        .select('*')
        .eq('budget_id', budgetId)
        .eq('is_deleted', false)

      // Apply filters
      if (params.get('startDate')) {
        query = query.gte('transaction_date', params.get('startDate')!)
      }
      if (params.get('endDate')) {
        query = query.lte('transaction_date', params.get('endDate')!)
      }
      if (params.get('transactionType')) {
        query = query.eq('transaction_type', params.get('transactionType')!)
      }
      if (params.get('envelopeId')) {
        const envelopeId = params.get('envelopeId')!
        query = query.or(`from_envelope_id.eq.${envelopeId},to_envelope_id.eq.${envelopeId}`)
      }
      if (params.get('payeeId')) {
        query = query.eq('payee_id', params.get('payeeId')!)
      }
      if (params.get('incomeSourceId')) {
        query = query.eq('income_source_id', params.get('incomeSourceId')!)
      }
      if (params.get('categoryId')) {
        query = query.eq('category_id', params.get('categoryId')!)
      }
      if (params.get('isCleared') !== null) {
        const isCleared = params.get('isCleared') === 'true'
        query = query.eq('is_cleared', isCleared)
      }
      if (params.get('isReconciled') !== null) {
        const isReconciled = params.get('isReconciled') === 'true'
        query = query.eq('is_reconciled', isReconciled)
      }
      if (params.get('minAmount')) {
        query = query.gte('amount', parseFloat(params.get('minAmount')!))
      }
      if (params.get('maxAmount')) {
        query = query.lte('amount', parseFloat(params.get('maxAmount')!))
      }

      // Apply ordering (most recent first by default)
      query = query.order('transaction_date', { ascending: false })

      // Apply pagination
      const limit = params.get('limit') ? parseInt(params.get('limit')!) : 50
      const offset = params.get('offset') ? parseInt(params.get('offset')!) : 0
      
      if (limit) {
        query = query.limit(limit)
      }
      if (offset) {
        query = query.range(offset, offset + limit - 1)
      }

      const { data: transactions, error: transactionsError } = await query

      if (transactionsError) {
        throw transactionsError
      }

      return new Response(
        JSON.stringify({ transactions }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle GET /transactions/{id}
    if (req.method === 'GET' && pathParts.length === 2 && pathParts[0] === 'transactions') {
      const transactionId = pathParts[1]
      
      // Get the transaction with details
      const { data: transaction, error: transactionError } = await supabaseClient
        .from('transactions')
        .select(`
          *,
          from_envelope:envelopes!from_envelope_id(*),
          to_envelope:envelopes!to_envelope_id(*),
          payee:payees!payee_id(*),
          income_source:income_sources!income_source_id(*),
          category:categories!category_id(*)
        `)
        .eq('id', transactionId)
        .eq('is_deleted', false)
        .single()

      if (transactionError || !transaction) {
        if (transactionError?.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Transaction not found' }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        throw transactionError
      }

      // Verify budget access
      const { error: budgetError } = await supabaseClient
        .from('budgets')
        .select('id')
        .eq('id', transaction.budget_id)
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

      return new Response(
        JSON.stringify({ transaction }),
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