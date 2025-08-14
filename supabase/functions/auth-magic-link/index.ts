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

const handler = async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const clientIP = getClientIP(req);
  let email: string;

  try {
    const body = await req.json()
    
    // Validate email
    const emailError = validateEmail(body.email);
    if (emailError) {
      return createValidationErrorResponse([emailError], corsHeaders);
    }
    
    // Validate redirectTo if provided
    const redirectToError = validateString(body.redirectTo, 'redirectTo', { 
      required: false, 
      maxLength: 2048 
    });
    if (redirectToError) {
      return createValidationErrorResponse([redirectToError], corsHeaders);
    }
    
    // Use sanitized values
    email = sanitizeString(body.email);
    const redirectTo = body.redirectTo ? sanitizeString(body.redirectTo) : undefined;

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

    // Generate magic link using Supabase Admin API
    const { data, error } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: redirectTo || 'https://nvlp.app/auth/callback'
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

    // Now send our custom email with the magic link
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable not set')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Enhanced magic link template (inline)
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in to NVLP</title>
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
        .header img {
            height: 32px;
            filter: brightness(0) invert(1);
            margin-bottom: 16px;
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
        .magic-link-container {
            text-align: center;
            margin: 40px 0;
        }
        .magic-link-button {
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
        .link-copy {
            background: #FFFFFF;
            border: 1px solid #E8E9ED;
            border-radius: 12px;
            padding: 16px;
            margin: 24px 0;
            word-break: break-all;
            font-family: monospace;
            font-size: 13px;
            color: #6A31F6;
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="header">
                <img src="https://nvlp.app/assets/logo/FullLogo_Transparent_NoBuffer.png" alt="NVLP">
                <h1>Welcome Back!</h1>
                <p>Sign in to your NVLP account</p>
            </div>
            
            <div class="content-section">
                <h2 class="greeting">Hi {{user_name}},</h2>
                <p class="message">
                    You requested a magic link to sign in to your NVLP account. Click the button below to securely access your virtual envelope budgeting dashboard.
                </p>
                
                <div class="magic-link-container">
                    <a href="{{magic_link}}" class="magic-link-button">Sign in to NVLP</a>
                </div>
                
                <p style="font-size: 14px; color: #7E808F; margin-bottom: 12px;">Can't click the button? Copy and paste this link into your browser:</p>
                <div class="link-copy">{{magic_link}}</div>
            </div>
            
            <div class="footer">
                <p>If you didn't request this email, you can safely ignore it. The link will expire automatically.</p>
                <p style="margin-top: 16px;">© 2025 NVLP - Virtual Envelope Budgeting<br>This email was sent to {{user_email}}</p>
            </div>
        </div>
    </div>
</body>
</html>`

    // Replace template variables
    const processedHtml = htmlTemplate
      .replace(/{{user_name}}/g, email.split('@')[0]) // Use email prefix as name fallback
      .replace(/{{user_email}}/g, email)
      .replace(/{{magic_link}}/g, data.properties?.action_link || '')
      .replace(/{{app_url}}/g, 'https://nvlp.app')

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NVLP <noreply@nvlp.app>',
        to: [email],
        subject: 'Sign in to your NVLP account',
        html: processedHtml,
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json() as { message?: string }
      console.error('Resend API error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { 
          status: 500,
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

// Apply security middleware and rate limiting to the handler
serve(withSecurity(withRateLimit('auth', handler)))