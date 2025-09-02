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
import { 
  validateEmail, 
  validateString,
  createValidationErrorResponse,
  sanitizeString
} from '../_shared/validation.ts'
import { withSecurity } from '../_shared/security-headers.ts'

interface AuthRequest {
  action: 'signup' | 'signin' | 'signout' | 'signout_all' | 'reset_password' | 'resend_verification'
  email?: string
  password?: string
  deviceId?: string
  deviceName?: string
  deviceType?: string
}

const handler = async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const clientIP = getClientIP(req);

  try {
    const body: AuthRequest = await req.json()
    const { action } = body

    // Create Supabase client
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

    switch (action) {
      case 'signup': {
        // Validate email and password
        const emailError = validateEmail(body.email);
        if (emailError) {
          return createValidationErrorResponse([emailError], corsHeaders);
        }
        
        const passwordError = validateString(body.password, 'password', { 
          required: true, 
          minLength: 8,
          maxLength: 72 // bcrypt limit
        });
        if (passwordError) {
          return createValidationErrorResponse([passwordError], corsHeaders);
        }

        const email = sanitizeString(body.email!);
        const password = body.password!;

        // Sign up the user
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${Deno.env.get('PUBLIC_URL') || 'https://nvlp.app'}/email-verified`
          }
        })

        if (error) {
          recordFailedRequest({
            type: 'auth',
            identifier: clientIP
          });
          
          return new Response(
            JSON.stringify({ error: error.message }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Send custom verification email using Resend
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        if (resendApiKey) {
          const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify your NVLP account</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', 'Inter', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.4;
            color: #1F2029;
            background: linear-gradient(135deg, #F8F8F8 0%, #F5F5F7 100%);
            margin: 0;
            padding: 0;
        }
        .email-wrapper {
            width: 100%;
            background: linear-gradient(135deg, #F8F8F8 0%, #F5F5F7 100%);
            padding: 48px 20px;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #FFFFFF;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0px 4px 40px rgba(0, 0, 0, 0.08);
        }
        .header {
            background: linear-gradient(135deg, #7C56FE 0%, #6A31F6 100%);
            padding: 24px 32px 20px;
            text-align: center;
            color: #FFFFFF;
        }
        .header h1 {
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 4px;
            letter-spacing: -0.5px;
        }
        .content-section {
            padding: 40px 32px;
        }
        .greeting {
            font-size: 20px;
            font-weight: 600;
            color: #1F2029;
            margin-bottom: 12px;
        }
        .message {
            font-size: 15px;
            color: #7E808F;
            line-height: 1.6;
            margin-bottom: 32px;
        }
        .verify-button {
            display: inline-block;
            background: linear-gradient(135deg, #6A31F6 0%, #7C56FE 100%);
            color: #FFFFFF !important;
            text-decoration: none;
            padding: 16px 48px;
            border-radius: 14px;
            font-size: 17px;
            font-weight: 600;
            box-shadow: 0px 4px 24px rgba(106, 49, 246, 0.3);
        }
        .footer {
            background: #F8F8F8;
            padding: 32px;
            text-align: center;
            color: #ADAEB8;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="header">
                <h1>Welcome to NVLP!</h1>
                <p>Please verify your email address</p>
            </div>
            
            <div class="content-section">
                <h2 class="greeting">Hi there,</h2>
                <p class="message">
                    Thanks for signing up for NVLP! Please click the button below to verify your email address and activate your account.
                </p>
                
                <div style="text-align: center; margin: 40px 0;">
                    <a href="{{verification_link}}" class="verify-button">Verify Email Address</a>
                </div>
                
                <p style="font-size: 14px; color: #7E808F;">
                    Once verified, you can return to the NVLP app and sign in with your email and password.
                </p>
            </div>
            
            <div class="footer">
                <p>If you didn't create an account with NVLP, you can safely ignore this email.</p>
                <p style="margin-top: 16px;">© 2025 NVLP - Virtual Envelope Budgeting</p>
            </div>
        </div>
    </div>
</body>
</html>`

          // Note: We would need to generate the verification link here
          // For now, using the default Supabase email
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Account created! Please check your email to verify your account.',
            userId: data.user?.id
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      case 'signin': {
        // Validate email and password
        const emailError = validateEmail(body.email);
        if (emailError) {
          return createValidationErrorResponse([emailError], corsHeaders);
        }
        
        const passwordError = validateString(body.password, 'password', { 
          required: true,
          minLength: 1 // Just check it exists for signin
        });
        if (passwordError) {
          return createValidationErrorResponse([passwordError], corsHeaders);
        }

        const email = sanitizeString(body.email!);
        const password = body.password!;
        const deviceId = body.deviceId ? sanitizeString(body.deviceId) : null;
        const deviceName = body.deviceName ? sanitizeString(body.deviceName) : null;
        const deviceType = body.deviceType ? sanitizeString(body.deviceType) : null;

        // Sign in the user
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password
        })

        if (error) {
          recordFailedRequest({
            type: 'auth',
            identifier: clientIP
          });
          recordFailedRequest({
            type: 'auth', 
            identifier: `email:${email}`
          });

          // Check if email not verified
          if (error.message.includes('Email not confirmed')) {
            return new Response(
              JSON.stringify({ 
                error: 'Please verify your email before signing in.',
                code: 'EMAIL_NOT_VERIFIED'
              }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }

          return new Response(
            JSON.stringify({ error: error.message }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Create session record if device info provided
        if (deviceId && data.session) {
          const { error: sessionError } = await supabaseClient
            .from('user_sessions')
            .upsert({
              user_id: data.user.id,
              session_id: data.session.access_token,
              device_id: deviceId,
              device_name: deviceName,
              device_type: deviceType,
              is_active: true,
              last_activity: new Date().toISOString()
            }, {
              onConflict: 'user_id,device_id'
            })

          if (sessionError) {
            console.error('Failed to create session record:', sessionError)
          }

          // Check if this is a new device
          const { data: existingSessions } = await supabaseClient
            .from('user_sessions')
            .select('device_id')
            .eq('user_id', data.user.id)
            .neq('device_id', deviceId)
            .eq('is_active', true)

          if (existingSessions && existingSessions.length > 0) {
            // Send new device notification
            await supabaseClient.functions.invoke('send-device-notification', {
              body: {
                userId: data.user.id,
                deviceName: deviceName || 'Unknown Device',
                deviceType: deviceType || 'Unknown'
              }
            })
          }
        }

        // Get current rate limit status for headers
        const rateLimitResult = checkRateLimit({
          type: 'auth',
          identifier: clientIP,
          skipOnSuccess: true,
        });

        return new Response(
          JSON.stringify({ 
            success: true,
            session: data.session,
            user: data.user
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
      }

      case 'signout': {
        // Get authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: 'No authorization header' }),
            { 
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        const token = authHeader.replace('Bearer ', '')
        
        // Sign out the current session
        const { error } = await supabaseClient.auth.admin.signOut(token)

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Mark session as inactive
        await supabaseClient
          .from('user_sessions')
          .update({ 
            is_active: false,
            revoked_at: new Date().toISOString()
          })
          .eq('session_id', token)

        return new Response(
          JSON.stringify({ success: true }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      case 'signout_all': {
        // Get authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: 'No authorization header' }),
            { 
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        const token = authHeader.replace('Bearer ', '')
        const deviceId = body.deviceId ? sanitizeString(body.deviceId) : null;

        // Get user from token
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
        
        if (userError || !user) {
          return new Response(
            JSON.stringify({ error: 'Invalid token' }),
            { 
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Revoke all other sessions
        const { error } = await supabaseClient
          .from('user_sessions')
          .update({ 
            is_active: false,
            revoked_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .neq('device_id', deviceId || '')

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'All other devices have been signed out'
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      case 'reset_password': {
        // Validate email
        const emailError = validateEmail(body.email);
        if (emailError) {
          return createValidationErrorResponse([emailError], corsHeaders);
        }

        const email = sanitizeString(body.email!);

        // Request password reset
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: `${Deno.env.get('PUBLIC_URL') || 'https://nvlp.app'}/reset-password`
        })

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Password reset email sent'
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      case 'resend_verification': {
        // Validate email
        const emailError = validateEmail(body.email);
        if (emailError) {
          return createValidationErrorResponse([emailError], corsHeaders);
        }

        const email = sanitizeString(body.email!);

        // Resend verification email
        const { error } = await supabaseClient.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: `${Deno.env.get('PUBLIC_URL') || 'https://nvlp.app'}/email-verified`
          }
        })

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Verification email sent'
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }
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

// Apply security middleware and rate limiting to the handler
serve(withSecurity(withRateLimit('auth', handler)))