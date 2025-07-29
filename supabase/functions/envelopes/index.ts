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
    
    // Handle GET /budgets/{budgetId}/envelopes
    if (req.method === 'GET' && pathParts.length === 3 && pathParts[0] === 'budgets' && pathParts[2] === 'envelopes') {
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

      // Get envelopes for the budget
      const { data: envelopes, error: envelopesError } = await supabaseClient
        .from('envelopes')
        .select('*')
        .eq('budget_id', budgetId)
        .order('name', { ascending: true })

      if (envelopesError) {
        throw envelopesError
      }

      return new Response(
        JSON.stringify({ envelopes }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle GET /budgets/{budgetId}/envelopes/negative
    if (req.method === 'GET' && pathParts.length === 4 && pathParts[0] === 'budgets' && pathParts[2] === 'envelopes' && pathParts[3] === 'negative') {
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

      // Get envelopes with negative balance
      const { data: envelopes, error: envelopesError } = await supabaseClient
        .from('envelopes')
        .select('*')
        .eq('budget_id', budgetId)
        .lt('current_balance', 0)
        .order('current_balance', { ascending: true })

      if (envelopesError) {
        throw envelopesError
      }

      return new Response(
        JSON.stringify({ envelopes }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle GET /budgets/{budgetId}/envelopes/low-balance
    if (req.method === 'GET' && pathParts.length === 4 && pathParts[0] === 'budgets' && pathParts[2] === 'envelopes' && pathParts[3] === 'low-balance') {
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

      // Get envelopes that have low balance notification enabled and a threshold set
      const { data: envelopes, error: envelopesError } = await supabaseClient
        .from('envelopes')
        .select('*')
        .eq('budget_id', budgetId)
        .eq('notify_on_low_balance', true)
        .not('low_balance_threshold', 'is', null)
        .order('current_balance', { ascending: true })

      if (envelopesError) {
        throw envelopesError
      }

      // Filter envelopes where current_balance <= low_balance_threshold
      const lowBalanceEnvelopes = (envelopes || []).filter((envelope: any) => 
        envelope.current_balance <= (envelope.low_balance_threshold || 0)
      )

      return new Response(
        JSON.stringify({ envelopes: lowBalanceEnvelopes }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle GET /envelopes/{id}
    if (req.method === 'GET' && pathParts.length === 2 && pathParts[0] === 'envelopes') {
      const envelopeId = pathParts[1]
      
      // Get the envelope
      const { data: envelope, error: envelopeError } = await supabaseClient
        .from('envelopes')
        .select('*')
        .eq('id', envelopeId)
        .single()

      if (envelopeError || !envelope) {
        if (envelopeError?.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Envelope not found' }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        throw envelopeError
      }

      // Verify budget access
      const { error: budgetError } = await supabaseClient
        .from('budgets')
        .select('id')
        .eq('id', envelope.budget_id)
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
        JSON.stringify({ envelope }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle POST /budgets/{budgetId}/envelopes
    if (req.method === 'POST' && pathParts.length === 3 && pathParts[0] === 'budgets' && pathParts[2] === 'envelopes') {
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
      if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
        return new Response(
          JSON.stringify({ error: 'Name is required and must be a non-empty string' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Create envelope
      const { data: envelope, error: envelopeError } = await supabaseClient
        .from('envelopes')
        .insert({
          budget_id: budgetId,
          name: body.name,
          description: body.description || null,
          target_amount: body.target_amount || null,
          envelope_type: body.envelope_type || 'regular',
          category_id: body.category_id || null,
          notify_on_low_balance: body.notify_on_low_balance ?? false,
          low_balance_threshold: body.low_balance_threshold || null,
        })
        .select()
        .single()

      if (envelopeError) {
        throw envelopeError
      }

      return new Response(
        JSON.stringify({ envelope }),
        { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle PATCH /envelopes/{id}
    if (req.method === 'PATCH' && pathParts.length === 2 && pathParts[0] === 'envelopes') {
      const envelopeId = pathParts[1]
      
      // Get the envelope first to verify it exists and we have access
      const { data: envelope, error: envelopeError } = await supabaseClient
        .from('envelopes')
        .select('*')
        .eq('id', envelopeId)
        .single()

      if (envelopeError || !envelope) {
        if (envelopeError?.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Envelope not found' }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        throw envelopeError
      }

      // Verify budget access
      const { error: budgetError } = await supabaseClient
        .from('budgets')
        .select('id')
        .eq('id', envelope.budget_id)
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
      
      // Validate name if provided
      if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
        return new Response(
          JSON.stringify({ error: 'Name must be a non-empty string' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Build update object with only provided fields
      const updates: any = {
        updated_at: new Date().toISOString()
      }

      if (body.name !== undefined) updates.name = body.name
      if (body.description !== undefined) updates.description = body.description || null
      if (body.target_amount !== undefined) updates.target_amount = body.target_amount || null
      if (body.envelope_type !== undefined) updates.envelope_type = body.envelope_type
      if (body.category_id !== undefined) updates.category_id = body.category_id || null
      if (body.notify_on_low_balance !== undefined) updates.notify_on_low_balance = body.notify_on_low_balance
      if (body.low_balance_threshold !== undefined) updates.low_balance_threshold = body.low_balance_threshold || null
      if (body.is_active !== undefined) updates.is_active = body.is_active

      // Update envelope
      const { data: updatedEnvelope, error: updateError } = await supabaseClient
        .from('envelopes')
        .update(updates)
        .eq('id', envelopeId)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return new Response(
        JSON.stringify({ envelope: updatedEnvelope }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle DELETE /envelopes/{id}
    if (req.method === 'DELETE' && pathParts.length === 2 && pathParts[0] === 'envelopes') {
      const envelopeId = pathParts[1]
      
      // Get the envelope first to verify it exists and we have access
      const { data: envelope, error: envelopeError } = await supabaseClient
        .from('envelopes')
        .select('*')
        .eq('id', envelopeId)
        .single()

      if (envelopeError || !envelope) {
        if (envelopeError?.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Envelope not found' }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        throw envelopeError
      }

      // Verify budget access
      const { error: budgetError } = await supabaseClient
        .from('budgets')
        .select('id')
        .eq('id', envelope.budget_id)
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

      // Check if envelope has zero balance
      if (envelope.current_balance !== 0) {
        return new Response(
          JSON.stringify({ error: 'Cannot delete envelope with non-zero balance' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Delete envelope
      const { error: deleteError } = await supabaseClient
        .from('envelopes')
        .delete()
        .eq('id', envelopeId)

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