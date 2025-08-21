import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Token Storage Service
 * 
 * Simple token storage using AsyncStorage for convenience authentication.
 * Security is provided by magic link validation, not storage encryption.
 */

// Storage keys for different types of data
const STORAGE_KEYS = {
  AUTH_TOKENS: '@nvlp:auth_tokens',
  DEVICE_INFO: '@nvlp:device_info',
} as const;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
  lastActivity: number; // Track last activity for auto sign-out
  expiresAt?: number; // Unix timestamp when the access token expires
}

export interface DeviceInfo {
  deviceId: string;
  deviceFingerprint: string;
  deviceName: string;
  deviceType: 'ios' | 'android';
}

/**
 * Token Storage Service
 */
export class SecureStorageService {
  /**
   * Store authentication tokens
   */
  static async setAuthTokens(tokens: AuthTokens): Promise<void> {
    try {
      console.log('💾 TokenStorage: Storing auth tokens...', {
        userId: tokens.userId,
        lastActivity: new Date(tokens.lastActivity).toISOString(),
        hasAccessToken: !!tokens.accessToken,
        hasRefreshToken: !!tokens.refreshToken
      });
      
      const tokenData = JSON.stringify(tokens);
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKENS, tokenData);
      
      console.log('✅ TokenStorage: Auth tokens stored successfully');
    } catch (error) {
      console.error('❌ TokenStorage: Failed to store auth tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  }

  /**
   * Retrieve authentication tokens
   */
  static async getAuthTokens(): Promise<AuthTokens | null> {
    try {
      console.log('💾 TokenStorage: Attempting to retrieve auth tokens...');
      
      const tokenData = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
      
      console.log('💾 TokenStorage: AsyncStorage result:', {
        hasData: !!tokenData,
        dataLength: tokenData?.length || 0
      });
      
      if (!tokenData) {
        console.log('💾 TokenStorage: No tokens found in storage');
        return null;
      }

      console.log('💾 TokenStorage: Parsing stored token data...');
      const tokens = JSON.parse(tokenData) as AuthTokens;
      
      console.log('💾 TokenStorage: Retrieved tokens:', {
        userId: tokens.userId,
        lastActivity: tokens.lastActivity ? new Date(tokens.lastActivity).toISOString() : 'undefined',
        hasAccessToken: !!tokens.accessToken,
        hasRefreshToken: !!tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        expiresAtDate: tokens.expiresAt ? new Date(tokens.expiresAt * 1000).toISOString() : 'N/A'
      });
      
      // Only check for 30-day inactivity - assume tokens are valid since they were validated before storing
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (tokens.lastActivity && (Date.now() - tokens.lastActivity) > thirtyDaysMs) {
        console.log('💾 TokenStorage: Auto sign-out - 30 days of inactivity detected');
        await this.clearAuthTokens();
        return null;
      }

      console.log('✅ TokenStorage: Valid tokens found');
      return tokens;
    } catch (error) {
      console.error('❌ TokenStorage: Failed to retrieve auth tokens:', error);
      return null;
    }
  }

  /**
   * Update last activity timestamp for existing tokens
   */
  static async updateLastActivity(): Promise<void> {
    try {
      const tokens = await this.getAuthTokens();
      if (tokens) {
        tokens.lastActivity = Date.now();
        await this.setAuthTokens(tokens);
      }
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  }

  /**
   * Clear authentication tokens
   */
  static async clearAuthTokens(): Promise<void> {
    try {
      console.log('💾 TokenStorage: Clearing auth tokens...');
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKENS);
      console.log('✅ TokenStorage: Auth tokens cleared successfully');
    } catch (error) {
      console.error('❌ TokenStorage: Failed to clear auth tokens:', error);
    }
  }

  /**
   * Store device information
   */
  static async setDeviceInfo(deviceInfo: DeviceInfo): Promise<void> {
    try {
      const deviceData = JSON.stringify(deviceInfo);
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_INFO, deviceData);
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
      const deviceData = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_INFO);
      return deviceData ? JSON.parse(deviceData) as DeviceInfo : null;
    } catch (error) {
      console.error('Failed to retrieve device info:', error);
      return null;
    }
  }

  /**
   * Clear all stored data (use for logout/reset)
   * Note: This preserves device info to maintain device identity across logins
   */
  static async clearAll(): Promise<void> {
    try {
      // Only clear auth tokens, not device info
      // Device info should persist across logins to avoid creating duplicate device entries
      await this.clearAuthTokens();
      // DO NOT clear device info - it should persist
      // await AsyncStorage.removeItem(STORAGE_KEYS.DEVICE_INFO);
    } catch (error) {
      console.error('Failed to clear all storage:', error);
    }
  }
  
  /**
   * Clear all data including device info (use for factory reset)
   */
  static async clearAllIncludingDevice(): Promise<void> {
    try {
      await Promise.all([
        this.clearAuthTokens(),
        AsyncStorage.removeItem(STORAGE_KEYS.DEVICE_INFO),
      ]);
    } catch (error) {
      console.error('Failed to clear all storage including device:', error);
    }
  }
}

export default SecureStorageService;