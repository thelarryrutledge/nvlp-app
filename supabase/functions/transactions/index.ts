import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { withSecurity } from '../_shared/security-headers.ts'
import { withRateLimit } from '../_shared/rate-limiter.ts'
import { 
  validateTransactionRequest, 
  createValidationErrorResponse 
} from '../_shared/validation.ts'

const handler = async (req: Request) => {
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const url = new URL(req.url)
    const method = req.method

    // GET /transactions - List transactions with filters
    if (method === 'GET') {
      const params = url.searchParams
      const budgetId = params.get('budget_id')
      
      if (!budgetId) {
        return new Response(
          JSON.stringify({ error: 'budget_id query parameter is required' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      let query = supabaseClient
        .from('transactions')
        .select(`
          *,
          from_envelope:envelopes!from_envelope_id(*),
          to_envelope:envelopes!to_envelope_id(*),
          payee:payees!payee_id(*),
          income_source:income_sources!income_source_id(*)
        `)
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
        query = query.or(`from_envelope_id.eq.${params.get('envelopeId')!},to_envelope_id.eq.${params.get('envelopeId')!}`)
      }
      if (params.get('payeeId')) {
        query = query.eq('payee_id', params.get('payeeId')!)
      }
      if (params.get('incomeSourceId')) {
        query = query.eq('income_source_id', params.get('incomeSourceId')!)
      }
      if (params.get('isCleared') !== null) {
        query = query.eq('is_cleared', params.get('isCleared') === 'true')
      }
      if (params.get('isReconciled') !== null) {
        query = query.eq('is_reconciled', params.get('isReconciled') === 'true')
      }

      // Apply ordering (most recent first by default)
      query = query.order('transaction_date', { ascending: false })

      // Apply pagination
      const limit = parseInt(params.get('limit') || '50')
      const offset = parseInt(params.get('offset') || '0')
      query = query.range(offset, offset + limit - 1)

      const { data: transactions, error } = await query

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify(transactions),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // POST /transactions - Create transaction
    if (method === 'POST') {
      const body = await req.json()
      
      // Use comprehensive validation
      const validation = validateTransactionRequest(body)
      if (!validation.isValid) {
        return createValidationErrorResponse(validation.errors, corsHeaders)
      }
      
      const validatedBody = validation.sanitizedData

      // The comprehensive validation already handled all of this

      // Insert transaction
      const { data: transaction, error: insertError } = await supabaseClient
        .from('transactions')
        .insert({
          budget_id: validatedBody.budget_id,
          transaction_type: validatedBody.transaction_type,
          amount: validatedBody.amount,
          transaction_date: validatedBody.transaction_date,
          description: validatedBody.description || null,
          from_envelope_id: validatedBody.from_envelope_id || null,
          to_envelope_id: validatedBody.to_envelope_id || null,
          payee_id: validatedBody.payee_id || null,
          income_source_id: validatedBody.income_source_id || null,
          is_cleared: validatedBody.is_cleared ?? false,
          is_reconciled: false
        })
        .select(`
          *,
          from_envelope:envelopes!from_envelope_id(*),
          to_envelope:envelopes!to_envelope_id(*),
          payee:payees!payee_id(*),
          income_source:income_sources!income_source_id(*)
        `)
        .single()

      if (insertError) {
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify(transaction),
        { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // PUT /transactions/{id} - Update transaction
    if (method === 'PUT') {
      const pathParts = url.pathname.split('/')
      const transactionId = pathParts[pathParts.length - 1]
      
      if (!transactionId) {
        return new Response(
          JSON.stringify({ error: 'Transaction ID is required in URL path' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const body = await req.json()

      // Get existing transaction to verify ownership
      const { data: existingTransaction, error: getError } = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('is_deleted', false)
        .single()

      if (getError || !existingTransaction) {
        return new Response(
          JSON.stringify({ error: 'Transaction not found' }),
          { 
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Build updates object
      const updates: any = { updated_at: new Date().toISOString() }
      if (body.amount !== undefined) updates.amount = body.amount
      if (body.transaction_date !== undefined) updates.transaction_date = body.transaction_date
      if (body.description !== undefined) updates.description = body.description || null
      if (body.from_envelope_id !== undefined) updates.from_envelope_id = body.from_envelope_id || null
      if (body.to_envelope_id !== undefined) updates.to_envelope_id = body.to_envelope_id || null
      if (body.payee_id !== undefined) updates.payee_id = body.payee_id || null
      if (body.income_source_id !== undefined) updates.income_source_id = body.income_source_id || null
      if (body.is_cleared !== undefined) updates.is_cleared = body.is_cleared
      if (body.is_reconciled !== undefined) updates.is_reconciled = body.is_reconciled

      const { data: updatedTransaction, error: updateError } = await supabaseClient
        .from('transactions')
        .update(updates)
        .eq('id', transactionId)
        .select(`
          *,
          from_envelope:envelopes!from_envelope_id(*),
          to_envelope:envelopes!to_envelope_id(*),
          payee:payees!payee_id(*),
          income_source:income_sources!income_source_id(*)
        `)
        .single()

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify(updatedTransaction),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // DELETE /transactions/{id} - Soft delete transaction
    if (method === 'DELETE') {
      const pathParts = url.pathname.split('/')
      const transactionId = pathParts[pathParts.length - 1]
      
      if (!transactionId) {
        return new Response(
          JSON.stringify({ error: 'Transaction ID is required in URL path' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Soft delete the transaction
      const { error: deleteError } = await supabaseClient
        .from('transactions')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)
        .eq('is_deleted', false)

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ message: 'Transaction deleted successfully' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

serve(withSecurity(withRateLimit('critical', handler)))