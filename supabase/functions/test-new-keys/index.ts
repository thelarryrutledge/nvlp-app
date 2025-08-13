import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Testing with new publishable/secret keys...')
    
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No Bearer token provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.substring(7)
    
    // Get the publishable key - it should work as the anon key replacement
    const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')
    const url = Deno.env.get('SUPABASE_URL')
    
    console.log('Key prefix:', publishableKey?.substring(0, 20))
    console.log('Is new format key:', publishableKey?.startsWith('sb_publishable_'))

    // Initialize Supabase client with new publishable key
    // The key should still be in SUPABASE_ANON_KEY env var
    const supabase = createClient(
      url!,
      publishableKey!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: publishableKey! // Also pass as apikey header
          }
        }
      }
    )

    console.log('Testing auth.getUser()...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('Auth error:', userError)
      
      // Try alternative: decode JWT manually and use service role key
      console.log('Trying with service role key...')
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      console.log('Service key prefix:', serviceKey?.substring(0, 20))
      
      const supabaseAdmin = createClient(
        url!,
        serviceKey!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      
      // Decode the JWT to get user ID
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      
      // Get user with admin client
      const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.getUserById(payload.sub)
      
      if (adminError) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Both methods failed',
            publishableError: userError.message,
            adminError: adminError.message,
            keyFormats: {
              publishable: publishableKey?.startsWith('sb_publishable_'),
              secret: serviceKey?.startsWith('sb_secret_')
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Working with service role key!',
          userId: adminUser.user?.id,
          email: adminUser.user?.email,
          method: 'admin_client'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Working with publishable key!',
        userId: user.id,
        email: user.email,
        method: 'standard_client'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Test error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})