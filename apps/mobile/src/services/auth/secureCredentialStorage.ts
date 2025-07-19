/**
 * Secure Credential Storage Service
 * 
 * Stores encrypted user credentials for biometric authentication
 * Uses react-native-keychain for secure storage
 */

import * as Keychain from 'react-native-keychain';

export interface SecureCredentials {
  email: string;
  password: string;
}

class SecureCredentialStorage {
  private readonly SERVICE_NAME = 'com.nvlp.mobile.biometric';
  private readonly CREDENTIALS_KEY = 'user_credentials';

  /**
   * Store user credentials securely
   */
  async storeCredentials(credentials: SecureCredentials): Promise<boolean> {
    try {
      const result = await Keychain.setInternetCredentials(
        this.SERVICE_NAME,
        this.CREDENTIALS_KEY,
        credentials.email,
        credentials.password
      );
      
      console.log('Credentials stored successfully:', result);
      return result;
    } catch (error) {
      console.error('Error storing credentials:', error);
      return false;
    }
  }

  /**
   * Retrieve stored credentials
   */
  async getCredentials(): Promise<SecureCredentials | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(this.SERVICE_NAME);
      
      if (credentials) {
        return {
          email: credentials.username,
          password: credentials.password,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving credentials:', error);
      return null;
    }
  }

  /**
   * Check if credentials exist
   */
  async hasCredentials(): Promise<boolean> {
    try {
      const credentials = await Keychain.getInternetCredentials(this.SERVICE_NAME);
      return !!credentials;
    } catch (error) {
      console.error('Error checking credentials:', error);
      return false;
    }
  }

  /**
   * Remove stored credentials
   */
  async removeCredentials(): Promise<boolean> {
    try {
      const result = await Keychain.resetInternetCredentials(this.SERVICE_NAME);
      console.log('Credentials removed:', result);
      return result;
    } catch (error) {
      console.error('Error removing credentials:', error);
      return false;
    }
  }

  /**
   * Check if keychain is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return !!biometryType;
    } catch (error) {
      console.error('Error checking keychain availability:', error);
      return false;
    }
  }
}

export const secureCredentialStorage = new SecureCredentialStorage();