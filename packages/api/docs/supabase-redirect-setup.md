# Supabase Redirect URL Configuration

## Problem
When clicking the magic link, you get a 404 because the redirect URL isn't properly configured.

## Solution

### Option 1: Use Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to Authentication → URL Configuration
3. Add these URLs to the "Redirect URLs" whitelist:
   - `https://idmvyzmjcbxqusvjvzna.supabase.co/functions/v1/verify-handler/verify`
   - `https://nvlp.app/verify` (for future production use)
   - `nvlp://verify` (for mobile app deep linking)

### Option 2: Use Default Supabase Success Page
For now, you can use Supabase's default success page and manually extract tokens:

1. Don't specify a redirectTo parameter
2. After clicking the magic link, you'll see Supabase's success page
3. Check the URL - it will contain the session tokens in the fragment

### Option 3: Local Development
For local testing, you can:
1. Use a local server to handle the redirect
2. Or manually copy tokens from the Supabase success page

## Extracting Tokens from Supabase Success Page

When you click the magic link without a custom redirect, Supabase shows a success page.
The URL will look like:
```
https://idmvyzmjcbxqusvjvzna.supabase.co/auth/v1/verify?token=...&type=signup#access_token=XXX&refresh_token=YYY
```

The tokens are in the URL fragment after the `#`:
- `access_token`: Your JWT access token
- `refresh_token`: Your refresh token

You can manually copy these and save them using:
```bash
node save-tokens.js <access_token> <refresh_token>
```

## Future Production Setup

Once nvlp.app is deployed, you'll:
1. Host the verify page at nvlp.app/verify
2. Configure it in Supabase redirect URLs
3. Handle tokens client-side in the web/mobile app