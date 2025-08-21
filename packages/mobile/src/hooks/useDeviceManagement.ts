import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { Device, DeviceSecurityStatus, DeviceRegisterRequest } from '@nvlp/types';
import ApiClientService from '../services/apiClient';
import { getDeviceInfo, storeDeviceInfo } from '../utils/device';
import reactotron from '../config/reactotron';

interface UseDeviceManagementOptions {
  autoFetch?: boolean;
  refreshInterval?: number; // in milliseconds
  showAlerts?: boolean;
}

interface UseDeviceManagementResult {
  // State
  devices: Device[];
  currentDevice: Device | null;
  securityStatus: DeviceSecurityStatus | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchDevices: () => Promise<void>;
  registerDevice: () => Promise<void>;
  updateDeviceName: (deviceId: string, newName: string) => Promise<void>;
  signOutDevice: (deviceId: string) => Promise<void>;
  signOutAllOtherDevices: () => Promise<void>;
  revokeDevice: (deviceId: string) => Promise<void>;
  refreshSecurityStatus: () => Promise<void>;
  clearError: () => void;
  
  // Utilities
  isCurrentDevice: (deviceId: string) => boolean;
  getDeviceById: (deviceId: string) => Device | undefined;
  hasMultipleDevices: () => boolean;
}

/**
 * Hook for managing user devices and sessions
 * 
 * This hook provides:
 * - Device list management
 * - Current device tracking
 * - Remote device sign-out
 * - Security status monitoring
 * - Automatic device registration
 */
export const useDeviceManagement = (options: UseDeviceManagementOptions = {}): UseDeviceManagementResult => {
  const {
    autoFetch = true,
    refreshInterval = 0, // No auto-refresh by default
    showAlerts = true,
  } = options;

  // State
  const [devices, setDevices] = useState<Device[]>([]);
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);
  const [securityStatus, setSecurityStatus] = useState<DeviceSecurityStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for interval management
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Ensure API client is initialized before use
   */
  const ensureApiClient = useCallback(async () => {
    try {
      return ApiClientService.getClient();
    } catch (initError) {
      // If client not initialized, initialize it now
      await ApiClientService.initialize();
      return ApiClientService.getClient();
    }
  }, []);

  /**
   * Fetch all devices for the current user
   */
  const fetchDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const client = await ensureApiClient();
      const deviceList = await client.device.getDevices();
      
      setDevices(deviceList);
      
      // Find and set the current device
      const current = deviceList.find(d => d.is_current);
      setCurrentDevice(current || null);
      
      reactotron.log('📱 Fetched devices:', {
        total: deviceList.length,
        current: current?.device_name,
      });
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Failed to fetch devices';
      setError(errorMessage);
      reactotron.error('Failed to fetch devices:', fetchError as Error);
      
      if (showAlerts) {
        Alert.alert('Error', 'Failed to load device list. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [showAlerts, ensureApiClient]);

  /**
   * Register the current device with the API
   */
  const registerDevice = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get device information
      const deviceInfo = await getDeviceInfo();
      
      const registerRequest: DeviceRegisterRequest = {
        device_id: deviceInfo.deviceId,
        device_fingerprint: deviceInfo.deviceFingerprint,
        device_name: deviceInfo.deviceName,
        device_type: deviceInfo.deviceType,
        device_model: deviceInfo.deviceModel,
        os_version: deviceInfo.systemVersion,
        app_version: deviceInfo.appVersion,
        ip_address: deviceInfo.ipAddress,
      };
      
      const client = await ensureApiClient();
      const result = await client.device.registerDevice(registerRequest);
      
      // Store device info locally
      await storeDeviceInfo({
        deviceId: result.device.device_id,
        deviceFingerprint: result.device.device_fingerprint,
        deviceName: result.device.device_name,
        deviceType: result.device.device_type,
      });
      
      // Update state
      setCurrentDevice(result.device);
      
      // If this is a new device, show notification
      if (result.is_new_device && showAlerts) {
        Alert.alert(
          'New Device Registered',
          `This device (${result.device.device_name}) has been registered to your account.`,
          [{ text: 'OK' }]
        );
      }
      
      reactotron.log('📱 Device registered:', {
        isNew: result.is_new_device,
        deviceName: result.device.device_name,
      });
      
      // Refresh device list after registration
      await fetchDevices();
    } catch (registerError) {
      const errorMessage = registerError instanceof Error ? registerError.message : 'Failed to register device';
      setError(errorMessage);
      reactotron.error('Failed to register device:', registerError as Error);
      
      if (showAlerts) {
        Alert.alert('Error', 'Failed to register device. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchDevices, showAlerts, ensureApiClient]);

  /**
   * Update device name
   */
  const updateDeviceName = useCallback(async (deviceId: string, newName: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const client = await ensureApiClient();
      const updatedDevice = await client.device.updateDeviceInfo({
        device_name: newName,
      });
      
      // Update local state
      setDevices(prev => prev.map(d => 
        d.device_id === deviceId ? { ...d, device_name: newName } : d
      ));
      
      if (currentDevice?.device_id === deviceId) {
        setCurrentDevice({ ...currentDevice, device_name: newName });
      }
      
      if (showAlerts) {
        Alert.alert('Success', `Device renamed to "${newName}"`);
      }
      
      reactotron.log('📱 Device renamed:', { deviceId, newName });
    } catch (updateError) {
      const errorMessage = updateError instanceof Error ? updateError.message : 'Failed to update device name';
      setError(errorMessage);
      reactotron.error('Failed to update device name:', updateError as Error);
      
      if (showAlerts) {
        Alert.alert('Error', 'Failed to update device name. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentDevice, showAlerts, ensureApiClient]);

  /**
   * Sign out a specific device
   */
  const signOutDevice = useCallback(async (deviceId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Don't allow signing out the current device through this method
      if (currentDevice?.device_id === deviceId) {
        throw new Error('Cannot sign out the current device. Use the sign out function instead.');
      }
      
      const client = await ensureApiClient();
      await client.device.signOutDevice(deviceId);
      
      // Remove from local state
      setDevices(prev => prev.filter(d => d.device_id !== deviceId));
      
      if (showAlerts) {
        const device = devices.find(d => d.device_id === deviceId);
        Alert.alert('Success', `Signed out "${device?.device_name || 'device'}"`);
      }
      
      reactotron.log('📱 Device signed out:', { deviceId });
    } catch (signOutError) {
      const errorMessage = signOutError instanceof Error ? signOutError.message : 'Failed to sign out device';
      setError(errorMessage);
      reactotron.error('Failed to sign out device:', signOutError as Error);
      
      if (showAlerts) {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentDevice, devices, showAlerts, ensureApiClient]);

  /**
   * Sign out all other devices
   */
  const signOutAllOtherDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const client = await ensureApiClient();
      await client.device.signOutAllOtherDevices();
      
      // Keep only the current device in state
      if (currentDevice) {
        setDevices([currentDevice]);
      }
      
      if (showAlerts) {
        Alert.alert('Success', 'All other devices have been signed out');
      }
      
      reactotron.log('📱 All other devices signed out');
    } catch (signOutError) {
      const errorMessage = signOutError instanceof Error ? signOutError.message : 'Failed to sign out devices';
      setError(errorMessage);
      reactotron.error('Failed to sign out all devices:', signOutError as Error);
      
      if (showAlerts) {
        Alert.alert('Error', 'Failed to sign out all devices. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentDevice, showAlerts, ensureApiClient]);

  /**
   * Revoke a device (permanent action)
   */
  const revokeDevice = useCallback(async (deviceId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const client = await ensureApiClient();
      await client.device.revokeDevice(deviceId);
      
      // Update device status in local state
      setDevices(prev => prev.map(d => 
        d.device_id === deviceId ? { ...d, is_revoked: true } : d
      ));
      
      if (showAlerts) {
        const device = devices.find(d => d.device_id === deviceId);
        Alert.alert('Success', `Device "${device?.device_name || 'device'}" has been revoked`);
      }
      
      reactotron.log('📱 Device revoked:', { deviceId });
    } catch (revokeError) {
      const errorMessage = revokeError instanceof Error ? revokeError.message : 'Failed to revoke device';
      setError(errorMessage);
      reactotron.error('Failed to revoke device:', revokeError as Error);
      
      if (showAlerts) {
        Alert.alert('Error', 'Failed to revoke device. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [devices, showAlerts, ensureApiClient]);

  /**
   * Refresh security status
   */
  const refreshSecurityStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const client = await ensureApiClient();
      const status = await client.device.getDeviceSecurityStatus();
      
      setSecurityStatus(status);
      
      reactotron.log('📱 Security status refreshed:', {
        totalDevices: status.total_devices,
        activeDevices: status.active_devices,
      });
    } catch (statusError) {
      const errorMessage = statusError instanceof Error ? statusError.message : 'Failed to get security status';
      setError(errorMessage);
      reactotron.error('Failed to get security status:', statusError as Error);
    } finally {
      setIsLoading(false);
    }
  }, [ensureApiClient]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check if a device is the current device
   */
  const isCurrentDevice = useCallback((deviceId: string): boolean => {
    return currentDevice?.device_id === deviceId;
  }, [currentDevice]);

  /**
   * Get device by ID
   */
  const getDeviceById = useCallback((deviceId: string): Device | undefined => {
    return devices.find(d => d.device_id === deviceId);
  }, [devices]);

  /**
   * Check if user has multiple devices
   */
  const hasMultipleDevices = useCallback((): boolean => {
    return devices.length > 1;
  }, [devices]);

  // Auto-fetch devices on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchDevices();
    }
  }, [autoFetch, fetchDevices]);

  // Set up refresh interval if specified
  useEffect(() => {
    if (refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        fetchDevices();
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [refreshInterval, fetchDevices]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    // State
    devices,
    currentDevice,
    securityStatus,
    isLoading,
    error,
    
    // Actions
    fetchDevices,
    registerDevice,
    updateDeviceName,
    signOutDevice,
    signOutAllOtherDevices,
    revokeDevice,
    refreshSecurityStatus,
    clearError,
    
    // Utilities
    isCurrentDevice,
    getDeviceById,
    hasMultipleDevices,
  };
};

export default useDeviceManagement;