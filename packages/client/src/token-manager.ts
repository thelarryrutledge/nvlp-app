/**
 * Token Manager - Handles token persistence and refresh logic
 */

import { PersistedAuthData, User } from './types';

export class TokenManager {
  private storageKey: string;
  private persistTokens: boolean;
  private autoRefresh: boolean;

  constructor(
    storageKey: string = 'nvlp_auth_tokens',
    persistTokens: boolean = true,
    autoRefresh: boolean = true
  ) {
    this.storageKey = storageKey;
    this.persistTokens = persistTokens;
    this.autoRefresh = autoRefresh;
  }

  /**
   * Save tokens to storage (localStorage in browser, file in Node.js)
   */
  saveTokens(
    accessToken: string,
    refreshToken: string | null,
    expiresIn: number,
    user: User
  ): void {
    if (!this.persistTokens) return;

    const authData: PersistedAuthData = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + (expiresIn * 1000),
      user,
      createdAt: Date.now()
    };

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Browser environment
        localStorage.setItem(this.storageKey, JSON.stringify(authData));
      } else if (typeof process !== 'undefined' && process.env) {
        // Node.js environment - use file system
        const fs = require('fs');
        const os = require('os');
        const path = require('path');
        
        const tokenDir = path.join(os.homedir(), '.nvlp');
        const tokenFile = path.join(tokenDir, 'auth.json');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(tokenDir)) {
          fs.mkdirSync(tokenDir, { recursive: true });
        }
        
        fs.writeFileSync(tokenFile, JSON.stringify(authData, null, 2));
      }
    } catch (error) {
      console.warn('Failed to persist auth tokens:', error);
    }
  }

  /**
   * Load tokens from storage
   */
  loadTokens(): PersistedAuthData | null {
    if (!this.persistTokens) return null;

    try {
      let authDataJson: string | null = null;

      if (typeof window !== 'undefined' && window.localStorage) {
        // Browser environment
        authDataJson = localStorage.getItem(this.storageKey);
      } else if (typeof process !== 'undefined' && process.env) {
        // Node.js environment
        const fs = require('fs');
        const os = require('os');
        const path = require('path');
        
        const tokenFile = path.join(os.homedir(), '.nvlp', 'auth.json');
        
        if (fs.existsSync(tokenFile)) {
          authDataJson = fs.readFileSync(tokenFile, 'utf8');
        }
      }

      if (!authDataJson) return null;

      const authData: PersistedAuthData = JSON.parse(authDataJson);
      
      // Check if token is expired
      if (authData.expiresAt <= Date.now()) {
        this.clearTokens();
        return null;
      }

      return authData;
    } catch (error) {
      console.warn('Failed to load auth tokens:', error);
      this.clearTokens();
      return null;
    }
  }

  /**
   * Clear tokens from storage
   */
  clearTokens(): void {
    if (!this.persistTokens) return;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Browser environment
        localStorage.removeItem(this.storageKey);
      } else if (typeof process !== 'undefined' && process.env) {
        // Node.js environment
        const fs = require('fs');
        const os = require('os');
        const path = require('path');
        
        const tokenFile = path.join(os.homedir(), '.nvlp', 'auth.json');
        
        if (fs.existsSync(tokenFile)) {
          fs.unlinkSync(tokenFile);
        }
      }
    } catch (error) {
      console.warn('Failed to clear auth tokens:', error);
    }
  }

  /**
   * Check if token needs refresh (within 5 minutes of expiry)
   */
  needsRefresh(expiresAt: number): boolean {
    if (!this.autoRefresh) return false;
    
    const fiveMinutes = 5 * 60 * 1000;
    return expiresAt - Date.now() < fiveMinutes;
  }

  /**
   * Parse JWT token to extract expiration time
   */
  parseJWTExpiration(token: string): number | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) {
        return null;
      }
      const decoded = JSON.parse(atob(payload));
      return decoded.exp ? decoded.exp * 1000 : null;
    } catch (error) {
      console.warn('Failed to parse JWT token:', error);
      return null;
    }
  }
}