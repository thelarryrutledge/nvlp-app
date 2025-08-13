import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No Bearer token provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.substring(7)
    const results: any = {}

    console.log('Testing multiple JWT verification methods...')

    // Method 1: Traditional auth.getUser() with anon key
    try {
      console.log('Method 1: Testing auth.getUser() with anon key...')
      const supabase1 = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        {
          auth: { autoRefreshToken: false, persistSession: false },
          global: { headers: { Authorization: `Bearer ${token}` } }
        }
      )
      
      const { data: { user }, error } = await supabase1.auth.getUser()
      results.method1_getUser = { 
        success: !error && !!user, 
        error: error?.message,
        userId: user?.id 
      }
    } catch (e) {
      results.method1_getUser = { success: false, error: e.message }
    }

    // Method 2: Try getClaims() if available
    try {
      console.log('Method 2: Testing getClaims()...')
      const supabase2 = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      )
      
      // Check if getClaims exists
      if (typeof supabase2.auth.getClaims === 'function') {
        const { data: claims, error } = await supabase2.auth.getClaims(token)
        results.method2_getClaims = { 
          success: !error && !!claims, 
          error: error?.message,
          claims: claims 
        }
      } else {
        results.method2_getClaims = { success: false, error: 'getClaims method not available' }
      }
    } catch (e) {
      results.method2_getClaims = { success: false, error: e.message }
    }

    // Method 3: Direct token validation with service role
    try {
      console.log('Method 3: Testing with service role key...')
      const supabase3 = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      
      // Manually decode the token to get user ID
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      
      if (payload.sub) {
        // Try to get user by ID using service role
        const { data: user, error } = await supabase3.auth.admin.getUserById(payload.sub)
        results.method3_serviceRole = { 
          success: !error && !!user, 
          error: error?.message,
          userId: user?.user?.id,
          decodedPayload: payload
        }
      } else {
        results.method3_serviceRole = { success: false, error: 'No sub in token payload' }
      }
    } catch (e) {
      results.method3_serviceRole = { success: false, error: e.message }
    }

    // Method 4: Raw JWKS verification
    try {
      console.log('Method 4: Testing raw JWKS fetch...')
      const jwksResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/.well-known/jwks.json`)
      const jwks = await jwksResponse.json()
      
      results.method4_jwks = { 
        success: jwksResponse.ok, 
        jwks: jwks,
        jwksUrl: `${Deno.env.get('SUPABASE_URL')}/auth/v1/.well-known/jwks.json`
      }
    } catch (e) {
      results.method4_jwks = { success: false, error: e.message }
    }

    // Token info
    try {
      const header = JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')))
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      results.tokenInfo = { header, payload }
    } catch (e) {
      results.tokenInfo = { error: 'Could not decode token' }
    }

    return new Response(
      JSON.stringify({ results }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Test error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})