import * as Keychain from 'react-native-keychain';

/**
 * Secure Storage Service
 * 
 * Provides secure storage for authentication tokens, PIN, and other sensitive data
 * using the device's secure keychain/keystore.
 * 
 * Security Features:
 * - Tokens stored in hardware-backed keychain when available
 * - Biometric authentication protection
 * - Access control restrictions
 */

// Service identifiers for different types of stored data
const SERVICES = {
  AUTH_TOKENS: 'nvlp.auth.tokens',
  USER_PIN: 'nvlp.auth.pin',
  DEVICE_INFO: 'nvlp.device.info',
  BIOMETRIC_SETTINGS: 'nvlp.biometric.settings',
} as const;

// Keychain access control options for maximum security
const SECURE_OPTIONS: Keychain.Options = {
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
  accessGroup: undefined, // Use default access group
  authenticatePrompt: 'Authenticate to access NVLP',
  service: SERVICES.AUTH_TOKENS,
  touchID: true,
  showModal: true,
};

// Standard options for non-critical data
const STANDARD_OPTIONS: Keychain.Options = {
  service: SERVICES.AUTH_TOKENS,
  touchID: false,
  showModal: false,
};

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceFingerprint: string;
  deviceName: string;
  deviceType: 'ios' | 'android';
}

export interface BiometricSettings {
  enabled: boolean;
  availableType: 'FaceID' | 'TouchID' | 'Fingerprint' | 'Passcode' | 'None';
}

/**
 * Secure Storage Service
 */
export class SecureStorageService {
  /**
   * Store authentication tokens securely
   */
  static async setAuthTokens(tokens: AuthTokens): Promise<void> {
    try {
      const tokenData = JSON.stringify(tokens);
      await Keychain.setInternetCredentials(
        SERVICES.AUTH_TOKENS,
        tokens.userId,
        tokenData,
        SECURE_OPTIONS
      );
    } catch (error) {
      console.error('Failed to store auth tokens:', error);
      throw new Error('Failed to store authentication tokens securely');
    }
  }

  /**
   * Retrieve authentication tokens
   */
  static async getAuthTokens(): Promise<AuthTokens | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(SERVICES.AUTH_TOKENS);
      
      if (!credentials || credentials === false) {
        return null;
      }

      const tokens = JSON.parse(credentials.password) as AuthTokens;
      
      // Check if tokens are expired
      if (tokens.expiresAt <= Date.now()) {
        await this.clearAuthTokens();
        return null;
      }

      return tokens;
    } catch (error) {
      console.error('Failed to retrieve auth tokens:', error);
      return null;
    }
  }

  /**
   * Clear authentication tokens
   */
  static async clearAuthTokens(): Promise<void> {
    try {
      await Keychain.resetInternetCredentials(SERVICES.AUTH_TOKENS);
    } catch (error) {
      console.error('Failed to clear auth tokens:', error);
    }
  }

  /**
   * Store user PIN securely
   */
  static async setPIN(pin: string, userId: string): Promise<void> {
    try {
      await Keychain.setInternetCredentials(
        SERVICES.USER_PIN,
        userId,
        pin,
        {
          ...SECURE_OPTIONS,
          service: SERVICES.USER_PIN,
          authenticatePrompt: 'Authenticate to save your PIN',
        }
      );
    } catch (error) {
      console.error('Failed to store PIN:', error);
      throw new Error('Failed to store PIN securely');
    }
  }

  /**
   * Verify user PIN
   */
  static async verifyPIN(pin: string, userId: string): Promise<boolean> {
    try {
      const credentials = await Keychain.getInternetCredentials(SERVICES.USER_PIN);
      
      if (!credentials || credentials === false) {
        return false;
      }

      return credentials.password === pin && credentials.username === userId;
    } catch (error) {
      console.error('Failed to verify PIN:', error);
      return false;
    }
  }

  /**
   * Clear user PIN
   */
  static async clearPIN(): Promise<void> {
    try {
      await Keychain.resetInternetCredentials(SERVICES.USER_PIN);
    } catch (error) {
      console.error('Failed to clear PIN:', error);
    }
  }

  /**
   * Store device information
   */
  static async setDeviceInfo(deviceInfo: DeviceInfo): Promise<void> {
    try {
      const deviceData = JSON.stringify(deviceInfo);
      await Keychain.setInternetCredentials(
        SERVICES.DEVICE_INFO,
        deviceInfo.deviceId,
        deviceData,
        {
          ...STANDARD_OPTIONS,
          service: SERVICES.DEVICE_INFO,
        }
      );
    } catch (error) {
      console.error('Failed to store device info:', error);
      throw new Error('Failed to store device information');
    }
  }

  /**
   * Retrieve device information
   */
  static async getDeviceInfo(): Promise<DeviceInfo | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(SERVICES.DEVICE_INFO);
      
      if (!credentials || credentials === false) {
        return null;
      }

      return JSON.parse(credentials.password) as DeviceInfo;
    } catch (error) {
      console.error('Failed to retrieve device info:', error);
      return null;
    }
  }

  /**
   * Store biometric settings
   */
  static async setBiometricSettings(settings: BiometricSettings): Promise<void> {
    try {
      const settingsData = JSON.stringify(settings);
      await Keychain.setInternetCredentials(
        SERVICES.BIOMETRIC_SETTINGS,
        'biometric_settings',
        settingsData,
        {
          ...STANDARD_OPTIONS,
          service: SERVICES.BIOMETRIC_SETTINGS,
        }
      );
    } catch (error) {
      console.error('Failed to store biometric settings:', error);
      throw new Error('Failed to store biometric settings');
    }
  }

  /**
   * Retrieve biometric settings
   */
  static async getBiometricSettings(): Promise<BiometricSettings | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(SERVICES.BIOMETRIC_SETTINGS);
      
      if (!credentials || credentials === false) {
        return null;
      }

      return JSON.parse(credentials.password) as BiometricSettings;
    } catch (error) {
      console.error('Failed to retrieve biometric settings:', error);
      return null;
    }
  }

  /**
   * Check if biometric authentication is available
   */
  static async isBiometricAvailable(): Promise<BiometricSettings> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      
      return {
        enabled: false, // Default to disabled, user must opt-in
        availableType: biometryType || 'None',
      };
    } catch (error) {
      console.error('Failed to check biometric availability:', error);
      return {
        enabled: false,
        availableType: 'None',
      };
    }
  }

  /**
   * Clear all stored data (use for logout/reset)
   */
  static async clearAll(): Promise<void> {
    try {
      await Promise.all([
        this.clearAuthTokens(),
        this.clearPIN(),
        Keychain.resetInternetCredentials(SERVICES.DEVICE_INFO),
        Keychain.resetInternetCredentials(SERVICES.BIOMETRIC_SETTINGS),
      ]);
    } catch (error) {
      console.error('Failed to clear all secure storage:', error);
    }
  }

  /**
   * Check if keychain is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      return await Keychain.hasInternetCredentials(SERVICES.AUTH_TOKENS);
    } catch (error) {
      console.error('Failed to check keychain availability:', error);
      return false;
    }
  }
}

export default SecureStorageService;