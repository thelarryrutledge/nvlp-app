import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  withRateLimit, 
  getClientIP, 
  checkRateLimit, 
  recordFailedRequest,
  createRateLimitHeaders 
} from '../_shared/rate-limiter.ts'

const handler = async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const clientIP = getClientIP(req);
  let email: string;

  try {
    const body = await req.json()
    email = body.email;
    const redirectTo = body.redirectTo;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with service role key for server-side operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Send magic link
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        // If no redirectTo is provided, Supabase will use its default success page
      }
    })

    if (error) {
      // Record failed authentication attempt for rate limiting
      recordFailedRequest({
        type: 'auth',
        identifier: clientIP
      });
      
      // Also record per-email rate limiting for auth attacks
      recordFailedRequest({
        type: 'auth', 
        identifier: `email:${email}`
      });

      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get current rate limit status for headers
    const rateLimitResult = checkRateLimit({
      type: 'auth',
      identifier: clientIP,
      skipOnSuccess: true, // Don't count successful requests
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Magic link sent to your email'
      }),
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          ...createRateLimitHeaders(rateLimitResult),
          'Content-Type': 'application/json' 
        }
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
serve(withRateLimit('auth', handler))