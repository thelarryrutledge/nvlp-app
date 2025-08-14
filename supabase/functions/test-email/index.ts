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

    // Parse request body to check for enhanced template request
    let requestBody = {}
    try {
      if (req.method === 'POST') {
        requestBody = await req.json()
      }
    } catch {
      // If no body or invalid JSON, use default behavior
      requestBody = {}
    }

    const { enhanced = false, template = 'device' } = requestBody as { enhanced?: boolean, template?: string }

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
      app_url: 'https://nvlp.app',
      magic_link: 'https://nvlp.app/auth/callback?token=test_magic_link_token_123456'
    }

    // Determine template path and subject based on request
    let htmlContent: string
    let textContent: string
    let subject: string

    if (enhanced) {
      if (template === 'magic-link') {
        subject = 'NVLP Enhanced Magic Link Test - Sign in to Your Account'
        textContent = `NVLP - Sign in to Your Account (Test)

Hi ${testData.user_name},

This is a test of the enhanced magic link email template featuring sophisticated design elements.

Click this link to sign in: ${testData.magic_link}

This link will expire in 60 minutes for security.

✨ Enhanced Features:
- Design system color integration (#6A31F6 primary)
- Modern gradients and shadows
- Responsive layout with dark mode
- Professional typography

If you didn't request this email, you can safely ignore it.

Best regards,
The NVLP Team`

        // Enhanced Magic Link HTML (simplified for testing)
        htmlContent = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Sign in to NVLP</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI','Inter',Roboto,sans-serif;line-height:1.4;color:#1F2029;background:linear-gradient(135deg,#F8F8F8 0%,#F5F5F7 100%);margin:0;padding:48px 20px}
.container{max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0px 4px 40px rgba(0,0,0,0.08)}
.header{background:linear-gradient(135deg,#7C56FE 0%,#6A31F6 100%);padding:24px 32px 20px;text-align:center;color:#FFFFFF}
.header img{height:32px;filter:brightness(0) invert(1);margin-bottom:16px}
.header h1{font-size:24px;font-weight:700;margin:0 0 4px;letter-spacing:-0.5px}
.content{padding:40px 32px}
.greeting{font-size:20px;font-weight:600;color:#1F2029;margin-bottom:12px}
.message{font-size:15px;color:#7E808F;line-height:1.6;margin-bottom:32px}
.cta{text-align:center;margin:40px 0}
.btn{display:inline-block;background:linear-gradient(135deg,#6A31F6 0%,#7C56FE 100%);color:#FFFFFF!important;text-decoration:none;padding:16px 48px;border-radius:14px;font-size:17px;font-weight:600;box-shadow:0px 4px 24px rgba(106,49,246,0.3)}
.footer{background:#F8F8F8;padding:32px;text-align:center;color:#ADAEB8;font-size:13px}
</style>
</head>
<body>
<div class="container">
<div class="header">
<img src="https://nvlp.app/assets/logo/FullLogo_Transparent_NoBuffer.png" alt="NVLP">
<h1>Welcome Back!</h1>
<p>Sign in to your NVLP account</p>
</div>
<div class="content">
<h2 class="greeting">Hi ${testData.user_name},</h2>
<p class="message">You requested a magic link to sign in to your NVLP account. This enhanced template features sophisticated design elements from our design system.</p>
<div class="cta">
<a href="${testData.magic_link}" class="btn">Sign in to NVLP</a>
</div>
</div>
<div class="footer">
<p>This is an enhanced template test featuring design system integration.<br>© 2025 NVLP. All rights reserved.</p>
</div>
</div>
</body>
</html>`
      } else {
        subject = 'NVLP Enhanced Security Test - New Device Sign-in'
        textContent = `NVLP - Security Alert (Enhanced Test)

Hi ${testData.user_name},

This is a test of the enhanced device notification email template featuring sophisticated design elements.

SIGN-IN DETAILS:
- Device: ${testData.device_name}
- Time: ${testData.signin_time}
- Location: ${testData.location}
- IP: ${testData.ip_address}

🎨 Enhanced Features:
- Design system color integration (#6A31F6 primary)
- Modern gradients and shadows
- Responsive layout with dark mode
- Professional typography and spacing
- Card-based layout with visual hierarchy

Best regards,
The NVLP Team`

        // Enhanced Device Notification HTML (simplified for testing)
        htmlContent = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Security Alert - NVLP</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI','Inter',Roboto,sans-serif;line-height:1.4;color:#1F2029;background:linear-gradient(135deg,#F8F8F8 0%,#F5F5F7 100%);margin:0;padding:48px 20px}
.container{max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0px 4px 40px rgba(0,0,0,0.08)}
.header{background:linear-gradient(135deg,#7C56FE 0%,#6A31F6 100%);padding:24px 32px 20px;text-align:center;color:#FFFFFF}
.header img{height:32px;filter:brightness(0) invert(1);margin-bottom:16px}
.header h1{font-size:20px;font-weight:700;margin:0 0 4px}
.content{padding:32px}
.alert{background:linear-gradient(135deg,#FEF5EA 0%,#FEF0DF 100%);border:1px solid #F89E2B;color:#DF8E27;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:600;display:inline-block;margin-bottom:16px}
.greeting{font-size:18px;font-weight:600;color:#1F2029;margin-bottom:8px}
.message{font-size:15px;color:#7E808F;line-height:1.5;margin-bottom:24px}
.device-card{background:linear-gradient(135deg,#F8F8F8 0%,#F5F5F7 100%);border-radius:16px;padding:24px;margin:24px 0;position:relative}
.device-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#6A31F6 0%,#9A85FF 100%)}
.device-header{margin-bottom:16px}
.device-name{font-size:17px;font-weight:600;color:#1F2029;margin-bottom:4px}
.device-type{font-size:13px;color:#ADAEB8}
.detail{margin:8px 0;font-size:14px}
.detail strong{color:#1F2029;font-weight:500}
.detail span{color:#7E808F}
.footer{background:#F8F8F8;padding:32px;text-align:center;color:#ADAEB8;font-size:13px}
</style>
</head>
<body>
<div class="container">
<div class="header">
<img src="https://nvlp.app/assets/logo/FullLogo_Transparent_NoBuffer.png" alt="NVLP">
<h1>Security Alert</h1>
<p>New device sign-in detected</p>
</div>
<div class="content">
<span class="alert">Security Notice</span>
<h2 class="greeting">Hi ${testData.user_name},</h2>
<p class="message">We noticed a sign-in to your NVLP account from a device we haven't seen before. If this was you, no action is needed. If this wasn't you, please secure your account immediately.</p>
<div class="device-card">
<div class="device-header">
<div class="device-name">${testData.device_name}</div>
<div class="device-type">New Device</div>
</div>
<div class="detail"><strong>Time:</strong> <span>${testData.signin_time}</span></div>
<div class="detail"><strong>Location:</strong> <span>${testData.location}</span></div>
<div class="detail"><strong>IP Address:</strong> <span>${testData.ip_address}</span></div>
</div>
</div>
<div class="footer">
<p>Enhanced template test featuring design system integration<br>© 2025 NVLP. All rights reserved.</p>
</div>
</div>
</body>
</html>`
      }
    } else {
      // Simple HTML template for basic testing
      htmlContent = `
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

      textContent = `
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

      subject = 'NVLP Security Email Test - New Device Sign-in'
    }

    console.log('Sending test email to:', testData.user_email)
    console.log('Template type:', enhanced ? `Enhanced ${template}` : 'Basic device notification')

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NVLP Security <onboarding@resend.dev>',
        to: [testData.user_email],
        subject: subject,
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

    const templateType = enhanced ? `Enhanced ${template}` : 'Basic device notification'
    const message = enhanced 
      ? `Enhanced ${template} email sent successfully to larryjrutledge@gmail.com`
      : 'Test email sent successfully to larryjrutledge@gmail.com'

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: message,
        emailId: result.id,
        templateType: templateType,
        enhanced: enhanced
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