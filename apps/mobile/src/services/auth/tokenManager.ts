/**
 * Authentication Token Manager for React Native
 * 
 * Manages secure storage, refresh, and validation of authentication tokens
 * using React Native Keychain for secure storage with biometric protection
 * and AsyncStorage for non-secure storage and migration support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import * as Keychain from 'react-native-keychain';

export interface TokenData {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  user: any;
  tokenType?: string;
}

export interface TokenManagerConfig {
  storageKey: string;
  useSecureStorage?: boolean;
  autoRefresh?: boolean;
  refreshThreshold?: number; // Minutes before expiry to trigger refresh
}

class TokenManager {
  private config: TokenManagerConfig;
  private currentTokens: TokenData | null = null;
  private refreshPromise: Promise<TokenData> | null = null;
  private refreshCallbacks: ((tokens: TokenData | null) => void)[] = [];

  constructor(config: TokenManagerConfig) {
    this.config = {
      refreshThreshold: 5, // Default 5 minutes
      autoRefresh: true,
      useSecureStorage: true,
      ...config,
    };
  }

  /**
   * Save tokens securely
   */
  async saveTokens(tokenData: TokenData): Promise<void> {
    try {
      this.currentTokens = tokenData;
      const tokenString = JSON.stringify(tokenData);

      if (this.config.useSecureStorage) {
        // Use react-native-keychain for secure storage
        await Keychain.setInternetCredentials(
          this.config.storageKey,
          'tokens', // username (required by keychain, we just use 'tokens')
          tokenString,
          {
            accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          }
        );
      } else {
        await AsyncStorage.setItem(this.config.storageKey, tokenString);
      }

      // Notify listeners of token update
      this.notifyTokenUpdate(tokenData);
    } catch (error) {
      console.error('Failed to save tokens:', error);
      throw new Error('Failed to save authentication tokens');
    }
  }

  /**
   * Load tokens from storage
   */
  async loadTokens(): Promise<TokenData | null> {
    try {
      let tokenString: string | null = null;

      if (this.config.useSecureStorage) {
        // Load from keychain
        try {
          const credentials = await Keychain.getInternetCredentials(this.config.storageKey);
          if (credentials && credentials.password) {
            tokenString = credentials.password;
          }
        } catch (error) {
          console.warn('Failed to load from keychain, falling back to AsyncStorage:', error);
          // Fallback to AsyncStorage for migration
          tokenString = await AsyncStorage.getItem(`secure_${this.config.storageKey}`);
          
          // If we found tokens in AsyncStorage, migrate them to keychain
          if (tokenString) {
            try {
              const tokenData = JSON.parse(tokenString);
              await this.saveTokens(tokenData);
              await AsyncStorage.removeItem(`secure_${this.config.storageKey}`);
              console.log('Migrated tokens from AsyncStorage to Keychain');
            } catch (migrationError) {
              console.warn('Failed to migrate tokens to keychain:', migrationError);
            }
          }
        }
      } else {
        tokenString = await AsyncStorage.getItem(this.config.storageKey);
      }
      
      if (!tokenString) {
        return null;
      }

      const tokenData: TokenData = JSON.parse(tokenString);
      
      // Validate token structure
      if (!this.isValidTokenData(tokenData)) {
        console.warn('Invalid token data found in storage, clearing...');
        await this.clearTokens();
        return null;
      }

      // Check if token is expired
      if (this.isTokenExpired(tokenData)) {
        console.log('Stored token is expired');
        
        // Try to refresh if we have a refresh token
        if (tokenData.refreshToken && this.config.autoRefresh) {
          console.log('Attempting to refresh expired token...');
          try {
            return await this.refreshTokens(tokenData.refreshToken);
          } catch (error) {
            console.warn('Failed to refresh expired token:', error);
            await this.clearTokens();
            return null;
          }
        }
        
        await this.clearTokens();
        return null;
      }

      this.currentTokens = tokenData;
      return tokenData;
    } catch (error) {
      console.error('Failed to load tokens:', error);
      return null;
    }
  }

  /**
   * Clear all tokens from storage
   */
  async clearTokens(): Promise<void> {
    try {
      this.currentTokens = null;
      
      // Clear from all storage locations
      const clearPromises = [
        AsyncStorage.removeItem(this.config.storageKey),
        AsyncStorage.removeItem(`secure_${this.config.storageKey}`),
      ];

      // Clear from keychain if using secure storage
      if (this.config.useSecureStorage) {
        clearPromises.push(
          Keychain.resetInternetCredentials(this.config.storageKey).catch(error => {
            console.warn('Failed to clear keychain credentials:', error);
          })
        );
      }

      await Promise.all(clearPromises);

      // Notify listeners of token clearing
      this.notifyTokenUpdate(null);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Get current tokens
   */
  getCurrentTokens(): TokenData | null {
    return this.currentTokens;
  }

  /**
   * Check if we have valid tokens
   */
  hasValidTokens(): boolean {
    return this.currentTokens !== null && !this.isTokenExpired(this.currentTokens);
  }

  /**
   * Check if token needs refresh
   */
  needsRefresh(): boolean {
    if (!this.currentTokens) {
      return false;
    }

    const refreshThresholdMs = this.config.refreshThreshold! * 60 * 1000;
    const timeUntilExpiry = this.currentTokens.expiresAt - Date.now();
    
    return timeUntilExpiry <= refreshThresholdMs;
  }

  /**
   * Refresh tokens using refresh token
   */
  async refreshTokens(refreshToken?: string): Promise<TokenData> {
    const tokenToUse = refreshToken || this.currentTokens?.refreshToken;
    
    if (!tokenToUse) {
      throw new Error('No refresh token available');
    }

    // Prevent multiple concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh(tokenToUse);
    
    try {
      const newTokens = await this.refreshPromise;
      await this.saveTokens(newTokens);
      return newTokens;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh (to be implemented with API client)
   */
  private async performTokenRefresh(refreshToken: string): Promise<TokenData> {
    // Import API client dynamically to avoid circular dependency
    const { apiClient } = await import('../api/client');
    
    try {
      // Set the refresh token temporarily for the refresh call
      const originalState = apiClient.getAuthState();
      apiClient.setAuth(originalState.accessToken || '', refreshToken, originalState.user);
      
      const result = await apiClient.refreshToken();
      
      return this.createTokenData(
        result.session.access_token,
        result.session.refresh_token || refreshToken,
        originalState.user,
        result.session.expires_in
      );
    } catch (error) {
      console.error('Token refresh API call failed:', error);
      throw error;
    }
  }

  /**
   * Add listener for token updates
   */
  addTokenListener(callback: (tokens: TokenData | null) => void): () => void {
    this.refreshCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.refreshCallbacks.indexOf(callback);
      if (index > -1) {
        this.refreshCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get access token for API requests
   */
  getAccessToken(): string | null {
    return this.currentTokens?.accessToken || null;
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return this.currentTokens?.refreshToken || null;
  }

  /**
   * Get user information from tokens
   */
  getUser(): any {
    return this.currentTokens?.user || null;
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(): number | null {
    return this.currentTokens?.expiresAt || null;
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(tokenData: TokenData): boolean {
    return Date.now() >= tokenData.expiresAt;
  }

  /**
   * Validate token data structure
   */
  private isValidTokenData(data: any): data is TokenData {
    return data &&
           typeof data.accessToken === 'string' &&
           typeof data.expiresAt === 'number' &&
           (data.refreshToken === null || typeof data.refreshToken === 'string');
  }

  /**
   * Notify all listeners of token updates
   */
  private notifyTokenUpdate(tokens: TokenData | null): void {
    this.refreshCallbacks.forEach(callback => {
      try {
        callback(tokens);
      } catch (error) {
        console.error('Token listener callback failed:', error);
      }
    });
  }

  /**
   * Handle token expiration
   */
  async handleTokenExpiration(): Promise<void> {
    if (!this.currentTokens) {
      return;
    }

    // Try to refresh if we have a refresh token
    if (this.currentTokens.refreshToken && this.config.autoRefresh) {
      try {
        await this.refreshTokens();
        return;
      } catch (error) {
        console.warn('Failed to refresh token on expiration:', error);
      }
    }

    // Clear tokens and show authentication required message
    await this.clearTokens();
    
    Alert.alert(
      'Session Expired',
      'Your session has expired. Please log in again.',
      [{ text: 'OK', style: 'default' }]
    );
  }

  /**
   * Parse JWT token to extract expiration
   */
  parseJWTExpiration(token: string): number | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      
      const decoded = JSON.parse(atob(payload));
      return decoded.exp ? decoded.exp * 1000 : null; // Convert to milliseconds
    } catch (error) {
      console.warn('Failed to parse JWT expiration:', error);
      return null;
    }
  }

  /**
   * Create token data from authentication response
   */
  createTokenData(
    accessToken: string,
    refreshToken: string | null,
    user: any,
    expiresIn?: number
  ): TokenData {
    let expiresAt: number;
    
    if (expiresIn) {
      expiresAt = Date.now() + (expiresIn * 1000);
    } else {
      // Try to parse expiration from JWT
      const jwtExpiration = this.parseJWTExpiration(accessToken);
      expiresAt = jwtExpiration || (Date.now() + (3600 * 1000)); // Default 1 hour
    }

    return {
      accessToken,
      refreshToken,
      expiresAt,
      user,
      tokenType: 'Bearer',
    };
  }
}

// Create singleton instance
export const tokenManager = new TokenManager({
  storageKey: '@nvlp:auth_tokens',
  useSecureStorage: true,
  autoRefresh: true,
  refreshThreshold: 5, // 5 minutes
});