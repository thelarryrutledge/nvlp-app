import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const handler = async (_req: Request) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verified - NVLP</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', 'Inter', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #7C56FE 0%, #6A31F6 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 24px;
            padding: 48px;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0px 20px 60px rgba(0, 0, 0, 0.15);
        }
        
        .success-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 24px;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .checkmark {
            width: 40px;
            height: 40px;
            stroke: white;
            stroke-width: 3;
            fill: none;
            animation: checkmark 0.5s ease-in-out;
        }
        
        @keyframes checkmark {
            from {
                stroke-dasharray: 100;
                stroke-dashoffset: 100;
            }
            to {
                stroke-dasharray: 100;
                stroke-dashoffset: 0;
            }
        }
        
        h1 {
            color: #1F2029;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 16px;
            letter-spacing: -0.5px;
        }
        
        p {
            color: #7E808F;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 32px;
        }
        
        .app-instructions {
            background: #F8F8F8;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 32px;
        }
        
        .app-instructions h2 {
            color: #1F2029;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        
        .step {
            display: flex;
            align-items: flex-start;
            text-align: left;
            margin-bottom: 16px;
        }
        
        .step-number {
            background: linear-gradient(135deg, #7C56FE 0%, #6A31F6 100%);
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 600;
            margin-right: 12px;
            flex-shrink: 0;
        }
        
        .step-text {
            color: #4A4B5C;
            font-size: 15px;
            line-height: 1.5;
        }
        
        .footer {
            color: #ADAEB8;
            font-size: 14px;
        }
        
        .logo {
            height: 40px;
            margin-bottom: 24px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">
            <svg class="checkmark" viewBox="0 0 52 52">
                <path d="M14 27l8 8 16-16" />
            </svg>
        </div>
        
        <h1>Email Verified!</h1>
        <p>Your email address has been successfully verified.</p>
        
        <div class="app-instructions">
            <h2>Next Steps:</h2>
            <div class="step">
                <div class="step-number">1</div>
                <div class="step-text">Open the NVLP app on your device</div>
            </div>
            <div class="step">
                <div class="step-number">2</div>
                <div class="step-text">Sign in with your email and password</div>
            </div>
            <div class="step">
                <div class="step-number">3</div>
                <div class="step-text">Start managing your budget with virtual envelopes!</div>
            </div>
        </div>
        
        <div class="footer">
            You can close this window and return to the app.
        </div>
    </div>
</body>
</html>
  `

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}

serve(handler)