# Magic Link Authentication Flow

## How Magic Link Authentication Works

1. **User requests magic link** → POST to `/functions/v1/auth-magic-link`
2. **Supabase sends email** → User receives email with magic link
3. **User clicks link** → Supabase validates and redirects to `https://nvlp.app/verify#access_token=...&refresh_token=...`
4. **App extracts tokens** → Tokens are in URL fragment after the `#`

## Token Extraction on Client

When users land on nvlp.app/verify, the tokens are in the URL fragment:

```javascript
// In your verify page (React Native example)
import { supabase } from './supabaseClient'

useEffect(() => {
  // Supabase client automatically handles the URL fragment
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session) {
    // User is authenticated!
    console.log('Access token:', session.access_token)
    console.log('Refresh token:', session.refresh_token)
    
    // Redirect to app
    navigation.navigate('Home')
  }
}, [])
```

## Alternative: Direct Token Extraction

```javascript
// If you need to manually extract tokens
const hash = window.location.hash
const params = new URLSearchParams(hash.substring(1))
const accessToken = params.get('access_token')
const refreshToken = params.get('refresh_token')

// Set the session manually
const { data, error } = await supabase.auth.setSession({
  access_token: accessToken,
  refresh_token: refreshToken
})
```

## Important Notes

- Tokens are passed in URL fragment (after #), not query params
- Fragment is NOT sent to server (client-side only for security)
- Supabase JS client automatically detects and handles these tokens
- The callback endpoint is NOT needed - Supabase handles everything
- Make sure nvlp.app/verify is whitelisted in Supabase dashboard

## Deep Linking for Mobile

For React Native apps, configure deep linking:

```javascript
// Deep link configuration
const linking = {
  prefixes: ['https://nvlp.app', 'nvlp://'],
  config: {
    screens: {
      Verify: 'verify',
    },
  },
}
```

The Supabase client will automatically handle the authentication when the app opens with the magic link URL.