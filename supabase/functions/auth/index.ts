import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

console.log("Auth function started")

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const url = new URL(req.url)
    const path = url.pathname
    const method = req.method

    // Route handling
    // Protected endpoint - requires valid JWT token
    if (path === '/auth/profile' && method === 'GET') {
      // Get the authorization header
      const authHeader = req.headers.get('authorization')
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing or invalid authorization header',
            code: 'UNAUTHORIZED'
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Extract the JWT token
      const token = authHeader.replace('Bearer ', '')
      
      // Verify the JWT token and get user
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      if (error || !user) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Return user profile
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Profile retrieved successfully',
          user: {
            id: user.id,
            email: user.email,
            email_confirmed_at: user.email_confirmed_at,
            created_at: user.created_at,
            updated_at: user.updated_at,
            role: user.role,
            app_metadata: user.app_metadata,
            user_metadata: user.user_metadata
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    else if (path === '/auth/login' && method === 'POST') {
      const { email, password } = await req.json()

      // Validate input
      if (!email || !password) {
        return new Response(
          JSON.stringify({ 
            error: 'Email and password are required',
            code: 'MISSING_CREDENTIALS'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Sign in user with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return new Response(
          JSON.stringify({ 
            error: error.message,
            code: error.code || 'LOGIN_FAILED'
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Return success response with session
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Login successful',
          user: {
            id: data.user?.id,
            email: data.user?.email,
            email_confirmed_at: data.user?.email_confirmed_at,
          },
          session: {
            access_token: data.session?.access_token,
            token_type: data.session?.token_type,
            expires_in: data.session?.expires_in,
            expires_at: data.session?.expires_at,
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    else if (path === '/auth/register' && method === 'POST') {
      const { email, password } = await req.json()

      // Validate input
      if (!email || !password) {
        return new Response(
          JSON.stringify({ 
            error: 'Email and password are required',
            code: 'MISSING_CREDENTIALS'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid email format',
            code: 'INVALID_EMAIL'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Password validation
      if (password.length < 6) {
        return new Response(
          JSON.stringify({ 
            error: 'Password must be at least 6 characters',
            code: 'WEAK_PASSWORD'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Register user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        return new Response(
          JSON.stringify({ 
            error: error.message,
            code: error.code || 'REGISTRATION_FAILED'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          message: 'User registered successfully',
          user: {
            id: data.user?.id,
            email: data.user?.email,
            email_confirmed_at: data.user?.email_confirmed_at,
          },
          session: data.session ? {
            access_token: data.session.access_token,
            token_type: data.session.token_type,
            expires_in: data.session.expires_in,
            expires_at: data.session.expires_at,
          } : null
        }),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle unsupported routes
    return new Response(
      JSON.stringify({ 
        error: 'Not found',
        code: 'ROUTE_NOT_FOUND',
        available_routes: ['/auth/register', '/auth/login', '/auth/profile (GET, protected)']
      }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Auth function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})