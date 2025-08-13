/**
 * Device Management Types
 * 
 * Types for tracking user devices, sessions, and security features
 */

export interface Device {
  id: string
  user_id: string
  device_id: string
  device_fingerprint: string
  device_name: string
  device_type: 'ios' | 'android'
  device_model?: string
  os_version?: string
  app_version?: string
  first_seen: string
  last_seen: string
  ip_address?: string
  location_country?: string
  location_city?: string
  is_current: boolean
  is_revoked: boolean
  push_token?: string
  created_at: string
  updated_at: string
}

export interface DeviceRegisterRequest {
  device_id: string
  device_fingerprint: string
  device_name: string
  device_type: 'ios' | 'android'
  device_model?: string
  os_version?: string
  app_version?: string
  push_token?: string
  ip_address?: string
  location_country?: string
  location_city?: string
}

export interface DeviceUpdateRequest {
  device_name?: string
  push_token?: string
  app_version?: string
  location_country?: string
  location_city?: string
}

export interface DeviceRegistrationResult {
  is_new_device: boolean
  device: Device
  requires_notification: boolean
}

export interface DeviceSecurityStatus {
  total_devices: number
  active_devices: number
  current_device: Device
  recent_signins: Array<{
    device_name: string
    location?: string
    signin_time: string
  }>
}

export interface InvalidatedSession {
  id: string
  user_id: string
  device_id?: string
  invalidated_at: string
  reason: string
  invalidated_by_device_id?: string
  created_at: string
}

export interface SessionInvalidationRequest {
  device_id?: string // If not provided, invalidates all devices
  reason?: string
}

// Location information for device registration
export interface DeviceLocation {
  country?: string
  city?: string
  ip_address?: string
}

// Device fingerprinting information
export interface DeviceFingerprint {
  model: string
  os_version: string
  screen_dimensions?: string
  timezone?: string
  language?: string
}