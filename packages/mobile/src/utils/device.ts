import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorageService, { DeviceInfo as StoredDeviceInfo } from '../services/secureStorage';
import reactotron from '../config/reactotron';

// Storage key for device ID
const DEVICE_ID_KEY = 'nvlp_device_id';

/**
 * Device Utilities Module
 * 
 * Provides device identification, fingerprinting, and device management utilities
 * for the trusted device management system.
 */

export interface DeviceDetails {
  deviceId: string;
  deviceFingerprint: string;
  deviceName: string;
  deviceType: 'ios' | 'android';
  deviceModel: string;
  systemVersion: string;
  appVersion: string;
  buildNumber: string;
  bundleId: string;
  isTablet: boolean;
  hasNotch: boolean;
  ipAddress?: string;
}

/**
 * Get or generate a unique device ID
 * 
 * This ID persists across app sessions and logins.
 * The ID is stored in AsyncStorage (not SecureStorage) so it survives logouts.
 * If the app is uninstalled and reinstalled, a new ID will be generated.
 */
export const getDeviceId = async (): Promise<string> => {
  try {
    // Always check AsyncStorage first (this persists across logins)
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Check secure storage for backward compatibility (might have old device ID)
      const storedInfo = await SecureStorageService.getDeviceInfo();
      if (storedInfo?.deviceId) {
        deviceId = storedInfo.deviceId;
        // Migrate to AsyncStorage for persistence
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
        reactotron.log('📱 Device ID migrated from secure storage to AsyncStorage:', deviceId);
      }
    }
    
    if (!deviceId) {
      // Generate a new UUID
      deviceId = uuidv4();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      reactotron.log('📱 New device ID generated:', deviceId);
    } else {
      reactotron.log('📱 Device ID retrieved:', deviceId);
    }
    
    return deviceId;
  } catch (error) {
    reactotron.error('Failed to get/generate device ID:', error as Error);
    // Fallback to a new UUID if storage fails
    return uuidv4();
  }
};

/**
 * Generate a device fingerprint
 * 
 * Creates a unique fingerprint based on device characteristics.
 * This helps identify the same device even if the app is reinstalled.
 */
export const getDeviceFingerprint = async (): Promise<string> => {
  try {
    const components = [
      await DeviceInfo.getUniqueId(), // Unique device ID (IDFV on iOS, Android ID on Android)
      DeviceInfo.getModel(),
      DeviceInfo.getSystemName(),
      DeviceInfo.getSystemVersion(),
      await DeviceInfo.getCarrier(),
      DeviceInfo.getDeviceType(),
    ];
    
    // Filter out null/undefined values and join
    const fingerprint = components
      .filter(Boolean)
      .join('|');
    
    reactotron.log('📱 Device fingerprint generated:', fingerprint);
    return fingerprint;
  } catch (error) {
    reactotron.error('Failed to generate device fingerprint:', error as Error);
    // Fallback to basic fingerprint
    return `${Platform.OS}|${DeviceInfo.getModel()}|${DeviceInfo.getSystemVersion()}`;
  }
};

/**
 * Get device information for display and tracking
 */
export const getDeviceInfo = async (): Promise<DeviceDetails> => {
  try {
    const [
      deviceId,
      deviceFingerprint,
      ipAddress,
      carrier,
    ] = await Promise.all([
      getDeviceId(),
      getDeviceFingerprint(),
      DeviceInfo.getIpAddress(),
      DeviceInfo.getCarrier(),
    ]);

    const deviceInfo: DeviceDetails = {
      deviceId,
      deviceFingerprint,
      deviceName: await getDeviceName(),
      deviceType: Platform.OS as 'ios' | 'android',
      deviceModel: DeviceInfo.getModel(),
      systemVersion: DeviceInfo.getSystemVersion(),
      appVersion: DeviceInfo.getVersion(),
      buildNumber: DeviceInfo.getBuildNumber(),
      bundleId: DeviceInfo.getBundleId(),
      isTablet: DeviceInfo.isTablet(),
      hasNotch: DeviceInfo.hasNotch(),
      ipAddress: ipAddress || undefined,
    };

    reactotron.log('📱 Device info collected:', deviceInfo);
    return deviceInfo;
  } catch (error) {
    reactotron.error('Failed to get device info:', error as Error);
    throw error;
  }
};

/**
 * Get a user-friendly device name
 */
export const getDeviceName = async (): Promise<string> => {
  try {
    // Try to get the device name (requires permission on iOS 16+)
    const deviceName = await DeviceInfo.getDeviceName();
    
    if (deviceName && deviceName !== 'unknown') {
      return deviceName;
    }
    
    // Fallback to a descriptive name
    const model = DeviceInfo.getModel();
    const systemName = DeviceInfo.getSystemName();
    return `${model} (${systemName})`;
  } catch (error) {
    // Fallback to basic device info
    const model = DeviceInfo.getModel();
    const platform = Platform.OS === 'ios' ? 'iOS' : 'Android';
    return `${model} (${platform})`;
  }
};

/**
 * Store device info in secure storage
 */
export const storeDeviceInfo = async (deviceInfo: Partial<StoredDeviceInfo>): Promise<void> => {
  try {
    const existingInfo = await SecureStorageService.getDeviceInfo();
    
    const updatedInfo: StoredDeviceInfo = {
      deviceId: deviceInfo.deviceId || existingInfo?.deviceId || await getDeviceId(),
      deviceFingerprint: deviceInfo.deviceFingerprint || existingInfo?.deviceFingerprint || await getDeviceFingerprint(),
      deviceName: deviceInfo.deviceName || existingInfo?.deviceName || await getDeviceName(),
      deviceType: deviceInfo.deviceType || existingInfo?.deviceType || (Platform.OS as 'ios' | 'android'),
    };
    
    await SecureStorageService.setDeviceInfo(updatedInfo);
    reactotron.log('📱 Device info stored in secure storage');
  } catch (error) {
    reactotron.error('Failed to store device info:', error as Error);
    throw error;
  }
};

/**
 * Clear device info from storage (used during logout)
 */
export const clearDeviceInfo = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(DEVICE_ID_KEY);
    // Note: SecureStorageService.clearAll() will handle clearing from secure storage
    reactotron.log('📱 Device info cleared');
  } catch (error) {
    reactotron.error('Failed to clear device info:', error as Error);
  }
};

/**
 * Get device info for API headers
 */
export const getDeviceHeaders = async (): Promise<Record<string, string>> => {
  try {
    const deviceId = await getDeviceId();
    const deviceFingerprint = await getDeviceFingerprint();
    
    return {
      'X-Device-ID': deviceId,
      'X-Device-Fingerprint': deviceFingerprint,
      'X-Device-Type': Platform.OS,
      'X-Device-Model': DeviceInfo.getModel(),
      'X-App-Version': DeviceInfo.getVersion(),
    };
  } catch (error) {
    reactotron.error('Failed to get device headers:', error as Error);
    return {};
  }
};

/**
 * Check if this is a new device (first time running the app)
 */
export const isNewDevice = async (): Promise<boolean> => {
  try {
    const storedId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    const storedInfo = await SecureStorageService.getDeviceInfo();
    
    return !storedId && !storedInfo;
  } catch (error) {
    reactotron.error('Failed to check if new device:', error as Error);
    return true; // Assume new device on error
  }
};

/**
 * Get device security info
 */
export const getDeviceSecurityInfo = async (): Promise<{
  isPinOrFingerprintSet: boolean;
  isJailbroken: boolean;
  isEmulator: boolean;
}> => {
  try {
    const [isPinOrFingerprintSet, isJailbroken, isEmulator] = await Promise.all([
      DeviceInfo.isPinOrFingerprintSet(),
      DeviceInfo.isJailBroken !== undefined ? DeviceInfo.isJailBroken() : Promise.resolve(false),
      DeviceInfo.isEmulator(),
    ]);
    
    return {
      isPinOrFingerprintSet,
      isJailbroken,
      isEmulator,
    };
  } catch (error) {
    reactotron.error('Failed to get device security info:', error as Error);
    return {
      isPinOrFingerprintSet: false,
      isJailbroken: false,
      isEmulator: false,
    };
  }
};