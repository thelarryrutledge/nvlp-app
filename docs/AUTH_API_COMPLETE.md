# NVLP Authentication API - Complete Documentation

**Base URL:** `https://api.nvlp.app`  
**API Version:** v1  
**Last Updated:** 2025-07-06

## Overview

The NVLP Authentication API provides secure user authentication using JWT tokens with refresh token support. All endpoints implement comprehensive input validation, security headers, and rate limiting.

### Authentication Types

- **Public endpoints**: Use Supabase anon key (`SUPABASE_ANON_KEY`)
- **Protected endpoints**: Use JWT access token from login/refresh
- **Recovery endpoints**: Use recovery token from password reset email

### Security Features

- Input validation and sanitization
- Request size limits (10KB max)
- Security headers (CSP, HSTS, XSS protection)
- Generic error messages (prevents user enumeration)
- Password complexity enforcement

---

## Endpoints

### 1. Register User

Create a new user account with email confirmation.

**Endpoint:** `POST /auth/register`  
**Type:** Public (requires anon key)

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer {SUPABASE_ANON_KEY}
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Validation Rules:**
- **Email:** Valid format, 3-255 characters, automatically normalized (trimmed + lowercase)
- **Password:** 6-72 characters, printable ASCII only

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email to confirm your account.",
  "user": {
    "id": "e3cb8d9e-a853-45d8-bf23-1fc0ddba21d8",
    "email": "user@example.com",
    "email_confirmed_at": null
  },
  "session": null
}
```

**Error Responses:**
- `400` - Missing credentials, invalid email/password format
- `400` - Registration failed (generic message)

---

### 2. Login User

Authenticate user and receive access + refresh tokens.

**Endpoint:** `POST /auth/login`  
**Type:** Public (requires anon key)

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer {SUPABASE_ANON_KEY}
```

**Request Body:**
```json
{
  "email": "user@example.com", 
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "e3cb8d9e-a853-45d8-bf23-1fc0ddba21d8",
    "email": "user@example.com",
    "email_confirmed_at": "2025-07-06T01:24:51.111183Z"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "mfys356n6v7e",
    "token_type": "bearer",
    "expires_in": 3600,
    "expires_at": 1751771452
  }
}
```

**Error Responses:**
- `400` - Missing credentials, invalid format
- `401` - Invalid email or password (generic message)

**Notes:**
- Access tokens expire in 1 hour (3600 seconds)
- Use refresh token to get new access tokens

---

### 3. Get User Profile

Retrieve authenticated user's profile information.

**Endpoint:** `GET /auth/profile`  
**Type:** Protected (requires JWT)

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer {ACCESS_TOKEN}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "user": {
    "id": "e3cb8d9e-a853-45d8-bf23-1fc0ddba21d8",
    "email": "user@example.com",
    "email_confirmed_at": "2025-07-06T01:24:51.111183Z",
    "created_at": "2025-07-06T01:24:33.111344Z",
    "updated_at": "2025-07-06T02:11:14.383076Z",
    "role": "authenticated",
    "app_metadata": {
      "provider": "email",
      "providers": ["email"]
    },
    "user_metadata": {
      "email": "user@example.com",
      "email_verified": true,
      "phone_verified": false
    }
  }
}
```

**Error Responses:**
- `401` - Missing/invalid/expired token

---

### 4. Refresh Tokens

Get new access token using refresh token.

**Endpoint:** `POST /auth/refresh`  
**Type:** Public (requires anon key)

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer {SUPABASE_ANON_KEY}
```

**Request Body:**
```json
{
  "refresh_token": "mfys356n6v7e"
}
```

**Validation Rules:**
- **Refresh token:** String, 10-500 characters

**Success Response (200):**
```json
{
  "success": true,
  "message": "Session refreshed successfully",
  "user": {
    "id": "e3cb8d9e-a853-45d8-bf23-1fc0ddba21d8",
    "email": "user@example.com",
    "email_confirmed_at": "2025-07-06T01:24:51.111183Z"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "4jgooqapq2u7", 
    "token_type": "bearer",
    "expires_in": 3600,
    "expires_at": 1751771484
  }
}
```

**Error Responses:**
- `400` - Missing/invalid refresh token
- `401` - Expired/invalid refresh token

---

### 5. Logout User

Invalidate user session and tokens.

**Endpoint:** `POST /auth/logout`  
**Type:** Protected (requires JWT)

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer {ACCESS_TOKEN}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Error Responses:**
- `401` - Missing/invalid/expired token
- `400` - Logout failed

---

### 6. Request Password Reset

Send password reset email to user.

**Endpoint:** `POST /auth/reset-password`  
**Type:** Public (requires anon key)

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer {SUPABASE_ANON_KEY}
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Error Responses:**
- `400` - Missing email, invalid format

**Notes:**
- Always returns success to prevent email enumeration
- Reset link redirects to: `https://nvlp.app/auth/reset.html`
- Reset tokens expire after use

---

### 7. Update Password

Update user password using recovery token from reset email.

**Endpoint:** `POST /auth/update-password`  
**Type:** Recovery (requires recovery token)

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer {RECOVERY_TOKEN}
```

**Request Body:**
```json
{
  "password": "NewSecurePass123!"
}
```

**Validation Rules:**
- **Password:** 6-72 characters, printable ASCII only

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

**Error Responses:**
- `400` - Missing/invalid password
- `401` - Invalid/expired recovery token

**Notes:**
- Recovery token comes from password reset email URL hash
- Token is single-use and expires after password update

---

## Error Codes

| Code | Description |
|------|-------------|
| `MISSING_CREDENTIALS` | Email and/or password required |
| `INVALID_EMAIL` | Email format validation failed |
| `INVALID_PASSWORD` | Password validation failed |
| `INVALID_CREDENTIALS` | Login failed (generic) |
| `UNAUTHORIZED` | Missing/invalid authorization header |
| `INVALID_TOKEN` | JWT token invalid/expired |
| `MISSING_REFRESH_TOKEN` | Refresh token required |
| `REFRESH_FAILED` | Token refresh failed |
| `LOGOUT_FAILED` | Logout operation failed |
| `MISSING_EMAIL` | Email required for reset |
| `RESET_FAILED` | Password reset failed |
| `MISSING_PASSWORD` | Password required |
| `UPDATE_PASSWORD_FAILED` | Password update failed |
| `INVALID_RECOVERY_TOKEN` | Recovery token invalid/expired |
| `ROUTE_NOT_FOUND` | Endpoint not found |
| `INVALID_REQUEST` | Request parsing failed |
| `INTERNAL_ERROR` | Server error |

## Security Headers

All responses include security headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY  
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'none'; frame-ancestors 'none';
```

## Rate Limiting

- Request size limit: 10KB
- Input validation on all parameters
- Generic error messages prevent enumeration attacks

## Usage Examples

### Complete Authentication Flow

```bash
# 1. Register new user
curl -X POST "https://api.nvlp.app/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {SUPABASE_ANON_KEY}" \
  -d '{"email": "user@example.com", "password": "SecurePass123!"}'

# 2. Login (get tokens)  
curl -X POST "https://api.nvlp.app/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {SUPABASE_ANON_KEY}" \
  -d '{"email": "user@example.com", "password": "SecurePass123!"}'

# 3. Access protected resources
curl -X GET "https://api.nvlp.app/auth/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ACCESS_TOKEN}"

# 4. Refresh expired token
curl -X POST "https://api.nvlp.app/auth/refresh" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {SUPABASE_ANON_KEY}" \
  -d '{"refresh_token": "{REFRESH_TOKEN}"}'

# 5. Logout
curl -X POST "https://api.nvlp.app/auth/logout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ACCESS_TOKEN}"
```

### Password Reset Flow

```bash
# 1. Request reset email
curl -X POST "https://api.nvlp.app/auth/reset-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {SUPABASE_ANON_KEY}" \
  -d '{"email": "user@example.com"}'

# 2. User clicks email link → redirects to reset page
# 3. Reset page calls update-password with recovery token
curl -X POST "https://api.nvlp.app/auth/update-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {RECOVERY_TOKEN}" \
  -d '{"password": "NewSecurePass123!"}'
```

---

## Test Scripts

Available test scripts in `/scripts/`:

- `test-auth-endpoints.sh` - Complete auth flow testing
- `test-auth-validation.sh` - Input validation testing  
- `test-password-reset.sh` - Password reset flow testing

**Environment required:** `.env.local` with `API_BASE_URL` and `SUPABASE_ANON_KEY`