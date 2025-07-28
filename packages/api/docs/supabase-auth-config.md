# Supabase Auth Configuration

## Setting the Default Redirect URL

The issue is that Supabase needs the redirect URL configured in multiple places:

### 1. Dashboard Configuration
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set the **Site URL** to: `https://nvlp.app/verify`
   - This is the default redirect when no `redirectTo` is specified
3. Add to **Redirect URLs** (whitelist):
   - `https://nvlp.app/verify`
   - `https://nvlp.app/auth/callback` (if needed)
   - `nvlp://verify` (for mobile deep linking)

### 2. Email Template Configuration
1. Go to Authentication → Email Templates
2. Edit the "Magic Link" template
3. Make sure the confirmation URL uses: `{{ .SiteURL }}`
   - This will use the Site URL configured above

### 3. Alternative: Environment Variable
You can also set the default redirect URL via environment variable in your Supabase project:
- `SITE_URL=https://nvlp.app/verify`

## Why This Happens
- When you don't specify `redirectTo`, Supabase uses the configured Site URL
- The Site URL is different from the redirect whitelist
- The Site URL is what appears in the email template

## Testing
After updating the Site URL in the dashboard, test again without specifying redirectTo:
```bash
curl -X POST https://idmvyzmjcbxqusvjvzna.supabase.co/functions/v1/auth-magic-link \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

The magic link should now redirect to https://nvlp.app/verify