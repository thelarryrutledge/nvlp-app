import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Testing email service with Resend...')

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable not set')
    }

    // Test data
    const testData = {
      user_name: 'Larry',
      user_email: 'larryjrutledge@gmail.com',
      device_name: 'iPhone 15 Pro (Test)',
      signin_time: new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }),
      location: 'San Francisco, CA, United States',
      ip_address: '192.168.1.100',
      app_url: 'https://nvlp.app'
    }

    // Simple HTML template for testing
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>New Device Sign-in - NVLP</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #E8E9ED; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: 700; color: #6A31F6; margin-bottom: 10px; }
        .alert-box { background-color: #FEF5EA; border: 1px solid #F89E2B; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .device-info { background-color: #F8F8F8; border-radius: 8px; padding: 15px; margin: 15px 0; }
        .safe-notice { background-color: #E6F6F4; border: 1px solid #009883; border-radius: 8px; padding: 15px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <img src="https://nvlp.app/assets/logo/FullLogo_Transparent_NoBuffer.png" alt="NVLP Logo" style="max-height: 60px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;">
        <p>Virtual Envelope Budgeting - Security Test</p>
    </div>
    <div class="alert-box">
        <h2>🔐 New Device Sign-in Detected (TEST)</h2>
        <p>Hi ${testData.user_name},</p>
        <p>This is a test of the NVLP security email system.</p>
    </div>
    <div class="device-info">
        <h3>Sign-in Details</h3>
        <p><strong>Device:</strong> ${testData.device_name}</p>
        <p><strong>Time:</strong> ${testData.signin_time}</p>
        <p><strong>Location:</strong> ${testData.location}</p>
        <p><strong>IP:</strong> ${testData.ip_address}</p>
    </div>
    <div class="safe-notice">
        <p><strong>✅ This is a test email</strong><br>
        If you can see this, the email service is working correctly!</p>
    </div>
    <p>Best regards,<br>The NVLP Team</p>
</body>
</html>`

    const textContent = `
NVLP - New Device Sign-in Test

Hi ${testData.user_name},

This is a test of the NVLP security email system.

SIGN-IN DETAILS:
- Device: ${testData.device_name}
- Time: ${testData.signin_time}
- Location: ${testData.location}
- IP: ${testData.ip_address}

✅ This is a test email
If you can see this, the email service is working correctly!

Best regards,
The NVLP Team`

    console.log('Sending test email to:', testData.user_email)

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NVLP Security <onboarding@resend.dev>',
        to: [testData.user_email],
        subject: '🔐 NVLP Security Email Test - New Device Sign-in',
        html: htmlContent,
        text: textContent,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json() as { message?: string }
      console.error('Resend API error:', errorData)
      throw new Error(errorData.message || 'Failed to send email')
    }

    const result = await response.json() as { id: string }
    console.log('Email sent successfully:', result.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test email sent successfully to larryjrutledge@gmail.com',
        emailId: result.id
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error sending test email:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})