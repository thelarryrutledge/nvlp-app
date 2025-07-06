# NVLP Authentication API Documentation

Base URL: `https://api.nvlp.app`

## Authentication Overview

The NVLP API uses JWT (JSON Web Token) based authentication. 

- **Public endpoints** (register, login) require the Supabase anon key
- **Protected endpoints** require a valid JWT token obtained from login

## Endpoints

### 1. Register User

Create a new user account.

**Endpoint:** `POST /auth/register`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {SUPABASE_ANON_KEY}
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Validation Rules:**
- Email: Must be valid email format
- Password: Minimum 6 characters

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "76fe5efb-6c44-477d-814a-cff36e25ea23",
    "email": "user@example.com",
    "email_confirmed_at": null
  },
  "session": null
}
```

**Error Responses:**

Missing credentials (400):
```json
{
  "error": "Email and password are required",
  "code": "MISSING_CREDENTIALS"
}
```

Invalid email format (400):
```json
{
  "error": "Invalid email format",
  "code": "INVALID_EMAIL"
}
```

Weak password (400):
```json
{
  "error": "Password must be at least 6 characters",
  "code": "WEAK_PASSWORD"
}
```

Email already exists (400):
```json
{
  "error": "User already registered",
  "code": "user_already_exists"
}
```

**Example cURL:**
```bash
curl -X POST "https://api.nvlp.app/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {SUPABASE_ANON_KEY}" \
  -d '{"email": "user@example.com", "password": "securepass123"}'
```

---

### 2. Login

Authenticate user and receive JWT token.

**Endpoint:** `POST /auth/login`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {SUPABASE_ANON_KEY}
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "76fe5efb-6c44-477d-814a-cff36e25ea23",
    "email": "user@example.com",
    "email_confirmed_at": "2025-07-05T20:15:30.856963Z"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsImtpZCI6IklHYnRIOVR3OG1kVlozMmgiLCJ0eXAiOiJKV1QifQ...",
    "token_type": "bearer",
    "expires_in": 3600,
    "expires_at": 1751769720
  }
}
```

**Error Responses:**

Missing credentials (400):
```json
{
  "error": "Email and password are required",
  "code": "MISSING_CREDENTIALS"
}
```

Invalid credentials (401):
```json
{
  "error": "Invalid login credentials",
  "code": "invalid_credentials"
}
```

Email not confirmed (400):
```json
{
  "error": "Email not confirmed",
  "code": "email_not_confirmed"
}
```

**Example cURL:**
```bash
curl -X POST "https://api.nvlp.app/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {SUPABASE_ANON_KEY}" \
  -d '{"email": "user@example.com", "password": "securepass123"}'
```

---

### 3. Get User Profile (Protected)

Retrieve authenticated user's profile information.

**Endpoint:** `GET /auth/profile`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "user": {
    "id": "76fe5efb-6c44-477d-814a-cff36e25ea23",
    "email": "user@example.com",
    "email_confirmed_at": "2025-07-05T20:15:30.856963Z",
    "created_at": "2025-07-05T20:12:45.123456Z",
    "updated_at": "2025-07-05T20:15:30.856963Z",
    "role": "authenticated",
    "app_metadata": {
      "provider": "email",
      "providers": ["email"]
    },
    "user_metadata": {
      "email": "user@example.com",
      "email_verified": true,
      "phone_verified": false,
      "sub": "76fe5efb-6c44-477d-814a-cff36e25ea23"
    }
  }
}
```

**Error Responses:**

Missing authorization (401):
```json
{
  "error": "Missing or invalid authorization header",
  "code": "UNAUTHORIZED"
}
```

Invalid/expired token (401):
```json
{
  "error": "Invalid or expired token",
  "code": "INVALID_TOKEN"
}
```

**Example cURL:**
```bash
curl -X GET "https://api.nvlp.app/auth/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

---

## JWT Token Structure

The JWT token returned from login contains:

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT",
  "kid": "IGbtH9Tw8mdVZ32h"
}
```

**Payload:**
```json
{
  "iss": "https://qnpatlosomopoimtsmsr.supabase.co/auth/v1",
  "sub": "76fe5efb-6c44-477d-814a-cff36e25ea23",
  "aud": "authenticated",
  "exp": 1751769720,
  "iat": 1751766120,
  "email": "user@example.com",
  "role": "authenticated",
  "session_id": "759c588b-cc0c-417f-817e-360f99dcfd6d"
}
```

**Key Claims:**
- `sub`: User ID
- `email`: User's email address
- `role`: "authenticated" for logged-in users
- `exp`: Token expiration (Unix timestamp)
- `iat`: Token issued at (Unix timestamp)

---

## Authentication Flow

1. **Register** → Creates user account (email confirmation required)
2. **Confirm Email** → User clicks link in email
3. **Login** → Returns JWT access token
4. **Use JWT** → Include in Authorization header for protected endpoints
5. **Token Expiry** → After 1 hour, user must login again (or use refresh token in future)

---

## Error Codes Summary

| Code | Description |
|------|-------------|
| `MISSING_CREDENTIALS` | Email or password not provided |
| `INVALID_EMAIL` | Email format is invalid |
| `WEAK_PASSWORD` | Password less than 6 characters |
| `user_already_exists` | Email already registered |
| `invalid_credentials` | Wrong email/password combination |
| `email_not_confirmed` | User hasn't confirmed email |
| `UNAUTHORIZED` | Missing Authorization header |
| `INVALID_TOKEN` | JWT token invalid or expired |
| `ROUTE_NOT_FOUND` | Endpoint doesn't exist |

---

## Testing

Use the provided test scripts:

```bash
# Test all auth endpoints
./scripts/test-auth-endpoints.sh

# Test JWT token validation
./scripts/test-token-validation.sh

# Verify JWT token structure
./scripts/verify-jwt-token.sh
```