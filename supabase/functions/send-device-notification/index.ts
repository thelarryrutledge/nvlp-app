import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface NotificationRequest {
  user_name: string
  user_email: string
  device_name: string
  signin_time: string
  location: string
  ip_address: string
  app_url?: string
}

// Generate HTML email template
function generateDeviceNotificationHTML(data: NotificationRequest): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Device Sign-in - NVLP</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .device-info { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .info-row { margin: 10px 0; }
        .label { font-weight: 600; color: #374151; }
        .value { color: #6b7280; }
        .warning { background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .steps { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .step { margin: 8px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
        .button { display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 New Device Sign-in</h1>
        </div>
        
        <div class="content">
            <p>Hi ${data.user_name},</p>
            
            <p>We noticed a new sign-in to your NVLP account from a device we haven't seen before:</p>
            
            <div class="device-info">
                <div class="info-row">
                    <span class="label">Device:</span> 
                    <span class="value">${data.device_name}</span>
                </div>
                <div class="info-row">
                    <span class="label">Time:</span> 
                    <span class="value">${data.signin_time}</span>
                </div>
                <div class="info-row">
                    <span class="label">Location:</span> 
                    <span class="value">${data.location}</span>
                </div>
                <div class="info-row">
                    <span class="label">IP Address:</span> 
                    <span class="value">${data.ip_address}</span>
                </div>
            </div>
            
            <p><strong>If this was you</strong>, no action is needed. You're all set!</p>
            
            <div class="warning">
                <p><strong>If this wasn't you:</strong></p>
                <div class="steps">
                    <div class="step">1. Open the NVLP app immediately</div>
                    <div class="step">2. Go to Settings → Security → Active Sessions</div>
                    <div class="step">3. Sign out the unknown device</div>
                    <div class="step">4. Consider changing your email password</div>
                </div>
            </div>
            
            <p style="text-align: center;">
                <a href="${data.app_url}" class="button">Open NVLP App</a>
            </p>
            
            <div class="footer">
                <p>This email was sent to ${data.user_email}</p>
                <p>NVLP Security Team</p>
                <p><a href="${data.app_url}">nvlp.app</a></p>
            </div>
        </div>
    </div>
</body>
</html>
`
}

// Generate plain text email template
function generateDeviceNotificationText(data: NotificationRequest): string {
  return `
🔐 NEW DEVICE SIGN-IN TO YOUR NVLP ACCOUNT

Hi ${data.user_name},

We noticed a new sign-in to your NVLP account from a device we haven't seen before:

DEVICE DETAILS:
- Device: ${data.device_name}
- Time: ${data.signin_time}  
- Location: ${data.location}
- IP Address: ${data.ip_address}

IF THIS WAS YOU:
No action is needed. You're all set!

IF THIS WASN'T YOU:
1. Open the NVLP app immediately
2. Go to Settings → Security → Active Sessions
3. Sign out the unknown device
4. Consider changing your email password

Open NVLP: ${data.app_url}

---
This email was sent to ${data.user_email}
NVLP Security Team
${data.app_url}
`
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const body: NotificationRequest = await req.json()
    
    // Validate required fields
    const requiredFields = ['user_name', 'user_email', 'device_name', 'signin_time', 'location', 'ip_address']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          missing: missingFields 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Sending new device notification for:', body.user_email)

    // For now, let's use a simple inline approach instead of the shared email service
    // since the template loading is having issues in the Edge Function environment
    
    const emailSubject = '🔐 New device sign-in to your NVLP account'
    const emailHtml = generateDeviceNotificationHTML(body)
    const emailText = generateDeviceNotificationText(body)

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable not set')
    }

    const emailPayload = {
      from: 'NVLP Security <security@nvlp.app>',
      to: [body.user_email],
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    }
    
    console.log('Sending email via Resend API...')
    console.log('To:', body.user_email)
    console.log('Subject:', emailSubject)
    console.log('API Key present:', !!resendApiKey)
    console.log('API Key length:', resendApiKey?.length)
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    const responseText = await emailResponse.text()
    console.log('Resend API Response Status:', emailResponse.status)
    console.log('Resend API Response:', responseText)

    if (!emailResponse.ok) {
      let errorMessage = 'Unknown error'
      try {
        const errorData = JSON.parse(responseText)
        errorMessage = errorData.message || errorData.error || responseText
      } catch {
        errorMessage = responseText
      }
      throw new Error(`Email sending failed: ${errorMessage}`)
    }
    
    console.log('Email sent successfully:', responseText)

    console.log('Device notification sent successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Device notification sent successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-device-notification function:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send notification',
        details: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

serve(handler)