# Security Enhancement Roadmap

## Overview
Implementation plan for enhanced security features including PIN/biometric authentication, trusted device management, and session invalidation system for the NVLP API and client packages.

---

## Phase 1: Database & Core Infrastructure

### 1.1 Database Schema (✅ COMPLETED)
- [x] Create device tracking migration (`20250210000010_device_tracking.sql`)
- [x] `user_devices` table with device fingerprinting
- [x] `invalidated_sessions` table for session management
- [x] Helper functions: `is_session_invalidated()`, `invalidate_sessions()`, `register_device()`

### 1.2 Supabase Configuration
- [ ] Reduce magic link token expiry to 15 minutes (from 1 hour)
  ```toml
  # supabase/config.toml
  [auth]
  email_otp_expiry = 900  # 15 minutes in seconds
  ```
- [ ] Test magic link expiry timing
- [ ] Configure email templates for new device notifications

---

## Phase 2: API Service Layer

### 2.1 Device Service (`packages/api/src/services/device.service.ts`)
```typescript
export class DeviceService extends BaseService {
  // Core device management
  async registerDevice(deviceInfo: DeviceRegisterRequest): Promise<DeviceRegistrationResult>
  async updateDeviceInfo(deviceId: string, updates: DeviceUpdateRequest): Promise<Device>
  async getDevices(): Promise<Device[]>
  async getCurrentDevice(): Promise<Device>
  
  // Session management
  async signOutDevice(deviceId: string): Promise<void>
  async signOutAllOtherDevices(): Promise<void>
  async revokeDevice(deviceId: string): Promise<void>
  
  // Security checks
  async isSessionInvalidated(deviceId?: string): Promise<boolean>
  async getDeviceSecurityStatus(): Promise<DeviceSecurityStatus>
}

// Types to create in packages/types/src/models/device.ts
interface DeviceRegisterRequest {
  device_id: string
  device_fingerprint: string
  device_name: string
  device_type: 'ios' | 'android'
  device_model?: string
  os_version?: string
  app_version?: string
  push_token?: string
}

interface Device {
  id: string
  user_id: string
  device_id: string
  device_name: string
  device_type: 'ios' | 'android'
  device_model?: string
  first_seen: string
  last_seen: string
  ip_address?: string
  location_country?: string
  location_city?: string
  is_current: boolean
  is_revoked: boolean
}

interface DeviceRegistrationResult {
  is_new_device: boolean
  device: Device
  requires_notification: boolean
}
```

### 2.2 Session Validation Middleware
Create `packages/api/src/middleware/session-validation.ts`:
```typescript
export const sessionValidationMiddleware = async (
  supabaseClient: any,
  headers: Record<string, string>
): Promise<{ isValid: boolean; error?: string }> => {
  const deviceId = headers['x-device-id']
  
  if (!deviceId) {
    return { isValid: false, error: 'Device ID required' }
  }
  
  // Get current user
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
  if (userError || !user) {
    return { isValid: false, error: 'Invalid authentication' }
  }
  
  // Check session invalidation
  const { data: isInvalidated, error } = await supabaseClient.rpc(
    'is_session_invalidated',
    { p_user_id: user.id, p_device_id: deviceId }
  )
  
  if (error) {
    console.error('Session validation error:', error)
    return { isValid: false, error: 'Session validation failed' }
  }
  
  if (isInvalidated) {
    return { isValid: false, error: 'Session invalidated', code: 'SESSION_INVALIDATED' }
  }
  
  return { isValid: true }
}
```

### 2.3 Update Existing Services
Update all services in `packages/api/src/services/` to use session validation:

```typescript
// Example: packages/api/src/services/base.service.ts
export abstract class BaseService {
  // Add session validation to base service
  protected async validateSession(headers: Record<string, string>): Promise<void> {
    const validation = await sessionValidationMiddleware(this.client, headers)
    if (!validation.isValid) {
      if (validation.code === 'SESSION_INVALIDATED') {
        throw new ApiError(ErrorCode.SESSION_INVALIDATED, validation.error)
      }
      throw new ApiError(ErrorCode.UNAUTHORIZED, validation.error)
    }
  }
  
  // Update existing getCurrentUserId to include session validation
  protected async getCurrentUserId(headers?: Record<string, string>): Promise<string> {
    if (headers) {
      await this.validateSession(headers)
    }
    
    // Existing logic...
    const { data: { user }, error } = await this.client.auth.getUser()
    if (error || !user) {
      throw new ApiError(ErrorCode.UNAUTHORIZED, 'User not authenticated')
    }
    return user.id
  }
}

// Add new error code
export enum ErrorCode {
  // ... existing codes
  SESSION_INVALIDATED = 'SESSION_INVALIDATED',
}
```

---

## Phase 3: Edge Functions

### 3.1 Device Management Edge Function
Create `supabase/functions/device-management/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const handler = async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const path = url.pathname.replace('/device-management', '')
    
    // Routes:
    // POST /register - Register device
    // GET /list - Get user devices  
    // DELETE /:deviceId - Sign out device
    // POST /signout-all - Sign out all devices
    // POST /send-notification - Send new device email
    
    // Implementation details for each route...
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

serve(handler)
```

### 3.2 Update Existing Edge Functions
Update all existing Edge Functions to include session validation:

```typescript
// Example: supabase/functions/envelopes/index.ts
import { sessionValidationMiddleware } from '../_shared/session-validation.ts'

const handler = async (req: Request) => {
  // ... existing auth logic
  
  // Add session validation
  const sessionValidation = await sessionValidationMiddleware(supabaseClient, {
    'x-device-id': req.headers.get('x-device-id') || ''
  })
  
  if (!sessionValidation.isValid) {
    const statusCode = sessionValidation.code === 'SESSION_INVALIDATED' ? 401 : 403
    return new Response(
      JSON.stringify({ 
        error: sessionValidation.error,
        code: sessionValidation.code 
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
  
  // ... rest of existing logic
}
```

---

## Phase 4: Client Package Updates

### 4.1 Device Service Client (`packages/client/src/services/device.service.ts`)
```typescript
import { ApiClient } from '../api-client'
import { Device, DeviceRegisterRequest, DeviceRegistrationResult } from '@nvlp/types'

export class DeviceService {
  constructor(private apiClient: ApiClient) {}

  async registerDevice(deviceInfo: DeviceRegisterRequest): Promise<DeviceRegistrationResult> {
    return this.apiClient.post('/functions/v1/device-management/register', deviceInfo)
  }

  async getDevices(): Promise<Device[]> {
    const response = await this.apiClient.get('/functions/v1/device-management/list')
    return response.devices
  }

  async signOutDevice(deviceId: string): Promise<void> {
    await this.apiClient.delete(`/functions/v1/device-management/${deviceId}`)
  }

  async signOutAllOtherDevices(): Promise<void> {
    await this.apiClient.post('/functions/v1/device-management/signout-all')
  }

  async updateDeviceInfo(updates: Partial<DeviceRegisterRequest>): Promise<Device> {
    return this.apiClient.patch('/functions/v1/device-management/current', updates)
  }
}
```

### 4.2 Update ApiClient (`packages/client/src/api-client.ts`)
```typescript
export class ApiClient {
  private deviceId: string
  
  constructor(config: ApiClientConfig) {
    // ... existing logic
    this.deviceId = this.getOrCreateDeviceId()
  }
  
  private getOrCreateDeviceId(): string {
    // For web: use localStorage + crypto.randomUUID()
    // For React Native: will be implemented differently
    const stored = localStorage.getItem('nvlp_device_id')
    if (stored) return stored
    
    const deviceId = crypto.randomUUID()
    localStorage.setItem('nvlp_device_id', deviceId)
    return deviceId
  }
  
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    // Add device ID to all requests
    const headers = {
      ...options.headers,
      'X-Device-ID': this.deviceId,
    }
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })
    
    // Handle session invalidation
    if (response.status === 401) {
      const errorData = await response.json()
      if (errorData.code === 'SESSION_INVALIDATED') {
        // Emit event for session invalidation
        this.emit('sessionInvalidated', errorData.error)
        throw new SessionInvalidatedError(errorData.error)
      }
    }
    
    // ... rest of existing logic
  }
}

export class SessionInvalidatedError extends Error {
  code = 'SESSION_INVALIDATED'
  constructor(message: string) {
    super(message)
    this.name = 'SessionInvalidatedError'
  }
}
```

### 4.3 Update Main Client (`packages/client/src/client.ts`)
```typescript
export class NVLPClient {
  public readonly device: DeviceService
  
  constructor(config: ClientConfig) {
    // ... existing logic
    this.device = new DeviceService(this.apiClient)
    
    // Handle session invalidation globally
    this.apiClient.on('sessionInvalidated', this.handleSessionInvalidated.bind(this))
  }
  
  private handleSessionInvalidated(error: string) {
    // Clear local auth state
    this.auth.signOut()
    // Emit event for UI to handle
    this.emit('sessionInvalidated', error)
  }
}
```

---

## Phase 5: Email Notifications

### 5.1 Email Template
Create email template for new device notifications:

```html
<!-- supabase/functions/_shared/email-templates/new-device-signin.html -->
<!DOCTYPE html>
<html>
<head>
    <title>New Device Sign-in - NVLP</title>
</head>
<body>
    <h2>New Device Sign-in</h2>
    <p>Hi {{user_name}},</p>
    
    <p>We noticed a new sign-in to your NVLP account:</p>
    
    <ul>
        <li><strong>Device:</strong> {{device_name}}</li>
        <li><strong>Location:</strong> {{location}}</li>
        <li><strong>Time:</strong> {{signin_time}}</li>
        <li><strong>IP Address:</strong> {{ip_address}}</li>
    </ul>
    
    <p>If this was you, no action is needed.</p>
    
    <p>If this wasn't you:</p>
    <ol>
        <li>Open the NVLP app</li>
        <li>Go to Settings > Security > Active Sessions</li>
        <li>Sign out the unknown device</li>
        <li>Consider changing your email password</li>
    </ol>
    
    <p>Best regards,<br>The NVLP Team</p>
</body>
</html>
```

### 5.2 Email Service
Update `packages/api/src/services/notification.service.ts`:

```typescript
export class NotificationService extends BaseService {
  async sendNewDeviceAlert(
    userId: string,
    deviceInfo: Device,
    location?: { country: string; city: string }
  ): Promise<void> {
    // Get user email
    const { data: user } = await this.client.auth.admin.getUserById(userId)
    if (!user?.email) return
    
    // Send email notification
    await this.sendEmail({
      to: user.email,
      template: 'new-device-signin',
      variables: {
        user_name: user.user_metadata?.name || 'User',
        device_name: deviceInfo.device_name,
        location: location ? `${location.city}, ${location.country}` : 'Unknown',
        signin_time: new Date().toLocaleString(),
        ip_address: deviceInfo.ip_address || 'Unknown'
      }
    })
  }
}
```

---

## Phase 6: Testing & Validation

### 6.1 Unit Tests
- [ ] Test device registration logic
- [ ] Test session invalidation functions
- [ ] Test middleware behavior
- [ ] Test email notification triggers

### 6.2 Integration Tests  
- [ ] Test full device registration flow
- [ ] Test "sign out all devices" functionality
- [ ] Test session invalidation across multiple devices
- [ ] Test email notifications

### 6.3 Security Testing
- [ ] Verify session invalidation works immediately
- [ ] Test device fingerprinting uniqueness
- [ ] Validate email notifications are sent
- [ ] Test edge cases (device ID spoofing attempts)

---

## Implementation Checklist

### Backend API Changes
- [ ] Create DeviceService in packages/api
- [ ] Add session validation middleware  
- [ ] Update BaseService with session validation
- [ ] Create device-management Edge Function
- [ ] Update all existing Edge Functions
- [ ] Add SESSION_INVALIDATED error code
- [ ] Create email notification system
- [ ] Add device management API endpoints

### Client Package Changes  
- [ ] Create DeviceService in packages/client
- [ ] Update ApiClient with device ID header
- [ ] Add SessionInvalidatedError handling
- [ ] Update main NVLPClient class
- [ ] Add device management types to packages/types
- [ ] Handle session invalidation events

### Database & Config
- [ ] Apply device tracking migration ✅
- [ ] Configure shorter magic link expiry
- [ ] Set up email templates
- [ ] Configure cleanup jobs for old sessions

### Testing
- [ ] Unit tests for all new services
- [ ] Integration tests for device flows
- [ ] Security validation tests
- [ ] Email notification tests

---

## Notes
- All session validation is backwards compatible
- Existing users won't be affected until they update their app
- Device registration happens automatically on login
- Email notifications are opt-out (users can disable in settings)
- Session invalidation takes effect immediately via API middleware
- Old invalidated session records are cleaned up automatically