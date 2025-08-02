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
    
    // Handle GET /budgets/{budgetId}/dashboard/summary
    if (req.method === 'GET' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'dashboard' && pathParts[3] === 'summary') {
      
      const budgetId = pathParts[1]
      
      // Verify budget access
      const { error: budgetError } = await supabaseClient
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

      // Use SQL for complex dashboard calculations
      const { data: dashboardData, error: dashboardError } = await supabaseClient
        .rpc('get_dashboard_summary', {
          p_budget_id: budgetId
        })

      if (dashboardError) {
        throw dashboardError
      }

      return new Response(
        JSON.stringify({ dashboard: dashboardData }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle GET /budgets/{budgetId}/dashboard/envelope-performance
    if (req.method === 'GET' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'dashboard' && pathParts[3] === 'envelope-performance') {
      
      const budgetId = pathParts[1]
      const params = url.searchParams
      const months = parseInt(params.get('months') || '6')
      
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

      // Complex envelope performance analysis
      const { data: performanceData, error: performanceError } = await supabaseClient
        .rpc('get_envelope_performance', {
          p_budget_id: budgetId,
          p_months: months
        })

      if (performanceError) {
        throw performanceError
      }

      return new Response(
        JSON.stringify({ performance: performanceData }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle GET /budgets/{budgetId}/dashboard/spending-insights
    if (req.method === 'GET' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'dashboard' && pathParts[3] === 'spending-insights') {
      
      const budgetId = pathParts[1]
      const params = url.searchParams
      const startDate = params.get('startDate')
      const endDate = params.get('endDate')
      
      if (!startDate || !endDate) {
        return new Response(
          JSON.stringify({ error: 'startDate and endDate query parameters are required' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
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

      // Advanced spending pattern analysis
      const { data: insightsData, error: insightsError } = await supabaseClient
        .rpc('get_spending_insights', {
          p_budget_id: budgetId,
          p_start_date: startDate,
          p_end_date: endDate
        })

      if (insightsError) {
        throw insightsError
      }

      return new Response(
        JSON.stringify({ insights: insightsData }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle GET /budgets/{budgetId}/dashboard/budget-health
    if (req.method === 'GET' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'dashboard' && pathParts[3] === 'budget-health') {
      
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

      // Calculate budget health metrics
      const { data: healthData, error: healthError } = await supabaseClient
        .rpc('get_budget_health_metrics', {
          p_budget_id: budgetId
        })

      if (healthError) {
        throw healthError
      }

      return new Response(
        JSON.stringify({ health: healthData }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle GET /budgets/{budgetId}/dashboard/cash-flow-forecast
    if (req.method === 'GET' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'dashboard' && pathParts[3] === 'cash-flow-forecast') {
      
      const budgetId = pathParts[1]
      const params = url.searchParams
      const months = parseInt(params.get('months') || '3')
      
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

      // Generate cash flow forecast based on historical patterns
      const { data: forecastData, error: forecastError } = await supabaseClient
        .rpc('get_cash_flow_forecast', {
          p_budget_id: budgetId,
          p_forecast_months: months
        })

      if (forecastError) {
        throw forecastError
      }

      return new Response(
        JSON.stringify({ forecast: forecastData }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle GET /budgets/{budgetId}/dashboard/category-variance
    if (req.method === 'GET' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'dashboard' && pathParts[3] === 'category-variance') {
      
      const budgetId = pathParts[1]
      const params = url.searchParams
      const months = parseInt(params.get('months') || '3')
      
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

      // Analyze variance between envelope targets and actual spending
      const { data: varianceData, error: varianceError } = await supabaseClient
        .rpc('get_category_variance_analysis', {
          p_budget_id: budgetId,
          p_analysis_months: months
        })

      if (varianceError) {
        throw varianceError
      }

      return new Response(
        JSON.stringify({ variance: varianceData }),
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
serve(withRateLimit('dashboard', handler))