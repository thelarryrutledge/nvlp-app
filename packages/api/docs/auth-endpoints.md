# Authentication API Endpoints

## POST /auth/magic-link

Send a magic link email to the user for passwordless authentication.

### Deployment

This endpoint is deployed as a Supabase Edge Function.

```bash
# Deploy the function
supabase functions deploy auth-magic-link

# Set environment variables (if not already set)
supabase secrets set SUPABASE_URL=your_project_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Request Body

```json
{
  "email": "string",
  "redirectTo": "string (optional)"
}
```

### Response

```json
{
  "success": true,
  "message": "Magic link sent to your email"
}
```

### Example Usage

```bash
# Call the deployed Supabase Edge Function
curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/auth-magic-link \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "redirectTo": "https://yourapp.com/auth/callback"
  }'
```

### JavaScript Example

```javascript
// Using Supabase client to call Edge Function
const { data, error } = await supabase.functions.invoke('auth-magic-link', {
  body: {
    email: 'user@example.com',
    redirectTo: 'https://yourapp.com/auth/callback'
  }
})
```

### Notes

- The magic link will be sent to the provided email address
- The link expires after 1 hour (configurable in Supabase)
- The `redirectTo` parameter is optional and specifies where the user should be redirected after clicking the magic link
- Make sure the redirect URL is whitelisted in your Supabase project settings
- The function runs on Supabase Edge Functions (Deno runtime)