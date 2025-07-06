// User Profile CRUD Edge Function
// Handles GET, PATCH operations for user profiles

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
}

interface ProfileData {
  display_name?: string;
  timezone?: string;
  currency_code?: string;
  date_format?: string;
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

    if (method === 'GET') {
      // Get user profile
      const { data: profile, error } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch profile', details: error.message }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (!profile) {
        return new Response(
          JSON.stringify({ error: 'Profile not found', details: 'User profile does not exist' }), 
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify(profile), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } else if (method === 'PATCH') {
      // Update user profile
      const body = await req.json() as ProfileData

      // Validate input
      const allowedFields = ['display_name', 'timezone', 'currency_code', 'date_format']
      const updateData: Partial<ProfileData> = {}
      
      for (const [key, value] of Object.entries(body)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateData[key as keyof ProfileData] = value
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
      if (updateData.display_name && (updateData.display_name.trim().length < 2 || updateData.display_name.length > 100)) {
        return new Response(
          JSON.stringify({ error: 'Invalid display_name', details: 'Display name must be 2-100 characters' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (updateData.timezone && !updateData.timezone.match(/^[A-Za-z_]+\/[A-Za-z_]+$|^UTC$/)) {
        return new Response(
          JSON.stringify({ error: 'Invalid timezone', details: 'Timezone must be in format like "America/New_York" or "UTC"' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (updateData.currency_code && !updateData.currency_code.match(/^[A-Z]{3}$/)) {
        return new Response(
          JSON.stringify({ error: 'Invalid currency_code', details: 'Currency code must be 3 uppercase letters like "USD"' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (updateData.date_format && !['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].includes(updateData.date_format)) {
        return new Response(
          JSON.stringify({ error: 'Invalid date_format', details: 'Date format must be one of: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Update profile
      const { data: updatedProfile, error } = await supabaseClient
        .from('user_profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update profile', details: error.message }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify(updatedProfile), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed', details: 'Supported methods: GET, PATCH' }), 
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