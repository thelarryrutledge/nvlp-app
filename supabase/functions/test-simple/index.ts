import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Just test if we can access environment variables
    const hasSupabaseUrl = !!Deno.env.get('SUPABASE_URL')
    const hasAnonKey = !!Deno.env.get('SUPABASE_ANON_KEY')
    const hasServiceKey = !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    const anonKeyPrefix = Deno.env.get('SUPABASE_ANON_KEY')?.substring(0, 20) + '...'
    const serviceKeyPrefix = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.substring(0, 20) + '...'

    return new Response(
      JSON.stringify({ 
        message: 'Environment test successful',
        hasSupabaseUrl,
        hasAnonKey,
        hasServiceKey,
        anonKeyPrefix,
        serviceKeyPrefix,
        authHeader: req.headers.get('authorization') ? 'Present' : 'Missing'
      }, null, 2),
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