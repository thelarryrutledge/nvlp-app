# AUTH REWORK ROADMAP

## Overview
Switching from magic link authentication to traditional email/password flow with email verification.

## Goals
- Simplify authentication flow
- Eliminate deep link complexity
- Maintain device management and security features
- Provide clear user experience

## Authentication Flow

### 1. Sign Up (New User)
```
User enters email/password
    ↓
App calls supabase.auth.signUp()
    ↓
Supabase sends verification email
    ↓
User clicks verification link
    ↓
Redirects to custom web page: "Email verified! Open NVLP to continue"
    ↓
User opens app → Login screen (no stored tokens)
    ↓
User signs in with email/password
    ↓
App receives tokens → Stores in secure storage
    ↓
Enter app
```

### 2. Sign In (Existing User, New Device)
```
User enters email/password
    ↓
App calls supabase.auth.signInWithPassword()
    ↓
If email not verified → Show error, resend verification option
If verified → Receive tokens
    ↓
Store tokens in secure storage
    ↓
Register new device in database
    ↓
Send notification about new device login
    ↓
Enter app
```

### 3. App Launch (Returning User, Same Device)
```
Check secure storage for tokens
    ↓
If tokens exist and not expired → Enter app
If tokens expired → Attempt refresh
If no tokens → Show login screen
```

### 4. Sign Out Other Devices
```
User requests "Sign out other devices"
    ↓
Mark other device sessions as revoked in database
    ↓
Other devices check session validity on next API call
    ↓
If revoked → Clear tokens → Return to login
```

## Implementation Phases

### Phase 1: Database Setup ✅ [COMPLETED]
- [x] Create user_sessions table for device tracking
- [x] Add session_id, device_id, is_active, revoked_at fields
- [x] Create RLS policies for session management

### Phase 2: Supabase Edge Functions ✅ [COMPLETED]
- [x] **Update auth endpoints**
  - [x] Remove magic link logic from auth functions
  - [x] Add password validation to signup endpoint
  - [x] Implement signInWithPassword flow
  - [x] Add session creation on successful login
  
- [x] **Create verification page**
  - [x] Simple HTML page hosted on Supabase
  - [x] Shows "Email verified!" message
  - [x] Instructions to open app
  
- [x] **Update device management**
  - [x] Check session validity on protected endpoints
  - [x] Add revoke_other_sessions endpoint
  - [x] Return 401 if session is revoked

### Phase 3: API Package Updates ✅ [COMPLETED]
- [x] **AuthService changes**
  - [x] Replace signInWithOtp with signInWithPassword
  - [x] Add signUp method with email/password
  - [x] Add password reset methods
  - [x] Remove magic link related code
  
- [x] **Session management**
  - [x] Add device management methods
  - [x] Add sign out all devices method
  - [x] Handle email verification errors

### Phase 4: Client Package Updates ✅ [COMPLETED]
- [x] **Update UnifiedClient**
  - [x] Remove magic link methods (N/A - client doesn't implement auth methods)
  - [x] Add email/password auth methods (N/A - handled by SessionProvider)
  - [x] Update error handling for revoked sessions (already implemented)
  
- [x] **Token management**
  - [x] Keep existing token storage logic (preserved)
  - [x] Add session validation on refresh (handled by http-client)
  - [x] Clear tokens if session revoked (handleSessionInvalidated method)

### Phase 5: Mobile App Updates
- [ ] **LoginScreen changes**
  - [ ] Add password field
  - [ ] Switch between Sign In / Sign Up modes
  - [ ] Add "Forgot Password?" link
  - [ ] Remove magic link UI elements
  
- [ ] **New SignUpScreen**
  - [ ] Email and password fields
  - [ ] Password strength indicator
  - [ ] Terms acceptance
  - [ ] Show "Check email for verification" message
  
- [ ] **Update auth flow**
  - [ ] Remove deep link handling for auth
  - [ ] Simplify AppNavigator logic
  - [ ] Update useAuth hook for new flow
  
- [ ] **Add PasswordResetScreen**
  - [ ] Email input for reset request
  - [ ] Success message UI
  
- [ ] **Device management UI**
  - [ ] Show current device
  - [ ] List other active devices
  - [ ] "Sign out other devices" button

### Phase 6: Testing & Cleanup
- [ ] Test complete sign up flow
- [ ] Test sign in on new device
- [ ] Test token persistence
- [ ] Test session revocation
- [ ] Test password reset flow
- [ ] Remove all magic link related code
- [ ] Update documentation

## Database Schema

```sql
-- user_sessions table (already created)
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT,
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_user_sessions_user_device ON user_sessions(user_id, device_id);
CREATE INDEX idx_user_sessions_session ON user_sessions(session_id);
```

## API Endpoints

### Authentication
- `POST /auth/signup` - Create account with email/password
- `POST /auth/signin` - Sign in with email/password
- `POST /auth/signout` - Sign out current session
- `POST /auth/signout-all` - Sign out all other devices
- `POST /auth/reset-password` - Request password reset
- `POST /auth/verify-email` - Resend verification email

### Session Management
- `GET /auth/sessions` - List active sessions/devices
- `DELETE /auth/sessions/:id` - Revoke specific session
- `POST /auth/validate-session` - Check if current session is valid

## Security Considerations

1. **Password Requirements**
   - Minimum 8 characters
   - Enforce via Supabase auth settings

2. **Rate Limiting**
   - Limit login attempts (5 per minute)
   - Limit password reset requests (3 per hour)

3. **Session Security**
   - Sessions expire after 30 days of inactivity
   - Refresh tokens rotate on use
   - Device ID tied to session for validation

4. **Email Verification**
   - Required before first login
   - Resend option available
   - Clear messaging about verification status

## Success Criteria

- [ ] Users can sign up with email/password
- [ ] Email verification works without deep links
- [ ] Users can sign in on multiple devices
- [ ] Token persistence works (bypass login if valid)
- [ ] Users can sign out other devices
- [ ] Password reset flow works
- [ ] No magic link code remains

## Notes

- Custom email templates will be configured in Supabase dashboard
- Device fingerprinting uses react-native-device-info
- Secure storage uses react-native-keychain
- All auth errors should be user-friendly
- Consider adding biometric auth in future iteration