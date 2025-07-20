/**
 * Permission Service
 * 
 * Simplified permission service using React Native's built-in APIs.
 * Handles camera, photo library, and notification permissions without external dependencies.
 */

import { Platform, Alert, Linking, PermissionsAndroid } from 'react-native';

// Permission types specific to our app needs
export type AppPermission = 
  | 'camera'
  | 'photoLibrary' 
  | 'notifications';

export type PermissionStatus = 
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable';

export interface PermissionResult {
  status: PermissionStatus;
  canAskAgain: boolean;
}

export interface PermissionInfo {
  title: string;
  description: string;
  essential: boolean;
}

class PermissionService {
  /**
   * Get human-readable information about a permission
   */
  getPermissionInfo(permission: AppPermission): PermissionInfo {
    const info = {
      camera: {
        title: 'Camera Access',
        description: 'Take photos for your profile',
        essential: false,
      },
      photoLibrary: {
        title: 'Photo Library',
        description: 'Choose photos from your library',
        essential: false,
      },
      notifications: {
        title: 'Notifications',
        description: 'Receive budget alerts and updates',
        essential: false,
      },
    };

    return info[permission];
  }

  /**
   * Check if a permission is currently granted (simplified approach)
   */
  async checkPermission(permission: AppPermission): Promise<PermissionResult> {
    try {
      if (Platform.OS === 'android') {
        return this.checkAndroidPermission(permission);
      } else {
        return this.checkiOSPermission(permission);
      }
    } catch (error) {
      console.error(`Error checking ${permission} permission:`, error);
      return {
        status: 'denied',
        canAskAgain: true,
      };
    }
  }

  private async checkAndroidPermission(permission: AppPermission): Promise<PermissionResult> {
    let androidPermission: string;
    
    switch (permission) {
      case 'camera':
        androidPermission = PermissionsAndroid.PERMISSIONS.CAMERA;
        break;
      case 'photoLibrary':
        androidPermission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        break;
      case 'notifications':
        // Android 13+ requires POST_NOTIFICATIONS, older versions don't need permission
        if (Number(Platform.Version) >= 33) {
          androidPermission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
        } else {
          return { status: 'granted', canAskAgain: false };
        }
        break;
      default:
        return { status: 'unavailable', canAskAgain: false };
    }

    const result = await PermissionsAndroid.check(androidPermission as any);
    return {
      status: result ? 'granted' : 'denied',
      canAskAgain: !result,
    };
  }

  private async checkiOSPermission(permission: AppPermission): Promise<PermissionResult> {
    // For iOS, we'll assume permissions need to be requested
    // React Native doesn't provide a way to check iOS permissions without external libraries
    // So we'll return 'denied' by default and let the request handle it
    return {
      status: 'denied',
      canAskAgain: true,
    };
  }

  /**
   * Request a specific permission
   */
  async requestPermission(
    permission: AppPermission,
    options?: {
      title?: string;
      message?: string;
      showSettingsAlert?: boolean;
    }
  ): Promise<PermissionResult> {
    try {
      if (Platform.OS === 'android') {
        return this.requestAndroidPermission(permission, options);
      } else {
        return this.requestiOSPermission(permission, options);
      }
    } catch (error) {
      console.error(`Error requesting ${permission} permission:`, error);
      return {
        status: 'denied',
        canAskAgain: true,
      };
    }
  }

  private async requestAndroidPermission(
    permission: AppPermission,
    options?: {
      title?: string;
      message?: string;
      showSettingsAlert?: boolean;
    }
  ): Promise<PermissionResult> {
    let androidPermission: string;
    const info = this.getPermissionInfo(permission);
    
    switch (permission) {
      case 'camera':
        androidPermission = PermissionsAndroid.PERMISSIONS.CAMERA;
        break;
      case 'photoLibrary':
        androidPermission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        break;
      case 'notifications':
        if (Number(Platform.Version) >= 33) {
          androidPermission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
        } else {
          return { status: 'granted', canAskAgain: false };
        }
        break;
      default:
        return { status: 'unavailable', canAskAgain: false };
    }

    const result = await PermissionsAndroid.request(
      androidPermission as any,
      {
        title: options?.title || `${info.title} Permission`,
        message: options?.message || `NVLP needs ${info.title.toLowerCase()} permission to ${info.description.toLowerCase()}.`,
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      }
    );

    const status = result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 
                   result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';

    if (status === 'blocked' && options?.showSettingsAlert !== false) {
      Alert.alert(
        `${info.title} Required`,
        `To use this feature, please enable ${info.title.toLowerCase()} access in Settings.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => Linking.openSettings(),
          },
        ]
      );
    }

    return {
      status,
      canAskAgain: status === 'denied',
    };
  }

  private async requestiOSPermission(
    permission: AppPermission,
    options?: {
      title?: string;
      message?: string;
      showSettingsAlert?: boolean;
    }
  ): Promise<PermissionResult> {
    // For iOS, we'll return 'granted' and let the native react-native-image-picker
    // and other libraries handle the actual permission requests
    // This avoids double prompts and ensures proper timing
    
    if (permission === 'notifications') {
      // For notifications, we need to handle this specially since we can't rely on a library
      return new Promise((resolve) => {
        Alert.alert(
          'Enable Notifications?',
          'Allow NVLP to send you budget alerts and important updates.',
          [
            { 
              text: 'Don\'t Allow', 
              style: 'cancel',
              onPress: () => resolve({ status: 'denied', canAskAgain: true })
            },
            { 
              text: 'Allow', 
              onPress: () => resolve({ status: 'granted', canAskAgain: false })
            },
          ]
        );
      });
    }
    
    // For camera and photo library, return granted immediately
    // The native libraries will handle the actual OS permission requests
    return {
      status: 'granted',
      canAskAgain: false,
    };
  }

  /**
   * Request multiple permissions at once
   */
  async requestMultiplePermissions(
    permissions: AppPermission[]
  ): Promise<Record<AppPermission, PermissionResult>> {
    const results: Partial<Record<AppPermission, PermissionResult>> = {};
    
    for (const permission of permissions) {
      results[permission] = await this.requestPermission(permission);
    }
    
    return results as Record<AppPermission, PermissionResult>;
  }

  /**
   * Check multiple permissions at once
   */
  async checkMultiplePermissions(
    permissions: AppPermission[]
  ): Promise<Record<AppPermission, PermissionResult>> {
    const results: Partial<Record<AppPermission, PermissionResult>> = {};
    
    for (const permission of permissions) {
      results[permission] = await this.checkPermission(permission);
    }
    
    return results as Record<AppPermission, PermissionResult>;
  }

  /**
   * Open device settings for the app
   */
  async openAppSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Error opening app settings:', error);
      Alert.alert(
        'Settings',
        'Please open Settings manually and navigate to this app to manage permissions.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Get all permissions status for the onboarding screen
   */
  async getAllPermissionsStatus(): Promise<Record<AppPermission, PermissionResult>> {
    const allPermissions: AppPermission[] = ['camera', 'photoLibrary', 'notifications'];
    return this.checkMultiplePermissions(allPermissions);
  }

  /**
   * Request all non-granted permissions
   */
  async requestAllMissingPermissions(): Promise<Record<AppPermission, PermissionResult>> {
    const allPermissions: AppPermission[] = ['camera', 'photoLibrary', 'notifications'];
    const currentStatus = await this.checkMultiplePermissions(allPermissions);
    
    const missingPermissions = allPermissions.filter(
      permission => currentStatus[permission].status !== 'granted'
    );
    
    if (missingPermissions.length === 0) {
      return currentStatus;
    }
    
    const requestResults = await this.requestMultiplePermissions(missingPermissions);
    
    // Merge current status with new request results
    return {
      ...currentStatus,
      ...requestResults,
    };
  }
}

export const permissionService = new PermissionService();