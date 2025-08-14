import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { withRateLimit } from '../_shared/rate-limiter.ts'
import { withSecurity } from '../_shared/security-headers.ts'
import { sessionValidationMiddleware } from '../_shared/session-validation.ts'

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

    // Add session validation
    const sessionValidation = await sessionValidationMiddleware(supabaseClient, {
      'x-device-id': req.headers.get('x-device-id') || ''
    })
    
    if (!sessionValidation.isValid) {
      const statusCode = sessionValidation.code === 'SESSION_INVALIDATED' ? 401 : 403
      return new Response(
        JSON.stringify({ 
          error: sessionValidation.error,
          code: sessionValidation.code 
        }),
        { 
          status: statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const url = new URL(req.url)
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

    // Handle GET /dashboard?budget_id={budgetId}
    if (req.method === 'GET') {
      // Verify budget access
      const { data: budget, error: budgetError } = await supabaseClient
        .from('budgets')
        .select('id, available_amount')
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

      // Get budget summary using the existing function
      const { data: summaryData, error: summaryError } = await supabaseClient
        .rpc('get_budget_summary', {
          budget_id_param: budgetId
        })

      if (summaryError) {
        return new Response(
          JSON.stringify({ error: summaryError.message }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Get envelope data
      const { data: envelopes, error: envelopeError } = await supabaseClient
        .from('envelopes')
        .select('*')
        .eq('budget_id', budgetId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (envelopeError) {
        throw envelopeError
      }

      // Get recent transactions
      const { data: recentTransactions, error: transactionError } = await supabaseClient
        .from('transactions')
        .select(`
          *,
          from_envelope:envelopes!from_envelope_id(name),
          to_envelope:envelopes!to_envelope_id(name),
          payee:payees!payee_id(name),
          income_source:income_sources!income_source_id(name)
        `)
        .eq('budget_id', budgetId)
        .eq('is_deleted', false)
        .order('transaction_date', { ascending: false })
        .limit(10)

      if (transactionError) {
        throw transactionError
      }

      return new Response(
        JSON.stringify({
          budget_summary: summaryData,
          envelopes: envelopes,
          recent_transactions: recentTransactions
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Method not found
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
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

// Apply security headers and rate limiting to the handler
serve(withSecurity(withRateLimit('dashboard', handler)))