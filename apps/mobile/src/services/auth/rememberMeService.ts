/**
 * Remember Me Service
 * 
 * Manages the "Remember Me" functionality for login persistence
 * Stores user preference and handles auto-login flow
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RememberMePreference {
  email: string;
  rememberMe: boolean;
  lastLoginDate: string;
}

class RememberMeService {
  private static readonly STORAGE_KEY = '@nvlp:remember_me';
  private static readonly AUTO_LOGIN_EXPIRY_DAYS = 30; // Remember me expires after 30 days

  /**
   * Save remember me preference
   */
  async savePreference(email: string, rememberMe: boolean): Promise<void> {
    try {
      if (rememberMe) {
        const preference: RememberMePreference = {
          email,
          rememberMe: true,
          lastLoginDate: new Date().toISOString(),
        };
        await AsyncStorage.setItem(RememberMeService.STORAGE_KEY, JSON.stringify(preference));
      } else {
        // Clear preference if rememberMe is false
        await AsyncStorage.removeItem(RememberMeService.STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to save remember me preference:', error);
    }
  }

  /**
   * Get remember me preference
   */
  async getPreference(): Promise<RememberMePreference | null> {
    try {
      const preferenceString = await AsyncStorage.getItem(RememberMeService.STORAGE_KEY);
      if (!preferenceString) {
        return null;
      }

      const preference: RememberMePreference = JSON.parse(preferenceString);
      
      // Check if preference has expired
      if (this.isPreferenceExpired(preference)) {
        await this.clearPreference();
        return null;
      }

      return preference;
    } catch (error) {
      console.error('Failed to get remember me preference:', error);
      return null;
    }
  }

  /**
   * Clear remember me preference
   */
  async clearPreference(): Promise<void> {
    try {
      await AsyncStorage.removeItem(RememberMeService.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear remember me preference:', error);
    }
  }

  /**
   * Check if user should be auto-logged in based on remember me preference
   */
  async shouldAutoLogin(): Promise<{ shouldLogin: boolean; email?: string }> {
    const preference = await this.getPreference();
    
    if (!preference || !preference.rememberMe) {
      return { shouldLogin: false };
    }

    return {
      shouldLogin: true,
      email: preference.email,
    };
  }

  /**
   * Check if remember me preference has expired
   */
  private isPreferenceExpired(preference: RememberMePreference): boolean {
    const lastLoginDate = new Date(preference.lastLoginDate);
    const expiryDate = new Date(lastLoginDate.getTime() + (RememberMeService.AUTO_LOGIN_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
    return new Date() > expiryDate;
  }

  /**
   * Update last login date for existing preference
   */
  async updateLastLoginDate(email: string): Promise<void> {
    try {
      const preference = await this.getPreference();
      if (preference && preference.email === email && preference.rememberMe) {
        preference.lastLoginDate = new Date().toISOString();
        await AsyncStorage.setItem(RememberMeService.STORAGE_KEY, JSON.stringify(preference));
      }
    } catch (error) {
      console.error('Failed to update last login date:', error);
    }
  }
}

export const rememberMeService = new RememberMeService();