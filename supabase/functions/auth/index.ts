import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
}

// Helper function for consistent error responses
function createErrorResponse(error: string, code: string, status: number = 400, details?: any) {
  const errorObj: any = { error, code }
  if (details) errorObj.details = details
  
  console.error(`[AUTH ERROR] ${code}: ${error}`, details ? details : '')
  
  return new Response(
    JSON.stringify(errorObj),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

// Helper function for consistent success responses
function createSuccessResponse(data: any, status: number = 200) {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

// Helper function to validate JWT token and get user
async function validateTokenAndGetUser(supabase: any, authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { error: 'Missing or invalid authorization header', code: 'UNAUTHORIZED', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    throw { error: 'Invalid or expired token', code: 'INVALID_TOKEN', status: 401 }
  }

  return user
}

console.log("Auth function started")

serve(async (req) => {
  const startTime = Date.now()
  const method = req.method
  const url = new URL(req.url)
  const path = url.pathname
  
  console.log(`[AUTH REQUEST] ${method} ${path}`)

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    console.log(`[AUTH CORS] Preflight request handled for ${path}`)
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Route handling
    // Protected endpoint - requires valid JWT token
    if (path === '/auth/profile' && method === 'GET') {
      try {
        const user = await validateTokenAndGetUser(supabase, req.headers.get('authorization'))
        
        console.log(`[AUTH SUCCESS] Profile retrieved for user: ${user.email}`)
        
        return createSuccessResponse({
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
        })
      } catch (authError: any) {
        return createErrorResponse(authError.error, authError.code, authError.status)
      }
    }
    
    else if (path === '/auth/login' && method === 'POST') {
      try {
        const { email, password } = await req.json()

        // Validate input
        if (!email || !password) {
          return createErrorResponse('Email and password are required', 'MISSING_CREDENTIALS', 400)
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          return createErrorResponse('Invalid email format', 'INVALID_EMAIL', 400)
        }

        console.log(`[AUTH LOGIN] Attempting login for: ${email}`)

        // Sign in user with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })

        if (error) {
          console.error(`[AUTH LOGIN ERROR] ${error.code}: ${error.message}`)
          return createErrorResponse(error.message, error.code || 'LOGIN_FAILED', 401)
        }

        console.log(`[AUTH SUCCESS] Login successful for: ${email}`)

        // Return success response with session
        return createSuccessResponse({
          success: true,
          message: 'Login successful',
          user: {
            id: data.user?.id,
            email: data.user?.email,
            email_confirmed_at: data.user?.email_confirmed_at,
          },
          session: {
            access_token: data.session?.access_token,
            refresh_token: data.session?.refresh_token,
            token_type: data.session?.token_type,
            expires_in: data.session?.expires_in,
            expires_at: data.session?.expires_at,
          }
        })
      } catch (parseError) {
        console.error('[AUTH ERROR] Failed to parse login request:', parseError)
        return createErrorResponse('Invalid request body', 'INVALID_JSON', 400)
      }
    }
    
    else if (path === '/auth/logout' && method === 'POST') {
      try {
        const user = await validateTokenAndGetUser(supabase, req.headers.get('authorization'))
        
        console.log(`[AUTH LOGOUT] Attempting logout for user: ${user.email}`)
        
        // Sign out the user
        const { error } = await supabase.auth.signOut()
        
        if (error) {
          console.error(`[AUTH LOGOUT ERROR] ${error.message}`)
          return createErrorResponse(error.message, 'LOGOUT_FAILED', 400)
        }

        console.log(`[AUTH SUCCESS] Logout successful for user: ${user.email}`)
        
        return createSuccessResponse({
          success: true,
          message: 'Logout successful'
        })
      } catch (authError: any) {
        return createErrorResponse(authError.error, authError.code, authError.status)
      }
    }
    
    else if (path === '/auth/refresh' && method === 'POST') {
      try {
        const { refresh_token } = await req.json()
        
        if (!refresh_token) {
          return createErrorResponse('Refresh token is required', 'MISSING_REFRESH_TOKEN', 400)
        }

        console.log(`[AUTH REFRESH] Attempting token refresh`)

        // Refresh the session
        const { data, error } = await supabase.auth.refreshSession({ refresh_token })
        
        if (error || !data.session) {
          console.error(`[AUTH REFRESH ERROR] ${error?.message || 'Unknown error'}`)
          return createErrorResponse(
            error?.message || 'Failed to refresh session',
            'REFRESH_FAILED',
            401
          )
        }

        console.log(`[AUTH SUCCESS] Token refresh successful for user: ${data.user?.email}`)

        // Return new session
        return createSuccessResponse({
          success: true,
          message: 'Session refreshed successfully',
          user: {
            id: data.user?.id,
            email: data.user?.email,
            email_confirmed_at: data.user?.email_confirmed_at,
          },
          session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            token_type: data.session.token_type,
            expires_in: data.session.expires_in,
            expires_at: data.session.expires_at,
          }
        })
      } catch (parseError) {
        console.error('[AUTH ERROR] Failed to parse refresh request:', parseError)
        return createErrorResponse('Invalid request body', 'INVALID_JSON', 400)
      }
    }
    
    else if (path === '/auth/register' && method === 'POST') {
      try {
        const { email, password } = await req.json()

        // Validate input
        if (!email || !password) {
          return createErrorResponse('Email and password are required', 'MISSING_CREDENTIALS', 400)
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          return createErrorResponse('Invalid email format', 'INVALID_EMAIL', 400)
        }

        // Password validation
        if (password.length < 6) {
          return createErrorResponse('Password must be at least 6 characters', 'WEAK_PASSWORD', 400)
        }

        console.log(`[AUTH REGISTER] Attempting registration for: ${email}`)

        // Register user with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        })

        if (error) {
          console.error(`[AUTH REGISTER ERROR] ${error.code}: ${error.message}`)
          return createErrorResponse(error.message, error.code || 'REGISTRATION_FAILED', 400)
        }

        console.log(`[AUTH SUCCESS] Registration successful for: ${email}`)

        // Return success response
        return createSuccessResponse({
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
        }, 201)
      } catch (parseError) {
        console.error('[AUTH ERROR] Failed to parse register request:', parseError)
        return createErrorResponse('Invalid request body', 'INVALID_JSON', 400)
      }
    }

    // Handle unsupported routes
    console.log(`[AUTH ERROR] Route not found: ${method} ${path}`)
    return createErrorResponse(
      `Route not found: ${method} ${path}`,
      'ROUTE_NOT_FOUND',
      404,
      {
        available_routes: [
          'POST /auth/register - Create user account',
          'POST /auth/login - Authenticate and get tokens',
          'POST /auth/logout - Invalidate session (protected)',
          'POST /auth/refresh - Refresh access token',
          'GET /auth/profile - Get user info (protected)'
        ]
      }
    )

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[AUTH FATAL ERROR] Request failed after ${duration}ms:`, error)
    
    return createErrorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500,
      {
        timestamp: new Date().toISOString(),
        request: `${method} ${path}`,
        duration: `${duration}ms`
      }
    )
  } finally {
    const duration = Date.now() - startTime
    console.log(`[AUTH REQUEST COMPLETE] ${method} ${path} - ${duration}ms`)
  }
})