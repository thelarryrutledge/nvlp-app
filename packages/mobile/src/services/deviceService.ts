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
import notificationService from './notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  private static readonly KNOWN_DEVICES_KEY = '@nvlp/known_devices';
  private static lastCheckTime: Date | null = null;
  private static readonly MIN_CHECK_INTERVAL = 300000; // Minimum 5 minutes between checks
  /**
   * Get the device service instance from the API client
   */
  private static async getService(): Promise<ClientDeviceService> {
    // Ensure API client is initialized
    try {
      const client = ApiClientService.getClient();
      return client.device;
    } catch (initError) {
      // If client not initialized, initialize it now
      await ApiClientService.initialize();
      const client = ApiClientService.getClient();
      return client.device;
    }
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
      const service = await this.getService();
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
   * Also opportunistically checks for new devices to show notifications
   */
  static async getActiveDevices(): Promise<RegisteredDevice[]> {
    try {
      const service = await this.getService();
      const devices = await service.getDevices();
      
      // Opportunistically check for new devices (throttled)
      this.checkForNewDevicesOpportunistically();
      
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
      const service = await this.getService();
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
      const service = await this.getService();
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
   * Check for new devices opportunistically
   * Called automatically when getting active devices
   */
  static async checkForNewDevicesOpportunistically(): Promise<void> {
    // Only check if enough time has passed since last check
    if (this.lastCheckTime) {
      const timeSinceLastCheck = Date.now() - this.lastCheckTime.getTime();
      if (timeSinceLastCheck < this.MIN_CHECK_INTERVAL) {
        return; // Too soon, skip check
      }
    }
    
    this.lastCheckTime = new Date();
    await this.checkForNewDevices();
  }

  /**
   * Check for new devices and show notifications
   */
  static async checkForNewDevices(): Promise<void> {
    try {
      // Get current device ID
      const currentDeviceId = await getDeviceId();
      
      // Get all active devices directly (without triggering another check)
      const service = await this.getService();
      const devicesRaw = await service.getDevices();
      const devices = devicesRaw.map((device: Device) => ({
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
      
      // Get known devices from storage
      const knownDevicesJson = await AsyncStorage.getItem(this.KNOWN_DEVICES_KEY);
      const knownDevices: string[] = knownDevicesJson ? JSON.parse(knownDevicesJson) : [];
      
      reactotron.log('📱 Checking for new devices:', {
        currentDeviceId,
        totalDevices: devices.length,
        knownDevices: knownDevices.length,
        deviceIds: devices.map(d => ({ id: d.deviceId, name: d.deviceName }))
      });
      
      // Find new devices (not in known list and not current device)
      const newDevices = devices.filter(device => 
        !device.isRevoked && 
        device.deviceId !== currentDeviceId &&
        !knownDevices.includes(device.deviceId)
      );
      
      reactotron.log('📱 New devices found:', newDevices.length, newDevices.map(d => d.deviceName));
      
      // Show notification for each new device
      for (const device of newDevices) {
        notificationService.showDeviceAlert({
          deviceName: device.deviceName,
          deviceId: device.deviceId,
          location: device.locationCity && device.locationCountry 
            ? `${device.locationCity}, ${device.locationCountry}`
            : device.locationCountry,
          onViewDetails: () => {
            // Navigate to device details screen
            reactotron.log('View device details:', device.deviceId);
            // TODO: Implement navigation to device details
          },
          onSignOutDevice: async () => {
            // Sign out the specific device
            try {
              await this.signOutDevice(device.deviceId);
              reactotron.log('✅ Device signed out:', device.deviceId);
              notificationService.showSuccess(
                'Device Signed Out',
                `${device.deviceName} has been signed out successfully.`
              );
            } catch (error) {
              reactotron.error('Failed to sign out device:', error as Error);
              notificationService.showError(
                'Sign Out Failed',
                'Failed to sign out the device. Please try again.'
              );
            }
          },
        });
      }
      
      // Update known devices list
      const allDeviceIds = devices
        .filter(d => !d.isRevoked)
        .map(d => d.deviceId);
      await AsyncStorage.setItem(this.KNOWN_DEVICES_KEY, JSON.stringify(allDeviceIds));
      
      if (newDevices.length > 0) {
        reactotron.log(`📱 Found ${newDevices.length} new device(s)`);
      }
    } catch (error) {
      reactotron.error('Failed to check for new devices:', error as Error);
    }
  }

  /**
   * Clear known devices (useful after sign out)
   */
  static async clearKnownDevices(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.KNOWN_DEVICES_KEY);
      reactotron.log('📱 Cleared known devices list');
    } catch (error) {
      reactotron.error('Failed to clear known devices:', error as Error);
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