import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const url = new URL(req.url)
  
  // Handle /verify path
  if (url.pathname === '/verify') {
    // Extract tokens from URL hash (this would normally be done client-side)
    // For now, return an HTML page that handles the redirect
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>NVLP - Verifying...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .success {
      color: #22c55e;
      font-size: 1.25rem;
      margin: 1rem 0;
    }
    .message {
      color: #666;
      margin: 1rem 0;
    }
    .token-info {
      background: #f9f9f9;
      padding: 1rem;
      border-radius: 4px;
      margin: 1rem 0;
      font-family: monospace;
      font-size: 0.875rem;
      word-break: break-all;
      text-align: left;
      max-width: 500px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner" id="spinner"></div>
    <div id="status">Verifying your email...</div>
    <div id="message" class="message"></div>
    <div id="tokenInfo" class="token-info" style="display: none;"></div>
  </div>

  <script>
    // Extract tokens from URL hash
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    const spinner = document.getElementById('spinner');
    const status = document.getElementById('status');
    const message = document.getElementById('message');
    const tokenInfo = document.getElementById('tokenInfo');

    if (error) {
      spinner.style.display = 'none';
      status.textContent = 'Verification Failed';
      status.style.color = '#ef4444';
      message.textContent = errorDescription || 'An error occurred during verification';
    } else if (accessToken && refreshToken) {
      // Success!
      spinner.style.display = 'none';
      status.innerHTML = '✓ Email Verified Successfully!';
      status.className = 'success';
      message.textContent = 'Your email has been verified. You can now use the NVLP app.';
      
      // Show token info (for development)
      tokenInfo.style.display = 'block';
      tokenInfo.innerHTML = '<strong>Development Info:</strong><br>' +
        'Access Token: ' + accessToken.substring(0, 20) + '...<br>' +
        'Refresh Token: ' + refreshToken.substring(0, 20) + '...<br><br>' +
        'Save these tokens for API testing.';

      // In production, you would:
      // 1. Save tokens to secure storage
      // 2. Redirect to app with deep link
      // 3. Or show "Open App" button
      
      // For now, log to console
      console.log('Auth tokens:', { accessToken, refreshToken });
      
      // Optionally redirect after a delay
      setTimeout(() => {
        message.innerHTML += '<br><br>Redirecting to app...';
        // In production: window.location.href = 'nvlp://authenticated';
      }, 3000);
    } else {
      // No tokens found
      spinner.style.display = 'none';
      status.textContent = 'Invalid Verification Link';
      status.style.color = '#ef4444';
      message.textContent = 'This verification link appears to be invalid or expired.';
    }
  </script>
</body>
</html>
    `
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    })
  }
  
  // Default 404 response
  return new Response('Not Found', { status: 404 })
})