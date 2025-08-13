// Email service for sending device security notifications

interface EmailTemplate {
  subject: string
  htmlContent: string
  textContent: string
}

interface DeviceSigninData {
  user_name: string
  user_email: string
  device_name: string
  signin_time: string
  location: string
  ip_address: string
  app_url: string
}

/**
 * Load and process email templates with variable substitution
 */
export async function loadEmailTemplate(
  templateName: string,
  variables: Record<string, string>
): Promise<EmailTemplate> {
  try {
    // Read template files
    const htmlTemplate = await Deno.readTextFile(`./email-templates/${templateName}.html`)
    const textTemplate = await Deno.readTextFile(`./email-templates/${templateName}.txt`)
    
    // Replace variables in both templates
    let htmlContent = htmlTemplate
    let textContent = textTemplate
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`
      htmlContent = htmlContent.replaceAll(placeholder, value)
      textContent = textContent.replaceAll(placeholder, value)
    }
    
    // Generate subject based on template
    const subject = getEmailSubject(templateName, variables)
    
    return {
      subject,
      htmlContent,
      textContent
    }
  } catch (error) {
    console.error('Error loading email template:', error)
    throw new Error(`Failed to load email template: ${templateName}`)
  }
}

/**
 * Generate email subject based on template type
 */
function getEmailSubject(templateName: string, variables: Record<string, string>): string {
  switch (templateName) {
    case 'new-device-signin':
      return `🔐 New device sign-in to your NVLP account`
    default:
      return 'NVLP Security Alert'
  }
}

/**
 * Send email using Resend API
 */
export async function sendSecurityEmail(
  to: string,
  template: EmailTemplate,
  from: string = 'NVLP Security <security@nvlp.app>'
): Promise<{ success: boolean; error?: string }> {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable not set')
      return { success: false, error: 'Email service not configured' }
    }
    
    console.log('Sending security email via Resend...')
    console.log('To:', to)
    console.log('Subject:', template.subject)
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent,
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json() as { message?: string }
      console.error('Resend API error:', errorData)
      return { success: false, error: errorData.message || 'Failed to send email' }
    }
    
    const result = await response.json() as { id: string }
    console.log('Email sent successfully:', result.id)
    
    return { success: true }
  } catch (error) {
    console.error('Error sending security email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send new device sign-in notification
 */
export async function sendNewDeviceAlert(data: DeviceSigninData): Promise<void> {
  try {
    const template = await loadEmailTemplate('new-device-signin', {
      user_name: data.user_name,
      user_email: data.user_email,
      device_name: data.device_name,
      signin_time: data.signin_time,
      location: data.location,
      ip_address: data.ip_address,
      app_url: data.app_url,
    })
    
    const result = await sendSecurityEmail(data.user_email, template)
    
    if (!result.success) {
      throw new Error(`Failed to send new device alert: ${result.error}`)
    }
    
    console.log(`New device alert sent to ${data.user_email}`)
  } catch (error) {
    console.error('Error sending new device alert:', error)
    throw error
  }
}