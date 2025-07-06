// Budget CRUD Edge Function
// Handles GET, POST, PATCH, DELETE operations for budgets

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
}

interface BudgetData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get current user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'Invalid or missing JWT token' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const method = req.method
    const url = new URL(req.url)
    const budgetId = url.searchParams.get('id')

    if (method === 'GET') {
      if (budgetId) {
        // Get specific budget
        const { data: budget, error } = await supabaseClient
          .from('budgets')
          .select('*')
          .eq('id', budgetId)
          .eq('user_id', user.id)
          .single()

        if (error) {
          console.error('Error fetching budget:', error)
          if (error.code === 'PGRST116') {
            return new Response(
              JSON.stringify({ error: 'Budget not found', details: 'Budget does not exist or access denied' }), 
              { 
                status: 404, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
          return new Response(
            JSON.stringify({ error: 'Failed to fetch budget', details: error.message }), 
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        return new Response(
          JSON.stringify(budget), 
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else {
        // Get all user's budgets
        const { data: budgets, error } = await supabaseClient
          .from('budgets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching budgets:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch budgets', details: error.message }), 
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        return new Response(
          JSON.stringify(budgets), 
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

    } else if (method === 'POST') {
      // Create new budget
      const body = await req.json() as BudgetData

      // Validate required fields
      if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid name', details: 'Budget name is required and cannot be empty' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validate input
      const budgetData: any = {
        user_id: user.id,
        name: body.name.trim(),
        is_active: body.is_active !== undefined ? body.is_active : true
      }

      if (body.description !== undefined) {
        if (typeof body.description !== 'string' || body.description.length > 500) {
          return new Response(
            JSON.stringify({ error: 'Invalid description', details: 'Description must be a string with maximum 500 characters' }), 
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        budgetData.description = body.description
      }

      // Validate name length
      if (body.name.length > 100) {
        return new Response(
          JSON.stringify({ error: 'Invalid name', details: 'Budget name must be 100 characters or less' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Create budget
      const { data: newBudget, error } = await supabaseClient
        .from('budgets')
        .insert(budgetData)
        .select()
        .single()

      if (error) {
        console.error('Error creating budget:', error)
        if (error.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'Budget name already exists', details: 'A budget with this name already exists' }), 
            { 
              status: 409, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        return new Response(
          JSON.stringify({ error: 'Failed to create budget', details: error.message }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify(newBudget), 
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } else if (method === 'PATCH') {
      // Update budget
      if (!budgetId) {
        return new Response(
          JSON.stringify({ error: 'Budget ID required', details: 'Budget ID must be provided as query parameter: ?id=budget-id' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const body = await req.json() as BudgetData

      // Validate input
      const allowedFields = ['name', 'description', 'is_active']
      const updateData: Partial<BudgetData> = {}
      
      for (const [key, value] of Object.entries(body)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateData[key as keyof BudgetData] = value
        }
      }

      if (Object.keys(updateData).length === 0) {
        return new Response(
          JSON.stringify({ error: 'No valid fields to update', details: 'Allowed fields: ' + allowedFields.join(', ') }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validate specific fields
      if (updateData.name !== undefined) {
        if (typeof updateData.name !== 'string' || updateData.name.trim().length === 0) {
          return new Response(
            JSON.stringify({ error: 'Invalid name', details: 'Budget name cannot be empty' }), 
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        if (updateData.name.length > 100) {
          return new Response(
            JSON.stringify({ error: 'Invalid name', details: 'Budget name must be 100 characters or less' }), 
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        updateData.name = updateData.name.trim()
      }

      if (updateData.description !== undefined && updateData.description !== null) {
        if (typeof updateData.description !== 'string' || updateData.description.length > 500) {
          return new Response(
            JSON.stringify({ error: 'Invalid description', details: 'Description must be a string with maximum 500 characters' }), 
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }

      if (updateData.is_active !== undefined && typeof updateData.is_active !== 'boolean') {
        return new Response(
          JSON.stringify({ error: 'Invalid is_active', details: 'is_active must be a boolean value' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Update budget
      const { data: updatedBudget, error } = await supabaseClient
        .from('budgets')
        .update(updateData)
        .eq('id', budgetId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating budget:', error)
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Budget not found', details: 'Budget does not exist or access denied' }), 
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        if (error.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'Budget name already exists', details: 'A budget with this name already exists' }), 
            { 
              status: 409, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        return new Response(
          JSON.stringify({ error: 'Failed to update budget', details: error.message }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify(updatedBudget), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } else if (method === 'DELETE') {
      // Delete budget
      if (!budgetId) {
        return new Response(
          JSON.stringify({ error: 'Budget ID required', details: 'Budget ID must be provided as query parameter: ?id=budget-id' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if this is the default budget
      const { data: budget, error: fetchError } = await supabaseClient
        .from('budgets')
        .select('is_default')
        .eq('id', budgetId)
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Budget not found', details: 'Budget does not exist or access denied' }), 
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        return new Response(
          JSON.stringify({ error: 'Failed to fetch budget', details: fetchError.message }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (budget.is_default) {
        return new Response(
          JSON.stringify({ error: 'Cannot delete default budget', details: 'Default budget cannot be deleted. Create another budget and set it as default first.' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Delete budget (CASCADE will handle related records)
      const { error } = await supabaseClient
        .from('budgets')
        .delete()
        .eq('id', budgetId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error deleting budget:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to delete budget', details: error.message }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ message: 'Budget deleted successfully' }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed', details: 'Supported methods: GET, POST, PATCH, DELETE' }), 
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: 'An unexpected error occurred' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/* no default export */