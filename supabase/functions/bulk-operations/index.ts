import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { withRateLimit } from '../_shared/rate-limiter.ts'

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
    
    // Handle POST /budgets/{budgetId}/bulk/transactions
    if (req.method === 'POST' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'bulk' && pathParts[3] === 'transactions') {
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
      
      if (!Array.isArray(body.transactions) || body.transactions.length === 0) {
        return new Response(
          JSON.stringify({ error: 'transactions array is required and must not be empty' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Validate each transaction
      const validatedTransactions = []
      const validationErrors = []

      for (let i = 0; i < body.transactions.length; i++) {
        const transaction = body.transactions[i]
        const errors = []

        // Basic validation
        if (!transaction.transaction_type || !transaction.amount || !transaction.transaction_date) {
          errors.push('transaction_type, amount, and transaction_date are required')
        }

        if (transaction.amount && transaction.amount <= 0) {
          errors.push('Transaction amount must be positive')
        }

        if (transaction.amount && !Number.isInteger(transaction.amount * 100)) {
          errors.push('Transaction amount can have at most 2 decimal places')
        }

        if (transaction.transaction_date) {
          const transactionDate = new Date(transaction.transaction_date)
          const now = new Date()
          if (transactionDate > now) {
            errors.push('Transaction date cannot be in the future')
          }
        }

        if (transaction.description && transaction.description.length > 500) {
          errors.push('Description cannot exceed 500 characters')
        }

        // Transaction type specific validation
        const { transaction_type, from_envelope_id, to_envelope_id, payee_id, income_source_id } = transaction

        switch (transaction_type) {
          case 'income':
            if (!income_source_id || from_envelope_id || to_envelope_id || payee_id) {
              errors.push('Income transactions require income_source_id and no envelope or payee references')
            }
            break

          case 'allocation':
            if (!to_envelope_id || from_envelope_id || payee_id || income_source_id) {
              errors.push('Allocation transactions require to_envelope_id only')
            }
            break

          case 'expense':
          case 'debt_payment':
            if (!from_envelope_id || !payee_id || to_envelope_id || income_source_id) {
              errors.push(`${transaction_type} transactions require from_envelope_id and payee_id`)
            }
            break

          case 'transfer':
            if (!from_envelope_id || !to_envelope_id || payee_id || income_source_id) {
              errors.push('Transfer transactions require from_envelope_id and to_envelope_id')
            }
            if (from_envelope_id === to_envelope_id) {
              errors.push('Cannot transfer to the same envelope')
            }
            break

          default:
            errors.push('Invalid transaction type')
        }

        if (errors.length > 0) {
          validationErrors.push({ index: i, errors })
        } else {
          validatedTransactions.push({
            budget_id: budgetId,
            transaction_type: transaction.transaction_type,
            amount: transaction.amount,
            transaction_date: transaction.transaction_date,
            description: transaction.description || null,
            from_envelope_id: transaction.from_envelope_id || null,
            to_envelope_id: transaction.to_envelope_id || null,
            payee_id: transaction.payee_id || null,
            income_source_id: transaction.income_source_id || null,
            category_id: transaction.category_id || null,
            is_cleared: transaction.is_cleared ?? false,
            is_reconciled: transaction.is_reconciled ?? false,
            notes: transaction.notes || null,
          })
        }
      }

      if (validationErrors.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Validation failed for some transactions',
            validationErrors 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Insert all transactions
      const { data: transactions, error: transactionError } = await supabaseClient
        .from('transactions')
        .insert(validatedTransactions)
        .select()

      if (transactionError) {
        throw transactionError
      }

      return new Response(
        JSON.stringify({ 
          transactions,
          created_count: transactions.length 
        }),
        { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle POST /budgets/{budgetId}/bulk/envelopes
    if (req.method === 'POST' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'bulk' && pathParts[3] === 'envelopes') {
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
      
      if (!Array.isArray(body.envelopes) || body.envelopes.length === 0) {
        return new Response(
          JSON.stringify({ error: 'envelopes array is required and must not be empty' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Validate each envelope
      const validatedEnvelopes = []
      const validationErrors = []

      for (let i = 0; i < body.envelopes.length; i++) {
        const envelope = body.envelopes[i]
        const errors = []

        // Basic validation
        if (!envelope.name) {
          errors.push('name is required')
        }

        if (envelope.name && envelope.name.length > 100) {
          errors.push('name cannot exceed 100 characters')
        }

        if (envelope.target_amount !== undefined && envelope.target_amount < 0) {
          errors.push('target_amount cannot be negative')
        }

        if (errors.length > 0) {
          validationErrors.push({ index: i, errors })
        } else {
          validatedEnvelopes.push({
            budget_id: budgetId,
            name: envelope.name,
            category_id: envelope.category_id || null,
            envelope_type: envelope.envelope_type || 'general',
            target_amount: envelope.target_amount || 0,
            current_balance: envelope.current_balance || 0,
            is_active: envelope.is_active ?? true,
            display_order: envelope.display_order || 0,
          })
        }
      }

      if (validationErrors.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Validation failed for some envelopes',
            validationErrors 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Insert all envelopes
      const { data: envelopes, error: envelopeError } = await supabaseClient
        .from('envelopes')
        .insert(validatedEnvelopes)
        .select()

      if (envelopeError) {
        throw envelopeError
      }

      return new Response(
        JSON.stringify({ 
          envelopes,
          created_count: envelopes.length 
        }),
        { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle POST /budgets/{budgetId}/bulk/categories
    if (req.method === 'POST' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'bulk' && pathParts[3] === 'categories') {
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
      
      if (!Array.isArray(body.categories) || body.categories.length === 0) {
        return new Response(
          JSON.stringify({ error: 'categories array is required and must not be empty' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Validate each category
      const validatedCategories = []
      const validationErrors = []

      for (let i = 0; i < body.categories.length; i++) {
        const category = body.categories[i]
        const errors = []

        // Basic validation
        if (!category.name) {
          errors.push('name is required')
        }

        if (category.name && category.name.length > 100) {
          errors.push('name cannot exceed 100 characters')
        }

        if (category.is_income === undefined) {
          errors.push('is_income is required')
        }

        if (errors.length > 0) {
          validationErrors.push({ index: i, errors })
        } else {
          validatedCategories.push({
            budget_id: budgetId,
            name: category.name,
            parent_id: category.parent_id || null,
            is_income: category.is_income,
            display_order: category.display_order || 0,
          })
        }
      }

      if (validationErrors.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Validation failed for some categories',
            validationErrors 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Insert all categories
      const { data: categories, error: categoryError } = await supabaseClient
        .from('categories')
        .insert(validatedCategories)
        .select()

      if (categoryError) {
        throw categoryError
      }

      return new Response(
        JSON.stringify({ 
          categories,
          created_count: categories.length 
        }),
        { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle POST /budgets/{budgetId}/bulk/payees
    if (req.method === 'POST' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'bulk' && pathParts[3] === 'payees') {
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
      
      if (!Array.isArray(body.payees) || body.payees.length === 0) {
        return new Response(
          JSON.stringify({ error: 'payees array is required and must not be empty' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Validate each payee
      const validatedPayees = []
      const validationErrors = []

      for (let i = 0; i < body.payees.length; i++) {
        const payee = body.payees[i]
        const errors = []

        // Basic validation
        if (!payee.name) {
          errors.push('name is required')
        }

        if (payee.name && payee.name.length > 100) {
          errors.push('name cannot exceed 100 characters')
        }

        if (errors.length > 0) {
          validationErrors.push({ index: i, errors })
        } else {
          validatedPayees.push({
            budget_id: budgetId,
            name: payee.name,
            is_debt: payee.is_debt ?? false,
            is_active: payee.is_active ?? true,
          })
        }
      }

      if (validationErrors.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Validation failed for some payees',
            validationErrors 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Insert all payees
      const { data: payees, error: payeeError } = await supabaseClient
        .from('payees')
        .insert(validatedPayees)
        .select()

      if (payeeError) {
        throw payeeError
      }

      return new Response(
        JSON.stringify({ 
          payees,
          created_count: payees.length 
        }),
        { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle PATCH /budgets/{budgetId}/bulk/envelopes
    if (req.method === 'PATCH' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'bulk' && pathParts[3] === 'envelopes') {
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
      
      if (!Array.isArray(body.updates) || body.updates.length === 0) {
        return new Response(
          JSON.stringify({ error: 'updates array is required and must not be empty' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Process bulk updates
      const updatedEnvelopes = []
      const updateErrors = []

      for (let i = 0; i < body.updates.length; i++) {
        const update = body.updates[i]
        
        if (!update.id) {
          updateErrors.push({ index: i, errors: ['id is required'] })
          continue
        }

        try {
          // Build update object with only provided fields
          const updates: any = {
            updated_at: new Date().toISOString()
          }

          if (update.name !== undefined) updates.name = update.name
          if (update.target_amount !== undefined) updates.target_amount = update.target_amount
          if (update.is_active !== undefined) updates.is_active = update.is_active
          if (update.display_order !== undefined) updates.display_order = update.display_order
          if (update.category_id !== undefined) updates.category_id = update.category_id

          // Update envelope
          const { data: updatedEnvelope, error: updateError } = await supabaseClient
            .from('envelopes')
            .update(updates)
            .eq('id', update.id)
            .eq('budget_id', budgetId)
            .select()
            .single()

          if (updateError) {
            updateErrors.push({ index: i, id: update.id, error: updateError.message })
          } else if (updatedEnvelope) {
            updatedEnvelopes.push(updatedEnvelope)
          }
        } catch (error) {
          updateErrors.push({ index: i, id: update.id, error: error instanceof Error ? error.message : 'Unknown error' })
        }
      }

      return new Response(
        JSON.stringify({ 
          envelopes: updatedEnvelopes,
          updated_count: updatedEnvelopes.length,
          errors: updateErrors.length > 0 ? updateErrors : undefined
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
}

// Apply rate limiting to the handler
serve(withRateLimit('critical', handler))