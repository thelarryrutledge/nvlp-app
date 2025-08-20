/**
 * Device Management Service
 * 
 * Handles device registration, management, and session tracking
 * with the NVLP API backend.
 */

import { DeviceService as ClientDeviceService } from '@nvlp/client';
import { DeviceRegisterRequest, Device } from '@nvlp/types';
import ApiClientService from './apiClient';
import SecureStorageService from './secureStorage';
import { getDeviceInfo, getDeviceId, storeDeviceInfo } from '../utils/device';
import reactotron from '../config/reactotron';

export interface RegisteredDevice {
  id: string;
  deviceId: string;
  deviceFingerprint: string;
  deviceName: string;
  deviceType: 'ios' | 'android';
  firstSeen: string;
  lastSeen: string;
  ipAddress?: string;
  locationCountry?: string;
  locationCity?: string;
  isCurrent: boolean;
  isRevoked: boolean;
}

/**
 * Device Management Service
 */
export class DeviceService {
  /**
   * Get the device service instance from the API client
   */
  private static getService(): ClientDeviceService {
    const client = ApiClientService.getClient();
    // The NVLPClient has a device property that is already an instance of DeviceService
    return client.device;
  }

  /**
   * Register the current device with the API
   * 
   * This should be called after successful authentication
   */
  static async registerDevice(): Promise<void> {
    try {
      reactotron.log('📱 Starting device registration...');

      // Get device information
      const deviceInfo = await getDeviceInfo();
      
      // Store device info locally
      await storeDeviceInfo({
        deviceId: deviceInfo.deviceId,
        deviceFingerprint: deviceInfo.deviceFingerprint,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
      });

      // Prepare device info for API
      const apiDeviceInfo: DeviceRegisterRequest = {
        device_id: deviceInfo.deviceId,
        device_fingerprint: deviceInfo.deviceFingerprint,
        device_name: deviceInfo.deviceName,
        device_type: deviceInfo.deviceType,
        device_model: deviceInfo.deviceModel,
        os_version: deviceInfo.systemVersion,
        app_version: deviceInfo.appVersion,
        ip_address: deviceInfo.ipAddress,
      };

      // Register with API
      const service = this.getService();
      await service.registerDevice(apiDeviceInfo);

      reactotron.log('✅ Device registered successfully', {
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
      });
    } catch (error) {
      reactotron.error('❌ Device registration failed:', error as Error);
      // Don't throw - device registration failure shouldn't block authentication
      console.warn('Device registration failed, continuing anyway:', error);
    }
  }

  /**
   * Get list of user's active devices
   */
  static async getActiveDevices(): Promise<RegisteredDevice[]> {
    try {
      const service = this.getService();
      const devices = await service.getDevices();
      
      return devices.map((device: Device) => ({
        id: device.id,
        deviceId: device.device_id,
        deviceFingerprint: device.device_fingerprint,
        deviceName: device.device_name,
        deviceType: device.device_type,
        firstSeen: device.first_seen,
        lastSeen: device.last_seen,
        ipAddress: device.ip_address,
        locationCountry: device.location_country,
        locationCity: device.location_city,
        isCurrent: device.is_current,
        isRevoked: device.is_revoked,
      }));
    } catch (error) {
      reactotron.error('Failed to get active devices:', error as Error);
      throw error;
    }
  }

  /**
   * Sign out a specific device
   */
  static async signOutDevice(deviceId: string): Promise<void> {
    try {
      const service = this.getService();
      await service.signOutDevice(deviceId);
      
      reactotron.log('✅ Device signed out:', deviceId);
    } catch (error) {
      reactotron.error('Failed to sign out device:', error as Error);
      throw error;
    }
  }

  /**
   * Sign out all other devices
   */
  static async signOutAllOtherDevices(): Promise<void> {
    try {
      const service = this.getService();
      await service.signOutAllOtherDevices();
      
      reactotron.log('✅ All other devices signed out');
    } catch (error) {
      reactotron.error('Failed to sign out all devices:', error as Error);
      throw error;
    }
  }

  /**
   * Check if the current device is registered
   */
  static async isDeviceRegistered(): Promise<boolean> {
    try {
      const deviceId = await getDeviceId();
      const devices = await this.getActiveDevices();
      
      return devices.some(device => 
        device.deviceId === deviceId && !device.isRevoked
      );
    } catch (error) {
      reactotron.error('Failed to check device registration:', error as Error);
      return false;
    }
  }

  /**
   * Handle session invalidation error
   * 
   * This is called when the API returns a SESSION_INVALIDATED error
   */
  static async handleSessionInvalidation(): Promise<void> {
    try {
      reactotron.log('⚠️ Session invalidated, clearing local data...');
      
      // Clear all stored auth data
      await SecureStorageService.clearAuthTokens();
      
      // The app should redirect to login screen
      // This will be handled by the auth state management
    } catch (error) {
      reactotron.error('Failed to handle session invalidation:', error as Error);
    }
  }

  /**
   * Update device name
   */
  static async updateDeviceName(deviceId: string, newName: string): Promise<void> {
    try {
      // For now, this would need to be implemented in the API
      // The API doesn't currently support updating device names
      reactotron.log('Device name update not yet supported by API');
      throw new Error('Device name update not yet implemented');
    } catch (error) {
      reactotron.error('Failed to update device name:', error as Error);
      throw error;
    }
  }

  /**
   * Get current device ID
   */
  static async getCurrentDeviceId(): Promise<string> {
    return getDeviceId();
  }
}

export default DeviceService;