# Authentication API Endpoints

## POST /auth/magic-link

Send a magic link email to the user for passwordless authentication.

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

```typescript
// Using the AuthService directly
const authService = new AuthService(supabaseClient);
await authService.signInWithMagicLink({
  email: 'user@example.com',
  redirectTo: 'https://yourapp.com/auth/callback'
});
```

### cURL Example

```bash
curl -X POST https://your-api.com/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "redirectTo": "https://yourapp.com/auth/callback"
  }'
```

### Notes

- The magic link will be sent to the provided email address
- The link expires after 1 hour (configurable in Supabase)
- The `redirectTo` parameter is optional and specifies where the user should be redirected after clicking the magic link
- Make sure the redirect URL is whitelisted in your Supabase project settings