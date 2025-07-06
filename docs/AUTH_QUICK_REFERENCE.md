# Authentication Quick Reference

## Environment Setup
```bash
# Load environment variables
source .env.local

# Key variables:
# - API_BASE_URL=https://api.nvlp.app
# - SUPABASE_ANON_KEY={your-anon-key}
```

## Quick Examples

### 1. Register New User
```bash
curl -X POST "${API_BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "test@example.com", "password": "testpass123"}'
```

### 2. Login (Get JWT Token)
```bash
# Login and save response
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"email": "test@example.com", "password": "testpass123"}')

# Extract JWT token
JWT_TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['session']['access_token'])")
```

### 3. Use JWT for Protected Endpoints
```bash
# Get user profile
curl -X GET "${API_BASE_URL}/auth/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}"

# Future endpoints (budgets, transactions, etc.)
curl -X GET "${API_BASE_URL}/budgets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}"
```

## Key Points

1. **Public endpoints** use `SUPABASE_ANON_KEY`
2. **Protected endpoints** use JWT token from login
3. **JWT expires** in 1 hour (3600 seconds)
4. **Email confirmation** required after registration

## Common Headers

### For Public Endpoints (register, login):
```
Content-Type: application/json
Authorization: Bearer {SUPABASE_ANON_KEY}
```

### For Protected Endpoints:
```
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
```

## Response Status Codes

- `200` - Success (login, profile)
- `201` - Created (register)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found (invalid endpoint)

## Test Scripts Available

```bash
./scripts/test-auth-endpoints.sh      # Test all auth endpoints
./scripts/test-token-validation.sh    # Test JWT validation
./scripts/verify-jwt-token.sh         # Analyze JWT structure
```