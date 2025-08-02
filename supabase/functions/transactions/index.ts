import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { withRateLimit, createRateLimitHeaders, checkRateLimit } from '../_shared/rate-limiter.ts'
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

    // Handle POST /budgets/{budgetId}/transactions
    if (req.method === 'POST' && pathParts.length === 3 && pathParts[0] === 'budgets' && pathParts[2] === 'transactions') {
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

      // Parse request body
      const body = await req.json()
      
      // Validate required fields
      if (!body.transaction_type || !body.amount || !body.transaction_date) {
        return new Response(
          JSON.stringify({ error: 'transaction_type, amount, and transaction_date are required' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Validate amount is positive
      if (body.amount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Transaction amount must be positive' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Validate amount has at most 2 decimal places
      if (!Number.isInteger(body.amount * 100)) {
        return new Response(
          JSON.stringify({ error: 'Transaction amount can have at most 2 decimal places' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Validate transaction date is not in the future
      const transactionDate = new Date(body.transaction_date)
      const now = new Date()
      if (transactionDate > now) {
        return new Response(
          JSON.stringify({ error: 'Transaction date cannot be in the future' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Validate description length
      if (body.description && body.description.length > 500) {
        return new Response(
          JSON.stringify({ error: 'Description cannot exceed 500 characters' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Validate transaction type specific requirements
      const { transaction_type, from_envelope_id, to_envelope_id, payee_id, income_source_id } = body

      switch (transaction_type) {
        case 'income':
          if (!income_source_id || from_envelope_id || to_envelope_id || payee_id) {
            return new Response(
              JSON.stringify({ error: 'Income transactions require income_source_id and no envelope or payee references' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          
          // Validate income source exists and belongs to budget
          const { data: incomeSource, error: incomeSourceError } = await supabaseClient
            .from('income_sources')
            .select('id, is_active')
            .eq('id', income_source_id)
            .eq('budget_id', budgetId)
            .single()
          
          if (incomeSourceError || !incomeSource) {
            return new Response(
              JSON.stringify({ error: 'Income source not found or does not belong to this budget' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          
          if (!incomeSource.is_active) {
            return new Response(
              JSON.stringify({ error: 'Income source is not active' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          break

        case 'allocation':
          if (!to_envelope_id || from_envelope_id || payee_id || income_source_id) {
            return new Response(
              JSON.stringify({ error: 'Allocation transactions require to_envelope_id only' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          
          // Validate target envelope exists and belongs to budget
          const { data: targetEnvelope, error: targetEnvelopeError } = await supabaseClient
            .from('envelopes')
            .select('id, is_active')
            .eq('id', to_envelope_id)
            .eq('budget_id', budgetId)
            .single()
          
          if (targetEnvelopeError || !targetEnvelope) {
            return new Response(
              JSON.stringify({ error: 'Target envelope not found or does not belong to this budget' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          
          if (!targetEnvelope.is_active) {
            return new Response(
              JSON.stringify({ error: 'Cannot allocate to inactive envelope' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          break

        case 'expense':
        case 'debt_payment':
          if (!from_envelope_id || !payee_id || to_envelope_id || income_source_id) {
            return new Response(
              JSON.stringify({ error: `${transaction_type} transactions require from_envelope_id and payee_id` }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          
          // Validate source envelope exists and belongs to budget
          const { data: sourceEnvelope, error: sourceEnvelopeError } = await supabaseClient
            .from('envelopes')
            .select('id, is_active, envelope_type')
            .eq('id', from_envelope_id)
            .eq('budget_id', budgetId)
            .single()
          
          if (sourceEnvelopeError || !sourceEnvelope) {
            return new Response(
              JSON.stringify({ error: 'Source envelope not found or does not belong to this budget' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          
          if (!sourceEnvelope.is_active) {
            return new Response(
              JSON.stringify({ error: 'Source envelope is not active' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          
          // For debt payments, validate envelope is debt type
          if (transaction_type === 'debt_payment' && sourceEnvelope.envelope_type !== 'debt') {
            return new Response(
              JSON.stringify({ error: 'Debt payments can only be made from debt envelopes' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          
          // Validate payee exists and belongs to budget
          const { data: payee, error: payeeError } = await supabaseClient
            .from('payees')
            .select('id, is_active')
            .eq('id', payee_id)
            .eq('budget_id', budgetId)
            .single()
          
          if (payeeError || !payee) {
            return new Response(
              JSON.stringify({ error: 'Payee not found or does not belong to this budget' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          
          if (!payee.is_active) {
            return new Response(
              JSON.stringify({ error: 'Payee is not active' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          break

        case 'transfer':
          if (!from_envelope_id || !to_envelope_id || payee_id || income_source_id) {
            return new Response(
              JSON.stringify({ error: 'Transfer transactions require from_envelope_id and to_envelope_id' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          if (from_envelope_id === to_envelope_id) {
            return new Response(
              JSON.stringify({ error: 'Cannot transfer to the same envelope' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          
          // Validate both envelopes exist and belong to budget
          const { data: transferEnvelopes, error: transferEnvelopesError } = await supabaseClient
            .from('envelopes')
            .select('id, is_active')
            .in('id', [from_envelope_id, to_envelope_id])
            .eq('budget_id', budgetId)
          
          if (transferEnvelopesError || !transferEnvelopes || transferEnvelopes.length !== 2) {
            return new Response(
              JSON.stringify({ error: 'One or both envelopes not found or do not belong to this budget' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          
          const inactiveEnvelopes = transferEnvelopes.filter(env => !env.is_active)
          if (inactiveEnvelopes.length > 0) {
            return new Response(
              JSON.stringify({ error: 'Cannot transfer to or from inactive envelopes' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          break

        default:
          return new Response(
            JSON.stringify({ error: 'Invalid transaction type' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
      }

      // Validate category if provided
      if (body.category_id) {
        const { data: category, error: categoryError } = await supabaseClient
          .from('categories')
          .select('id')
          .eq('id', body.category_id)
          .eq('budget_id', budgetId)
          .single()
        
        if (categoryError || !category) {
          return new Response(
            JSON.stringify({ error: 'Category not found or does not belong to this budget' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
      }

      // Create transaction
      const { data: transaction, error: transactionError } = await supabaseClient
        .from('transactions')
        .insert({
          budget_id: budgetId,
          transaction_type: body.transaction_type,
          amount: body.amount,
          transaction_date: body.transaction_date,
          description: body.description || null,
          from_envelope_id: body.from_envelope_id || null,
          to_envelope_id: body.to_envelope_id || null,
          payee_id: body.payee_id || null,
          income_source_id: body.income_source_id || null,
          category_id: body.category_id || null,
          is_cleared: body.is_cleared ?? false,
          is_reconciled: body.is_reconciled ?? false,
          notes: body.notes || null,
        })
        .select()
        .single()

      if (transactionError) {
        throw transactionError
      }

      return new Response(
        JSON.stringify({ transaction }),
        { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle PATCH /transactions/{id}
    if (req.method === 'PATCH' && pathParts.length === 2 && pathParts[0] === 'transactions') {
      const transactionId = pathParts[1]
      
      // Get the existing transaction first
      const { data: existingTransaction, error: fetchError } = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('is_deleted', false)
        .single()

      if (fetchError || !existingTransaction) {
        if (fetchError?.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Transaction not found' }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        throw fetchError
      }

      // Verify budget access
      const { error: budgetError } = await supabaseClient
        .from('budgets')
        .select('id')
        .eq('id', existingTransaction.budget_id)
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

      // Parse request body
      const body = await req.json()
      
      // If updating amount, validate it's positive
      if (body.amount !== undefined && body.amount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Transaction amount must be positive' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // If updating any field that affects transaction type requirements, validate
      if (body.from_envelope_id !== undefined || 
          body.to_envelope_id !== undefined ||
          body.payee_id !== undefined ||
          body.income_source_id !== undefined) {
        
        // Construct the full transaction object with updates
        const updatedTransaction = {
          transaction_type: existingTransaction.transaction_type,
          amount: body.amount ?? existingTransaction.amount,
          transaction_date: body.transaction_date ?? existingTransaction.transaction_date,
          from_envelope_id: body.from_envelope_id ?? existingTransaction.from_envelope_id,
          to_envelope_id: body.to_envelope_id ?? existingTransaction.to_envelope_id,
          payee_id: body.payee_id ?? existingTransaction.payee_id,
          income_source_id: body.income_source_id ?? existingTransaction.income_source_id,
        }

        // Validate based on transaction type
        switch (updatedTransaction.transaction_type) {
          case 'income':
            if (!updatedTransaction.income_source_id || updatedTransaction.from_envelope_id || 
                updatedTransaction.to_envelope_id || updatedTransaction.payee_id) {
              return new Response(
                JSON.stringify({ error: 'Income transactions require income_source_id and no envelope or payee references' }),
                { 
                  status: 400,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              )
            }
            break

          case 'allocation':
            if (!updatedTransaction.to_envelope_id || updatedTransaction.from_envelope_id || 
                updatedTransaction.payee_id || updatedTransaction.income_source_id) {
              return new Response(
                JSON.stringify({ error: 'Allocation transactions require to_envelope_id only' }),
                { 
                  status: 400,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              )
            }
            break

          case 'expense':
          case 'debt_payment':
            if (!updatedTransaction.from_envelope_id || !updatedTransaction.payee_id || 
                updatedTransaction.to_envelope_id || updatedTransaction.income_source_id) {
              return new Response(
                JSON.stringify({ error: `${updatedTransaction.transaction_type} transactions require from_envelope_id and payee_id` }),
                { 
                  status: 400,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              )
            }
            break

          case 'transfer':
            if (!updatedTransaction.from_envelope_id || !updatedTransaction.to_envelope_id || 
                updatedTransaction.payee_id || updatedTransaction.income_source_id) {
              return new Response(
                JSON.stringify({ error: 'Transfer transactions require from_envelope_id and to_envelope_id' }),
                { 
                  status: 400,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              )
            }
            if (updatedTransaction.from_envelope_id === updatedTransaction.to_envelope_id) {
              return new Response(
                JSON.stringify({ error: 'Cannot transfer to the same envelope' }),
                { 
                  status: 400,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              )
            }
            break
        }
      }

      // Build update object with only provided fields
      const updates: any = {
        updated_at: new Date().toISOString()
      }

      if (body.amount !== undefined) updates.amount = body.amount
      if (body.transaction_date !== undefined) updates.transaction_date = body.transaction_date
      if (body.description !== undefined) updates.description = body.description || null
      if (body.from_envelope_id !== undefined) updates.from_envelope_id = body.from_envelope_id || null
      if (body.to_envelope_id !== undefined) updates.to_envelope_id = body.to_envelope_id || null
      if (body.payee_id !== undefined) updates.payee_id = body.payee_id || null
      if (body.income_source_id !== undefined) updates.income_source_id = body.income_source_id || null
      if (body.category_id !== undefined) updates.category_id = body.category_id || null
      if (body.is_cleared !== undefined) updates.is_cleared = body.is_cleared
      if (body.is_reconciled !== undefined) updates.is_reconciled = body.is_reconciled
      if (body.notes !== undefined) updates.notes = body.notes || null

      // Update transaction
      const { data: updatedTransaction, error: updateError } = await supabaseClient
        .from('transactions')
        .update(updates)
        .eq('id', transactionId)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return new Response(
        JSON.stringify({ transaction: updatedTransaction }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle DELETE /transactions/{id}
    if (req.method === 'DELETE' && pathParts.length === 2 && pathParts[0] === 'transactions') {
      const transactionId = pathParts[1]
      
      // Get the transaction first to verify it exists and we have access
      const { data: transaction, error: transactionError } = await supabaseClient
        .from('transactions')
        .select('*')
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

      // Soft delete the transaction
      const { error: deleteError } = await supabaseClient
        .from('transactions')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId)

      if (deleteError) {
        throw deleteError
      }

      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle POST /transactions/{id}/restore
    if (req.method === 'POST' && pathParts.length === 3 && pathParts[0] === 'transactions' && pathParts[2] === 'restore') {
      const transactionId = pathParts[1]
      
      // Check if user can restore (must be the one who deleted)
      const { data: transaction, error: fetchError } = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('is_deleted', true)
        .eq('deleted_by', user.id)
        .single()

      if (fetchError || !transaction) {
        if (fetchError?.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Deleted transaction not found or you cannot restore it' }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        throw fetchError
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

      // Restore the transaction
      const { data: restoredTransaction, error: restoreError } = await supabaseClient
        .from('transactions')
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .select()
        .single()

      if (restoreError) {
        throw restoreError
      }

      return new Response(
        JSON.stringify({ transaction: restoredTransaction }),
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
}

// Apply rate limiting to the handler
serve(withRateLimit('critical', handler))