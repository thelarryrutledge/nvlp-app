import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';",
}

// Helper function for consistent error responses
function createErrorResponse(error: string, code: string, status: number = 400, details?: unknown) {
  const errorObj: Record<string, unknown> = { error, code }
  if (details) errorObj.details = details
  
  console.error(`[AUTH ERROR] ${code}: ${error}`, details ? details : '')
  
  return new Response(
    JSON.stringify(errorObj),
    { 
      status, 
      headers: { 
        ...corsHeaders, 
        ...securityHeaders,
        'Content-Type': 'application/json' 
      } 
    }
  )
}

// Helper function for consistent success responses
function createSuccessResponse(data: unknown, status: number = 200) {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { 
        ...corsHeaders, 
        ...securityHeaders,
        'Content-Type': 'application/json' 
      } 
    }
  )
}

// Helper function to validate JWT token and get user
async function validateTokenAndGetUser(supabase: unknown, authHeader: string | null) {
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

// Input validation helpers
const ValidationRules = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 255,
    minLength: 3
  },
  password: {
    minLength: 6,
    maxLength: 72, // bcrypt limit
    pattern: /^[\x20-\x7E]*$/ // Printable ASCII characters
  },
  general: {
    maxJsonSize: 10 * 1024 // 10KB max request size
  }
}

// Sanitize and validate email
function sanitizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null
  
  // Remove leading/trailing whitespace and convert to lowercase
  const cleaned = email.trim().toLowerCase()
  
  // Check length constraints
  if (cleaned.length < ValidationRules.email.minLength || 
      cleaned.length > ValidationRules.email.maxLength) {
    return null
  }
  
  // Validate format
  if (!ValidationRules.email.pattern.test(cleaned)) {
    return null
  }
  
  return cleaned
}

// Validate password (no sanitization for security)
function validatePassword(password: any): { valid: boolean; error?: string } {
  if (typeof password !== 'string') {
    return { valid: false, error: 'Password must be a string' }
  }
  
  if (password.length < ValidationRules.password.minLength) {
    return { valid: false, error: `Password must be at least ${ValidationRules.password.minLength} characters` }
  }
  
  if (password.length > ValidationRules.password.maxLength) {
    return { valid: false, error: `Password must be less than ${ValidationRules.password.maxLength} characters` }
  }
  
  if (!ValidationRules.password.pattern.test(password)) {
    return { valid: false, error: 'Password contains invalid characters' }
  }
  
  return { valid: true }
}

// Validate request size
function validateRequestSize(req: Request): boolean {
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > ValidationRules.general.maxJsonSize) {
    return false
  }
  return true
}

// Safe JSON parsing with size limit
async function parseJsonBody(req: Request): Promise<any> {
  if (!validateRequestSize(req)) {
    throw new Error('Request body too large')
  }
  
  try {
    return await req.json()
  } catch (error) {
    throw new Error('Invalid JSON in request body')
  }
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
        const body = await parseJsonBody(req)
        const { email, password } = body

        // Validate required fields
        if (!email || !password) {
          return createErrorResponse('Email and password are required', 'MISSING_CREDENTIALS', 400)
        }

        // Sanitize and validate email
        const sanitizedEmail = sanitizeEmail(email)
        if (!sanitizedEmail) {
          return createErrorResponse('Invalid email format', 'INVALID_EMAIL', 400)
        }

        // Validate password
        const passwordValidation = validatePassword(password)
        if (!passwordValidation.valid) {
          return createErrorResponse(passwordValidation.error!, 'INVALID_PASSWORD', 400)
        }

        console.log(`[AUTH LOGIN] Attempting login for: ${sanitizedEmail}`)

        // Sign in user with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password,
        })

        if (error) {
          console.error(`[AUTH LOGIN ERROR] ${error.code}: ${error.message}`)
          // Don't leak information about whether email exists
          return createErrorResponse('Invalid email or password', 'INVALID_CREDENTIALS', 401)
        }

        console.log(`[AUTH SUCCESS] Login successful for: ${sanitizedEmail}`)

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
      } catch (parseError: any) {
        console.error('[AUTH ERROR] Failed to process login request:', parseError)
        return createErrorResponse(
          parseError.message || 'Invalid request',
          'INVALID_REQUEST',
          400
        )
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
        const body = await parseJsonBody(req)
        const { refresh_token } = body
        
        // Validate refresh token is provided and is a string
        if (!refresh_token || typeof refresh_token !== 'string') {
          return createErrorResponse('Valid refresh token is required', 'MISSING_REFRESH_TOKEN', 400)
        }

        // Basic token validation - ensure it's not empty and has reasonable length
        if (refresh_token.length < 10 || refresh_token.length > 500) {
          return createErrorResponse('Invalid refresh token', 'INVALID_TOKEN', 400)
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
        const body = await parseJsonBody(req)
        const { email, password, display_name } = body

        // Validate required fields
        if (!email || !password) {
          return createErrorResponse('Email and password are required', 'MISSING_CREDENTIALS', 400)
        }

        // Sanitize and validate email
        const sanitizedEmail = sanitizeEmail(email)
        if (!sanitizedEmail) {
          return createErrorResponse('Invalid email format', 'INVALID_EMAIL', 400)
        }

        // Validate password
        const passwordValidation = validatePassword(password)
        if (!passwordValidation.valid) {
          return createErrorResponse(passwordValidation.error!, 'INVALID_PASSWORD', 400)
        }

        console.log(`[AUTH REGISTER] Attempting registration for: ${sanitizedEmail}`, {
          hasDisplayName: !!display_name
        })

        // Register user with Supabase Auth
        const signUpData: any = {
          email: sanitizedEmail,
          password,
        }

        // Add user metadata if display_name is provided
        if (display_name) {
          signUpData.options = {
            data: {
              display_name: display_name
            }
          }
        }

        const { data, error } = await supabase.auth.signUp(signUpData)

        if (error) {
          console.error(`[AUTH REGISTER ERROR] ${error.code}: ${error.message}`)
          // Generic error to prevent email enumeration
          return createErrorResponse(
            'Registration failed. Please try again.',
            error.code || 'REGISTRATION_FAILED',
            400
          )
        }

        console.log(`[AUTH SUCCESS] Registration successful for: ${sanitizedEmail}`)

        // Return success response
        return createSuccessResponse({
          success: true,
          message: 'User registered successfully. Please check your email to confirm your account.',
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
      } catch (parseError: any) {
        console.error('[AUTH ERROR] Failed to process register request:', parseError)
        return createErrorResponse(
          parseError.message || 'Invalid request',
          'INVALID_REQUEST',
          400
        )
      }
    }
    
    else if (path === '/auth/reset-password' && method === 'POST') {
      try {
        const body = await parseJsonBody(req)
        const { email } = body
        
        // Validate email is provided
        if (!email) {
          return createErrorResponse('Email is required', 'MISSING_EMAIL', 400)
        }

        // Sanitize and validate email
        const sanitizedEmail = sanitizeEmail(email)
        if (!sanitizedEmail) {
          return createErrorResponse('Invalid email format', 'INVALID_EMAIL', 400)
        }

        console.log(`[AUTH RESET] Initiating password reset for: ${sanitizedEmail}`)

        // Send password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
          redirectTo: 'https://nvlp.app/auth/reset.html'
        })

        if (error) {
          console.error(`[AUTH RESET ERROR] ${error.message}`)
          return createErrorResponse(error.message, 'RESET_FAILED', 400)
        }

        console.log(`[AUTH SUCCESS] Password reset email sent to: ${email}`)

        // Always return success to prevent email enumeration
        return createSuccessResponse({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        })
      } catch (parseError) {
        console.error('[AUTH ERROR] Failed to parse reset request:', parseError)
        return createErrorResponse('Invalid request body', 'INVALID_JSON', 400)
      }
    }
    
    else if (path === '/auth/update-password' && method === 'POST') {
      try {
        const body = await parseJsonBody(req)
        const { password } = body
        
        // Validate password is provided
        if (!password) {
          return createErrorResponse('Password is required', 'MISSING_PASSWORD', 400)
        }

        // Validate password
        const passwordValidation = validatePassword(password)
        if (!passwordValidation.valid) {
          return createErrorResponse(passwordValidation.error!, 'INVALID_PASSWORD', 400)
        }

        // Get the authorization header
        const authHeader = req.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return createErrorResponse('Missing or invalid authorization header', 'UNAUTHORIZED', 401)
        }

        const token = authHeader.replace('Bearer ', '')
        
        console.log(`[AUTH UPDATE PASSWORD] Attempting password update with recovery token`)

        // Create a new Supabase client with the recovery token
        const authClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          }
        )

        // Set the session with the recovery token
        const { data: sessionData, error: sessionError } = await authClient.auth.setSession({
          access_token: token,
          refresh_token: token
        })

        if (sessionError) {
          console.error(`[AUTH UPDATE PASSWORD ERROR] Session error: ${sessionError.message}`)
          return createErrorResponse('Invalid or expired recovery token', 'INVALID_RECOVERY_TOKEN', 401)
        }

        // Update user password
        const { error } = await authClient.auth.updateUser({
          password: password
        })

        if (error) {
          console.error(`[AUTH UPDATE PASSWORD ERROR] ${error.message}`)
          return createErrorResponse(error.message, 'UPDATE_PASSWORD_FAILED', 400)
        }

        const userEmail = sessionData?.user?.email || 'unknown'
        console.log(`[AUTH SUCCESS] Password updated for user: ${userEmail}`)

        return createSuccessResponse({
          success: true,
          message: 'Password updated successfully'
        })
      } catch (parseError) {
        console.error('[AUTH ERROR] Failed to parse update password request:', parseError)
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
          'GET /auth/profile - Get user info (protected)',
          'POST /auth/reset-password - Send password reset email',
          'POST /auth/update-password - Update user password (protected)'
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