import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getUserIdFromHeaders, extractAndVerifyJWT } from '../_shared/jwt-verification.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Testing JWKS verification...')
    
    // Test JWT verification
    const authHeader = req.headers.get('authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No authorization header provided',
          message: 'Send a Bearer token to test JWKS verification'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the JWT
    const payload = await extractAndVerifyJWT(authHeader)
    console.log('JWT verified successfully:', payload.sub)
    
    // Test the convenience function
    const userId = await getUserIdFromHeaders(req.headers)
    console.log('User ID extracted:', userId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'JWKS verification working correctly!',
        userId: userId,
        tokenInfo: {
          sub: payload.sub,
          email: payload.email,
          iss: payload.iss,
          aud: payload.aud,
          exp: new Date(payload.exp * 1000).toISOString()
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('JWKS test error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: 'JWKS verification failed - check if using new asymmetric keys'
      }),
      { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})