# Authentication Quick Reference

## Environment Setup
```bash
# Load environment variables
source .env.local

# Key variables:
# - API_BASE_URL=https://api.nvlp.app
# - SUPABASE_ANON_KEY={your-anon-key}
```

## All 7 Authentication Endpoints

| Endpoint | Method | Auth Type | Purpose |
|----------|--------|-----------|---------|
| `/auth/register` | POST | Anon Key | Create user account |
| `/auth/login` | POST | Anon Key | Get JWT tokens |
| `/auth/profile` | GET | JWT | Get user info |
| `/auth/refresh` | POST | Anon Key | Refresh tokens |
| `/auth/logout` | POST | JWT | Invalidate session |
| `/auth/reset-password` | POST | Anon Key | Send reset email |
| `/auth/update-password` | POST | Recovery | Update password |

## Quick Examples

### 1. Register New User
```bash
curl -X POST "${API_BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "user@example.com", "password": "SecurePass123!"}'
```

### 2. Login (Get JWT Tokens)
```bash
# Login and save response
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "user@example.com", "password": "SecurePass123!"}')

# Extract tokens
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['session']['access_token'])")
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['session']['refresh_token'])")
```

### 3. Use JWT for Protected Endpoints
```bash
# Get user profile
curl -X GET "${API_BASE_URL}/auth/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Logout
curl -X POST "${API_BASE_URL}/auth/logout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### 4. Refresh Expired Tokens
```bash
curl -X POST "${API_BASE_URL}/auth/refresh" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d "{\"refresh_token\": \"${REFRESH_TOKEN}\"}"
```

### 5. Password Reset Flow
```bash
# Request reset email
curl -X POST "${API_BASE_URL}/auth/reset-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "user@example.com"}'

# Update password (recovery token from email)
curl -X POST "${API_BASE_URL}/auth/update-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${RECOVERY_TOKEN}" \
  -d '{"password": "NewSecurePass123!"}'
```

## Authentication Types

1. **Anon Key** - Public endpoints (register, login, reset, refresh)
2. **JWT Token** - Protected endpoints (profile, logout)  
3. **Recovery Token** - Password reset (update-password)

## Key Points

- **JWT expires** in 1 hour → use refresh tokens
- **Email confirmation** required after registration
- **Passwords**: 6-72 chars, printable ASCII only
- **Emails**: auto-normalized (trim + lowercase)
- **Security headers** on all responses

## Common Headers

### Public Endpoints:
```http
Content-Type: application/json
Authorization: Bearer {SUPABASE_ANON_KEY}
```

### Protected Endpoints:
```http
Content-Type: application/json
Authorization: Bearer {ACCESS_TOKEN}
```

### Recovery Endpoints:
```http
Content-Type: application/json
Authorization: Bearer {RECOVERY_TOKEN}
```

## Response Status Codes

- `200` - Success (login, profile, logout, refresh, etc.)
- `201` - Created (register)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing/expired token)
- `404` - Not Found (invalid endpoint)

## Validation Rules

- **Email**: Valid format, 3-255 chars
- **Password**: 6-72 chars, printable ASCII
- **Request size**: 10KB max
- **Refresh token**: 10-500 chars

## Test Scripts Available

```bash
./scripts/test-auth-endpoints.sh      # Complete auth flow
./scripts/test-auth-validation.sh     # Input validation tests
./scripts/test-password-reset.sh      # Password reset flow
```

## Web Pages

- **Request reset**: https://nvlp.app/auth/request-reset.html
- **Reset password**: https://nvlp.app/auth/reset.html (auto-redirect from email)