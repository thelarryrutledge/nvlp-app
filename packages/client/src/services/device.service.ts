/**
 * Device Service for NVLP Client
 * 
 * Handles device registration, management, and session control
 */

import { 
  Device, 
  DeviceRegisterRequest, 
  DeviceUpdateRequest,
  DeviceRegistrationResult, 
  DeviceSecurityStatus 
} from '@nvlp/types'
import { HttpClient } from '../http-client'

export class DeviceService {
  private httpClient: HttpClient

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient
  }

  /**
   * Register or update a device
   */
  async registerDevice(deviceInfo: DeviceRegisterRequest): Promise<DeviceRegistrationResult> {
    const response = await this.httpClient.post<DeviceRegistrationResult>(
      '/functions/v1/device-management/register',
      deviceInfo
    )
    return response
  }

  /**
   * Update device information (name, push token, app version)
   */
  async updateDeviceInfo(updates: DeviceUpdateRequest): Promise<Device> {
    const response = await this.httpClient.patch<{ device: Device }>(
      '/functions/v1/device-management/current',
      updates
    )
    return response.device
  }

  /**
   * Get all devices for the current user
   */
  async getDevices(): Promise<Device[]> {
    const response = await this.httpClient.get<{ devices: Device[] }>(
      '/functions/v1/device-management/list'
    )
    return response.devices
  }

  /**
   * Get the current device information
   */
  async getCurrentDevice(): Promise<Device> {
    const response = await this.httpClient.get<{ device: Device }>(
      '/functions/v1/device-management/current'
    )
    return response.device
  }

  /**
   * Sign out a specific device by device ID
   */
  async signOutDevice(deviceId: string): Promise<void> {
    await this.httpClient.delete(
      `/functions/v1/device-management/${deviceId}`
    )
  }

  /**
   * Sign out all other devices (keeping the current device active)
   */
  async signOutAllOtherDevices(): Promise<void> {
    await this.httpClient.post(
      '/functions/v1/device-management/signout-all',
      {}
    )
  }

  /**
   * Permanently revoke a device (cannot be restored)
   */
  async revokeDevice(deviceId: string): Promise<void> {
    await this.httpClient.patch(
      `/functions/v1/device-management/revoke/${deviceId}`,
      {}
    )
  }

  /**
   * Check if the current session is invalidated
   */
  async isSessionInvalidated(): Promise<boolean> {
    try {
      // Try to make an authenticated request
      await this.getCurrentDevice()
      return false
    } catch (error: any) {
      // Check if the error is due to session invalidation
      return error?.code === 'SESSION_INVALIDATED'
    }
  }

  /**
   * Get device security status and recent activity
   */
  async getDeviceSecurityStatus(): Promise<DeviceSecurityStatus> {
    const devices = await this.getDevices()
    const currentDevice = devices.find(d => d.is_current)
    
    if (!currentDevice) {
      throw new Error('Current device not found')
    }

    // Get recent sign-ins (devices created in the last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentSignins = devices
      .filter(d => new Date(d.first_seen) > thirtyDaysAgo)
      .sort((a, b) => new Date(b.first_seen).getTime() - new Date(a.first_seen).getTime())
      .slice(0, 5) // Limit to 5 most recent
      .map(d => ({
        device_name: d.device_name,
        location: d.location_city && d.location_country 
          ? `${d.location_city}, ${d.location_country}` 
          : undefined,
        signin_time: d.first_seen
      }))

    return {
      total_devices: devices.length,
      active_devices: devices.filter(d => !d.is_revoked).length,
      current_device: currentDevice,
      recent_signins: recentSignins
    }
  }

  /**
   * Send a new device notification email manually
   */
  async sendNewDeviceNotification(deviceId: string): Promise<void> {
    await this.httpClient.post(
      '/functions/v1/device-management/send-notification',
      { device_id: deviceId }
    )
  }
}