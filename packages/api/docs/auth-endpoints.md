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
    "redirectTo": "https://nvlp.app/verify"
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
- The `redirectTo` parameter is optional and defaults to the Supabase verify handler function
- Make sure the redirect URL is whitelisted in your Supabase project settings
- The function runs on Supabase Edge Functions (Deno runtime)
- Supabase may reject certain test email addresses (like test@example.com) - use a real email for testing

## POST /auth/logout

Sign out the current user and invalidate their refresh token.

### Headers

```
Authorization: Bearer <access_token>
```

### Response

```json
{
  "success": true,
  "message": "Successfully signed out"
}
```

### Example Usage

```bash
# Using cURL with saved token
curl -X POST https://idmvyzmjcbxqusvjvzna.supabase.co/functions/v1/auth-logout \
  -H "Authorization: Bearer [ACCESS_TOKEN]" \
  -H "Content-Type: application/json"
```

### JavaScript Example

```javascript
// Using Supabase client to call Edge Function
const { data, error } = await supabase.functions.invoke('auth-logout', {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
})
```

### Notes

- Requires a valid access token in the Authorization header
- Invalidates the refresh token on the server side
- The current access token remains valid until expiration
- Clears the user's session from Supabase's auth system

## GET /auth/user

Get the current user's profile information.

### Headers

```
Authorization: Bearer <access_token>
```

### Response

```json
{
  "user": {
    "id": "user_uuid",
    "email": "user@example.com",
    "display_name": "User Name",
    "avatar_url": null,
    "default_budget_id": null,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### Example Usage

```bash
# Using cURL with saved token
curl -X GET https://idmvyzmjcbxqusvjvzna.supabase.co/functions/v1/auth-user \
  -H "Authorization: Bearer [ACCESS_TOKEN]" \
  -H "Content-Type: application/json"
```

### JavaScript Example

```javascript
// Using Supabase client to call Edge Function
const { data, error } = await supabase.functions.invoke('auth-user', {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
})
```

### Notes

- Requires a valid access token in the Authorization header
- Returns the user's profile from the user_profiles table
- Returns 404 if user profile is not found
- Returns 401 if token is invalid or expired