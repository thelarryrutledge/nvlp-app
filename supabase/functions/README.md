# NVLP Supabase Edge Functions

This directory contains all the Supabase Edge Functions for the NVLP API.

## Deployment

Deploy all functions:
```bash
supabase functions deploy
```

Deploy a specific function:
```bash
supabase functions deploy auth-magic-link
```

## Available Functions

### auth-magic-link
Sends a magic link email for passwordless authentication.

**Endpoint**: `POST /functions/v1/auth-magic-link`

## Testing

Test a deployed function:
```bash
# Replace [PROJECT_REF] and [ANON_KEY] with your actual values
curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/auth-magic-link \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## Local Development

To test functions locally:
```bash
supabase functions serve auth-magic-link
```

Then call it at: `http://localhost:54321/functions/v1/auth-magic-link`